import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Surface, Stack, Container, Inline, Spacer, Divider, Section, Page } from '../';

// Basic render tests to ensure foundations don't crash and generate semantic markup
describe('Foundations', () => {
  it('renders Surface without crashing', () => {
    const html = renderToString(<Surface>Content</Surface>);
    expect(html).toContain('Content');
    expect(html).toContain('bg-surfacePrimary');
  });

  it('renders Stack without crashing', () => {
    const html = renderToString(<Stack gap={4}>Content</Stack>);
    expect(html).toContain('Content');
    expect(html).toContain('flex flex-col gap-4');
  });

  it('renders Container without crashing', () => {
    const html = renderToString(<Container maxWidth="lg">Content</Container>);
    expect(html).toContain('Content');
    expect(html).toContain('max-w-screen-lg');
  });

  it('renders Inline without crashing', () => {
    const html = renderToString(<Inline>Content</Inline>);
    expect(html).toContain('Content');
    expect(html).toContain('flex flex-row flex-wrap');
  });

  it('renders Spacer without crashing', () => {
    const html = renderToString(<Spacer size={8} />);
    expect(html).toContain('h-8');
  });

  it('renders Divider without crashing', () => {
    const html = renderToString(<Divider orientation="horizontal" />);
    expect(html).toContain('<hr');
  });
  
  it('renders Section without crashing', () => {
    const html = renderToString(<Section header={<h1>Header</h1>}>Content</Section>);
    expect(html).toContain('<section');
    expect(html).toContain('Header');
  });
  
  it('renders Page without crashing', () => {
    const html = renderToString(<Page>Content</Page>);
    expect(html).toContain('min-h-screen');
  });
});
