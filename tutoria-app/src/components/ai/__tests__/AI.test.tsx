import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { 
  AssistantPanel,
  SuggestionCard,
  ChatMessage,
  TypingIndicator,
  EmptyConversation,
  AIResponse,
  PromptBox,
  PromptSuggestions,
  ReasoningCard,
  AIThinking,
  ConfidenceBadge,
  SourceBadge
} from '../';

describe('AI Experience System', () => {
  it('renders AssistantPanel without crashing', () => {
    const html = renderToString(
      <AssistantPanel title="TutorIA Assistant" subtitle="Ready to help">
        <p>Panel Content</p>
      </AssistantPanel>
    );
    expect(html).toContain('TutorIA Assistant');
    expect(html).toContain('Ready to help');
    expect(html).toContain('Panel Content');
  });

  it('renders SuggestionCard without crashing', () => {
    const html = renderToString(
      <SuggestionCard title="Analyze" description="Analyze the current document" />
    );
    expect(html).toContain('Analyze');
    expect(html).toContain('Analyze the current document');
  });

  it('renders ChatMessage for assistant and user', () => {
    const assistantHtml = renderToString(<ChatMessage role="assistant">Hello User</ChatMessage>);
    expect(assistantHtml).toContain('Hello User');
    expect(assistantHtml).toContain('TutorIA');
    
    const userHtml = renderToString(<ChatMessage role="user">Hi AI</ChatMessage>);
    expect(userHtml).toContain('Hi AI');
    expect(userHtml).toContain('Tú');
  });

  it('renders TypingIndicator', () => {
    const html = renderToString(<TypingIndicator text="Pensando..." />);
    expect(html).toContain('Pensando...');
    expect(html).toContain('aria-live="polite"');
  });

  it('renders EmptyConversation', () => {
    const html = renderToString(
      <EmptyConversation title="Start Chat" description="Say something" />
    );
    expect(html).toContain('Start Chat');
    expect(html).toContain('Say something');
  });

  it('renders AIResponse', () => {
    const html = renderToString(
      <AIResponse timestampSlot={<span>10:00 AM</span>}>
        <p>This is the answer</p>
      </AIResponse>
    );
    expect(html).toContain('This is the answer');
    expect(html).toContain('10:00 AM');
  });

  it('renders PromptBox', () => {
    const html = renderToString(<PromptBox placeholder="Type here" />);
    expect(html).toContain('placeholder="Type here"');
    expect(html).toContain('type="submit"');
  });

  it('renders PromptSuggestions', () => {
    const html = renderToString(
      <PromptSuggestions items={[{ id: '1', label: 'Suggestion 1' }]} />
    );
    expect(html).toContain('Suggestion 1');
  });

  it('renders ReasoningCard', () => {
    const html = renderToString(
      <ReasoningCard title="Explanation">
        Because of X
      </ReasoningCard>
    );
    expect(html).toContain('Explanation');
    expect(html).toContain('Because of X');
  });

  it('renders AIThinking', () => {
    const html = renderToString(<AIThinking status="Loading..." />);
    expect(html).toContain('Loading...');
  });

  it('renders ConfidenceBadge without semantic colors', () => {
    const html = renderToString(<ConfidenceBadge level="high" />);
    expect(html).toContain('Alta');
    expect(html).not.toContain('bg-green-');
    expect(html).not.toContain('bg-red-');
  });

  it('renders SourceBadge', () => {
    const html = renderToString(<SourceBadge name="Document.pdf" type="PDF" />);
    expect(html).toContain('Document.pdf');
    expect(html).toContain('PDF');
  });
});
