import { useState, useRef, useCallback } from 'react';
import { encodeWAV, resampleTo16kHz } from '../utils/audioUtils';

export interface UseAudioRecorderReturn {
  isRecording: boolean;
  audioVolume: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
}

export function useAudioRecorder(): UseAudioRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [audioVolume, setAudioVolume] = useState(0);

  const isRecordingRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const updateVolume = useCallback(() => {
    if (!analyserRef.current || !isRecordingRef.current) {
      setAudioVolume(0);
      return;
    }

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const avg = sum / dataArray.length;
    // Sensitive human speech volume calculation
    const normalized = Math.min(1, Math.max(0, (avg - 6) / 40));
    setAudioVolume(normalized);

    animFrameRef.current = requestAnimationFrame(updateVolume);
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Try high-quality constraints first; gracefully fallback to basic audio on older sound cards
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          }
        });
      } catch (errConstraints) {
        console.warn('[Audio] Advanced constraints failed on this audio device, falling back to standard audio:', errConstraints);
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      }
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(100);
      isRecordingRef.current = true;
      setIsRecording(true);

      animFrameRef.current = requestAnimationFrame(updateVolume);
    } catch (err) {
      console.error('[Audio] Failed to access microphone:', err);
      throw err;
    }
  }, [updateVolume]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      isRecordingRef.current = false;
      setIsRecording(false);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      setAudioVolume(0);

      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === 'inactive') {
        resolve(null);
        return;
      }

      recorder.onstop = async () => {
        try {
          const rawBlob = new Blob(audioChunksRef.current);

          // Clean up stream immediately
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
          }

          // Reject only if genuinely empty (less than 150 bytes)
          if (rawBlob.size < 150) {
            setIsRecording(false);
            resolve(null);
            return;
          }

          const arrayBuffer = await rawBlob.arrayBuffer();
          const audioCtx = audioContextRef.current || new (window.AudioContext || (window as any).webkitAudioContext)();
          const decodedBuffer = await audioCtx.decodeAudioData(arrayBuffer);

          // Resample to clean 16kHz mono PCM WAV
          const samples16k = await resampleTo16kHz(decodedBuffer);
          const wavBlob = encodeWAV(samples16k, 16000);

          if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
          }

          setIsRecording(false);
          resolve(wavBlob);
        } catch (err) {
          console.error('[Audio] Error processing audio to 16kHz WAV, falling back to raw blob:', err);
          const rawBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          setIsRecording(false);
          resolve(rawBlob);
        }
      };

      recorder.stop();
    });
  }, []);

  return {
    isRecording,
    audioVolume,
    startRecording,
    stopRecording
  };
}
