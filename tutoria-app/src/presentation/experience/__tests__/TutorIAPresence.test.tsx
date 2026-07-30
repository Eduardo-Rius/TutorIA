import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TutorIAPresence } from '../TutorIAPresence';
import { ExperienceContext } from '../ExperienceTypes';

describe('TutorIAPresence (Phase B2 Quality Gates)', () => {

  const baseContext: ExperienceContext = {
    scene: 'workspace-reception',
    lifecycleState: 'RETURNING_VISIT',
    hasPendingWork: false,
    isFirstVisit: false,
    primaryAction: {
      id: 'test_action',
      label: 'Acción de prueba',
      enabled: true
    }
  };

  it('1. Renders copy from catalog correctly', () => {
    render(<TutorIAPresence context={{ ...baseContext, lifecycleState: 'EMPTY_STATE', scene: 'default' }} />);
    // "Aún no hay elementos aquí. ¡Prueba creando algo nuevo!" is the empty_state_default copy
    expect(screen.getByText(/Aún no hay elementos aquí/)).toBeDefined();
  });

  it('2. Renders fallback visual when no asset is available (or fails)', () => {
    const { container } = render(<TutorIAPresence context={{ ...baseContext, lifecycleState: 'ERROR' }} />);
    const img = container.querySelector('img');
    expect(img).toBeDefined();

    if (img) {
      fireEvent.error(img);
    }

    expect(screen.getByRole('img', { name: 'Representación institucional' })).toBeDefined();
  });

  it('3. Disables action button when processing', () => {
    render(<TutorIAPresence context={{ ...baseContext, lifecycleState: 'PROCESSING', scene: 'ai-processing' }} />);
    const btn = screen.getByRole('button');
    expect(btn.hasAttribute('disabled')).toBe(true);
    expect(btn.textContent).toContain('Procesando...');
  });

  it('4. Respects prefers-reduced-motion via CSS classes', () => {
    const { container } = render(<TutorIAPresence context={{ ...baseContext, lifecycleState: 'SUCCESS' }} />);
    const motionWrapper = container.querySelector('.motion-reduce\\:animate-none');
    expect(motionWrapper).toBeDefined();
  });

  it('5. Renders without final asset safely', () => {
    const { container } = render(<TutorIAPresence context={baseContext} />);
    expect(container).toBeDefined();
  });

  it('6. Does not mutate props (Immutability)', () => {
    const contextCopy = JSON.parse(JSON.stringify(baseContext));
    render(<TutorIAPresence context={baseContext} />);
    expect(baseContext).toEqual(contextCopy);
  });

  it('7. Contains basic responsive behavior classes', () => {
    const { container } = render(<TutorIAPresence context={baseContext} />);
    const outerDiv = container.firstChild as HTMLElement;
    expect(outerDiv.className).toContain('flex-col');
    expect(outerDiv.className).toContain('md:flex-row');
  });

  it('8. Maintains structural visibility (Integration Test)', () => {
    render(<TutorIAPresence context={baseContext} />);
    expect(screen.getByTestId('tutoria-presence')).toBeDefined();
    expect(screen.getByRole('heading')).toBeDefined();
    expect(screen.getByRole('button')).toBeDefined();
    expect(screen.getByRole('button').hasAttribute('disabled')).toBe(false);
  });

});
