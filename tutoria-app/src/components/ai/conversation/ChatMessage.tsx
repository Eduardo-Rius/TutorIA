import React from 'react';
import { Surface, Stack } from '../../foundations';
import { Avatar, Text } from '../../primitives';
import { AIComponentProps } from '../shared/types';

export interface ChatMessageProps extends React.HTMLAttributes<HTMLDivElement>, AIComponentProps {
  role: 'user' | 'assistant';
  avatarInitials?: string;
  avatarSrc?: string;
}

export function ChatMessage({
  role,
  avatarInitials,
  avatarSrc,
  loading = false,
  disabled = false,
  className = '',
  children,
  ...props
}: ChatMessageProps) {
  const isAssistant = role === 'assistant';
  const combinedClassName = `flex gap-4 ${isAssistant ? '' : 'flex-row-reverse'} ${
    disabled || loading ? 'opacity-50' : ''
  } ${className}`.trim();

  const bubbleClasses = isAssistant
    ? 'bg-brandPrimary/5 text-textPrimary rounded-tr-xl rounded-br-xl rounded-bl-xl border border-brandPrimary/10'
    : 'bg-surfacePrimary text-textPrimary rounded-tl-xl rounded-bl-xl rounded-br-xl border border-textPrimary/10 shadow-sm';

  return (
    <div className={combinedClassName} {...props}>
      <div className="flex-shrink-0 mt-1">
        <Avatar
          alt={isAssistant ? 'AI Assistant' : 'User'}
          initials={avatarInitials || (isAssistant ? 'IA' : 'U')}
          {...(avatarSrc ? { src: avatarSrc } : {})}
          size="sm"
        />
      </div>
      <div className={`flex flex-col gap-2 max-w-[85%] sm:max-w-[75%]`}>
        <Text size="xs" weight={500} className={`text-textPrimary/60 ${isAssistant ? 'text-left' : 'text-right'}`}>
          {isAssistant ? 'TutorIA' : 'Tú'}
        </Text>
        <div className={`p-4 ${bubbleClasses}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
