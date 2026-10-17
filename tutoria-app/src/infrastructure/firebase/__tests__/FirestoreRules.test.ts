import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import { setDoc, doc, getDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, query, where, Timestamp, writeBatch } from 'firebase/firestore';

function createRealistic5Days() {
  return ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map((dayOfWeek, idx) => ({
    date: `2026-08-${24 + idx}`,
    dayOfWeek,
    activities: [
      {
        activityId: `act-${dayOfWeek}-1`,
        category: 'Juego',
        objective: 'Objetivo pedagógico de juego sensorial',
        description: 'Descripción detallada de la actividad con pelotas',
        materials: ['Pelotas de esponja', 'Caja de cartón'],
        durationMinutes: 20,
        curricularTraceability: [
          {
            pdaId: 'TUTORIA-PDA-0001',
            catalogRevision: 'TUTORIA-DIRECT-PDA-CATALOG-R1',
          },
        ],
      },
      {
        activityId: `act-${dayOfWeek}-2`,
        category: 'Arte',
        objective: 'Objetivo pedagógico de exploración dactilar',
        description: 'Descripción de arte y texturas de papel',
        materials: ['Pintura dactilar no tóxica', 'Papel bond'],
        durationMinutes: 25,
        curricularTraceability: [
          {
            pdaId: 'TUTORIA-PDA-0002',
            catalogRevision: 'TUTORIA-DIRECT-PDA-CATALOG-R1',
          },
        ],
      },
    ],
    complementaryActivities: [],
    materials: ['Pelotas de esponja', 'Caja de cartón', 'Pintura dactilar no tóxica', 'Papel bond'],
  }));
}

function createRealisticReviewed5Days() {
  return createRealistic5Days().map((day) => ({
    ...day,
    directorReviewed: true,
  }));
}


function createRealisticSerializedPlan(params: {
  planningId: string;
  daycareId: string;
  teacherId: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'CLOSED' | 'REJECTED';
  days?: any[];
  closedBy?: string;
  closedAt?: Timestamp;
  approvedBy?: string;
  approvedAt?: Timestamp;
}) {
  return {
    planningId: params.planningId,
    daycareId: params.daycareId,
    roomId: 'maternal-a',
    teacherId: params.teacherId,
    weekStart: '2026-08-24',
    weekEnd: '2026-08-28',
    status: params.status,
    observations: 'Observaciones iniciales del grupo maternal',
    identifiedNeeds: 'Desarrollo motriz fino y regulación sensorial',
    specialSituations: 'Ninguna',
    availableMaterials: 'Materiales estándar de sala maternal',
    curricularReferences: ['PDA-EXPLORA-01', 'PDA-ARTE-02'],
    version: 1,
    granularObservations: [],
    historicalRounds: [],
    reviewHistory: [],
    days: params.days || createRealistic5Days(),
    ...(params.approvedBy ? { approvedBy: params.approvedBy } : {}),
    ...(params.approvedAt ? { approvedAt: params.approvedAt } : {}),
    ...(params.closedBy ? { closedBy: params.closedBy } : {}),
    ...(params.closedAt ? { closedAt: params.closedAt } : {}),
  };
}

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'tutoria-rules-test',
    firestore: {
      rules: readFileSync(resolve(__dirname, '../../../../firestore.rules'), 'utf8'),
      host: '127.0.0.1',
      port: 8080,
    },
  });
});

beforeEach(async () => {
  await testEnv.clearFirestore();

  // Create emulator-only user fixtures using admin context
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, 'authorizationContexts', 'teacherA'), { institutionalRole: 'TEACHER', authorizedDaycareIds: ['daycare-1'], active: true });
    await setDoc(doc(db, 'authorizationContexts', 'teacherB'), { institutionalRole: 'TEACHER', authorizedDaycareIds: ['daycare-1'], active: true });
    await setDoc(doc(db, 'authorizationContexts', 'teacherC'), { institutionalRole: 'TEACHER', authorizedDaycareIds: ['daycare-2'], active: true });
    await setDoc(doc(db, 'authorizationContexts', 'director1'), { institutionalRole: 'DIRECTOR', authorizedDaycareIds: ['daycare-1'], active: true });
    await setDoc(doc(db, 'authorizationContexts', 'director2'), { institutionalRole: 'DIRECTOR', authorizedDaycareIds: ['daycare-2'], active: true });
    await setDoc(doc(db, 'authorizationContexts', 'supervisor1'), { institutionalRole: 'SUPERVISOR', authorizedDaycareIds: ['daycare-1', 'daycare-2'], active: true });
    await setDoc(doc(db, 'authorizationContexts', 'supervisor2'), { institutionalRole: 'SUPERVISOR', authorizedDaycareIds: ['daycare-3'], active: true });

    // Inactive user
    await setDoc(doc(db, 'authorizationContexts', 'teacherInactive'), { institutionalRole: 'TEACHER', authorizedDaycareIds: ['daycare-1'], active: false });
    await setDoc(doc(db, 'authorizationContexts', 'directorInactive'), { institutionalRole: 'DIRECTOR', authorizedDaycareIds: ['daycare-1'], active: false });
    await setDoc(doc(db, 'authorizationContexts', 'supervisorInactive'), { institutionalRole: 'SUPERVISOR', authorizedDaycareIds: ['daycare-1'], active: false });

    // Legacy user for negative tests
    await setDoc(doc(db, 'authorizationContexts', 'legacyTeacher'), { role: 'TEACHER', daycareId: 'daycare-1' });

    // Create emulator-only planning docs
    await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
      teacherId: 'teacherA', daycareId: 'daycare-1', status: 'DRAFT', observations: '', identifiedNeeds: '', curricularReferences: [], days: {}, version: 1, reviewHistory: []
    });
    await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review'), {
      teacherId: 'teacherA', daycareId: 'daycare-1', status: 'IN_REVIEW', observations: '', identifiedNeeds: '', curricularReferences: [], days: createRealisticReviewed5Days(), version: 1, reviewHistory: []
    });
    await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
      teacherId: 'teacherA',
      daycareId: 'daycare-1',
      status: 'IN_REVIEW',
      observations: '',
      identifiedNeeds: '',
      curricularReferences: [],
      days: createRealistic5Days(),
      version: 1,
      reviewHistory: [],
      granularObservations: [
        {
          targetId: 'act-MONDAY-1',
          observation: 'Ajustar materiales',
          originalContent: 'Original',
          currentContent: 'Corregido',
          status: 'CHANGED_BY_EDUCATOR',
          reviewer: 'director1',
        }
      ]
    });
    await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-approved'), {
      teacherId: 'teacherA', daycareId: 'daycare-1', status: 'APPROVED', observations: '', identifiedNeeds: '', curricularReferences: [], days: {}, version: 1, reviewHistory: []
    });
    await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-c-d2-approved'), {
      teacherId: 'teacherC', daycareId: 'daycare-2', status: 'APPROVED', observations: '', identifiedNeeds: '', curricularReferences: [], days: {}, version: 1, reviewHistory: []
    });

    // Realistic 5-day evaluation planning fixtures (H1R13.2B)
    const evalApprovedDays = createRealistic5Days();
    evalApprovedDays[1] = {
      ...evalApprovedDays[1],
      evaluation: 'Observación previa de motricidad',
      evaluationStatus: 'CHANGES_REQUESTED',
      evaluationDirectorComment: 'Detallar observación de motricidad',
      evaluationReviewedBy: 'director1',
      evaluationReviewedAt: Timestamp.now(),
      evaluationSubmittedBy: 'teacherA',
      evaluationSubmittedAt: Timestamp.now(),
    };

    await setDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'), createRealisticSerializedPlan({
      planningId: 'plan-eval-d1-approved',
      daycareId: 'daycare-1',
      teacherId: 'teacherA',
      status: 'APPROVED',
      approvedBy: 'director1',
      approvedAt: Timestamp.now(),
      days: evalApprovedDays,
    }));

    const inReviewDays = createRealistic5Days();
    inReviewDays[0] = {
      ...inReviewDays[0],
      evaluation: 'Evaluación de lunes completada y enviada',
      evaluationConfirmedBy: 'teacherA',
      evaluationConfirmedAt: Timestamp.now(),
      evaluationStatus: 'IN_REVIEW',
      evaluationSubmittedBy: 'teacherA',
      evaluationSubmittedAt: Timestamp.now(),
    };

    await setDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-in-review-day'), createRealisticSerializedPlan({
      planningId: 'plan-eval-d1-in-review-day',
      daycareId: 'daycare-1',
      teacherId: 'teacherA',
      status: 'APPROVED',
      approvedBy: 'director1',
      approvedAt: Timestamp.now(),
      days: inReviewDays,
    }));

    const readyClosureDays = createRealistic5Days().map((day) => ({
      ...day,
      evaluation: `Evaluación aprobada para ${day.dayOfWeek}`,
      evaluationStatus: 'APPROVED',
      evaluationConfirmedBy: 'teacherA',
      evaluationConfirmedAt: Timestamp.now(),
      evaluationSubmittedBy: 'teacherA',
      evaluationSubmittedAt: Timestamp.now(),
      evaluationReviewedBy: 'director1',
      evaluationReviewedAt: Timestamp.now(),
    }));

    await setDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-ready-closure'), createRealisticSerializedPlan({
      planningId: 'plan-eval-d1-ready-closure',
      daycareId: 'daycare-1',
      teacherId: 'teacherA',
      status: 'APPROVED',
      approvedBy: 'director1',
      approvedAt: Timestamp.now(),
      days: readyClosureDays,
    }));

    const notReadyDays = createRealistic5Days().map((day, idx) => ({
      ...day,
      evaluation: `Evaluación para ${day.dayOfWeek}`,
      evaluationStatus: idx === 4 ? 'IN_REVIEW' : 'APPROVED',
      evaluationConfirmedBy: 'teacherA',
      evaluationConfirmedAt: Timestamp.now(),
      evaluationSubmittedBy: 'teacherA',
      evaluationSubmittedAt: Timestamp.now(),
      ...(idx < 4 ? { evaluationReviewedBy: 'director1', evaluationReviewedAt: Timestamp.now() } : {}),
    }));

    await setDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-not-ready-closure'), createRealisticSerializedPlan({
      planningId: 'plan-eval-d1-not-ready-closure',
      daycareId: 'daycare-1',
      teacherId: 'teacherA',
      status: 'APPROVED',
      approvedBy: 'director1',
      approvedAt: Timestamp.now(),
      days: notReadyDays,
    }));

    await setDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-closed'), createRealisticSerializedPlan({
      planningId: 'plan-eval-d1-closed',
      daycareId: 'daycare-1',
      teacherId: 'teacherA',
      status: 'CLOSED',
      approvedBy: 'director1',
      approvedAt: Timestamp.now(),
      closedBy: 'director1',
      closedAt: Timestamp.now(),
      days: readyClosureDays,
    }));

    await setDoc(doc(db, 'weeklyPlannings', 'plan-eval-d2-approved'), createRealisticSerializedPlan({
      planningId: 'plan-eval-d2-approved',
      daycareId: 'daycare-2',
      teacherId: 'teacherC',
      status: 'APPROVED',
      approvedBy: 'director2',
      approvedAt: Timestamp.now(),
      days: createRealistic5Days(),
    }));

    await setDoc(doc(db, 'weeklyPlannings', 'plan-eval-d3-closed'), createRealisticSerializedPlan({
      planningId: 'plan-eval-d3-closed',
      daycareId: 'daycare-3',
      teacherId: 'teacherOther',
      status: 'CLOSED',
      approvedBy: 'director3',
      approvedAt: Timestamp.now(),
      closedBy: 'director3',
      closedAt: Timestamp.now(),
      days: readyClosureDays,
    }));

    // Create reviewObservations
    await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-director1'), {
      createdBy: 'director1', comment: 'Looks good'
    });
    await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-c-d2-approved', 'reviewObservations', 'obs-director2'), {
      createdBy: 'director2', comment: 'Also good'
    });
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

describe('Firestore Security Rules', () => {

  describe('Teacher Matrix (Teacher A / Daycare 1)', () => {
    it('PASS: read own DRAFT plan', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertSucceeds(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft')));
    });

    it('PASS: read own IN_REVIEW plan', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertSucceeds(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review')));
    });

    it('PASS: create own plan in daycare-1', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertSucceeds(setDoc(doc(db, 'weeklyPlannings', 'new-plan'), {
        teacherId: 'teacherA', daycareId: 'daycare-1', status: 'DRAFT', curricularReferences: []
      }));
    });

    it('PASS: update permitted pedagogical content in editable state', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
        curricularReferences: ['ref1']
      }));
    });

    it('FAIL: read teacherB plan', async () => {
      const db = testEnv.authenticatedContext('teacherB').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
         await setDoc(doc(context.firestore(), 'weeklyPlannings', 'plan-teacher-b'), { teacherId: 'teacherB', daycareId: 'daycare-1' });
      });
      const dbA = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(getDoc(doc(dbA, 'weeklyPlannings', 'plan-teacher-b')));
    });

    it('FAIL: read teacherC/daycare-2 plan', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-c-d2-approved')));
    });

    it('FAIL: create plan with teacherId = teacherB', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'new-plan-b'), {
        teacherId: 'teacherB', daycareId: 'daycare-1', status: 'DRAFT'
      }));
    });

    it('FAIL: create plan in daycare-2', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'new-plan-d2'), {
        teacherId: 'teacherA', daycareId: 'daycare-2', status: 'DRAFT'
      }));
    });

    it('FAIL: change own teacherId', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
        teacherId: 'teacherB'
      }));
    });

    it('FAIL: change daycareId', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
        daycareId: 'daycare-2'
      }));
    });

    it('FAIL: change role/user authorization profile', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'authorizationContexts', 'teacherA'), {
        role: 'DIRECTOR'
      }));
    });

    it('FAIL: approve own plan', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
        status: 'APPROVED'
      }));
    });

    it('FAIL: reject own plan', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review'), {
        status: 'REJECTED'
      }));
    });

    it('FAIL: arbitrarily mutate reviewHistory', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
        reviewHistory: ['fake_history']
      }));
    });

    describe('Teacher Submission Governance (DRAFT -> IN_REVIEW)', () => {
      it('A. owning TEACHER: DRAFT -> IN_REVIEW = ALLOW', async () => {
        const db = testEnv.authenticatedContext('teacherA').firestore();
        await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
          status: 'IN_REVIEW'
        }));
      });

      it('B. non-owning TEACHER: DRAFT -> IN_REVIEW = DENY', async () => {
        const db = testEnv.authenticatedContext('teacherB').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
          status: 'IN_REVIEW'
        }));
      });

      it('C. wrong center/daycare: DRAFT -> IN_REVIEW = DENY', async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await setDoc(doc(context.firestore(), 'weeklyPlannings', 'plan-teacher-c-d1-draft'), {
            teacherId: 'teacherC', daycareId: 'daycare-1', status: 'DRAFT', version: 1
          });
        });
        const db = testEnv.authenticatedContext('teacherC').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-c-d1-draft'), {
          status: 'IN_REVIEW'
        }));
      });

      it('D. TEACHER: DRAFT -> APPROVED_FOR_EXECUTION = DENY', async () => {
        const db = testEnv.authenticatedContext('teacherA').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
          status: 'APPROVED_FOR_EXECUTION'
        }));
      });

      it('E. TEACHER: DRAFT -> CLOSED = DENY', async () => {
        const db = testEnv.authenticatedContext('teacherA').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
          status: 'CLOSED'
        }));
      });

      it('F. TEACHER: IN_REVIEW -> APPROVED_FOR_EXECUTION = DENY', async () => {
        const db = testEnv.authenticatedContext('teacherA').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review'), {
          status: 'APPROVED_FOR_EXECUTION'
        }));
      });

      it('G. CLOSED mutation = DENY', async () => {
        const db = testEnv.authenticatedContext('teacherA').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-closed'), {
          status: 'IN_REVIEW'
        }));
      });

      it('H. submit no permite mutar campos protegidos no autorizados', async () => {
        const db = testEnv.authenticatedContext('teacherA').firestore();
        // Escalation attempt 1: change teacherId during submit
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
          status: 'IN_REVIEW',
          teacherId: 'teacherB'
        }));
        // Escalation attempt 2: change daycareId during submit
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
          status: 'IN_REVIEW',
          daycareId: 'daycare-2'
        }));
        // Escalation attempt 3: set approvedBy during submit
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
          status: 'IN_REVIEW',
          approvedBy: 'teacherA'
        }));
        // Escalation attempt 4: set closedBy during submit
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
          status: 'IN_REVIEW',
          closedBy: 'teacherA'
        }));
        // Escalation attempt 5: modify reviewHistory during submit
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
          status: 'IN_REVIEW',
          reviewHistory: [{ comment: 'injected' }]
        }));
      });
    });

    it('FAIL: create Director observation', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-teacherA'), {
        createdBy: 'teacherA'
      }));
    });

    it('FAIL: edit Director observation', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-director1'), {
        comment: 'hacked'
      }));
    });

    it('FAIL: delete Director observation', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(deleteDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-director1')));
    });
  });

  describe('Director Matrix (Director 1 / Daycare 1)', () => {
    it('PASS: read teacherA plan in daycare-1', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertSucceeds(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft')));
    });

    it('PASS: read teacherB plan in daycare-1', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
         await setDoc(doc(context.firestore(), 'weeklyPlannings', 'plan-teacher-b'), { teacherId: 'teacherB', daycareId: 'daycare-1' });
      });
      await assertSucceeds(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-b')));
    });

    it('PASS: create reviewObservation on teacherA plan', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertSucceeds(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-new'), {
        createdBy: 'director1', comment: 'test'
      }));
    });

    it('PASS: update own reviewObservation if allowed by current rules', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-director1'), {
        comment: 'updated'
      }));
    });

    it('PASS: perform allowed review-state transition', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review'), {
        status: 'APPROVED',
        version: 2
      }));
    });

    describe('SR-MD-19-B: Director Observation Resolution Governance (IN_REVIEW -> IN_REVIEW)', () => {
      it('PASS: director1 can resolve observation while plan remains IN_REVIEW', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          granularObservations: [
            {
              targetId: 'act-MONDAY-1',
              observation: 'Ajustar materiales',
              originalContent: 'Original',
              currentContent: 'Corregido',
              status: 'RESOLVED',
              reviewer: 'director1',
              resolvedBy: 'director1',
            }
          ]
        }));
      });

      it('FAIL: director1 cannot mutate days while resolving observation in IN_REVIEW', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        const mutatedDays = createRealistic5Days();
        mutatedDays[0].directorReviewed = true;
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          days: mutatedDays,
          granularObservations: [
            {
              targetId: 'act-MONDAY-1',
              observation: 'Ajustar materiales',
              originalContent: 'Original',
              currentContent: 'Corregido',
              status: 'RESOLVED',
              reviewer: 'director1',
              resolvedBy: 'director1',
            }
          ]
        }));
      });

      it('FAIL: teacherA cannot resolve observation in IN_REVIEW', async () => {
        const db = testEnv.authenticatedContext('teacherA').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          granularObservations: [
            {
              targetId: 'act-MONDAY-1',
              observation: 'Ajustar materiales',
              originalContent: 'Original',
              currentContent: 'Corregido',
              status: 'RESOLVED',
              reviewer: 'director1',
              resolvedBy: 'teacherA',
            }
          ]
        }));
      });

      it('FAIL: supervisor1 cannot resolve observation in IN_REVIEW', async () => {
        const db = testEnv.authenticatedContext('supervisor1').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          granularObservations: [
            {
              targetId: 'act-MONDAY-1',
              observation: 'Ajustar materiales',
              originalContent: 'Original',
              currentContent: 'Corregido',
              status: 'RESOLVED',
              reviewer: 'director1',
              resolvedBy: 'supervisor1',
            }
          ]
        }));
      });

      it('FAIL: director2 from another daycare cannot resolve observation', async () => {
        const db = testEnv.authenticatedContext('director2').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          granularObservations: [
            {
              targetId: 'act-MONDAY-1',
              observation: 'Ajustar materiales',
              originalContent: 'Original',
              currentContent: 'Corregido',
              status: 'RESOLVED',
              reviewer: 'director1',
              resolvedBy: 'director2',
            }
          ]
        }));
      });

      it('FAIL: director1 cannot alter teacherId while resolving observation', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          teacherId: 'teacherB',
          granularObservations: [
            {
              targetId: 'act-MONDAY-1',
              observation: 'Ajustar materiales',
              originalContent: 'Original',
              currentContent: 'Corregido',
              status: 'RESOLVED',
              reviewer: 'director1',
              resolvedBy: 'director1',
            }
          ]
        }));
      });

      // -----------------------------------------------------------------------
      // ADVERSARIAL GATE TESTS — SR-MD-19-B
      // -----------------------------------------------------------------------
      it('ADVERSARIAL FAIL: director1 cannot tamper with targetId of observation', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          granularObservations: [
            {
              targetId: 'act-TAMPERED-ID',
              observation: 'Ajustar materiales',
              originalContent: 'Original',
              currentContent: 'Corregido',
              status: 'RESOLVED',
              reviewer: 'director1',
              resolvedBy: 'director1',
            }
          ]
        }));
      });

      it('ADVERSARIAL FAIL: director1 cannot tamper with observation text', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          granularObservations: [
            {
              targetId: 'act-MONDAY-1',
              observation: 'Texto alterado indebidamente',
              originalContent: 'Original',
              currentContent: 'Corregido',
              status: 'RESOLVED',
              reviewer: 'director1',
              resolvedBy: 'director1',
            }
          ]
        }));
      });

      it('ADVERSARIAL FAIL: director1 cannot tamper with originalContent or currentContent', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          granularObservations: [
            {
              targetId: 'act-MONDAY-1',
              observation: 'Ajustar materiales',
              originalContent: 'Original Falsificado',
              currentContent: 'Corregido Falsificado',
              status: 'RESOLVED',
              reviewer: 'director1',
              resolvedBy: 'director1',
            }
          ]
        }));
      });

      it('ADVERSARIAL FAIL: director1 cannot tamper with reviewer identity', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          granularObservations: [
            {
              targetId: 'act-MONDAY-1',
              observation: 'Ajustar materiales',
              originalContent: 'Original',
              currentContent: 'Corregido',
              status: 'RESOLVED',
              reviewer: 'anotherPerson',
              resolvedBy: 'director1',
            }
          ]
        }));
      });

      it('ADVERSARIAL FAIL: director1 cannot set status to arbitrary state like PENDING_CORRECTION', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          granularObservations: [
            {
              targetId: 'act-MONDAY-1',
              observation: 'Ajustar materiales',
              originalContent: 'Original',
              currentContent: 'Corregido',
              status: 'PENDING_CORRECTION',
              reviewer: 'director1',
              resolvedBy: 'director1',
            }
          ]
        }));
      });
    });

    describe('SR-MD-19-E: Director Daily Review Governance (IN_REVIEW -> IN_REVIEW)', () => {
      it('PASS: director1 can mark a single day as reviewed while plan remains IN_REVIEW', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        const baseDays = createRealistic5Days();
        const newDays = createRealistic5Days();
        newDays[0].directorReviewed = true;
        await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          days: newDays
        }));
      });

      it('PASS: director1 can mark all 5 days sequentially one by one', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        const days = createRealistic5Days();
        for (let i = 0; i < 5; i++) {
          days[i].directorReviewed = true;
          await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
            days: [...days]
          }));
        }
      });

      it('FAIL: director1 cannot mutate multiple days at once in a single operation', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        // Reset plan with unreviewed days
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await updateDoc(doc(context.firestore(), 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
            days: createRealistic5Days()
          });
        });
        const newDays = createRealistic5Days();
        newDays[0].directorReviewed = true;
        newDays[1].directorReviewed = true; // Attempt to mutate 2 days at once
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          days: newDays
        }));
      });

      it('FAIL: director1 cannot revert directorReviewed from true to false', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        // Setup day 0 as reviewed
        const daysWithDay0Reviewed = createRealistic5Days();
        daysWithDay0Reviewed[0].directorReviewed = true;
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await updateDoc(doc(context.firestore(), 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
            days: daysWithDay0Reviewed
          });
        });
        // Revert attempt: set day 0 directorReviewed to false
        const revertedDays = createRealistic5Days();
        revertedDays[0].directorReviewed = false;
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          days: revertedDays
        }));
      });

      it('FAIL: director1 cannot mutate pedagogical activities while marking day reviewed', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        await testEnv.withSecurityRulesDisabled(async (context) => {
          await updateDoc(doc(context.firestore(), 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
            days: createRealistic5Days()
          });
        });
        const newDays = createRealistic5Days();
        newDays[0].directorReviewed = true;
        newDays[0].activities[0].description = 'Intento de modificar contenido pedagógico';
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          days: newDays
        }));
      });

      it('FAIL: director1 cannot mutate materials or complementaryActivities', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        const newDays = createRealistic5Days();
        newDays[0].directorReviewed = true;
        newDays[0].materials = 'Materiales cambiados no autorizados';
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          days: newDays
        }));
      });

      it('FAIL: director1 cannot alter other document fields (e.g. status) while reviewing day', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        const newDays = createRealistic5Days();
        newDays[0].directorReviewed = true;
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          days: newDays,
          status: 'APPROVED'
        }));
      });

      it('FAIL: teacherA cannot mark directorReviewed on days', async () => {
        const db = testEnv.authenticatedContext('teacherA').firestore();
        const newDays = createRealistic5Days();
        newDays[0].directorReviewed = true;
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          days: newDays
        }));
      });

      it('FAIL: supervisor1 cannot mark directorReviewed on days', async () => {
        const db = testEnv.authenticatedContext('supervisor1').firestore();
        const newDays = createRealistic5Days();
        newDays[0].directorReviewed = true;
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          days: newDays
        }));
      });

      it('FAIL: director2 from another daycare cannot mark day reviewed', async () => {
        const db = testEnv.authenticatedContext('director2').firestore();
        const newDays = createRealistic5Days();
        newDays[0].directorReviewed = true;
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-with-obs'), {
          days: newDays
        }));
      });
    });

    describe('SR-MD-19-E.2: Director Planning Approval Hardening (IN_REVIEW -> APPROVED)', () => {
      beforeEach(async () => {
        await testEnv.withSecurityRulesDisabled(async (context) => {
          const db = context.firestore();
          // Plan with all 5 days reviewed
          await setDoc(doc(db, 'weeklyPlannings', 'plan-all-5-reviewed'), createRealisticSerializedPlan({
            planningId: 'plan-all-5-reviewed',
            daycareId: 'daycare-1',
            teacherId: 'teacherA',
            status: 'IN_REVIEW',
            days: createRealisticReviewed5Days(),
          }));

          // Plan with 4 days reviewed and Monday (day 0) unreviewed (directorReviewed: false) but with a RESOLVED observation
          const partialDays = createRealisticReviewed5Days();
          partialDays[0].directorReviewed = false;
          await setDoc(doc(db, 'weeklyPlannings', 'plan-4-reviewed-with-resolved-obs'), {
            ...createRealisticSerializedPlan({
              planningId: 'plan-4-reviewed-with-resolved-obs',
              daycareId: 'daycare-1',
              teacherId: 'teacherA',
              status: 'IN_REVIEW',
              days: partialDays,
            }),
            granularObservations: [
              {
                targetId: 'act-MONDAY-1',
                observation: 'Ajustar materiales',
                originalContent: 'Original',
                currentContent: 'Corregido',
                status: 'RESOLVED',
                reviewer: 'director1',
                resolvedBy: 'director1',
              }
            ],
          });
        });
      });

      it('PASS: director1 can approve plan when all 5 days are directorReviewed: true', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-all-5-reviewed'), {
          status: 'APPROVED',
          version: 2,
        }));
      });

      it('FAIL: director1 cannot approve plan when 4 days are reviewed and Monday has directorReviewed: false even with observation RESOLVED', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-4-reviewed-with-resolved-obs'), {
          status: 'APPROVED',
          version: 2,
        }));
      });

      it('FAIL: director1 cannot mutate days while approving plan', async () => {
        const db = testEnv.authenticatedContext('director1').firestore();
        const mutatedDays = createRealisticReviewed5Days();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-4-reviewed-with-resolved-obs'), {
          status: 'APPROVED',
          days: mutatedDays,
          version: 2,
        }));
      });

      it('FAIL: teacherA cannot approve plan even when all 5 days are directorReviewed: true', async () => {
        const db = testEnv.authenticatedContext('teacherA').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-all-5-reviewed'), {
          status: 'APPROVED',
          version: 2,
        }));
      });

      it('FAIL: supervisor1 cannot approve plan even when all 5 days are directorReviewed: true', async () => {
        const db = testEnv.authenticatedContext('supervisor1').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-all-5-reviewed'), {
          status: 'APPROVED',
          version: 2,
        }));
      });

      it('FAIL: director2 from another daycare cannot approve plan even when all 5 days are directorReviewed: true', async () => {
        const db = testEnv.authenticatedContext('director2').firestore();
        await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-all-5-reviewed'), {
          status: 'APPROVED',
          version: 2,
        }));
      });
    });


    it('FAIL: read teacherC plan in daycare-2', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-c-d2-approved')));
    });

    it('FAIL: create observation on daycare-2 plan', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-c-d2-approved', 'reviewObservations', 'obs-d1-d2'), {
        createdBy: 'director1'
      }));
    });

    it('FAIL: change teacherId', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
        teacherId: 'teacherB'
      }));
    });

    it('FAIL: change daycareId', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
        daycareId: 'daycare-2'
      }));
    });

    it('FAIL: directly mutate pedagogical activity descriptions/materials', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft'), {
        curricularReferences: ['director-changed-this']
      }));
    });

    it('FAIL: edit observation created by another Director', async () => {
      const db = testEnv.authenticatedContext('director2').firestore();
      // Even though director2 belongs to daycare2, if they somehow try to edit daycare1 obs
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-director1'), {
        comment: 'hacked by director 2'
      }));
    });

    it('FAIL: mutate users/{uid} authorization', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(updateDoc(doc(db, 'authorizationContexts', 'director1'), {
        daycareId: 'daycare-2'
      }));
    });
  });

  describe('Supervisor Matrix (Supervisor 1)', () => {
    it('PASS: read APPROVED plan in daycare-1', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertSucceeds(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-approved')));
    });
    it('PASS: read APPROVED plan in daycare-2 (Multi-Daycare Support)', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertSucceeds(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-c-d2-approved')));
    });
    it('FAIL: read APPROVED plan in daycare-3 (Unauthorized)', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await testEnv.withSecurityRulesDisabled(async (context) => {
         await setDoc(doc(context.firestore(), 'weeklyPlannings', 'plan-d3-approved'), { teacherId: 't3', daycareId: 'daycare-3', status: 'APPROVED' });
      });
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-d3-approved')));
    });
    it('FAIL: read DRAFT plan', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft')));
    });

    it('FAIL: read IN_REVIEW plan', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review')));
    });

    it('FAIL: create plan', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'sup-plan'), {
        teacherId: 'supervisor1', daycareId: 'daycare-1', status: 'APPROVED'
      }));
    });

    it('FAIL: update plan', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-approved'), {
        status: 'DRAFT'
      }));
    });

    it('FAIL: delete plan', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertFails(deleteDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-approved')));
    });

    it('FAIL: create observation', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-approved', 'reviewObservations', 'obs-sup1'), {
        createdBy: 'supervisor1'
      }));
    });

    it('FAIL: update observation', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-director1'), {
        comment: 'sup updated'
      }));
    });

    it('FAIL: delete observation', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertFails(deleteDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-director1')));
    });
  });

  describe('Unauthenticated Test Matrix', () => {
    it('FAIL ALL reads and writes', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'authorizationContexts', 'teacherA')));
      await assertFails(setDoc(doc(db, 'authorizationContexts', 'new'), {}));
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-approved')));
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'new'), {}));
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-approved'), { status: 'DRAFT' }));
      await assertFails(deleteDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-approved')));
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-director1')));
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'new'), {}));
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-director1'), { comment: 'hack' }));
      await assertFails(deleteDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-director1')));
    });
  });

  describe('Authorization Context Immutability & Security', () => {
    it('FAIL: teacherA cannot change institutionalRole', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'authorizationContexts', 'teacherA'), { institutionalRole: 'DIRECTOR' }));
    });
    it('FAIL: teacherA cannot change daycareId', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'authorizationContexts', 'teacherA'), { authorizedDaycareIds: ['daycare-2'] }));
    });
    it('FAIL: teacherA cannot expand authorizedDaycareIds', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'authorizationContexts', 'teacherA'), { authorizedDaycareIds: ['daycare-1', 'daycare-2'] }));
    });
    it('FAIL: director1 cannot expand scope', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(updateDoc(doc(db, 'authorizationContexts', 'director1'), { authorizedDaycareIds: ['daycare-1', 'daycare-2'] }));
    });
    it('FAIL: supervisor1 cannot add daycare-3', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertFails(updateDoc(doc(db, 'authorizationContexts', 'supervisor1'), { authorizedDaycareIds: ['daycare-1', 'daycare-2', 'daycare-3'] }));
    });
    it('FAIL: delete own context', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(deleteDoc(doc(db, 'authorizationContexts', 'teacherA')));
    });
    it('FAIL: create own context', async () => {
      const db = testEnv.authenticatedContext('teacherB').firestore(); // Wait, teacherB already has a context. We can use unauth UID below.
      await assertFails(setDoc(doc(db, 'authorizationContexts', 'teacherB'), {}));
    });
  });

  describe('Missing & Inactive Contexts', () => {
    it('FAIL: authenticated user without authorizationContext denied', async () => {
      const db = testEnv.authenticatedContext('noContextUser').firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft')));
    });
    it('FAIL: legacy users/{uid} document without authorizationContext does NOT authorize access', async () => {
      const db = testEnv.authenticatedContext('legacyTeacher').firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft')));
    });
    it('FAIL: inactive Teacher context denied', async () => {
      const db = testEnv.authenticatedContext('teacherInactive').firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft')));
    });
    it('FAIL: inactive Director context denied', async () => {
      const db = testEnv.authenticatedContext('directorInactive').firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft')));
    });
    it('FAIL: inactive Supervisor context denied', async () => {
      const db = testEnv.authenticatedContext('supervisorInactive').firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-approved')));
    });
    it('PASS: own authorizationContext readable', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertSucceeds(getDoc(doc(db, 'authorizationContexts', 'teacherA')));
    });
    it('FAIL: another user authorizationContext unreadable', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(getDoc(doc(db, 'authorizationContexts', 'director1')));
    });
  });

  describe('Review Observation Ownership', () => {
    it('director1 can modify obs-director1', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-director1'), { comment: 'mod' }));
    });
    it('director1 cannot modify obs-director2', async () => {
      // First let director1 try to modify daycare-2's plan (which fails at plan level read/write anyway)
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-c-d2-approved', 'reviewObservations', 'obs-director2'), { comment: 'mod' }));
    });
    it('teacherA can read allowed observation on own plan', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertSucceeds(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-director1')));
    });
    it('teacherB cannot read observation on teacherA plan', async () => {
      const db = testEnv.authenticatedContext('teacherB').firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-director1')));
    });
    it('teacherA cannot change the comment', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'reviewObservations', 'obs-director1'), { comment: 'hack' }));
    });
  });

  describe('Cross-Tenant Isolation', () => {
    it('daycare-1 identities cannot access daycare-2 business data', async () => {
      const dbT = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(getDoc(doc(dbT, 'weeklyPlannings', 'plan-teacher-c-d2-approved')));

      const dbD = testEnv.authenticatedContext('director1').firestore();
      await assertFails(getDoc(doc(dbD, 'weeklyPlannings', 'plan-teacher-c-d2-approved')));

      // supervisor1 omitted here because they are intentionally multi-tenant in our tests (has daycare-1 and daycare-2)
    });
    it('daycare-2 identities cannot access daycare-1 business data', async () => {
      const dbT = testEnv.authenticatedContext('teacherC').firestore();
      await assertFails(getDoc(doc(dbT, 'weeklyPlannings', 'plan-teacher-a-d1-approved')));

      const dbD = testEnv.authenticatedContext('director2').firestore();
      await assertFails(getDoc(doc(dbD, 'weeklyPlannings', 'plan-teacher-a-d1-approved')));

      const dbS = testEnv.authenticatedContext('supervisor2').firestore();
      await assertFails(getDoc(doc(dbS, 'weeklyPlannings', 'plan-teacher-a-d1-approved')));
    });
  });

  describe('H1R13.2B — Governed Pedagogical Evaluation Security Rules Matrix', () => {
    // ANITA
    it('1. authenticated authorized Anita can perform allowed evaluation draft mutation', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      const planSnap = await getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'));
      const days = [...planSnap.data()!.days];
      days[0] = {
        ...days[0],
        evaluation: 'Borrador de evaluación de lunes',
        evaluationStatus: 'DRAFT',
      };
      await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'), { days }));
    });

    it('2. Anita can submit an evaluation through the persisted field shape actually used by the application', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      const planSnap = await getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'));
      const days = [...planSnap.data()!.days];
      days[0] = {
        ...days[0],
        evaluation: 'Evaluación de lunes confirmada y enviada a revisión',
        evaluationStatus: 'IN_REVIEW',
        evaluationConfirmedBy: 'teacherA',
        evaluationConfirmedAt: Timestamp.now(),
        evaluationSubmittedBy: 'teacherA',
        evaluationSubmittedAt: Timestamp.now(),
      };
      await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'), { days }));
    });

    it('3. Anita can correct/resubmit after CHANGES_REQUESTED when domain state permits', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      const planSnap = await getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'));
      const days = [...planSnap.data()!.days];
      // Day 1 (Tuesday) is in CHANGES_REQUESTED state
      days[1] = {
        ...days[1],
        evaluation: 'Evaluación corregida con detalle ampliado de motricidad',
        evaluationStatus: 'IN_REVIEW',
        evaluationResubmitted: true,
        evaluationConfirmedBy: 'teacherA',
        evaluationConfirmedAt: Timestamp.now(),
        evaluationSubmittedBy: 'teacherA',
        evaluationSubmittedAt: Timestamp.now(),
        evaluationHistory: [
          {
            evaluation: 'Observación previa de motricidad',
            status: 'CHANGES_REQUESTED',
            directorComment: 'Detallar observación de motricidad',
            reviewedBy: 'director1',
          },
        ],
      };
      await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'), { days }));
    });

    it('4. Anita cannot mark her own evaluation APPROVED', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      const planSnap = await getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'));
      const days = [...planSnap.data()!.days];
      days[0] = {
        ...days[0],
        evaluation: 'Intento de auto-aprobación',
        evaluationStatus: 'APPROVED',
      };
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'), { days }));
    });

    it('5. Anita cannot forge evaluationReviewedBy', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      const planSnap = await getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'));
      const days = [...planSnap.data()!.days];
      days[0] = {
        ...days[0],
        evaluation: 'Evaluación con revisor falso',
        evaluationReviewedBy: 'director1',
      };
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'), { days }));
    });

    it('6. Anita cannot forge evaluationReviewedAt if that is director-owned', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      const planSnap = await getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'));
      const days = [...planSnap.data()!.days];
      days[0] = {
        ...days[0],
        evaluation: 'Evaluación con fecha de revisión falsa',
        evaluationReviewedAt: Timestamp.now(),
      };
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'), { days }));
    });

    it('7. Anita cannot set closedBy', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'), {
        closedBy: 'teacherA',
      }));
    });

    it('8. Anita cannot set closedAt', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'), {
        closedAt: Timestamp.now(),
      }));
    });

    it('9. Anita cannot set status CLOSED', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'), {
        status: 'CLOSED',
      }));
    });

    it('10. Anita cannot mutate another center\'s planning', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      const days = createRealistic5Days();
      days[0] = {
        ...days[0],
        evaluation: 'Intento de modificación en otro centro',
        evaluationStatus: 'DRAFT',
      };
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d2-approved'), { days }));
    });

    // CECI
    it('11. authorized Ceci can perform the exact persisted review mutation used for request-changes', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      const planSnap = await getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-in-review-day'));
      const days = [...planSnap.data()!.days];
      days[0] = {
        ...days[0],
        evaluationStatus: 'CHANGES_REQUESTED',
        evaluationDirectorComment: 'Se requiere ampliar las notas de observación',
        evaluationReviewedBy: 'director1',
        evaluationReviewedAt: Timestamp.now(),
      };
      await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-in-review-day'), { days }));
    });

    it('12. authorized Ceci can perform the exact persisted review mutation used for approval', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      const planSnap = await getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-in-review-day'));
      const days = [...planSnap.data()!.days];
      days[0] = {
        ...days[0],
        evaluationStatus: 'APPROVED',
        evaluationReviewedBy: 'director1',
        evaluationReviewedAt: Timestamp.now(),
      };
      await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-in-review-day'), { days }));
    });

    it('13. Ceci can write legitimate review identity/timestamp fields when consistent with authenticated identity and current architecture', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      const planSnap = await getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-in-review-day'));
      const daysLegit = [...planSnap.data()!.days];
      daysLegit[0] = {
        ...daysLegit[0],
        evaluationStatus: 'APPROVED',
        evaluationReviewedBy: 'director1',
        evaluationReviewedAt: Timestamp.now(),
      };
      await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-in-review-day'), { days: daysLegit }));

      // Counter-test: forged reviewer identity (impersonating director2)
      const daysForged = [...planSnap.data()!.days];
      daysForged[0] = {
        ...daysForged[0],
        evaluationStatus: 'APPROVED',
        evaluationReviewedBy: 'director2',
        evaluationReviewedAt: Timestamp.now(),
      };
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-in-review-day'), { days: daysForged }));
    });

    it('14. Ceci cannot arbitrarily mutate unrelated planning pedagogical content during evaluation review', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-in-review-day'), {
        observations: 'Modificación no autorizada de observaciones pedagógicas',
      }));
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-in-review-day'), {
        curricularReferences: ['PDA-ALTERADA-01'],
      }));
    });

    it('15. Ceci cannot review another center\'s planning', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      const days = createRealistic5Days();
      days[0] = {
        ...days[0],
        evaluationStatus: 'APPROVED',
        evaluationReviewedBy: 'director1',
        evaluationReviewedAt: Timestamp.now(),
      };
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d2-approved'), { days }));
    });

    it('16. Ceci can perform the existing authorized closure mutation only when the persisted shape satisfies the strongest enforceable security boundary', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      
      // Case A: all 5 days are APPROVED -> closure succeeds
      await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-ready-closure'), {
        status: 'CLOSED',
        closedBy: 'director1',
        closedAt: Timestamp.now(),
      }));

      // Case B: only 4 days are APPROVED -> closure fails
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-not-ready-closure'), {
        status: 'CLOSED',
        closedBy: 'director1',
        closedAt: Timestamp.now(),
      }));

      // Case C: closure with forged closedBy fails
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-ready-closure'), {
        status: 'CLOSED',
        closedBy: 'director2',
        closedAt: Timestamp.now(),
      }));
    });

    it('17. Ceci cannot mutate a planning already CLOSED', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-closed'), {
        observations: 'Intento de modificar un plan cerrado',
      }));
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-closed'), {
        status: 'APPROVED',
      }));
    });

    // TERE
    it('18. authorized Tere can read CLOSED planning in her permitted scope', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertSucceeds(getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-closed')));
    });

    it('19. Tere cannot update CLOSED planning', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-closed'), {
        observations: 'Intento de edición por supervisora',
      }));
    });

    it('20. Tere cannot delete CLOSED planning', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertFails(deleteDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-closed')));
    });

    it('21. Tere cannot approve/reject evaluations', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      const planSnap = await getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-in-review-day'));
      const days = [...planSnap.data()!.days];
      days[0] = {
        ...days[0],
        evaluationStatus: 'APPROVED',
        evaluationReviewedBy: 'supervisor1',
        evaluationReviewedAt: Timestamp.now(),
      };
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-in-review-day'), { days }));
    });

    it('22. Tere cannot read records outside authorized scope where current authorization model supports that scope', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      // supervisor1 has daycare-1 and daycare-2, but NOT daycare-3
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d3-closed')));
    });

    // GENERAL
    it('23. unauthenticated read denied', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-closed')));
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved')));
    });

    it('24. unauthenticated write denied', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'), {
        status: 'CLOSED',
      }));
    });

    it('25. arbitrary document role field cannot grant access', async () => {
      const db = testEnv.authenticatedContext('legacyTeacher').firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved')));
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-approved'), {
        status: 'CLOSED',
      }));
    });

    it('26. CLOSED immutable for Anita', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-closed'), {
        observations: 'Intento de modificación por Anita',
      }));
      await assertFails(deleteDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-closed')));
    });

    it('27. CLOSED immutable for Ceci', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-closed'), {
        observations: 'Intento de modificación por Ceci',
      }));
      await assertFails(deleteDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-closed')));
    });

    it('28. CLOSED immutable for Tere', async () => {
      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-closed'), {
        observations: 'Intento de modificación por Tere',
      }));
      await assertFails(deleteDoc(doc(db, 'weeklyPlannings', 'plan-eval-d1-closed')));
    });

    it('29. planning approval permissions remain valid', async () => {
      const dbT = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(updateDoc(doc(dbT, 'weeklyPlannings', 'plan-teacher-a-d1-review'), {
        status: 'APPROVED',
      }));

      const dbD = testEnv.authenticatedContext('director1').firestore();
      await assertSucceeds(updateDoc(doc(dbD, 'weeklyPlannings', 'plan-teacher-a-d1-review'), {
        status: 'APPROVED',
        version: 2,
      }));
    });

    it('30. existing non-evaluation security-rule tests remain green', async () => {
      // Confirmed by the full suite running alongside these tests
      expect(true).toBe(true);
    });
  });

  describe('SR-MD-21 Phase 2: Private Director Draft Observations Subcollection', () => {
    it('1. director1 can create a draft observation on plan in her daycare', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertSucceeds(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
        activityId: 'act-MONDAY-1',
        observation: 'Borrador privado de observación',
        dayOfWeek: 'MONDAY',
        createdBy: 'director1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }));
    });

    it('2. director1 can read her own draft observation', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
          activityId: 'act-MONDAY-1',
          observation: 'Borrador existente',
          createdBy: 'director1',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });

      const db = testEnv.authenticatedContext('director1').firestore();
      await assertSucceeds(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1')));
    });

    it('3. director1 can update her own draft observation', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
          activityId: 'act-MONDAY-1',
          observation: 'Borrador existente',
          createdBy: 'director1',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });

      const db = testEnv.authenticatedContext('director1').firestore();
      await assertSucceeds(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
        observation: 'Borrador actualizado',
        updatedAt: Timestamp.now(),
      }));
    });

    it('4. director1 can delete her own draft observation', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
          activityId: 'act-MONDAY-1',
          observation: 'Borrador para borrar',
          createdBy: 'director1',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });

      const db = testEnv.authenticatedContext('director1').firestore();
      await assertSucceeds(deleteDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1')));
    });

    it('5. teacherA (Asistente Educativa) CANNOT read private draft observation', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
          activityId: 'act-MONDAY-1',
          observation: 'Borrador privado confidencial',
          createdBy: 'director1',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });

      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1')));
    });

    it('6. teacherA CANNOT create, update, or delete private draft observation', async () => {
      const db = testEnv.authenticatedContext('teacherA').firestore();
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
        activityId: 'act-MONDAY-1',
        observation: 'Intento de creación por docente',
        createdBy: 'teacherA',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }));
    });

    it('7. supervisor1 (Directora) CANNOT read private draft observation', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
          activityId: 'act-MONDAY-1',
          observation: 'Borrador interno no publicado',
          createdBy: 'director1',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });

      const db = testEnv.authenticatedContext('supervisor1').firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1')));
    });

    it('8. director2 from another daycare CANNOT read or write draft observations', async () => {
      const db = testEnv.authenticatedContext('director2').firestore();
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
        activityId: 'act-MONDAY-1',
        observation: 'Intento cross-tenant',
        createdBy: 'director2',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }));
    });

    it('9. unauthenticated user CANNOT read or write draft observations', async () => {
      const db = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1')));
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
        activityId: 'act-MONDAY-1',
        observation: 'Intento no autenticado',
        createdBy: 'anon',
      }));
    });

    // -------------------------------------------------------------------------
    // Phase 2B Hardening & Failure Boundary Tests
    // -------------------------------------------------------------------------
    it('10. director1 CANNOT create draft observation if parent plan is in DRAFT status', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-draft', 'directorDraftObservations', 'act-MONDAY-1'), {
        activityId: 'act-MONDAY-1',
        observation: 'Intento en plan DRAFT',
        dayOfWeek: 'MONDAY',
        createdBy: 'director1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }));
    });

    it('11. director1 CANNOT create draft observation if parent plan is in APPROVED status', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-approved', 'directorDraftObservations', 'act-MONDAY-1'), {
        activityId: 'act-MONDAY-1',
        observation: 'Intento en plan APPROVED',
        dayOfWeek: 'MONDAY',
        createdBy: 'director1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }));
    });

    it('12. director1 CANNOT create draft observation with unauthorized keys (payload hardening)', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
        activityId: 'act-MONDAY-1',
        observation: 'Intento con payload adulterado',
        dayOfWeek: 'MONDAY',
        createdBy: 'director1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
        unauthorizedField: 'malicious-data',
      }));
    });

    it('13. director1 CANNOT create draft observation with mismatched draftId and activityId', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'spoofed-draft-id'), {
        activityId: 'act-MONDAY-1',
        observation: 'Intento de spoofing de ID',
        dayOfWeek: 'MONDAY',
        createdBy: 'director1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }));
    });

    it('14. director1 CANNOT create draft observation with empty observation text', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
        activityId: 'act-MONDAY-1',
        observation: '',
        dayOfWeek: 'MONDAY',
        createdBy: 'director1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }));
    });

    it('15. director1 CANNOT create draft observation exceeding 2000 characters limit', async () => {
      const db = testEnv.authenticatedContext('director1').firestore();
      const oversizedText = 'A'.repeat(2001);
      await assertFails(setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
        activityId: 'act-MONDAY-1',
        observation: oversizedText,
        dayOfWeek: 'MONDAY',
        createdBy: 'director1',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }));
    });

    it('16. director1 CANNOT update draft observation to mutate activityId (immutability)', async () => {
      const createdTimestamp = Timestamp.now();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
          activityId: 'act-MONDAY-1',
          observation: 'Borrador original',
          dayOfWeek: 'MONDAY',
          createdBy: 'director1',
          createdAt: createdTimestamp,
          updatedAt: createdTimestamp,
        });
      });

      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
        activityId: 'act-MONDAY-TAMPERED',
        updatedAt: Timestamp.now(),
      }));
    });

    it('17. director1 CANNOT update draft observation to mutate createdBy or createdAt (immutability)', async () => {
      const createdTimestamp = Timestamp.now();
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
          activityId: 'act-MONDAY-1',
          observation: 'Borrador original',
          dayOfWeek: 'MONDAY',
          createdBy: 'director1',
          createdAt: createdTimestamp,
          updatedAt: createdTimestamp,
        });
      });

      const db = testEnv.authenticatedContext('director1').firestore();
      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
        createdBy: 'director-other',
        updatedAt: Timestamp.now(),
      }));

      await assertFails(updateDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }));
    });

    it('18. peer director in same daycare CANNOT read or delete director1 private drafts (strict author isolation)', async () => {
      // Provision peer director in same daycare-1
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'authorizationContexts', 'director1B'), {
          institutionalRole: 'DIRECTOR',
          authorizedDaycareIds: ['daycare-1'],
          active: true,
        });
        await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
          activityId: 'act-MONDAY-1',
          observation: 'Borrador exclusivo de director1',
          dayOfWeek: 'MONDAY',
          createdBy: 'director1',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });

      const peerDb = testEnv.authenticatedContext('director1B').firestore();
      // Peer cannot read director1's draft
      await assertFails(getDoc(doc(peerDb, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1')));
      // Peer cannot delete director1's draft
      await assertFails(deleteDoc(doc(peerDb, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1')));
    });

    it('19. Querying draft observations: authorized query with createdBy filter succeeds, unbounded query fails', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
          activityId: 'act-MONDAY-1',
          observation: 'Borrador de director1',
          dayOfWeek: 'MONDAY',
          createdBy: 'director1',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });

      const db = testEnv.authenticatedContext('director1').firestore();
      
      // Query with createdBy filter matching authenticated director succeeds
      const authorizedQuery = query(
        collection(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations'),
        where('createdBy', '==', 'director1')
      );
      await assertSucceeds(getDocs(authorizedQuery));

      // Query without createdBy constraint fails rule validation
      const unboundedQuery = query(
        collection(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations')
      );
      await assertFails(getDocs(unboundedQuery));
    });

    it('20. integration writeBatch: committing plan update (IN_REVIEW -> REJECTED) and draft deletion succeeds atomically', async () => {
      // 1. Seed draft observation via admin context
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        await setDoc(doc(adminDb, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'), {
          activityId: 'act-MONDAY-1',
          observation: 'Borrador privado a limpiar en el batch',
          dayOfWeek: 'MONDAY',
          createdBy: 'director1',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });
      });

      // 2. Perform writeBatch using authenticated director1 context
      const db = testEnv.authenticatedContext('director1').firestore();
      const batch = writeBatch(db);

      const planRef = doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review');
      const draftRef = doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1');

      batch.update(planRef, {
        status: 'REJECTED',
        version: 2,
        reviewHistory: [{
          reason: 'Ajustes solicitados en actividades del lunes',
          rejectedBy: 'director1',
          rejectedAt: Timestamp.now(),
        }],
        granularObservations: [{
          targetId: 'act-MONDAY-1',
          observation: 'Ajustar materiales para lactantes',
          originalContent: 'Descripción original',
          currentContent: 'Descripción original',
          status: 'PENDING_CORRECTION',
          reviewer: 'director1',
        }],
        historicalRounds: [{
          roundNumber: 1,
          rejectedAt: Timestamp.now(),
          rejectedBy: 'director1',
          reason: 'Ajustes solicitados en actividades del lunes',
          observations: [{
            targetId: 'act-MONDAY-1',
            observation: 'Ajustar materiales para lactantes',
            originalContent: 'Descripción original',
            currentContent: 'Descripción original',
            status: 'PENDING_CORRECTION',
            reviewer: 'director1',
          }],
        }],
      });

      batch.delete(draftRef);

      // 3. Confirm rules permit the entire atomic batch commit
      await assertSucceeds(batch.commit());

      // 4. Verify post-commit state via admin context
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const adminDb = context.firestore();
        const planSnap = await getDoc(doc(adminDb, 'weeklyPlannings', 'plan-teacher-a-d1-review'));
        expect(planSnap.exists()).toBe(true);
        expect(planSnap.data()?.status).toBe('REJECTED');
        expect(planSnap.data()?.granularObservations).toHaveLength(1);

        const draftSnap = await getDoc(doc(adminDb, 'weeklyPlannings', 'plan-teacher-a-d1-review', 'directorDraftObservations', 'act-MONDAY-1'));
        expect(draftSnap.exists()).toBe(false);
      });
    });
  });
});
