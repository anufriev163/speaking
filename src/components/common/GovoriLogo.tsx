import React from 'react';

interface GovoriLogoProps {
  className?: string;
  size?: number;
}

export const GovoriLogo: React.FC<GovoriLogoProps> = ({ className = 'w-6 h-6', size }) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <div
      style={style}
      className={`relative flex items-center justify-center rounded-[8px] bg-black text-white shadow-xs select-none shrink-0 overflow-hidden ${className}`}
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-4/5 h-4/5"
      >
        {/* Subtle glow / backdrop accent */}
        <circle cx="16" cy="16" r="10" fill="white" fillOpacity="0.06" />

        {/* Dynamic speech waveform bars & voice ribbon */}
        <line x1="6" y1="16" x2="6" y2="16.01" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.5" />
        <line x1="10" y1="12" x2="10" y2="20" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.8" />
        <line x1="14" y1="8" x2="14" y2="24" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="18" y1="11" x2="18" y2="21" stroke="white" strokeWidth="2.2" strokeLinecap="round" />
        <line x1="22" y1="13.5" x2="22" y2="18.5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.8" />
        <line x1="26" y1="16" x2="26" y2="16.01" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeOpacity="0.5" />

        {/* Smooth central speech wave contour */}
        <path
          d="M 5 16 C 9 16, 11 10, 14 8 C 17 6, 18 22, 21 16 C 23 12, 25 16, 27 16"
          stroke="white"
          strokeWidth="1.2"
          strokeOpacity="0.35"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
};
