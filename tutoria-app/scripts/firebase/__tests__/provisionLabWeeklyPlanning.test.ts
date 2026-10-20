import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  parseCliArgs,
  assertProjectFirewall,
  assertMaterialEnclosure,
  createSyntheticFiveDays,
  executeDomainLifecycle,
  serializeWeeklyPlanningForAdmin,
  buildNormalizedSnapshot,
  hashNormalizedSnapshot,
  runProvisioner,
  TARGET_PROJECT,
  PROD_PROJECT,
  LAB_PLANNING_ID,
  LAB_ROOM_ID,
  LAB_FIXTURE_WEEK_START,
  LAB_FIXTURE_WEEK_END,
  LAB_TARGET_DAY_OF_WEEK,
} from '../provisionLabWeeklyPlanning';
import { WeeklyPlanning } from '../../../src/domain/planning/WeeklyPlanning';
import { FirestoreWeeklyPlanningAdminRepository } from '../../../functions/src/FirestoreWeeklyPlanningAdminRepository';

describe('H1R13.3G.2A — LAB Weekly Planning Provisioner Tests', () => {
  describe('1. CLI Argument Parsing & Fail-Closed Guard', () => {
    it('defaults to DRY_RUN when no arguments supplied', () => {
      const res = parseCliArgs([]);
      expect(res.mode).toBe('DRY_RUN');
    });

    it('parses --dry-run flag as DRY_RUN', () => {
      const res = parseCliArgs(['--dry-run']);
      expect(res.mode).toBe('DRY_RUN');
    });

    it('parses --execute flag as EXECUTE', () => {
      const res = parseCliArgs(['--execute']);
      expect(res.mode).toBe('EXECUTE');
    });

    it('fails closed if both --dry-run and --execute are supplied', () => {
      expect(() => parseCliArgs(['--dry-run', '--execute'])).toThrow(
        /Conflicting flags: --dry-run and --execute cannot be passed simultaneously/
      );
    });

    it('fails closed on unknown flags', () => {
      expect(() => parseCliArgs(['--unknown-flag'])).toThrow(
        /Unknown flag: '--unknown-flag'/
      );
      expect(() => parseCliArgs(['--force'])).toThrow(
        /Unknown flag: '--force'/
      );
    });
  });

  describe('2. Project Firewall Assertions', () => {
    it('accepts exact TARGET_PROJECT', () => {
      expect(() => assertProjectFirewall(TARGET_PROJECT)).not.toThrow();
    });

    it('fails closed for undefined or empty project', () => {
      expect(() => assertProjectFirewall(undefined)).toThrow(/Target project is undefined/);
      expect(() => assertProjectFirewall('')).toThrow(/Target project is undefined/);
    });

    it('fails closed for PROD project', () => {
      expect(() => assertProjectFirewall(PROD_PROJECT)).toThrow(
        /Refusing execution against production project: 'guarderiasimss-5cb09'/
      );
    });

    it('fails closed for any other arbitrary project', () => {
      expect(() => assertProjectFirewall('other-project-123')).toThrow(
        /Target project must be 'tutoria-identity-lab'/
      );
    });
  });

  describe('3. In-Memory Domain Lifecycle Execution', () => {
    it('executes full 5-day lifecycle ending in APPROVED status with version 2', async () => {
      const planning = await executeDomainLifecycle({
        planningId: LAB_PLANNING_ID,
        daycareId: '00000000-0000-4000-8000-000000000001',
        roomId: LAB_ROOM_ID,
        teacherId: 'lab-teacher-anita',
        directorId: 'lab-director-ceci',
        weekStart: LAB_FIXTURE_WEEK_START,
        weekEnd: LAB_FIXTURE_WEEK_END,
      });

      expect(planning.planningId).toBe(LAB_PLANNING_ID);
      expect(planning.status).toBe('APPROVED');
      expect(planning.isApprovedForExecution()).toBe(true);
      expect(planning.version).toBe(2);
      expect(planning.days).toHaveLength(5);
      expect(planning.approvedBy).toBe('lab-director-ceci');
      expect(planning.approvedAt).toBeDefined();
      const approvedAt = new Date(planning.approvedAt as unknown as string | Date);
      expect(Number.isNaN(approvedAt.getTime())).toBe(false);
      expect(planning.closedAt).toBeUndefined();
      expect(planning.closedBy).toBeUndefined();

      // Check all 5 weekdays
      const days = planning.days;
      expect(days.map((d) => d.dayOfWeek)).toEqual([
        'MONDAY',
        'TUESDAY',
        'WEDNESDAY',
        'THURSDAY',
        'FRIDAY',
      ]);

      // All 5 days have teacher review metadata
      for (const d of days) {
        expect(d.teacherReviewedAt).toBeDefined();
        const reviewedAt = new Date(d.teacherReviewedAt as unknown as string | Date);
        expect(Number.isNaN(reviewedAt.getTime())).toBe(false);
        expect(d.teacherReviewedBy).toBe('lab-teacher-anita');
        expect(d.activities).toHaveLength(1);
        expect(d.activities[0].durationMinutes).toBe(15);
        expect(d.activities[0].curricularTraceability).toEqual([]);
        expect(d.complementaryActivities).toEqual([]);
        expect(d.prioritizedPractices).toEqual([]);
      }

      // Target day (Monday) evaluation is absent
      const monday = days.find((d) => d.dayOfWeek === 'MONDAY');
      expect(monday).toBeDefined();
      expect(monday?.evaluation).toBeUndefined();
      expect(monday?.evaluationStatus).toBeUndefined();
    });

    it('fails if roomId is not in RoomCatalog', async () => {
      await expect(
        executeDomainLifecycle({
          planningId: LAB_PLANNING_ID,
          daycareId: '00000000-0000-4000-8000-000000000001',
          roomId: 'invalid-room-999',
          teacherId: 'lab-teacher-anita',
          directorId: 'lab-director-ceci',
          weekStart: LAB_FIXTURE_WEEK_START,
          weekEnd: LAB_FIXTURE_WEEK_END,
        })
      ).rejects.toThrow(/Invalid room: 'invalid-room-999'/);
    });
  });

  describe('4. Material Enclosure Assertions', () => {
    it('passes when activity materials belong strictly to authorized universe', async () => {
      const planning = await executeDomainLifecycle({
        planningId: LAB_PLANNING_ID,
        daycareId: '00000000-0000-4000-8000-000000000001',
        roomId: LAB_ROOM_ID,
        teacherId: 'lab-teacher-anita',
        directorId: 'lab-director-ceci',
        weekStart: LAB_FIXTURE_WEEK_START,
        weekEnd: LAB_FIXTURE_WEEK_END,
      });

      expect(() => assertMaterialEnclosure(planning)).not.toThrow();
    });

    it('fails closed when an unauthorized material is present in an activity', () => {
      const days = createSyntheticFiveDays();
      days[0].activities[0].materials.push('unauthorized-object-123');

      const planning = new WeeklyPlanning(
        LAB_PLANNING_ID,
        '00000000-0000-4000-8000-000000000001',
        LAB_ROOM_ID,
        'lab-teacher-anita',
        LAB_FIXTURE_WEEK_START,
        LAB_FIXTURE_WEEK_END,
        'APPROVED',
        '',
        '',
        '',
        'telas suaves, colchonetas',
        [],
        [],
        days,
        2
      );

      expect(() => assertMaterialEnclosure(planning)).toThrow(
        /Material 'unauthorized-object-123' in activity 'act-lactantes-mon' on day 'MONDAY' is outside the authorized fixture universe/
      );
    });
  });

  describe('5. Serialization Structural Parity with Admin Repository', () => {
    it('serializes into shape deserializable by FirestoreWeeklyPlanningAdminRepository', async () => {
      const planning = await executeDomainLifecycle({
        planningId: LAB_PLANNING_ID,
        daycareId: '00000000-0000-4000-8000-000000000001',
        roomId: LAB_ROOM_ID,
        teacherId: 'lab-teacher-anita',
        directorId: 'lab-director-ceci',
        weekStart: LAB_FIXTURE_WEEK_START,
        weekEnd: LAB_FIXTURE_WEEK_END,
      });

      const serialized = serializeWeeklyPlanningForAdmin(planning);

      // Verify serialized fields
      expect(serialized.planningId).toBe(LAB_PLANNING_ID);
      expect(serialized.status).toBe('APPROVED');
      expect(serialized.version).toBe(2);
      expect(serialized.approvedBy).toBe('lab-director-ceci');
      expect(serialized.approvedAt).toBeInstanceOf(Date);
      expect((serialized.days as any[])).toHaveLength(5);

      // Round-trip through FirestoreWeeklyPlanningAdminRepository.deserialize
      const adminRepo = new FirestoreWeeklyPlanningAdminRepository();
      const deserialized = adminRepo.deserialize(serialized);

      expect(deserialized.planningId).toBe(LAB_PLANNING_ID);
      expect(deserialized.status).toBe('APPROVED');
      expect(deserialized.version).toBe(2);
      expect(deserialized.approvedBy).toBe('lab-director-ceci');
      expect(deserialized.approvedAt).toBeInstanceOf(Date);
      expect(deserialized.days).toHaveLength(5);
      expect(deserialized.isApprovedForExecution()).toBe(true);

      // Curricular, complementary, and prioritized practice invariants hold
      expect(() => deserialized.assertValidCurricularInvariants()).not.toThrow();
      expect(() => deserialized.assertValidComplementaryInvariants()).not.toThrow();
      expect(() => deserialized.assertValidPrioritizedPracticeInvariants()).not.toThrow();
    });
  });

  describe('6. Zero-Persistence Snapshot Normalization', () => {
    it('produces deterministic normalized snapshot and SHA-256 hash', async () => {
      const planning = await executeDomainLifecycle({
        planningId: LAB_PLANNING_ID,
        daycareId: '00000000-0000-4000-8000-000000000001',
        roomId: LAB_ROOM_ID,
        teacherId: 'lab-teacher-anita',
        directorId: 'lab-director-ceci',
        weekStart: LAB_FIXTURE_WEEK_START,
        weekEnd: LAB_FIXTURE_WEEK_END,
      });

      const snap1 = buildNormalizedSnapshot(planning);
      const hash1 = hashNormalizedSnapshot(snap1);

      const snap2 = buildNormalizedSnapshot(planning);
      const hash2 = hashNormalizedSnapshot(snap2);

      expect(snap1.version).toBe(2);
      expect(snap1.status).toBe('APPROVED');
      expect(snap1.daysCount).toBe(5);
      expect(snap1.targetDay.dayOfWeek).toBe('MONDAY');
      expect(snap1.targetDay.hasEvaluation).toBe(false);
      expect(snap1.targetDay.evaluationStatus).toBeNull();
      expect(snap1.governance.isApproved).toBe(true);
      expect(snap1.closure.isClosed).toBe(false);
      expect(hash1).toBe(hash2);
      expect(typeof hash1).toBe('string');
      expect(hash1.length).toBe(64);
    });
  });

  describe('7. Provisioner Engine & Mock Cloud Environment', () => {
    it('executes DRY_RUN with zero cloud writes and zero AI calls', async () => {
      const mockDb = {
        collection: (colName: string) => {
          if (colName === 'authorizationContexts') {
            return {
              doc: (id: string) => ({
                get: async () => {
                  if (id === 'lab-teacher-anita') {
                    return {
                      exists: true,
                      data: () => ({
                        institutionalRole: 'TEACHER',
                        active: true,
                        authorizedDaycareIds: ['00000000-0000-4000-8000-000000000001'],
                      }),
                    };
                  }
                  if (id === 'lab-director-ceci') {
                    return {
                      exists: true,
                      data: () => ({
                        institutionalRole: 'DIRECTOR',
                        active: true,
                        authorizedDaycareIds: ['00000000-0000-4000-8000-000000000001'],
                      }),
                    };
                  }
                  return { exists: false, data: () => ({}) };
                },
              }),
            };
          }
          if (colName === 'weeklyPlannings') {
            return {
              doc: (_id: string) => ({
                get: async () => ({ exists: false, data: () => ({}) }),
                create: vi.fn(),
              }),
            };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
      };

      const result = await runProvisioner({
        mode: 'DRY_RUN',
        projectId: 'tutoria-identity-lab',
        db: mockDb,
      });

      expect(result.mode).toBe('DRY_RUN');
      expect(result.targetProject).toBe('tutoria-identity-lab');
      expect(result.actualFirestoreWrites).toBe(0);
      expect(result.openAiCalls).toBe(0);
      expect(result.prodAccess).toBe(0);
      expect(result.totalDays).toBe(5);
      expect(result.totalActivities).toBe(5);
      expect(result.totalPdaReferences).toBe(0);
      expect(result.totalComplementaryActivities).toBe(0);
      expect(result.totalPrioritizedPractices).toBe(0);
      expect(result.materialEnclosurePassed).toBe(true);
      expect(result.finalStatus).toBe('APPROVED');
      expect(result.finalVersion).toBe(2);
      expect(result.targetDayEvaluationPresent).toBe(false);
      expect(result.closurePresent).toBe(false);
      expect(result.expectedDocumentsMutatedOnExecute).toBe(1);
      expect(result.expectedWritesOnExecute).toBe(1);
    });

    it('fails closed if fixture already exists in Firestore', async () => {
      const mockDb = {
        collection: (colName: string) => {
          if (colName === 'authorizationContexts') {
            return {
              doc: () => ({
                get: async () => ({
                  exists: true,
                  data: () => ({
                    institutionalRole: 'TEACHER',
                    active: true,
                    authorizedDaycareIds: ['00000000-0000-4000-8000-000000000001'],
                  }),
                }),
              }),
            };
          }
          if (colName === 'weeklyPlannings') {
            return {
              doc: (id: string) => ({
                get: async () => {
                  if (id === LAB_PLANNING_ID) {
                    return { exists: true, data: () => ({ status: 'APPROVED' }) };
                  }
                  return { exists: false, data: () => ({}) };
                },
              }),
            };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
      };

      await expect(
        runProvisioner({
          mode: 'DRY_RUN',
          projectId: 'tutoria-identity-lab',
          db: mockDb,
        })
      ).rejects.toThrow(/\[FIXTURE PREEXISTENCE\] Fixture 'f1000000-0000-4000-8000-000000000001' already exists/);
    });

    it('fails closed if teacher is inactive or lacks role/daycare', async () => {
      const mockDb = {
        collection: (colName: string) => {
          if (colName === 'authorizationContexts') {
            return {
              doc: (id: string) => ({
                get: async () => {
                  if (id === 'lab-teacher-anita') {
                    return {
                      exists: true,
                      data: () => ({
                        institutionalRole: 'TEACHER',
                        active: false, // INACTIVE!
                        authorizedDaycareIds: ['00000000-0000-4000-8000-000000000001'],
                      }),
                    };
                  }
                  return { exists: false, data: () => ({}) };
                },
              }),
            };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
      };

      await expect(
        runProvisioner({
          mode: 'DRY_RUN',
          projectId: 'tutoria-identity-lab',
          db: mockDb,
        })
      ).rejects.toThrow(/Teacher is not active with TEACHER role/);
    });

    it('fails closed if director is missing or unauthorized', async () => {
      const mockDb = {
        collection: (colName: string) => {
          if (colName === 'authorizationContexts') {
            return {
              doc: (id: string) => ({
                get: async () => {
                  if (id === 'lab-teacher-anita') {
                    return {
                      exists: true,
                      data: () => ({
                        institutionalRole: 'TEACHER',
                        active: true,
                        authorizedDaycareIds: ['00000000-0000-4000-8000-000000000001'],
                      }),
                    };
                  }
                  if (id === 'lab-director-ceci') {
                    return {
                      exists: true,
                      data: () => ({
                        institutionalRole: 'SUPERVISOR', // WRONG ROLE!
                        active: true,
                        authorizedDaycareIds: ['00000000-0000-4000-8000-000000000001'],
                      }),
                    };
                  }
                  return { exists: false, data: () => ({}) };
                },
              }),
            };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
      };

      await expect(
        runProvisioner({
          mode: 'DRY_RUN',
          projectId: 'tutoria-identity-lab',
          db: mockDb,
        })
      ).rejects.toThrow(/Director is not active with DIRECTOR role/);
    });

    it('guarantees create-if-absent semantics on EXECUTE without overwriting', async () => {
      const createMock = vi.fn().mockResolvedValue({ writeTime: { seconds: 12345 } });
      const mockDb = {
        collection: (colName: string) => {
          if (colName === 'authorizationContexts') {
            return {
              doc: (id: string) => ({
                get: async () => {
                  if (id === 'lab-teacher-anita') {
                    return {
                      exists: true,
                      data: () => ({
                        institutionalRole: 'TEACHER',
                        active: true,
                        authorizedDaycareIds: ['00000000-0000-4000-8000-000000000001'],
                      }),
                    };
                  }
                  if (id === 'lab-director-ceci') {
                    return {
                      exists: true,
                      data: () => ({
                        institutionalRole: 'DIRECTOR',
                        active: true,
                        authorizedDaycareIds: ['00000000-0000-4000-8000-000000000001'],
                      }),
                    };
                  }
                  return { exists: false, data: () => ({}) };
                },
              }),
            };
          }
          if (colName === 'weeklyPlannings') {
            return {
              doc: (_id: string) => ({
                get: async () => ({ exists: false, data: () => ({}) }),
                create: createMock,
              }),
            };
          }
          return { doc: () => ({ get: async () => ({ exists: false }) }) };
        },
      };

      const result = await runProvisioner({
        mode: 'EXECUTE',
        projectId: 'tutoria-identity-lab',
        db: mockDb,
      });

      expect(result.mode).toBe('EXECUTE');
      expect(result.actualFirestoreWrites).toBe(1);
      expect(createMock).toHaveBeenCalledTimes(1);
      const callArg = createMock.mock.calls[0][0];
      expect(callArg.planningId).toBe(LAB_PLANNING_ID);
      expect(callArg.status).toBe('APPROVED');
      expect(callArg.version).toBe(2);
    });
  });
});
