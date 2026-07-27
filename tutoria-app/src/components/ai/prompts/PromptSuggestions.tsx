import React from 'react';
import { Inline } from '../../foundations';
import { Badge } from '../../primitives';
import { AIComponentProps } from '../shared/types';

export interface SuggestionItem {
  id: string;
  label: string;
}

export interface PromptSuggestionsProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onSelect'>, AIComponentProps {
  items: SuggestionItem[];
  onSelect?: (item: SuggestionItem) => void;
}

export function PromptSuggestions({
  items,
  onSelect,
  loading = false,
  disabled = false,
  className = '',
  ...props
}: PromptSuggestionsProps) {
  const combinedClassName = `w-full overflow-x-auto pb-2 scrollbar-hide ${className}`.trim();

  return (
    <div className={combinedClassName} {...props}>
      <Inline gap={2} wrap={false}>
        {items.map(item => (
          <button
            key={item.id}
            type="button"
            disabled={disabled || loading}
            onClick={() => onSelect?.(item)}
            className={`flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brandSecondary rounded-pill transition-transform active:scale-95 ${
              disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:bg-brandPrimary/10'
            }`}
          >
            {/* Compose with primitive Badge for visuals, button for accessibility */}
            <Badge label={item.label} variant="default" className="pointer-events-none" />
          </button>
        ))}
      </Inline>
    </div>
  );
}
