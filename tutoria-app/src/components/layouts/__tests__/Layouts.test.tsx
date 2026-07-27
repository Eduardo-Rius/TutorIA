import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { 
  AppShell, 
  Sidebar, 
  TopBar, 
  PageHeader, 
  Breadcrumb, 
  ContentArea, 
  Panel, 
  EmptyState, 
  LoadingState, 
  ErrorState 
} from '../';

describe('Layout System', () => {
  it('renders AppShell without crashing', () => {
    const html = renderToString(
      <AppShell sidebar={<div>Side</div>} topbar={<div>Top</div>}>
        Main Content
      </AppShell>
    );
    expect(html).toContain('Main Content');
    expect(html).toContain('Side');
    expect(html).toContain('Top');
    expect(html).toContain('<main');
  });

  it('renders Sidebar without crashing', () => {
    const items = [
      { id: '1', label: 'Home', href: '/home', active: true },
      { id: '2', label: 'Settings', href: '/settings' }
    ];
    const html = renderToString(<Sidebar items={items} />);
    expect(html).toContain('<aside');
    expect(html).toContain('Home');
    expect(html).toContain('Settings');
    expect(html).toContain('aria-current="page"'); // From active state
  });

  it('renders TopBar without crashing', () => {
    const html = renderToString(<TopBar centerSlot="Search here" />);
    expect(html).toContain('<header');
    expect(html).toContain('Search here');
  });

  it('renders PageHeader without crashing', () => {
    const html = renderToString(<PageHeader title="Dashboard" subtitle="Welcome" />);
    expect(html).toContain('<header');
    expect(html).toContain('Dashboard');
    expect(html).toContain('Welcome');
  });

  it('renders Breadcrumb without crashing', () => {
    const items = [
      { id: '1', label: 'Home', href: '/' },
      { id: '2', label: 'Settings' }
    ];
    const html = renderToString(<Breadcrumb items={items} />);
    expect(html).toContain('<nav');
    expect(html).toContain('aria-label="Breadcrumb"');
    expect(html).toContain('Home');
    expect(html).toContain('Settings');
    expect(html).toContain('aria-current="page"');
  });

  it('renders ContentArea without crashing', () => {
    const html = renderToString(<ContentArea maxWidth="xl">Content</ContentArea>);
    expect(html).toContain('Content');
    expect(html).toContain('max-w-screen-xl');
  });

  it('renders Panel without crashing', () => {
    const html = renderToString(<Panel>Panel Content</Panel>);
    expect(html).toContain('<section');
    expect(html).toContain('Panel Content');
  });

  it('renders EmptyState without crashing', () => {
    const html = renderToString(<EmptyState title="No items" description="Check back later" />);
    expect(html).toContain('No items');
    expect(html).toContain('Check back later');
  });

  it('renders LoadingState without crashing', () => {
    const html = renderToString(<LoadingState text="Please wait..." />);
    expect(html).toContain('Please wait...');
    expect(html).toContain('aria-live="polite"');
    expect(html).toContain('aria-busy="true"');
  });

  it('renders ErrorState without crashing', () => {
    const html = renderToString(<ErrorState title="Something went wrong" />);
    expect(html).toContain('Something went wrong');
    expect(html).toContain('role="alert"');
  });
});
