import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { WeeklyPlanningAILoadingProgress } from '../WeeklyPlanningAILoadingProgress';

describe('SR-MD-28N — WeeklyPlanningAILoadingProgress Component', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  // Requerimiento 1 & 2: Reutilizar estado de carga y barra con porcentaje estimado
  it('1. renders progressbar with initial estimated percentage and accessibility attributes', () => {
    act(() => {
      render(
        <WeeklyPlanningAILoadingProgress
          isGenerating={true}
          roomName="Maternal A"
        />
      );
    });

    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toBeDefined();
    expect(progressBar.getAttribute('aria-valuemin')).toBe('0');
    expect(progressBar.getAttribute('aria-valuemax')).toBe('100');
    expect(progressBar.getAttribute('aria-valuenow')).toBe('5');
    expect(screen.getByTestId('ai-progress-percentage').textContent).toBe('5%');
    expect(screen.getByText(/Maternal A/i)).toBeDefined();
  });

  // Requerimiento 3: Avance gradual y no lineal con tope < 95% mientras siga pendiente
  it('2. advances smoothly and non-linearly over time, strictly capped below 95% while pending', () => {
    act(() => {
      render(
        <WeeklyPlanningAILoadingProgress
          isGenerating={true}
          roomName="Lactantes B"
        />
      );
    });

    // Initial state
    expect(parseInt(screen.getByTestId('ai-progress-percentage').textContent || '0', 10)).toBe(5);

    // After 2.5 seconds (initial rapid phase: 0-3s up to ~28%)
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    const pct2s = parseInt(screen.getByTestId('ai-progress-percentage').textContent || '0', 10);
    expect(pct2s).toBeGreaterThanOrEqual(15);
    expect(pct2s).toBeLessThanOrEqual(30);

    // After 8 seconds (intermediate phase: 3-10s up to ~62%)
    act(() => {
      vi.advanceTimersByTime(5500); // total 8000ms
    });
    const pct8s = parseInt(screen.getByTestId('ai-progress-percentage').textContent || '0', 10);
    expect(pct8s).toBeGreaterThanOrEqual(45);
    expect(pct8s).toBeLessThanOrEqual(60);

    // After 18 seconds (deceleration phase: 10-22s up to ~85%)
    act(() => {
      vi.advanceTimersByTime(10000); // total 18000ms
    });
    const pct18s = parseInt(screen.getByTestId('ai-progress-percentage').textContent || '0', 10);
    expect(pct18s).toBeGreaterThanOrEqual(70);
    expect(pct18s).toBeLessThanOrEqual(85);

    // After 45 seconds (asymptotic crawl phase)
    act(() => {
      vi.advanceTimersByTime(27000); // total 45000ms
    });
    const pct45s = parseInt(screen.getByTestId('ai-progress-percentage').textContent || '0', 10);
    expect(pct45s).toBeGreaterThanOrEqual(85);
    expect(pct45s).toBeLessThanOrEqual(94); // strictly below 95%

    // After 120 seconds (long delayed backend response)
    act(() => {
      vi.advanceTimersByTime(75000); // total 120000ms
    });
    const pct120s = parseInt(screen.getByTestId('ai-progress-percentage').textContent || '0', 10);
    expect(pct120s).toBeLessThanOrEqual(94); // strictly capped <= 94%
    expect(pct120s).toBeLessThan(95);
  });

  // Requerimiento 4: Mensajes breves y comprensibles por fases
  it('3. transitions through contextual pedagogical messages during generation', () => {
    act(() => {
      render(
        <WeeklyPlanningAILoadingProgress
          isGenerating={true}
          roomName="Lactantes C"
        />
      );
    });

    // Initial message
    expect(screen.getByText(/Preparando propuesta semanal…/i)).toBeDefined();

    // Advance to 2.5s (percent ~23%, >= 15%)
    act(() => {
      vi.advanceTimersByTime(2500);
    });
    expect(screen.getByText(/TutorIA está preparando tu semana para Lactantes C/i)).toBeDefined();

    // Advance to 7s (percent ~47%, >= 40%)
    act(() => {
      vi.advanceTimersByTime(4500);
    });
    expect(screen.getByText(/Organizando experiencias pedagógicas y rutinas/i)).toBeDefined();

    // Advance to 15s (percent ~71%, >= 70%)
    act(() => {
      vi.advanceTimersByTime(8000);
    });
    expect(screen.getByText(/Preparando tu propuesta para revisión/i)).toBeDefined();
  });

  // Requerimiento 5: Si la respuesta tarda, mantener animación visible y mensaje de espera
  it('4. displays reassurance note and active living indicator when generation takes over 20 seconds', () => {
    act(() => {
      render(
        <WeeklyPlanningAILoadingProgress
          isGenerating={true}
          roomName="Maternal A"
        />
      );
    });

    // Initially reassurance note is not shown
    expect(screen.queryByText(/El modelo está generando 25 actividades con progresión semanal completa/i)).toBeNull();

    // Advance past 22 seconds
    act(() => {
      vi.advanceTimersByTime(24000);
    });

    // Reassurance note is now visible
    expect(screen.getByText(/El modelo está generando 25 actividades con progresión semanal completa/i)).toBeDefined();
    expect(screen.getByText(/Asegurando la calidad pedagógica y materiales… un momento por favor/i)).toBeDefined();
    expect(screen.getByText('activo')).toBeDefined();
  });

  // Requerimiento 6: Al recibir respuesta exitosa, completar al 100 %
  it('5. completes to 100% when isCompleted is true', () => {
    let rerenderFn: any;
    act(() => {
      const { rerender } = render(
        <WeeklyPlanningAILoadingProgress
          isGenerating={true}
          roomName="Lactantes A"
        />
      );
      rerenderFn = rerender;
    });

    // Simulating completion
    act(() => {
      rerenderFn(
        <WeeklyPlanningAILoadingProgress
          isGenerating={false}
          isCompleted={true}
          roomName="Lactantes A"
        />
      );
    });

    expect(screen.getByTestId('ai-progress-percentage').textContent).toBe('100%');
    expect(screen.getByText(/¡Propuesta lista! Abriendo revisión…/i)).toBeDefined();
    const bar = screen.getByTestId('ai-progress-bar-fill');
    expect(bar.style.width).toBe('100%');
  });

  // Requerimiento 7: Si ocurre un error, detener animación, retirar porcentaje y mostrar error con reintento
  it('6. stops animation, removes progress bar, displays error and executes onRetry on click', () => {
    const onRetryMock = vi.fn();
    let rerenderFn: any;

    act(() => {
      const { rerender } = render(
        <WeeklyPlanningAILoadingProgress
          isGenerating={true}
          roomName="Maternal A"
        />
      );
      rerenderFn = rerender;
    });

    // Transition into error state
    act(() => {
      rerenderFn(
        <WeeklyPlanningAILoadingProgress
          isGenerating={false}
          error="OpenAI timeout: la solicitud tardó más del límite."
          onRetry={onRetryMock}
          roomName="Maternal A"
        />
      );
    });

    // Progress bar must be gone
    expect(screen.queryByRole('progressbar')).toBeNull();
    expect(screen.queryByTestId('ai-progress-percentage')).toBeNull();

    // Error alert is displayed
    const alertBox = screen.getByRole('alert');
    expect(alertBox).toBeDefined();
    expect(screen.getByText(/No se pudo completar la generación con IA/i)).toBeDefined();
    expect(screen.getByText(/OpenAI timeout: la solicitud tardó más del límite/i)).toBeDefined();

    // Retry button is available and callable
    const retryBtn = screen.getByRole('button', { name: /Reintentar generación/i });
    expect(retryBtn).toBeDefined();

    act(() => {
      fireEvent.click(retryBtn);
    });
    expect(onRetryMock).toHaveBeenCalledTimes(1);
  });

  // Requerimiento 8: Limpiar correctamente los recursos de animación al desmontar
  it('7. clears interval timer cleanly on unmount to prevent leaks', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    let unmountFn: any;
    act(() => {
      const { unmount } = render(
        <WeeklyPlanningAILoadingProgress
          isGenerating={true}
          roomName="Lactantes B"
        />
      );
      unmountFn = unmount;
    });

    act(() => {
      unmountFn();
    });

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  // Requerimiento 9: Reutilizable para todas las salas (Lactantes A, B, C, Maternal A y futuras)
  it('8. renders correctly for all daycare rooms (Lactantes A, B, C, Maternal A, Maternal B)', () => {
    const rooms = ['Lactantes A', 'Lactantes B', 'Lactantes C', 'Maternal A', 'Maternal B'];

    rooms.forEach((room) => {
      let unmountFn: any;
      act(() => {
        const { unmount } = render(
          <WeeklyPlanningAILoadingProgress
            isGenerating={true}
            roomName={room}
          />
        );
        unmountFn = unmount;
      });

      expect(screen.getByText(new RegExp(`TutorIA • ${room}`, 'i'))).toBeDefined();
      act(() => {
        unmountFn();
      });
    });
  });

  // Requerimiento 10: Accesibilidad y paleta visual sage green
  it('9. complies with accessibility requirements (ARIA roles, live region, polite status)', () => {
    act(() => {
      render(
        <WeeklyPlanningAILoadingProgress
          isGenerating={true}
          roomName="Maternal A"
        />
      );
    });

    const liveStatus = screen.getByRole('status');
    expect(liveStatus).toBeDefined();
    expect(liveStatus.getAttribute('aria-live')).toBe('polite');

    const progressbar = screen.getByRole('progressbar');
    expect(progressbar.getAttribute('aria-label')).toBe('Progreso estimado de generación de planeación');
  });

  // Comportamiento pasivo: no genera output visual si no hay generación ni error
  it('10. renders nothing when isGenerating is false, no error, and not completed', () => {
    let containerEl: HTMLElement;
    act(() => {
      const { container } = render(
        <WeeklyPlanningAILoadingProgress
          isGenerating={false}
          roomName="Maternal A"
        />
      );
      containerEl = container;
    });

    expect(containerEl!.firstChild).toBeNull();
  });
});
