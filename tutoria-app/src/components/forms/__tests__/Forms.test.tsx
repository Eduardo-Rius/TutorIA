import React from 'react';
import { describe, it, expect } from 'vitest';
import { renderToString } from 'react-dom/server';
import { 
  Field, 
  FieldGroup, 
  Label, 
  Input, 
  Textarea, 
  Select, 
  Checkbox, 
  Radio, 
  Switch, 
  FieldHint, 
  FieldError 
} from '../';

describe('Forms Foundation', () => {
  it('renders Field and semantic structure without crashing', () => {
    const html = renderToString(
      <Field>
        <Label htmlFor="test-input" required>Email</Label>
        <Input id="test-input" type="email" aria-describedby="test-hint test-error" />
        <FieldHint id="test-hint">We will never share your email.</FieldHint>
        <FieldError id="test-error">Invalid email</FieldError>
      </Field>
    );
    expect(html).toContain('Email');
    expect(html).toContain('*');
    expect(html).toContain('type="email"');
    expect(html).toContain('aria-describedby="test-hint test-error"');
    expect(html).toContain('We will never share your email.');
    expect(html).toContain('Invalid email');
    expect(html).toContain('role="alert"'); // from FieldError
  });

  it('renders FieldGroup without crashing', () => {
    const html = renderToString(
      <FieldGroup legend="Preferences">
        <Checkbox name="pref" value="1" />
      </FieldGroup>
    );
    expect(html).toContain('<fieldset');
    expect(html).toContain('<legend');
    expect(html).toContain('Preferences');
    expect(html).toContain('type="checkbox"');
  });

  it('renders Input variants securely', () => {
    const html = renderToString(<Input type="password" invalid={true} />);
    expect(html).toContain('type="password"');
    expect(html).toContain('aria-invalid="true"');
  });

  it('renders Textarea without crashing', () => {
    const html = renderToString(<Textarea invalid={false} rows={3} />);
    expect(html).toContain('<textarea');
    expect(html).toContain('rows="3"');
    expect(html).toContain('aria-invalid="false"');
  });

  it('renders Select without crashing', () => {
    const html = renderToString(
      <Select>
        <option value="1">One</option>
      </Select>
    );
    expect(html).toContain('<select');
    expect(html).toContain('One');
  });

  it('renders Radio without crashing', () => {
    const html = renderToString(<Radio name="test" value="on" />);
    expect(html).toContain('type="radio"');
    expect(html).toContain('value="on"');
  });

  it('renders Switch as an accessible SR-only checkbox pattern', () => {
    const html = renderToString(<Switch checked={true} aria-label="Toggle setting" />);
    expect(html).toContain('type="checkbox"');
    expect(html).toContain('role="switch"');
    expect(html).toContain('sr-only');
    expect(html).toContain('checked');
    expect(html).toContain('aria-checked="true"');
  });
});
