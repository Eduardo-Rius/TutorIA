import React from 'react';
import { Field, Input } from '../../forms';
import { Button } from '../../primitives';
import { AIComponentProps } from '../shared/types';

export interface PromptBoxProps extends Omit<React.FormHTMLAttributes<HTMLFormElement>, 'onSubmit' | 'onChange'>, AIComponentProps {
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit?: (value: string) => void;
  buttonLabel?: string;
  buttonIconSlot?: React.ReactNode;
}

export function PromptBox({
  placeholder = 'Escribe tu instrucción aquí...',
  value,
  onChange,
  onSubmit,
  buttonLabel = 'Enviar',
  buttonIconSlot,
  loading = false,
  disabled = false,
  className = '',
  ...props
}: PromptBoxProps) {
  const combinedClassName = `relative w-full ${className}`.trim();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (onSubmit && value?.trim() && !disabled && !loading) {
      onSubmit(value);
    }
  };

  return (
    <form className={combinedClassName} onSubmit={handleSubmit} {...props}>
      <Field className="mb-0">
        <div className="relative flex items-center w-full">
          <Input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            disabled={disabled || loading}
            className="pr-24 py-3 sm:py-4 rounded-full shadow-sm"
          />
          <div className="absolute right-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="rounded-full"
              disabled={disabled || loading || !value?.trim()}
              loading={loading}
              aria-label={buttonLabel}
            >
              {buttonIconSlot || buttonLabel}
            </Button>
          </div>
        </div>
      </Field>
    </form>
  );
}
