import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { PlanningDay, WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';

function create5Days(roomId: string): PlanningDay[] {
  return ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((dayOfWeek, idx) => ({
    date: `2026-08-${24 + idx}`,
    dayOfWeek: dayOfWeek as PlanningDay['dayOfWeek'],
    teacherReviewed: true,
    teacherReviewedBy: 't1',
    teacherReviewedAt: new Date('2026-08-23T10:00:00Z'),
    activities: [
      {
        activityId: `act-${roomId}-${dayOfWeek}-1`,
        category: 'Juego y movimiento',
        objective: `Objetivo sensorial ${dayOfWeek} ${roomId}`,
        description: `Actividad sensorial para ${roomId} en día ${dayOfWeek}`,
        materials: ['Tapete suave', 'Caja de sorpresas'],
        durationMinutes: 20,
        curricularTraceability: [],
      },
    ],
    complementaryActivities: [],
    materials: ['Tapete suave', 'Caja de sorpresas'],
  }));
}

describe('SR-MD-21 Phase 2: Persistencia Institucional de Observaciones (Lactantes A y B)', () => {
  let repo: InMemoryWeeklyPlanningRepository;
  let service: PlanningWorkflowService;

  beforeEach(() => {
    repo = new InMemoryWeeklyPlanningRepository();
    service = new PlanningWorkflowService(repo);
    vi.clearAllMocks();
  });

  const testRooms = [
    { roomId: 'room-lactantes-a', roomName: 'Lactantes A', planId: 'plan-lactantes-a-2026-08-24' },
    { roomId: 'room-lactantes-b', roomName: 'Lactantes B', planId: 'plan-lactantes-b-2026-08-24' },
  ];

  testRooms.forEach(({ roomId, roomName, planId }) => {
    describe(`Circuito Institucional Completo en ${roomName} (${roomId})`, () => {
      beforeEach(async () => {
        // Setup initial submitted planning in IN_REVIEW
        await service.createPlanning(
          planId,
          'daycare-1',
          roomId,
          't1',
          '2026-08-24',
          '2026-08-28',
          'TEACHER'
        );

        const days = create5Days(roomId);
        await service.saveDraft(
          planId,
          `Observaciones iniciales de ${roomName}`,
          `Necesidades de ${roomName}`,
          'Ninguna',
          'Materiales estándar',
          [],
          days,
          'TEACHER'
        );

        await service.submit(planId, 'TEACHER');
      });

      it('1. Escribir observación sin guardar y recargar: no persiste en el repositorio institucional', async () => {
        // Unsaved draft in UI state is NOT saved to repository
        const drafts = await service.listDirectorDraftObservations(planId, 'Ceci', 'DIRECTOR');
        expect(drafts).toHaveLength(0);
      });

      it('2. Guardar observación y recargar: se recupera íntegramente de la persistencia institucional', async () => {
        const activityId = `act-${roomId}-MONDAY-1`;
        const obsText = `Revisar textura y tiempo de juego en ${roomName}`;

        await service.saveDirectorDraftObservation(
          planId,
          activityId,
          obsText,
          'Ceci',
          'DIRECTOR',
          'MONDAY'
        );

        // Simulate reload: fetch from repository
        const drafts = await service.listDirectorDraftObservations(planId, 'Ceci', 'DIRECTOR');
        expect(drafts).toHaveLength(1);
        expect(drafts[0].activityId).toBe(activityId);
        expect(drafts[0].observation).toBe(obsText);
        expect(drafts[0].createdBy).toBe('Ceci');
        expect(drafts[0].dayOfWeek).toBe('MONDAY');
        expect(drafts[0].createdAt).toBeInstanceOf(Date);
      });

      it('3. Cerrar sesión y volver a entrar: el borrador persiste para la Educadora autenticada', async () => {
        const activityId = `act-${roomId}-MONDAY-1`;
        const obsText = `Ajustar duración de actividad lunes en ${roomName}`;

        await service.saveDirectorDraftObservation(
          planId,
          activityId,
          obsText,
          'Ceci',
          'DIRECTOR',
          'MONDAY'
        );

        // Simulate logout / login with new service instance pointing to same repository
        const newSessionService = new PlanningWorkflowService(repo);
        const restoredDrafts = await newSessionService.listDirectorDraftObservations(planId, 'Ceci', 'DIRECTOR');

        expect(restoredDrafts).toHaveLength(1);
        expect(restoredDrafts[0].observation).toBe(obsText);

        // Security check: Another director doesn't get Ceci's private drafts
        const otherDirectorDrafts = await newSessionService.listDirectorDraftObservations(planId, 'other-director', 'DIRECTOR');
        expect(otherDirectorDrafts).toHaveLength(0);

        // Role security check: Teacher cannot invoke listDirectorDraftObservations
        await expect(
          newSessionService.listDirectorDraftObservations(planId, 't1', 'TEACHER' as any)
        ).rejects.toThrow(/Only Director/);
      });

      it('4. Guardar varias observaciones en diferentes días: persisten sin sobrescribirse', async () => {
        const mondayActId = `act-${roomId}-MONDAY-1`;
        const tuesdayActId = `act-${roomId}-TUESDAY-1`;

        await service.saveDirectorDraftObservation(
          planId,
          mondayActId,
          `Observación lunes para ${roomName}`,
          'Ceci',
          'DIRECTOR',
          'MONDAY'
        );

        await service.saveDirectorDraftObservation(
          planId,
          tuesdayActId,
          `Observación martes para ${roomName}`,
          'Ceci',
          'DIRECTOR',
          'TUESDAY'
        );

        const drafts = await service.listDirectorDraftObservations(planId, 'Ceci', 'DIRECTOR');
        expect(drafts).toHaveLength(2);

        const mondayDraft = drafts.find(d => d.activityId === mondayActId);
        const tuesdayDraft = drafts.find(d => d.activityId === tuesdayActId);

        expect(mondayDraft?.observation).toBe(`Observación lunes para ${roomName}`);
        expect(tuesdayDraft?.observation).toBe(`Observación martes para ${roomName}`);
      });

      it('5 a 9. Circuito completo: Devolver con observaciones, corregir, reenviar, resolver y aprobar conservando historial', async () => {
        const mondayActId = `act-${roomId}-MONDAY-1`;
        const obsMonday = `Modificar materiales para mayor seguridad en ${roomName}`;

        // 4. Guardar borrador institucional
        await service.saveDirectorDraftObservation(
          planId,
          mondayActId,
          obsMonday,
          'Ceci',
          'DIRECTOR',
          'MONDAY'
        );

        // 5. Devolver planeación con observaciones (handleSendRound)
        const granularObsArray = [
          {
            targetId: mondayActId,
            observation: obsMonday,
            originalContent: `Actividad sensorial para ${roomId} en día MONDAY`,
            currentContent: `Actividad sensorial para ${roomId} en día MONDAY`,
            status: 'PENDING_CORRECTION' as const,
            reviewer: 'DIRECTOR',
            timestamp: new Date(),
          },
        ];

        await service.reject(planId, 'Ajustes requeridos', 'Ceci', 'DIRECTOR', granularObsArray);

        // Verify status and published observations
        const rejectedPlan = await service.getPlanning(planId);
        expect(rejectedPlan?.status).toBe('REJECTED');
        expect(rejectedPlan?.granularObservations).toHaveLength(1);
        expect(rejectedPlan?.granularObservations[0].status).toBe('PENDING_CORRECTION');

        // Verify draft subcollection is cleared upon publishing
        const remainingDrafts = await service.listDirectorDraftObservations(planId, 'Ceci', 'DIRECTOR');
        expect(remainingDrafts).toHaveLength(0);

        // 6. Corregir como Asistente Educativa
        const days = rejectedPlan!.days;
        const mondayAct = days[0].activities.find(a => a.activityId === mondayActId)!;
        mondayAct.description = `Actividad sensorial corregida con materiales acolchados para ${roomName}`;
        mondayAct.materials = ['Tapete de foami extra suave', 'Mordederas esterilizadas'];

        // Teacher updates the content while REJECTED
        await service.resubmit(
          planId,
          rejectedPlan!.observations,
          rejectedPlan!.identifiedNeeds,
          rejectedPlan!.specialSituations || '',
          rejectedPlan!.availableMaterials || '',
          [],
          days,
          'TEACHER'
        );

        // 7. Reenviar a revisión
        const resubmittedPlan = await service.getPlanning(planId);
        expect(resubmittedPlan?.status).toBe('IN_REVIEW');
        expect(resubmittedPlan?.granularObservations[0].status).toBe('CHANGED_BY_EDUCATOR');
        expect(resubmittedPlan?.granularObservations[0].currentContent).toBe(mondayAct.description);

        // 8. Resolver observaciones como Educadora
        await service.resolveGranularObservation(planId, mondayActId, 'DIRECTOR', 'Ceci');
        const resolvedPlan = await service.getPlanning(planId);
        expect(resolvedPlan?.granularObservations[0].status).toBe('RESOLVED');

        // 9. Aprobar sin perder historial
        // Mark all 5 days reviewed
        for (const day of resolvedPlan!.days) {
          await service.markDirectorDayReviewed(planId, day.dayOfWeek, 'DIRECTOR');
        }

        await service.approve(planId, 'DIRECTOR', 'Ceci');
        const approvedPlan = await service.getPlanning(planId);

        expect(approvedPlan?.status).toBe('APPROVED');
        expect(approvedPlan?.approvedBy).toBe('Ceci');
        expect(approvedPlan?.approvedAt).toBeInstanceOf(Date);
        expect(approvedPlan?.historicalRounds).toHaveLength(1);
        expect(approvedPlan?.historicalRounds[0].observations[0].targetId).toBe(mondayActId);
        expect(approvedPlan?.historicalRounds[0].observations[0].status).toBe('RESOLVED');
      });
    });
  });

  describe('SR-MD-21 Phase 2B: Verificación de Atomicidad y Recuperación ante Fallos Parciales', () => {
    const planId = 'plan-atomicity-failover-test';
    const roomId = 'room-lactantes-b';

    beforeEach(async () => {
      await service.createPlanning(
        planId,
        'daycare-1',
        roomId,
        't1',
        '2026-08-24',
        '2026-08-28',
        'TEACHER'
      );
      const days = create5Days(roomId);
      await service.saveDraft(
        planId,
        'Obs iniciales',
        'Necesidades',
        'Ninguna',
        'Materiales',
        [],
        days,
        'TEACHER'
      );
      await service.submit(planId, 'TEACHER');

      // Director saves a draft observation
      await service.saveDirectorDraftObservation(
        planId,
        `act-${roomId}-MONDAY-1`,
        'Borrador para verificación atómica',
        'Ceci',
        'DIRECTOR',
        'MONDAY'
      );
    });

    it('1. Atomicidad: savePlanningAndClearDrafts ejecuta en una sola transacción publicación y limpieza', async () => {
      const spy = vi.spyOn(repo, 'savePlanningAndClearDrafts');

      const granularObs = [{
        targetId: `act-${roomId}-MONDAY-1`,
        observation: 'Observación formal enviada',
        originalContent: 'Original',
        currentContent: 'Original',
        status: 'PENDING_CORRECTION' as const,
        reviewer: 'DIRECTOR',
        timestamp: new Date()
      }];

      await service.reject(planId, 'Ajustes solicitados', 'Ceci', 'DIRECTOR', granularObs);

      expect(spy).toHaveBeenCalledTimes(1);

      // Verify that planning is REJECTED with published observation
      const plan = await service.getPlanning(planId);
      expect(plan?.status).toBe('REJECTED');
      expect(plan?.granularObservations).toHaveLength(1);

      // Verify drafts are completely cleared in the same operation
      const drafts = await service.listDirectorDraftObservations(planId, 'Ceci', 'DIRECTOR');
      expect(drafts).toHaveLength(0);
    });

    it('2. Recuperación ante fallo parcial: Si falla la transacción atómica, no se publica ni se pierden los borradores', async () => {
      // Force repository atomic commit to fail (simulating Firestore transaction/batch error)
      vi.spyOn(repo, 'savePlanningAndClearDrafts').mockRejectedValueOnce(
        new Error('Simulated atomic batch commit network failure')
      );

      const granularObs = [{
        targetId: `act-${roomId}-MONDAY-1`,
        observation: 'Observación que fallará al publicar',
        originalContent: 'Original',
        currentContent: 'Original',
        status: 'PENDING_CORRECTION' as const,
        reviewer: 'DIRECTOR',
        timestamp: new Date()
      }];

      await expect(
        service.reject(planId, 'Ajustes solicitados', 'Ceci', 'DIRECTOR', granularObs)
      ).rejects.toThrow('Simulated atomic batch commit network failure');

      // Verify planning is STILL in IN_REVIEW (not corrupted/partially rejected)
      const plan = await service.getPlanning(planId);
      expect(plan?.status).toBe('IN_REVIEW');
      expect(plan?.granularObservations).toHaveLength(0);

      // Verify draft observation STILL exists in repository (work is preserved for retry)
      const drafts = await service.listDirectorDraftObservations(planId, 'Ceci', 'DIRECTOR');
      expect(drafts).toHaveLength(1);
      expect(drafts[0].observation).toBe('Borrador para verificación atómica');
    });

    it('3. Reintento exitoso tras fallo parcial recupera y completa la operación', async () => {
      // First attempt fails
      const atomicSpy = vi.spyOn(repo, 'savePlanningAndClearDrafts');
      atomicSpy.mockRejectedValueOnce(new Error('Transient Firestore error'));

      const granularObs = [{
        targetId: `act-${roomId}-MONDAY-1`,
        observation: 'Observación a reintentar',
        originalContent: 'Original',
        currentContent: 'Original',
        status: 'PENDING_CORRECTION' as const,
        reviewer: 'DIRECTOR',
        timestamp: new Date()
      }];

      await expect(
        service.reject(planId, 'Ajustes solicitados', 'Ceci', 'DIRECTOR', granularObs)
      ).rejects.toThrow('Transient Firestore error');

      // Second attempt succeeds without mocking failure
      await service.reject(planId, 'Ajustes solicitados', 'Ceci', 'DIRECTOR', granularObs);

      const plan = await service.getPlanning(planId);
      expect(plan?.status).toBe('REJECTED');
      expect(plan?.granularObservations).toHaveLength(1);

      const drafts = await service.listDirectorDraftObservations(planId, 'Ceci', 'DIRECTOR');
      expect(drafts).toHaveLength(0);
    });

    it('4. Resiliencia de guardado de borrador: rechaza borradores vacíos antes de tocar repositorio', async () => {
      await expect(
        service.saveDirectorDraftObservation(planId, `act-${roomId}-MONDAY-1`, '', 'Ceci', 'DIRECTOR')
      ).rejects.toThrow(/cannot be empty/);

      await expect(
        service.saveDirectorDraftObservation(planId, `act-${roomId}-MONDAY-1`, '   ', 'Ceci', 'DIRECTOR')
      ).rejects.toThrow(/cannot be empty/);
    });
  });

  describe('SR-MD-21 Integridad de Actividades y Estado de Planeación (Validación Paso 1 & 2)', () => {
    const planIdA = 'plan-integrity-a';
    const planIdB = 'plan-integrity-b';
    const roomIdA = 'room-lactantes-a';
    const roomIdB = 'room-lactantes-b';

    beforeEach(async () => {
      // Create Plan A
      await service.createPlanning(planIdA, 'daycare-1', roomIdA, 't1', '2026-08-24', '2026-08-28', 'TEACHER');
      await service.saveDraft(planIdA, 'Obs A', 'Nec A', '', '', [], create5Days(roomIdA), 'TEACHER');

      // Create Plan B
      await service.createPlanning(planIdB, 'daycare-1', roomIdB, 't2', '2026-08-24', '2026-08-28', 'TEACHER');
      await service.saveDraft(planIdB, 'Obs B', 'Nec B', '', '', [], create5Days(roomIdB), 'TEACHER');
    });

    it('1. Actividad válida: permite guardar borrador y publicar observación cuando el plan está en IN_REVIEW', async () => {
      await service.submit(planIdA, 'TEACHER');
      const validActivityId = `act-${roomIdA}-MONDAY-1`;

      // Positivo: Guardar borrador en actividad válida
      await expect(
        service.saveDirectorDraftObservation(planIdA, validActivityId, 'Observación válida', 'Ceci', 'DIRECTOR', 'MONDAY')
      ).resolves.not.toThrow();

      // Positivo: Publicar observación formal en actividad válida
      const granularObs = [{
        targetId: validActivityId,
        observation: 'Ajuste aprobado para revisión',
        originalContent: 'Original',
        currentContent: 'Original',
        status: 'PENDING_CORRECTION' as const,
        reviewer: 'DIRECTOR',
        timestamp: new Date()
      }];

      await expect(
        service.reject(planIdA, 'Ajustes solicitados', 'Ceci', 'DIRECTOR', granularObs)
      ).resolves.not.toThrow();
    });

    it('2. Actividad inexistente: rechaza guardar borrador y rechaza publicar observación', async () => {
      await service.submit(planIdA, 'TEACHER');
      const nonExistentActivityId = 'act-ghost-999';

      // Negativo: Guardar borrador con activityId inexistente
      await expect(
        service.saveDirectorDraftObservation(planIdA, nonExistentActivityId, 'Observación huérfana', 'Ceci', 'DIRECTOR')
      ).rejects.toThrow(`Activity '${nonExistentActivityId}' does not belong to planning '${planIdA}'`);

      // Negativo: Publicar observación formal con activityId inexistente
      const invalidObs = [{
        targetId: nonExistentActivityId,
        observation: 'Observación formal huérfana',
        originalContent: 'Original',
        currentContent: 'Original',
        status: 'PENDING_CORRECTION' as const,
        reviewer: 'DIRECTOR',
        timestamp: new Date()
      }];

      await expect(
        service.reject(planIdA, 'Ajustes solicitados', 'Ceci', 'DIRECTOR', invalidObs)
      ).rejects.toThrow(`Activity '${nonExistentActivityId}' does not belong to planning '${planIdA}'`);
    });

    it('3. Actividad perteneciente a otra planeación: rechaza guardar borrador y rechaza publicar observación', async () => {
      await service.submit(planIdA, 'TEACHER');
      await service.submit(planIdB, 'TEACHER');

      // Activity from Plan B
      const activityFromPlanB = `act-${roomIdB}-MONDAY-1`;

      // Negativo: Intentar asociar la actividad de Plan B a Plan A en borrador
      await expect(
        service.saveDirectorDraftObservation(planIdA, activityFromPlanB, 'Intento de contaminación cruzada', 'Ceci', 'DIRECTOR')
      ).rejects.toThrow(`Activity '${activityFromPlanB}' does not belong to planning '${planIdA}'`);

      // Negativo: Intentar publicar observación de actividad de Plan B en Plan A
      const crossPlanObs = [{
        targetId: activityFromPlanB,
        observation: 'Observación cruzada',
        originalContent: 'Original',
        currentContent: 'Original',
        status: 'PENDING_CORRECTION' as const,
        reviewer: 'DIRECTOR',
        timestamp: new Date()
      }];

      await expect(
        service.reject(planIdA, 'Ajustes solicitados', 'Ceci', 'DIRECTOR', crossPlanObs)
      ).rejects.toThrow(`Activity '${activityFromPlanB}' does not belong to planning '${planIdA}'`);
    });

    it('4. Plan fuera de IN_REVIEW: rechaza guardar borradores y rechazar si el plan está en DRAFT o APPROVED', async () => {
      const activityId = `act-${roomIdA}-MONDAY-1`;

      // Negativo en estado DRAFT
      const planDraft = await service.getPlanning(planIdA);
      expect(planDraft?.status).toBe('DRAFT');

      await expect(
        service.saveDirectorDraftObservation(planIdA, activityId, 'Borrador prematuro en DRAFT', 'Ceci', 'DIRECTOR')
      ).rejects.toThrow(/Cannot save draft observations when planning is in status: DRAFT/);

      await expect(
        service.reject(planIdA, 'Rechazo prematuro en DRAFT', 'Ceci', 'DIRECTOR')
      ).rejects.toThrow(/Cannot reject planning in status: DRAFT/);

      // Transition to IN_REVIEW then APPROVED
      await service.submit(planIdA, 'TEACHER');
      for (const day of create5Days(roomIdA)) {
        await service.markDirectorDayReviewed(planIdA, day.dayOfWeek, 'DIRECTOR');
      }
      await service.approve(planIdA, 'DIRECTOR', 'Ceci');

      const planApproved = await service.getPlanning(planIdA);
      expect(planApproved?.status).toBe('APPROVED');

      // Negativo en estado APPROVED
      await expect(
        service.saveDirectorDraftObservation(planIdA, activityId, 'Borrador tardío en APPROVED', 'Ceci', 'DIRECTOR')
      ).rejects.toThrow(/Cannot save draft observations when planning is in status: APPROVED/);

      await expect(
        service.reject(planIdA, 'Rechazo tardío en APPROVED', 'Ceci', 'DIRECTOR')
      ).rejects.toThrow(/Cannot reject planning in status: APPROVED/);
    });
  });
});
