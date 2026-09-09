import React from 'react';

interface WaveformProps {
  volume: number;
  isRecording: boolean;
}

export const Waveform: React.FC<WaveformProps> = ({ volume, isRecording }) => {
  const bars = [0.45, 0.85, 1.25, 0.95, 1.15, 0.6];

  return (
    <div className="flex items-center gap-[3.5px] h-6 px-1">
      {bars.map((weight, i) => {
        const dynamicHeight = isRecording
          ? Math.max(3.5, Math.min(22, Math.round(3.5 + volume * 22 * weight)))
          : 3.5;

        return (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-75 ease-out ${
              isRecording
                ? volume > 0.08
                  ? 'bg-neutral-900'
                  : 'bg-neutral-700'
                : 'bg-neutral-400'
            }`}
            style={{ height: `${dynamicHeight}px` }}
          />
        );
      })}
    </div>
  );
};
