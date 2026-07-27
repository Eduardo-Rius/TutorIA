import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { Button, Text, Heading, Icon, Badge, Avatar, Card } from '../';

describe('Primitives', () => {
  it('renders Button without crashing and applies variants', () => {
    const html = renderToString(<Button variant="primary">Click Me</Button>);
    expect(html).toContain('Click Me');
    expect(html).toContain('bg-brandPrimary');
  });

  it('renders Button loading state correctly', () => {
    const html = renderToString(<Button loading>Click Me</Button>);
    expect(html).toContain('disabled');
    expect(html).toContain('animate-spin');
  });

  it('renders Text without crashing', () => {
    const html = renderToString(<Text as="span" size="sm">Hello</Text>);
    expect(html).toContain('<span');
    expect(html).toContain('text-sm');
  });

  it('renders Heading without crashing', () => {
    const html = renderToString(<Heading as="h1" size="2xl">Title</Heading>);
    expect(html).toContain('<h1');
    expect(html).toContain('text-2xl');
  });

  it('renders Icon without crashing', () => {
    const html = renderToString(<Icon label="Star" />);
    expect(html).toContain('aria-label="Star"');
    expect(html).toContain('role="img"');
  });

  it('renders Badge without crashing', () => {
    const html = renderToString(<Badge label="New" variant="primary" />);
    expect(html).toContain('New');
    expect(html).toContain('bg-brandPrimary');
  });

  it('renders Avatar without crashing', () => {
    const html = renderToString(<Avatar alt="User" initials="U" />);
    expect(html).toContain('aria-label="User"');
    expect(html).toContain('U');
  });

  it('renders Card without crashing', () => {
    const html = renderToString(<Card>Content</Card>);
    expect(html).toContain('Content');
    // Interactive removed
  });
});
