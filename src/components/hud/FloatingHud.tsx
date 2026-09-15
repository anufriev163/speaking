import React, { useState, useEffect, useRef } from 'react';
import { Mic, Settings, Sparkles, Check, AlertCircle, Loader2, X } from 'lucide-react';
import { Waveform } from './Waveform';
import { CapsuleBorder } from './CapsuleBorder';
import { GovoriLogo } from '../common/GovoriLogo';
import { useAudioRecorder } from '../../hooks/useAudioRecorder';
import { ActiveContext, HudState, UILanguage } from '../../types';
import { soundEffects } from '../../utils/soundEffects';
import { getTranslations } from '../../utils/i18n';

export const FloatingHud: React.FC = () => {
  const [hudState, setHudState] = useState<HudState>('idle');
  const [isVisible, setIsVisible] = useState<boolean>(() => typeof window !== 'undefined' && !window.govoriAPI);
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
  const [mockVoicing, setMockVoicing] = useState<boolean>(false);
  const [selectionInfo, setSelectionInfo] = useState<{ hasSelection: boolean; snippet: string }>({ hasSelection: false, snippet: '' });
  const [isRewriteResult, setIsRewriteResult] = useState<boolean>(false);
  const [currentLanguage, setCurrentLanguage] = useState<'ru' | 'en' | 'auto'>('ru');
  const [uiLanguage, setUiLanguage] = useState<UILanguage>('auto');
  const [appMode, setAppMode] = useState<'toggle' | 'ptt'>('toggle');
  const [savedMacroInfo, setSavedMacroInfo] = useState<{ trigger: string; replacement: string } | null>(null);

  const t = getTranslations(uiLanguage);

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
    // In browser preview, never auto-dismiss so the UI can be freely inspected
    if (typeof window !== 'undefined' && !window.govoriAPI) {
      return;
    }

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
    if (!isRecordingRef.current && hudState !== 'recording') {
      return;
    }

    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    setHudState('processing');
    soundEffects.playStop();

    try {
      isRecordingRef.current = false;
      const audioBlob = await stopRecording();

      if (!audioBlob || audioBlob.size < 800) {
        setHudState('idle');
        scheduleDismiss(600);
        window.govoriAPI?.notifyRecordingStopped?.();
        return;
      }

      const arrayBuffer = await audioBlob.arrayBuffer();

      if (window.govoriAPI) {
        const result = await window.govoriAPI.transcribeAudio(arrayBuffer, audioBlob.type);

        if (result.success && result.text) {
          soundEffects.playSuccess();
          setHudState('success');
          setTextSnippet(result.text);
          setLatency(result.latencyMs);
          const macro = result.macroSaved || result.macroCreated;
          if (macro) {
            setSavedMacroInfo(macro);
          } else {
            setSavedMacroInfo(null);
          }

          scheduleDismiss(1600);
        } else {
          soundEffects.playError();
          setHudState('error');
          const cleanErr = (result.error || 'Ошибка распознавания').replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, '');
          setErrorMessage(cleanErr);
          scheduleDismiss(2500);
        }
      } else {
        setHudState('success');
        setTextSnippet('Демо-режим: API недоступен');
        scheduleDismiss(1200);
      }
    } catch (err: any) {
      console.error('[HUD] Error stopping recording:', err);
      soundEffects.playError();
      setHudState('error');
      const cleanErr = (err?.message || 'Ошибка обработки').replace(/^Error invoking remote method '[^']+':\s*(Error:\s*)?/, '');
      setErrorMessage(cleanErr);
      scheduleDismiss(2500);
    } finally {
      isTransitioningRef.current = false;
      window.govoriAPI?.notifyRecordingStopped?.();
    }
  };

  const handleCancelRecording = (e?: React.MouseEvent) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    cancelDismiss();

    if (isRecordingRef.current) {
      isRecordingRef.current = false;
      stopRecording(); // stop and discard audio
    }
    soundEffects.playStop();
    setHudState('idle');
    if (typeof window !== 'undefined' && window.govoriAPI) {
      setIsVisible(false);
      setTimeout(() => {
        window.govoriAPI?.notifyRecordingStopped?.();
        window.govoriAPI?.hideHud?.();
      }, 180);
    }
  };

  const handleConfirmRecording = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    if (isRecordingRef.current || hudState === 'recording') {
      stopRecordingAction();
    } else if (hudState === 'success' || hudState === 'error') {
      // Result is shown: clicking checkmark smoothly dismisses HUD
      cancelDismiss();
      setIsVisible(false);
      setTimeout(() => {
        window.govoriAPI?.notifyRecordingStopped?.();
        window.govoriAPI?.hideHud?.();
        setHudState('idle');
        setTextSnippet('');
        setErrorMessage('');
        setLatency(null);
      }, 180);
    } else if (hudState === 'idle') {
      startRecordingAction();
    }
  };

  const handleCapsuleClick = () => {
    if (hudState === 'success' || hudState === 'error') {
      cancelDismiss();
      setIsVisible(false);
      setTimeout(() => {
        window.govoriAPI?.notifyRecordingStopped?.();
        window.govoriAPI?.hideHud?.();
        setHudState('idle');
        setTextSnippet('');
        setErrorMessage('');
        setLatency(null);
      }, 180);
    }
  };

  const handleToggleRecording = () => {
    if (hudState === 'recording' || isRecordingRef.current) {
      stopRecordingAction();
    } else if (hudState === 'success' || hudState === 'error') {
      cancelDismiss();
      startRecordingAction();
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
        if (s.language) setCurrentLanguage(s.language);
        if (s.uiLanguage) setUiLanguage(s.uiLanguage);
        if (s.mode) setAppMode(s.mode);
      }
    });

    const unsubSettings = window.govoriAPI.onSettingsChanged?.((s: any) => {
      if (s) {
        if (s.language) setCurrentLanguage(s.language);
        if (s.uiLanguage) setUiLanguage(s.uiLanguage);
        if (s.mode) setAppMode(s.mode);
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
      if (action === 'toggle') {
        handleToggleRecordingRef.current();
      } else if (action === 'start') {
        startRecordingAction();
      } else if (action === 'stop') {
        stopRecordingAction();
      } else if (action === 'show') {
        cancelDismiss();
        setIsVisible(true);
        scheduleDismiss(3500);
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelRecording();
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
    if (hudState === 'recording') {
      setRecordDuration(0);
      timerRef.current = setInterval(() => {
        setRecordDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [hudState]);

  const dragStartPos = useRef<{ mouseX: number; mouseY: number } | null>(null);
  const isDragging = useRef<boolean>(false);

  const handleDragStart = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.app-no-drag')) {
      return;
    }
    isDragging.current = true;
    dragStartPos.current = { mouseX: e.screenX, mouseY: e.screenY };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current || !dragStartPos.current) return;
      const deltaX = moveEvent.screenX - dragStartPos.current.mouseX;
      const deltaY = moveEvent.screenY - dragStartPos.current.mouseY;
      dragStartPos.current = { mouseX: moveEvent.screenX, mouseY: moveEvent.screenY };
      window.govoriAPI?.moveHud?.(deltaX, deltaY);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      dragStartPos.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    hoverRef.current = true;
    cancelDismiss();
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    hoverRef.current = false;
    if (typeof window !== 'undefined' && !window.govoriAPI) {
      return;
    }
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
      className="w-full h-full flex items-center justify-center select-none overflow-visible p-5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`hud-spring-wrapper ${isVisible ? 'hud-spring-visible' : 'hud-spring-hidden'}`}>
        <div
          onMouseDown={handleDragStart}
          onClick={handleCapsuleClick}
          className={`wispr-capsule cursor-grab active:cursor-grabbing select-none ${
            (isRecording || hudState === 'recording') ? 'wispr-capsule-recording' : ''
          }`}
        >
          {/* Unified capsule border: permanent 1px base + traveling tapered white beam */}
          <CapsuleBorder isRecording={isRecording || hudState === 'recording'} />

          {/* Left: Cancel Circle Button (✕) */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleCancelRecording}
            className="app-no-drag wispr-circle-btn cursor-pointer relative z-10"
            title="Отменить (Esc)"
          >
            <X className="w-3.5 h-3.5 stroke-[2.5] pointer-events-none" />
          </button>

          {/* Center: Waveform / Status */}
          <div className="flex items-center justify-center min-w-[70px] px-1 relative z-10">
            {hudState === 'processing' ? (
              <div className="flex items-center gap-2 px-2 text-white/90 text-xs font-medium">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                <span className="text-[11px] tracking-tight">{selectionInfo.hasSelection ? t.hudRewriting : t.hudProcessing}</span>
              </div>
            ) : hudState === 'success' ? (
              <div className="flex items-center gap-1.5 px-2 text-white text-xs font-medium max-w-[200px] truncate">
                <Check className="w-3.5 h-3.5 stroke-[3] text-emerald-400 shrink-0" />
                <span className="text-[11px] truncate text-white/90">
                  {savedMacroInfo ? savedMacroInfo.trigger : textSnippet ? `«${textSnippet}»` : t.hudPasted}
                </span>
              </div>
            ) : hudState === 'error' ? (
              <div className="flex items-center gap-1.5 px-2 text-rose-300 text-xs font-medium max-w-[180px] truncate">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[11px] truncate">{errorMessage || t.hudMicError}</span>
              </div>
            ) : (
              /* Equalizer waveform */
              <Waveform
                volume={mockVoicing ? 0.36 : audioVolume}
                isRecording={isRecording || hudState === 'recording'}
              />
            )}
          </div>

          {/* Right: Confirm Circle Button (✓) */}
          <button
            type="button"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={handleConfirmRecording}
            className="app-no-drag wispr-circle-btn cursor-pointer relative z-10"
            title={hudState === 'recording' ? "Завершить и вставить (Ctrl + ~)" : hudState === 'success' ? "Готово (закрыть)" : "Начать запись"}
          >
            {hudState === 'processing' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white pointer-events-none" />
            ) : (
              <Check className="w-3.5 h-3.5 stroke-[2.5] pointer-events-none" />
            )}
          </button>
        </div>
      </div>

      {/* Developer / Browser Preview Controls (only rendered in browser when window.govoriAPI is absent) */}
      {typeof window !== 'undefined' && !window.govoriAPI && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-neutral-900/90 border border-white/20 rounded-full px-3.5 py-1.5 shadow-2xl backdrop-blur-md z-50 select-none">
          <span className="text-neutral-400 font-mono text-[10px] mr-1">Тест HUD:</span>
          <button
            id="test-btn-idle"
            onClick={() => { setHudState('idle'); setIsVisible(true); setMockVoicing(false); }}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              hudState === 'idle' ? 'bg-sky-500 text-white shadow-sm' : 'bg-white/10 text-neutral-300 hover:bg-white/20'
            }`}
          >
            Готов
          </button>
          <button
            id="test-btn-recording"
            onClick={() => { setHudState('recording'); setIsVisible(true); setMockVoicing(true); }}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              hudState === 'recording' && mockVoicing ? 'bg-sky-500 text-white shadow-sm' : 'bg-white/10 text-neutral-300 hover:bg-white/20'
            }`}
          >
            Запись + Речь
          </button>
          <button
            id="test-btn-processing"
            onClick={() => { setHudState('processing'); setIsVisible(true); }}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              hudState === 'processing' ? 'bg-sky-500 text-white shadow-sm' : 'bg-white/10 text-neutral-300 hover:bg-white/20'
            }`}
          >
            Обработка
          </button>
          <button
            id="test-btn-success"
            onClick={() => {
              setHudState('success');
              setTextSnippet('Привет! Всё отлично работает.');
              setLatency(190);
              setIsVisible(true);
            }}
            className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
              hudState === 'success' ? 'bg-emerald-500 text-white shadow-sm' : 'bg-white/10 text-neutral-300 hover:bg-white/20'
            }`}
          >
            Успех
          </button>
        </div>
      )}
    </div>
  );
};
