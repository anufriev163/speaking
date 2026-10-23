import React from 'react';

// Shared "clean notebook" primitives for the settings window: rows on ruled lines,
// inputs written on a line, one ink-blue accent. No cards, shadows or icon tiles.

export const PageTitle: React.FC<{ title: string; subtitle?: string; aside?: React.ReactNode }> = ({ title, subtitle, aside }) => (
  <div className="flex items-start justify-between gap-6 mb-6">
    <div>
      <h2 className="text-[20px] leading-7 font-semibold text-graphite">{title}</h2>
      {subtitle && <p className="mt-1 text-[13px] leading-5 text-muted max-w-[52ch]">{subtitle}</p>}
    </div>
    {aside && <div className="shrink-0 pt-1">{aside}</div>}
  </div>
);

/** One setting per ruled line: label + hint on the left, control on the right. */
export const Row: React.FC<{ label: React.ReactNode; hint?: React.ReactNode; children?: React.ReactNode }> = ({ label, hint, children }) => (
  <div className="flex items-center justify-between gap-6 py-4 border-b border-rule">
    <div className="min-w-0">
      <div className="text-[14px] leading-5 text-graphite">{label}</div>
      {hint && <div className="mt-0.5 text-[13px] leading-5 text-muted">{hint}</div>}
    </div>
    {children && <div className="shrink-0">{children}</div>}
  </div>
);

export const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string }> = ({ checked, onChange, label }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative w-9 h-5 rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
      checked ? 'bg-ink' : 'bg-rule'
    }`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-paper transition-transform ${checked ? 'translate-x-4' : ''}`}
    />
  </button>
);

/** Plain-text choices; the chosen one is written in ink and underlined. */
export function Choice<T extends string>({ value, options, onChange }: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-4" role="radiogroup">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`text-[14px] leading-5 pb-0.5 border-b transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink ${
              active ? 'text-ink border-ink' : 'text-muted border-transparent hover:text-graphite'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Input as a line on the page — you write on it, there is no box. */
export const LineInput = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className = '', ...props }, ref) => (
    <input
      ref={ref}
      {...props}
      className={`w-full bg-transparent border-0 border-b border-rule px-0 py-2 text-[14px] text-graphite placeholder:text-muted/70 focus:outline-none focus:border-ink transition-colors select-text ${className}`}
    />
  )
);
LineInput.displayName = 'LineInput';

export const LineTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement>> = ({ className = '', ...props }) => (
  <textarea
    {...props}
    className={`w-full bg-transparent border-0 border-b border-rule px-0 py-2 text-[14px] text-graphite placeholder:text-muted/70 focus:outline-none focus:border-ink transition-colors resize-none select-text ${className}`}
  />
);

/** Text button: ink for actions, red pen for destructive ones. */
export const TextButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'ink' | 'muted' | 'danger' }> = ({
  tone = 'ink',
  className = '',
  ...props
}) => (
  <button
    type="button"
    {...props}
    className={`text-[14px] leading-5 transition-colors disabled:opacity-40 disabled:cursor-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink rounded-sm ${
      tone === 'ink' ? 'text-ink hover:underline' : tone === 'danger' ? 'text-redpen hover:underline' : 'text-muted hover:text-graphite'
    } ${className}`}
  />
);
