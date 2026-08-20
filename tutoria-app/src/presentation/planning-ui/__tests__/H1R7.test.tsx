import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';

describe('H1R7: INDIRECT OFFICIAL IMSS FORM IMPLEMENTATION', () => {
  let repository: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;

  beforeEach(() => {
    repository = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repository);
  });

  it('Renders the authoritative INDIRECT form when LAB modality is set to INDIRECT', async () => {
    const plan = WeeklyPlanning.create('plan-indirect', 'dc-1', 'rm-1', 't1', '2026-08-10', '2026-08-14');
    plan.editPedagogicalContent('Observaciones para INDIRECT', 'needs', 'sit', 'mat', ['ref1'], [
        { dayOfWeek: 'MONDAY', date: '2026-08-10', activities: [{ activityId: 'act1', category: 'C', objective: 'Obj INDIRECT MONDAY', description: 'Desc INDIRECT', durationMinutes: 30, materials: ['Mat Indirect'], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'TUESDAY', date: '2026-08-11', activities: [], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'WEDNESDAY', date: '2026-08-12', activities: [], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'THURSDAY', date: '2026-08-13', activities: [], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
        { dayOfWeek: 'FRIDAY', date: '2026-08-14', activities: [], complementaryActivities: [], materials: [], executionNotes: '', evaluation: '' },
    ] as any);
    plan.submit();
    await repository.save(plan);

    // Render App
    render(<PlanningDemoApp service={service} source={new DeterministicPedagogicalRecommendationSource()} />);

    // Set LAB Modality to INDIRECT
    const modalitySelect = screen.getByRole('combobox');
    fireEvent.change(modalitySelect, { target: { value: 'INDIRECT' } });

    // Login as Director and Approve
    fireEvent.click(screen.getByText('Ceci (Directora)'));
    await waitFor(() => expect(screen.getByText('Lista para conversar')).toBeTruthy());
    fireEvent.click(screen.getByText('Lista para conversar'));

    await waitFor(() => expect(screen.getByText('✓ APROBAR TODA LA PLANEACIÓN')).toBeTruthy());
    fireEvent.click(screen.getByText('✓ APROBAR TODA LA PLANEACIÓN'));

    // Verify Director can open the official version
    await waitFor(() => expect(screen.getByText('Versión Oficial IMSS')).toBeTruthy());
    fireEvent.click(screen.getByText('Versión Oficial IMSS'));

    // Assert INDIRECT properties
    await waitFor(() => {
      // A. INDIRECT title = Planeación de Acciones Pedagógicas
      expect(screen.queryAllByText(/Planeación de Acciones Pedagógicas/i).length).toBeGreaterThan(0);
      // B. INDIRECT code = DPES/CG/2020/PDG/04
      expect(screen.queryAllByText(/DPES\/CG\/2020\/PDG\/04/i).length).toBeGreaterThan(0);
      // C. All 8 static curricular references render.
      expect(screen.queryAllByText(/Establecer vínculos afectivos y apegos seguros/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/Construir una base de seguridad y confianza en sí mismo/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/Desarrollar autonomía y autorregulación crecientes/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/Desarrollar la curiosidad, la exploración, la imaginación y la creatividad/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/Acceder al lenguaje en un sentido pleno, comunicacional y creador/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/Descubrir en los libros y la lectura el gozo y la riqueza de la ficción/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/Descubrir el propio cuerpo desde la libertad de movimiento y la expresividad motriz/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/Convivir con otros y compartir el aprendizaje, el juego, el arte y la cultura/i).length).toBeGreaterThan(0);

      // D. "No implementado" does NOT appear
      expect(screen.queryByText(/No implementado en esta versión demo/i)).toBeNull();

      // E. INDIRECT Guardería/Sala/Periodo render
      expect(screen.queryAllByText("Guardería IMSS Demo (001)").length).toBeGreaterThan(0);

      // F. INDIRECT Observaciones render
      expect(screen.queryAllByText("Observaciones para INDIRECT").length).toBeGreaterThan(0);

      // G. Five-day planning area renders Monday-Friday
      expect(screen.queryAllByText(/Lunes/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/Obj INDIRECT MONDAY/i).length).toBeGreaterThan(0);

      // H. INDIRECT Materials label is correct
      expect(screen.queryAllByText(/Materiales para ambientes de aprendizaje/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/Mat Indirect/i).length).toBeGreaterThan(0);

      // I. Evaluation official section renders
      expect(screen.queryAllByText(/Evaluación:/i).length).toBeGreaterThan(0);

      // J. Actividades complementarias official section renders
      expect(screen.queryAllByText(/Actividades complementarias de otros programas/i).length).toBeGreaterThan(0);

      // K, L. INDIRECT signature roles render
      expect(screen.queryAllByText(/Educadora\/Coordinadora del área para apoyo terapéutico/i).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/Asistente educativa/i).length).toBeGreaterThan(0);

      // M. Oficial de Puericultura does NOT render in INDIRECT
      expect(screen.queryByText(/Oficial de Puericultura/i)).toBeNull();

      // N. DIRECT dynamic curricular structure does NOT leak
      expect(screen.queryByText(/Programa Sintético de la Fase 1/i)).toBeNull();
      expect(screen.queryByText(/Práctica\(s\) Priorizada\(s\)/i)).toBeNull();

      // O, P. Printable root exists, Anverso and Reverso sections exist
      const root = document.getElementById('printable-document-root');
      expect(root).toBeTruthy();
      expect(screen.queryAllByText(/\(Anverso\)/).length).toBeGreaterThan(0);
      expect(screen.queryAllByText(/\(Reverso\)/).length).toBeGreaterThan(0);
    });

    // Test Supervisor Access
    fireEvent.click(screen.getByText('← Volver'));
    await waitFor(() => expect(screen.getByText('← Volver al listado')).toBeTruthy());
    fireEvent.click(screen.getByText('← Volver al listado'));

    // Switch role to Supervisor
    fireEvent.click(screen.getByText('Tere (Supervisora)'));
    await waitFor(() => expect(screen.getByText('Planeación aprobada')).toBeTruthy());
    fireEvent.click(screen.getByText('Planeación aprobada'));
    await waitFor(() => expect(screen.getByText('VER VERSIÓN OFICIAL IMSS')).toBeTruthy());

    // S. Supervisor remains read-only (no approve/reject buttons)
    expect(screen.queryByText('✓ APROBAR TODA LA PLANEACIÓN')).toBeNull();
    expect(screen.queryByText('ENVIAR A CORRECCIÓN')).toBeNull();

    // R. Supervisor can open approved INDIRECT official version
    fireEvent.click(screen.getByText('VER VERSIÓN OFICIAL IMSS'));

    await waitFor(() => {
       expect(screen.queryAllByText(/Planeación de Acciones Pedagógicas/i).length).toBeGreaterThan(0);
       expect(screen.queryAllByText(/DPES\/CG\/2020\/PDG\/04/i).length).toBeGreaterThan(0);
    });
  });

  it('Ensures DIRECT Title/Code/Behavior remain unchanged', async () => {
     const plan = WeeklyPlanning.create('plan-direct', 'dc-1', 'rm-1', 't1', '2026-08-10', '2026-08-14');
     plan.editPedagogicalContent('Observaciones para DIRECT', 'needs', 'sit', 'mat', ['ref1'], [{ dayOfWeek: "MONDAY", date: "2026-08-10", activities: [{ activityId: "act1", category: "C", objective: "Obj DIRECT MONDAY", description: "Desc DIRECT", durationMinutes: 30, materials: ["Mat Direct"], curricularTraceability: [] }], complementaryActivities: [], materials: [], executionNotes: "", evaluation: "" }, { dayOfWeek: "TUESDAY", date: "2026-08-11", activities: [], complementaryActivities: [], materials: [], executionNotes: "", evaluation: "" }, { dayOfWeek: "WEDNESDAY", date: "2026-08-12", activities: [], complementaryActivities: [], materials: [], executionNotes: "", evaluation: "" }, { dayOfWeek: "THURSDAY", date: "2026-08-13", activities: [], complementaryActivities: [], materials: [], executionNotes: "", evaluation: "" }, { dayOfWeek: "FRIDAY", date: "2026-08-14", activities: [], complementaryActivities: [], materials: [], executionNotes: "", evaluation: "" }] as any);
     plan.submit();
     await repository.save(plan);

     render(<PlanningDemoApp service={service} source={new DeterministicPedagogicalRecommendationSource()} />);

     // By default Modality is DIRECT
     fireEvent.click(screen.getByText('Ceci (Directora)'));
     await waitFor(() => expect(screen.getByText('Lista para conversar')).toBeTruthy());
     fireEvent.click(screen.getByText('Lista para conversar'));

     await waitFor(() => expect(screen.getByText('✓ APROBAR TODA LA PLANEACIÓN')).toBeTruthy());
     fireEvent.click(screen.getByText('✓ APROBAR TODA LA PLANEACIÓN'));

     await waitFor(() => expect(screen.getByText('Versión Oficial IMSS')).toBeTruthy());
     fireEvent.click(screen.getByText('Versión Oficial IMSS'));

     await waitFor(() => {
       // T. DIRECT title/code remain unchanged
       expect(screen.queryAllByText(/Planeación de Actividades Pedagógicas/i).length).toBeGreaterThan(0);
       expect(screen.queryAllByText(/3D11-009-003/i).length).toBeGreaterThan(0);

       // Verify DIRECT specific elements
       expect(screen.queryAllByText(/Programa Sintético de la Fase 1 para educación inicial/i).length).toBeGreaterThan(0);
       expect(screen.queryAllByText(/Práctica\(s\) Priorizada\(s\) a implementar/i).length).toBeGreaterThan(0);

       // Verify INDIRECT specific elements do NOT leak into DIRECT
       expect(screen.queryByText(/Aprendizajes clave para niños de 0 a 3 años de edad/i)).toBeNull();
       expect(screen.queryByText(/Asistente educativa/i)).toBeNull();
     });
  });
});
