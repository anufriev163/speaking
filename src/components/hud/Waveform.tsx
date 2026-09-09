import React from 'react';

interface WaveformProps {
  volume: number;
  isRecording: boolean;
}

export const Waveform: React.FC<WaveformProps> = ({ volume, isRecording }) => {
  const bars = [0.35, 0.7, 1.0, 0.85, 0.55, 0.9, 0.6];

  return (
    <div className="flex items-center gap-[3px] h-5 px-1">
      {bars.map((weight, i) => {
        const height = isRecording
          ? Math.max(4, Math.min(22, Math.round(volume * 26 * weight + 4)))
          : 4;

        return (
          <div
            key={i}
            className={`w-[3px] rounded-full transition-all duration-75 ${
              isRecording
                ? 'bg-black'
                : 'bg-neutral-300'
            }`}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
};
