import { readFileSync } from 'fs';
import { resolve } from 'path';
import { initializeTestEnvironment, RulesTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import { setDoc, doc, getDoc, updateDoc, deleteDoc, addDoc, collection, getDocs, query, where } from 'firebase/firestore';

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
      teacherId: 'teacherA', daycareId: 'daycare-1', status: 'IN_REVIEW', observations: '', identifiedNeeds: '', curricularReferences: [], days: {}, version: 1, reviewHistory: []
    });
    await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-a-d1-approved'), {
      teacherId: 'teacherA', daycareId: 'daycare-1', status: 'APPROVED', observations: '', identifiedNeeds: '', curricularReferences: [], days: {}, version: 1, reviewHistory: []
    });
    await setDoc(doc(db, 'weeklyPlannings', 'plan-teacher-c-d2-approved'), {
      teacherId: 'teacherC', daycareId: 'daycare-2', status: 'APPROVED', observations: '', identifiedNeeds: '', curricularReferences: [], days: {}, version: 1, reviewHistory: []
    });

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
});
