import React, { useEffect, useState, useRef } from 'react';

interface WaveformProps {
  volume: number;
  isRecording: boolean;
}

export const Waveform: React.FC<WaveformProps> = ({ volume, isRecording }) => {
  // 11 equalizer bars with natural acoustic curve
  const weights = [0.45, 0.7, 0.95, 1.2, 1.45, 1.6, 1.45, 1.2, 0.95, 0.7, 0.45];
  const [phase, setPhase] = useState<number>(0);
  const animFrameRef = useRef<number | null>(null);

  // Strictly gate ambient noise
  const effectiveVol = Math.max(0, volume - 0.02);

  useEffect(() => {
    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = now - lastTime;
      lastTime = now;
      // Fluid continuous traveling wave motion (speeds up smoothly when voicing)
      const speed = isRecording ? (effectiveVol > 0.02 ? 0.0075 : 0.0035) : 0.002;
      setPhase((prev) => (prev + dt * speed) % (Math.PI * 40));
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isRecording, effectiveVol > 0.02]);

  return (
    <div className="flex items-center gap-[3px] h-6 px-1">
      {weights.map((weight, i) => {
        // Multi-frequency organic sound wave harmonics (lifelike fluid motion)
        const wave1 = Math.sin(phase * 1.5 + i * 0.58);
        const wave2 = Math.cos(phase * 1.15 - i * 0.72);
        const wave3 = Math.sin(phase * 2.3 + i * 1.05) * 0.35;
        const waveMotion = 0.5 + 0.3 * wave1 + 0.15 * wave2 + 0.05 * wave3;

        // Dynamic 2D metallic shimmer (flows smoothly left/right and up/down)
        const xShimmer = Math.sin(phase * 1.4 + i * 0.52);
        const yShimmer = Math.cos(phase * 1.7 + i * 0.42);

        // Gradient angle smoothly swaying between 165deg and 195deg (left-to-right flow)
        const gradientAngle = Math.round(180 + xShimmer * 16);

        // Specular highlight & shadow movement along the bar
        const darkAccentPos = Math.round(82 + yShimmer * 10);

        const isVoicing = isRecording && effectiveVol > 0.015;
        const isPeak = isRecording && effectiveVol > 0.08;

        // In silence: 4px resting dots in crisp white
        // During speech: dynamic organic undulation up to 22px
        const dynamicHeight = isVoicing
          ? Math.min(22, Math.max(4, Math.round(4 + effectiveVol * 22 * weight * (0.35 + 0.65 * waveMotion))))
          : 4;

        return (
          <div
            key={i}
            className="w-[2.5px] rounded-full transition-all duration-75 ease-out"
            style={{
              height: `${dynamicHeight}px`,
              background: '#ffffff',
              opacity: isRecording ? (isVoicing ? 1 : 0.85) : 0.7,
              boxShadow: isPeak
                ? '0 0 6px rgba(255, 255, 255, 0.65)'
                : isVoicing
                ? '0 0 3px rgba(255, 255, 255, 0.35)'
                : 'none'
            }}
          />
        );
      })}
    </div>
  );
};
