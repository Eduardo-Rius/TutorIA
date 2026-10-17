import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AppShell } from '../AppShell';

describe('SR-MD-16 — AppShell AI Institutional Disclaimer', () => {
  const EXACT_DISCLAIMER_TEXT =
    'La IA puede cometer errores. Toda propuesta requiere revisión y validación del personal educativo responsable.';

  it('A. El aviso aparece exactamente una sola vez en el espacio de trabajo', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div data-testid="workspace-content">Contenido de Mi espacio</div>
        </AppShell>
      </MemoryRouter>
    );

    const disclaimers = screen.getAllByText(EXACT_DISCLAIMER_TEXT);
    expect(disclaimers).toHaveLength(1);
    expect(screen.getByTestId('ai-disclaimer-footer')).toBeDefined();
  });

  it('B. No aparece duplicado con múltiples hijos o componentes anidados', () => {
    render(
      <MemoryRouter>
        <AppShell
          topbar={<div data-testid="topbar">Barra superior</div>}
          sidebar={<div data-testid="custom-sidebar">Sidebar</div>}
        >
          <div>Sección 1</div>
          <div>Sección 2</div>
          <div>Sección 3</div>
        </AppShell>
      </MemoryRouter>
    );

    const disclaimers = screen.getAllByText(EXACT_DISCLAIMER_TEXT);
    expect(disclaimers).toHaveLength(1);
  });

  it('C. Oculto durante la impresión (incluye clase print:hidden)', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Contenido</div>
        </AppShell>
      </MemoryRouter>
    );

    const footer = screen.getByTestId('ai-disclaimer-footer');
    expect(footer.className).toContain('print:hidden');
  });

  it('D. No usa position: fixed y no obstruye controles de acción', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <button data-testid="action-btn">Crear Planeación</button>
        </AppShell>
      </MemoryRouter>
    );

    const footer = screen.getByTestId('ai-disclaimer-footer');
    expect(footer.className).not.toContain('fixed');
    expect(footer.className).toContain('w-full');
    expect(footer.className).toContain('text-center');
    expect(footer.className).toContain('mt-auto');

    // Botón de acción accesible y clickeable
    const btn = screen.getByTestId('action-btn');
    expect(btn).toBeDefined();
  });

  it('E. Presenta tipografía discreta y contraste adecuado', () => {
    render(
      <MemoryRouter>
        <AppShell>
          <div>Contenido</div>
        </AppShell>
      </MemoryRouter>
    );

    const paragraph = screen.getByText(EXACT_DISCLAIMER_TEXT);
    expect(paragraph.className).toContain('text-gray-500');
    expect(paragraph.className).toContain('text-[11px]');
  });
});
