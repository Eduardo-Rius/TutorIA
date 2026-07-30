import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ invalid = false, className = '', disabled, ...props }, ref) => {
    const baseClasses = 'block w-full rounded-md border border-brandPrimary/10 bg-surfacePrimary px-3 py-2 text-base text-textPrimary placeholder:text-textPrimary/50 focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brandSecondary disabled:opacity-50 disabled:cursor-not-allowed';

    const combinedClassName = `${baseClasses} ${className}`.trim();

    return (
      <textarea
        ref={ref}
        disabled={disabled}
        aria-invalid={invalid}
        aria-disabled={disabled}
        className={combinedClassName}
        {...props}
      />
    );
  }
);
Textarea.displayName = 'Textarea';
