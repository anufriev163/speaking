import React, { useState, useEffect, useRef } from 'react';
import { Mic, Settings, Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';
import { Waveform } from './Waveform';
import { GovoriLogo } from '../common/GovoriLogo';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { ActiveContext, HudState } from '../../types';
import { soundEffects } from '../../utils/soundEffects';

declare global {
  interface Window {
    govoriAPI?: any;
  }
}



export const FloatingHud: React.FC = () => {
  const [hudState, setHudState] = useState<HudState>('idle');
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [context, setContext] = useState<ActiveContext>({
    processName: '',
    windowTitle: '',
    category: 'general',
    categoryLabel: 'Готов'
  });
  const [latency, setLatency] = useState<number | null>(null);
  const [textSnippet, setTextSnippet] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [recordDuration, setRecordDuration] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [selectionInfo, setSelectionInfo] = useState<{ hasSelection: boolean; snippet: string }>({ hasSelection: false, snippet: '' });
  const [isRewriteResult, setIsRewriteResult] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<'ru' | 'en' | 'auto'>('ru');
  const [appMode, setAppMode] = useState<'toggle' | 'ptt'>('toggle');
  const [savedMacroInfo, setSavedMacroInfo] = useState<{ trigger: string; replacement: string } | null>(null);

  const { isRecording, audioVolume, startRecording, stopRecording } = useAudioRecorder();
  const timerRef = useRef<any>(null);
  const dismissTimerRef = useRef<any>(null);
  const animTimerRef = useRef<any>(null);
  const hoverRef = useRef<boolean>(false);

  const isRecordingRef = useRef<boolean>(false);
  const isTransitioningRef = useRef<boolean>(false);
  const recordStartTimeRef = useRef<number>(0);

  const handleToggleRecordingRef = useRef<() => void>(() => {});

  const cancelDismiss = () => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
      dismissTimerRef.current = null;
    }
    if (animTimerRef.current) {
      clearTimeout(animTimerRef.current);
      animTimerRef.current = null;
    }
  };

  const scheduleDismiss = (delayMs = 1400) => {
    cancelDismiss();
    dismissTimerRef.current = setTimeout(() => {
      if (hoverRef.current) {
        return;
      }
      setIsVisible(false);
      animTimerRef.current = setTimeout(() => {
        window.govoriAPI?.hideHud?.();
        setHudState('idle');
        setTextSnippet('');
        setErrorMessage('');
        setLatency(null);
        setSelectionInfo({ hasSelection: false, snippet: '' });
        setIsRewriteResult(false);
        setSavedMacroInfo(null);
      }, 380);
    }, delayMs);
  };

  const startRecordingAction = async () => {
    if (isRecordingRef.current || isTransitioningRef.current || hudState === 'processing') {
      return;
    }

    cancelDismiss();
    setIsVisible(true);
    isTransitioningRef.current = true;
    recordStartTimeRef.current = Date.now();

    try {
      setHudState('recording');
      soundEffects.playStart();
      await startRecording();
      isRecordingRef.current = true;
    } catch (err: any) {
      console.error('[HUD] Error starting recording:', err);
      isRecordingRef.current = false;
      setHudState('error');
      setErrorMessage(err?.message || 'Ошибка микрофона');
      window.govoriAPI?.notifyRecordingStopped?.();
      scheduleDismiss(2500);
    } finally {
      isTransitioningRef.current = false;
    }
  };

  const stopRecordingAction = async () => {
    if (!isRecordingRef.current || isTransitioningRef.current || hudState === 'processing') {
      return;
    }

    const now = Date.now();
    const elapsed = now - recordStartTimeRef.current;
    // In PTT or fast release, guarantee at least 350ms buffer before finalizing audio
    if (elapsed < 350) {
      await new Promise((r) => setTimeout(r, 350 - elapsed));
    }

    isTransitioningRef.current = true;
    soundEffects.playStop();
    setHudState('processing');

    try {
      const audioBlob = await stopRecording();
      isRecordingRef.current = false;
      window.govoriAPI?.notifyRecordingStopped?.();

      if (!audioBlob || audioBlob.size === 0) {
        scheduleDismiss(200);
        return;
      }

      const arrayBuffer = await audioBlob.arrayBuffer();
      if (window.govoriAPI) {
        const result = await window.govoriAPI.transcribeAudio(arrayBuffer, audioBlob.type);
        if (result) {
          if (result.macroCreated) {
            setSavedMacroInfo(result.macroCreated);
            setTextSnippet('');
            setIsRewriteResult(false);
            setLatency(result.latencyMs);
            setHudState('success');
            soundEffects.playSuccess();
            scheduleDismiss(2200);
          } else if (result.text) {
            setSavedMacroInfo(null);
            setLatency(result.latencyMs);
            setTextSnippet(result.text);
            setIsRewriteResult(Boolean(result.isRewrite));
            setHudState('success');
            soundEffects.playSuccess();
            scheduleDismiss(1400); // Display result for 1.4s then smoothly glide down
          } else {
            setHudState('idle');
            scheduleDismiss(300);
          }
        }
      } else {
        setHudState('idle');
        scheduleDismiss(300);
      }
    } catch (err: any) {
      console.error('[HUD] Transcription error:', err);
      setHudState('error');
      setErrorMessage(err?.message || 'Ошибка распознавания');
      scheduleDismiss(2500);
    } finally {
      isTransitioningRef.current = false;
      window.govoriAPI?.notifyRecordingStopped?.();
    }
  };

  const handleToggleRecording = () => {
    if (isRecordingRef.current) {
      stopRecordingAction();
    } else {
      startRecordingAction();
    }
  };

  handleToggleRecordingRef.current = handleToggleRecording;

  useEffect(() => {
    if (!window.govoriAPI) return;

    window.govoriAPI.getActiveContext().then((ctx: ActiveContext) => {
      if (ctx) setContext(ctx);
    });

    window.govoriAPI.getSettings?.().then((s: any) => {
      if (s) {
        if (typeof s.soundFeedback === 'boolean') {
          soundEffects.setEnabled(s.soundFeedback);
        }
        if (s.language) {
          setCurrentLanguage(s.language);
        }
        if (s.mode) {
          setAppMode(s.mode);
        }
      }
    });

    const unsubSettings = window.govoriAPI.onSettingsChanged?.((s: any) => {
      if (s) {
        if (typeof s.soundFeedback === 'boolean') {
          soundEffects.setEnabled(s.soundFeedback);
        }
        if (s.language) {
          setCurrentLanguage(s.language);
        }
        if (s.mode) {
          setAppMode(s.mode);
        }
      }
    });

    const unsubContext = window.govoriAPI.onContextChanged((newCtx: ActiveContext) => {
      setContext(newCtx);
    });

    const unsubSelection = window.govoriAPI.onSelectionChanged?.((data: any) => {
      if (data) {
        setSelectionInfo(data);
      }
    });

    const unsubHotkey = window.govoriAPI.onTriggerRecording((action: string) => {
      if (action === 'start') {
        startRecordingAction();
      } else if (action === 'stop') {
        stopRecordingAction();
      } else if (action === 'show') {
        cancelDismiss();
        setIsVisible(true);
        setHudState('idle');
      } else {
        handleToggleRecording();
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelDismiss();
        setIsVisible(false);
        setTimeout(() => {
          window.govoriAPI?.hideHud?.();
          setHudState('idle');
        }, 380);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      unsubSettings?.();
      unsubContext?.();
      unsubSelection?.();
      unsubHotkey?.();
      window.removeEventListener('keydown', handleKeyDown);
      cancelDismiss();
    };
  }, []);

  useEffect(() => {
    if (isRecording) {
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRecording]);

  const handleDragStart = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    let startX = e.screenX;
    let startY = e.screenY;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.screenX - startX;
      const deltaY = moveEvent.screenY - startY;
      startX = moveEvent.screenX;
      startY = moveEvent.screenY;
      window.govoriAPI?.moveHud?.(deltaX, deltaY);
    };

    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    hoverRef.current = true;
    cancelDismiss();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    hoverRef.current = false;
    if (hudState === 'success') {
      scheduleDismiss(800);
    } else if (hudState === 'error') {
      scheduleDismiss(1200);
    } else if (hudState === 'idle' && isVisible) {
      scheduleDismiss(3000);
    }
  };


  const cycleLanguage = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextLang = currentLanguage === 'ru' ? 'en' : currentLanguage === 'en' ? 'auto' : 'ru';
    setCurrentLanguage(nextLang);
    window.govoriAPI?.updateSettings?.({ language: nextLang });
  };

  const openSettings = () => {
    window.govoriAPI?.openSettings();
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div
      className="w-full h-full flex items-end justify-center pb-2 select-none overflow-hidden"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`hud-spring-wrapper ${isVisible ? 'hud-spring-visible' : 'hud-spring-hidden'}`}>
        <div
          onMouseDown={handleDragStart}
          className={`apple-pill rounded-full px-3 py-1.5 flex items-center gap-2.5 cursor-grab active:cursor-grabbing ${
            hudState === 'recording' ? 'apple-pill-recording' : ''
          }`}
        >
          {/* Record / Action Button */}
          <button
            onClick={handleToggleRecording}
            className={`app-no-drag w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 cursor-pointer shadow-xs ${
              hudState === 'recording'
                ? 'bg-red-500 text-white scale-105 ring-2 ring-red-400/30'
                : hudState === 'processing'
                ? 'bg-white/70 text-black border border-black/10 backdrop-blur-md'
                : hudState === 'success'
                ? 'bg-emerald-600 text-white'
                : hudState === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-black text-white hover:bg-neutral-800'
            }`}
            title={isRecording ? 'Остановить запись (Ctrl+~)' : 'Начать запись (Ctrl+~)'}
          >
            {hudState === 'processing' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : hudState === 'recording' ? (
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-pulse" />
            ) : hudState === 'success' ? (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : hudState === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5" />
            ) : (
              <Mic className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Center Dynamic Content */}
          <div className="flex items-center gap-2 min-w-[150px] max-w-[260px] overflow-hidden">
            {hudState === 'recording' ? (
              <div className="flex items-center gap-2.5">
                <Waveform volume={audioVolume} isRecording={isRecording} />
                <span className="text-xs font-mono font-semibold text-neutral-900 tracking-tight">
                  {formatSeconds(recordDuration)}
                </span>

                {selectionInfo.hasSelection && (
                  <span className="flex items-center gap-1 text-[10px] text-amber-900 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full font-medium truncate max-w-[100px]" title={selectionInfo.snippet}>
                    <Sparkles className="w-2.5 h-2.5 text-amber-600 animate-spin" />
                    Редактор
                  </span>
                )}
              </div>
            ) : hudState === 'processing' ? (
              <div className="flex items-center gap-2 text-xs text-neutral-900 font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-700" />
                <span>{selectionInfo.hasSelection ? 'Редактирую...' : 'Обработка...'}</span>
              </div>
            ) : hudState === 'success' ? (
              <div className="flex items-center gap-2 text-xs truncate">
                {latency && (
                  <span className="px-1.5 py-0.5 rounded-full bg-black/80 text-white font-mono text-[10px] font-semibold shrink-0">
                    {latency}мс
                  </span>
                )}
                {savedMacroInfo ? (
                  <span className="text-emerald-800 font-semibold truncate text-[11px] flex items-center gap-1">
                    <span>💾</span>
                    <span>Макрос: «{savedMacroInfo.trigger}»</span>
                  </span>
                ) : (
                  <span className="text-neutral-900 font-medium truncate text-[11px]">
                    {isRewriteResult
                      ? 'Заменено!'
                      : textSnippet
                      ? `«${textSnippet}»`
                      : 'Вставлено!'}
                  </span>
                )}
              </div>
            ) : hudState === 'error' ? (
              <span className="text-xs text-red-600 truncate text-[11px] font-medium">
                {errorMessage || 'Ошибка'}
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <GovoriLogo className="w-4 h-4 text-black shrink-0" />
                <span className="text-xs font-semibold text-neutral-900 tracking-tight lowercase">
                  говори
                </span>
                <span className="px-1.5 py-0.5 rounded-md bg-black/5 border border-black/5 text-neutral-500 font-mono text-[9px] font-semibold tracking-tight">
                  Ctrl + ~
                </span>
              </div>
            )}
          </div>

          {/* Quick Language Toggle */}
          <button
            onClick={cycleLanguage}
            className="app-no-drag px-2 py-0.5 rounded-full bg-black/5 hover:bg-black/10 text-neutral-800 hover:text-black transition-all font-mono text-[10px] font-bold tracking-tight cursor-pointer border border-black/5"
            title={`Язык: ${currentLanguage.toUpperCase()} (нажмите для смены RU / EN / AUTO)`}
          >
            {currentLanguage.toUpperCase()}
          </button>

          {/* Quick Settings */}
          <button
            onClick={openSettings}
            className="app-no-drag w-7 h-7 rounded-full flex items-center justify-center text-neutral-500 hover:text-black hover:bg-black/5 transition-all cursor-pointer"
            title="Настройки"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
