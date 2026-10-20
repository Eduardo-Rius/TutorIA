import { describe, it, expect, vi } from 'vitest';
import { RoomCatalog, Room } from '../RoomCatalog';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import {
  AIWeeklyPlanningProposalSource,
  WeeklyPlanningAIExecutor,
  UnsupportedPedagogicalPolicyError,
} from '../../../application/planning/AIWeeklyPlanningProposalSource';
import { WeeklyPlanningProposalRequest } from '../../../application/planning/WeeklyPlanningProposalSource';
import {
  PedagogicalAgePolicyCatalog,
  LACTANTES_B_AGE_POLICY,
} from '../PedagogicalAgePolicy';

describe('ORDEN SR-MD-14-F — Normalización Controlada del Catálogo: Lactantes B', () => {
  // =========================================================================
  // 1. Reconocimiento de Lactantes B en el catálogo
  // =========================================================================
  describe('1. Reconocimiento de Lactantes B en el catálogo canónico', () => {
    it('debe registrar y resolver room-lactantes-b con metadatos exactos (7 a 12 meses)', () => {
      const room = RoomCatalog.getRoom('room-lactantes-b');
      expect(room).toBeDefined();
      expect(room).toEqual({
        roomId: 'room-lactantes-b',
        name: 'Lactantes B',
        minAgeMonths: 7,
        maxAgeMonths: 12,
      });
    });

    it('debe incluir room-lactantes-b en la lista total de salas canónicas', () => {
      const allRooms = RoomCatalog.getAllRooms();
      const lactantesB = allRooms.find(r => r.roomId === 'room-lactantes-b');
      expect(lactantesB).toBeDefined();
      expect(lactantesB?.name).toBe('Lactantes B');
      expect(lactantesB?.minAgeMonths).toBe(7);
      expect(lactantesB?.maxAgeMonths).toBe(12);
    });
  });

  // =========================================================================
  // 2. Conservación de identificadores históricos (Lactantes A y Lactantes C)
  // =========================================================================
  describe('2. Conservación de identificadores históricos (Lactantes A y Lactantes C)', () => {
    it('debe preservar room-lactantes-a intacto (0 a 6 meses)', () => {
      const roomA = RoomCatalog.getRoom('room-lactantes-a');
      expect(roomA).toBeDefined();
      expect(roomA).toEqual({
        roomId: 'room-lactantes-a',
        name: 'Lactantes A',
        minAgeMonths: 0,
        maxAgeMonths: 6,
      });
    });

    it('debe preservar lactantes-c intacto con su ID histórico (13 a 18 meses)', () => {
      const roomC = RoomCatalog.getRoom('lactantes-c');
      expect(roomC).toBeDefined();
      expect(roomC).toEqual({
        roomId: 'lactantes-c',
        name: 'Lactantes C',
        minAgeMonths: 13,
        maxAgeMonths: 18,
      });
    });

    it('el catálogo canónico contiene exactamente las 3 salas sin duplicados', () => {
      const allRooms = RoomCatalog.getAllRooms();
      expect(allRooms).toHaveLength(3);
      const roomIds = allRooms.map(r => r.roomId);
      expect(roomIds).toEqual(['lactantes-c', 'room-lactantes-a', 'room-lactantes-b']);
    });
  });

  // =========================================================================
  // 3. Resolución correcta por PlanningWorkflowService
  // =========================================================================
  describe('3. Resolución correcta por PlanningWorkflowService', () => {
    it('debe permitir a la Educadora crear una planeación para room-lactantes-b exitosamente', async () => {
      const repository = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repository);

      const planning = await service.createPlanning(
        'plan-lactantes-b-2026-w35',
        'daycare-lab-01',
        'room-lactantes-b',
        'lab-teacher-anita',
        '2026-08-24',
        '2026-08-28',
        'TEACHER'
      );

      expect(planning).toBeDefined();
      expect(planning.planningId).toBe('plan-lactantes-b-2026-w35');
      expect(planning.roomId).toBe('room-lactantes-b');
      expect(planning.teacherId).toBe('lab-teacher-anita');
      expect(planning.status).toBe('DRAFT');

      // Verificar persistencia en repositorio
      const persisted = await repository.findById('plan-lactantes-b-2026-w35');
      expect(persisted).not.toBeNull();
      expect(persisted?.roomId).toBe('room-lactantes-b');
    });

    it('debe continuar permitiendo la creación de planeaciones para salas históricas', async () => {
      const repository = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repository);

      const planA = await service.createPlanning(
        'plan-lactantes-a-01',
        'daycare-lab-01',
        'room-lactantes-a',
        'lab-teacher-anita',
        '2026-08-24',
        '2026-08-28',
        'TEACHER'
      );
      expect(planA.roomId).toBe('room-lactantes-a');

      const planC = await service.createPlanning(
        'plan-lactantes-c-01',
        'daycare-lab-01',
        'lactantes-c',
        'lab-teacher-anita',
        '2026-08-24',
        '2026-08-28',
        'TEACHER'
      );
      expect(planC.roomId).toBe('lactantes-c');
    });

    it('debe seguir rechazando salas no reconocidas o inexistentes', async () => {
      const repository = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repository);

      await expect(
        service.createPlanning(
          'plan-invalid-01',
          'daycare-lab-01',
          'room-no-existente',
          'lab-teacher-anita',
          '2026-08-24',
          '2026-08-28',
          'TEACHER'
        )
      ).rejects.toThrow('Invalid room');
    });
  });

  // =========================================================================
  // 4. Aislamiento de salas y permisos
  // =========================================================================
  describe('4. Aislamiento de salas y permisos institucionales', () => {
    it('rechaza la creación de planeación en Lactantes B si el rol no es TEACHER', async () => {
      const repository = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repository);

      await expect(
        service.createPlanning(
          'plan-director-invalid',
          'daycare-lab-01',
          'room-lactantes-b',
          'lab-director-ceci',
          '2026-08-24',
          '2026-08-28',
          'DIRECTOR'
        )
      ).rejects.toThrow('Only Teacher can create planning');

      await expect(
        service.createPlanning(
          'plan-supervisor-invalid',
          'daycare-lab-01',
          'room-lactantes-b',
          'lab-supervisor-tere',
          '2026-08-24',
          '2026-08-28',
          'SUPERVISOR'
        )
      ).rejects.toThrow('Only Teacher can create planning');
    });

    it('garantiza que las planeaciones de Lactantes B quedan aisladas por roomId', async () => {
      const repository = new InMemoryWeeklyPlanningRepository();
      const service = new PlanningWorkflowService(repository);

      await service.createPlanning(
        'plan-b-isolated',
        'daycare-lab-01',
        'room-lactantes-b',
        'lab-teacher-anita',
        '2026-08-24',
        '2026-08-28',
        'TEACHER'
      );

      await service.createPlanning(
        'plan-a-isolated',
        'daycare-lab-01',
        'room-lactantes-a',
        'lab-teacher-anita',
        '2026-08-24',
        '2026-08-28',
        'TEACHER'
      );

      const allTeacherPlans = await repository.listByTeacher('lab-teacher-anita', 'daycare-lab-01');
      const bPlans = allTeacherPlans.filter(p => p.roomId === 'room-lactantes-b');
      const aPlans = allTeacherPlans.filter(p => p.roomId === 'room-lactantes-a');

      expect(bPlans).toHaveLength(1);
      expect(bPlans[0]!.planningId).toBe('plan-b-isolated');
      expect(aPlans).toHaveLength(1);
      expect(aPlans[0]!.planningId).toBe('plan-a-isolated');
      expect(bPlans[0]!.roomId).not.toBe(aPlans[0]!.roomId);
    });
  });

  // =========================================================================
  // 5. Gobernanza de autorización IA bajo SR-MD-25 (Lactantes B y C autorizadas, Maternal A bloqueada)
  // =========================================================================
  describe('5. Gobernanza de autorización IA bajo SR-MD-25 (Lactantes B y C autorizadas, Maternal A bloqueada)', () => {
    it('resuelve LACTANTES_B_AGE_POLICY para room-lactantes-b y confirma autorización IA bajo SR-MD-25', () => {
      const lactantesBRoom = RoomCatalog.getRoom('room-lactantes-b')!;
      expect(lactantesBRoom).toBeDefined();

      const policy = PedagogicalAgePolicyCatalog.getPolicyForRoom(lactantesBRoom);
      expect(policy).toBe(LACTANTES_B_AGE_POLICY);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_B')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_A')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_C')).toBe(true);
      expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('MATERNAL_A')).toBe(false);
    });

    it('rechaza fail-closed con UnsupportedPedagogicalPolicyError y NUNCA ejecuta IA para salas no autorizadas (ej. Maternal A)', async () => {
      const maternalARoom = {
        roomId: 'room-maternal-a',
        name: 'Maternal A',
        minAgeMonths: 19,
        maxAgeMonths: 24,
      };
      const mockExecutor: WeeklyPlanningAIExecutor = {
        execute: vi.fn(),
      };
      const provider = new AIWeeklyPlanningProposalSource(mockExecutor);

      const request: WeeklyPlanningProposalRequest = {
        planningId: 'plan-mat-a-proposal-fail',
        weekStart: '2026-08-24',
        weekEnd: '2026-08-28',
        modality: 'DIRECT',
        room: maternalARoom,
        currentContext: {
          observations: 'Observaciones de desarrollo motriz para 19 a 24 meses.',
          identifiedNeeds: 'Lenguaje y autonomía.',
          specialSituations: '',
          availableMaterials: 'Bloques de madera, cuentos ilustrados.',
        },
      };

      await expect(provider.propose(request)).rejects.toThrow(UnsupportedPedagogicalPolicyError);

      // Invariante de seguridad: el ejecutor de IA NUNCA debe ser contactado
      expect(mockExecutor.execute).toHaveBeenCalledTimes(0);
    });
  });
});
