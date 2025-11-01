import * as React from 'react';

import { cn } from '@/lib/utils';

export interface InputProps extends React.ComponentProps<'input'> {
  /**
   * Whether to automatically trim leading/trailing spaces
   * - 'blur': Trim on blur (recommended, doesn't interfere with input)
   * - 'change': Trim in real-time during input (use with caution, affects input experience)
   * - false: Don't auto-trim
   * @default 'blur'
   */
  autoTrim?: 'blur' | 'change' | false;
}

/**
 * Update input value using native method and trigger event to ensure React state sync
 */
function updateInputValue(input: HTMLInputElement, value: string) {
  const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    'value'
  )?.set;

  if (nativeInputValueSetter) {
    nativeInputValueSetter.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function Input({ className, type, autoTrim = 'blur', onChange, onBlur, ...props }: InputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (autoTrim === 'change' && e.target.value) {
      const trimmedValue = e.target.value.trim();
      if (trimmedValue !== e.target.value) {
        updateInputValue(e.target, trimmedValue);
        return; // Already triggered new input event, no need to continue
      }
    }
    onChange?.(e);
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (autoTrim === 'blur' && e.target.value) {
      const trimmedValue = e.target.value.trim();
      if (trimmedValue !== e.target.value) {
        updateInputValue(e.target, trimmedValue);
      }
    }
    onBlur?.(e);
  };

  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]',
        'aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive',
        className
      )}
      onChange={handleChange}
      onBlur={handleBlur}
      {...props}
    />
  );
}

export { Input };
