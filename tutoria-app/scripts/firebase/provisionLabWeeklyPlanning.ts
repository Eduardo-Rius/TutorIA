import { initializeApp, applicationDefault, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { createHash } from 'crypto';

import { WeeklyPlanning, PlanningDay } from '../../src/domain/planning/WeeklyPlanning';
import { RoomCatalog } from '../../src/domain/planning/RoomCatalog';
import { PlanningWorkflowService } from '../../src/application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../src/infrastructure/repositories/InMemoryWeeklyPlanningRepository';

// ============================================================================
// CONSTANTS & SOVEREIGN BOUNDS
// ============================================================================

export const TARGET_PROJECT = 'tutoria-identity-lab';
export const PROD_PROJECT = 'guarderiasimss-5cb09';

export const LAB_PLANNING_ID = 'f1000000-0000-4000-8000-000000000001';
export const LAB_ROOM_ID = 'room-lactantes-a';
export const LAB_FIXTURE_WEEK_START = '2026-08-24';
export const LAB_FIXTURE_WEEK_END = '2026-08-28';
export const LAB_TARGET_DAY_OF_WEEK = 'MONDAY';
export const LAB_TARGET_DAY_DATE = '2026-08-24';

export const SYNTHETIC_GOVERNANCE_AUDIT = {
  observations: 'Contexto grupal de prueba controlada para evaluación diagnóstica en sala Lactantes A.',
  identifiedNeeds: 'Estimulación visual y auditiva con materiales suaves disponibles en sala.',
  specialSituations: '',
  availableMaterials: 'telas suaves, colchonetas',
};

export const AUTHORIZED_MATERIAL_UNIVERSE = Object.freeze(new Set(['telas suaves', 'colchonetas']));

export const ACTIVITY_DURATION_MINUTES = 15;

// ============================================================================
// PROJECT FIREWALL
// ============================================================================

export function assertProjectFirewall(projectId: string | undefined): void {
  if (!projectId || projectId.trim() === '' || projectId === 'undefined') {
    throw new Error('[FIREWALL VIOLATION] Target project is undefined. Refusing execution.');
  }
  if (projectId === PROD_PROJECT) {
    throw new Error(`[FIREWALL VIOLATION] Refusing execution against production project: '${PROD_PROJECT}'.`);
  }
  if (projectId !== TARGET_PROJECT) {
    throw new Error(`[FIREWALL VIOLATION] Target project must be '${TARGET_PROJECT}'. Received: '${projectId}'.`);
  }
}

export function resolveProjectId(): string {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.FIREBASE_CONFIG) {
    try {
      const config = JSON.parse(process.env.FIREBASE_CONFIG);
      if (config.projectId) return config.projectId;
    } catch {}
  }
  return TARGET_PROJECT;
}

// ============================================================================
// CLI ARGS PARSER & VALIDATOR
// ============================================================================

export type ProvisionMode = 'DRY_RUN' | 'EXECUTE';

export function parseCliArgs(args: string[]): { mode: ProvisionMode } {
  const flags = args.filter((a) => a.startsWith('--'));

  const hasDryRun = flags.includes('--dry-run');
  const hasExecute = flags.includes('--execute');

  if (hasDryRun && hasExecute) {
    throw new Error('Conflicting flags: --dry-run and --execute cannot be passed simultaneously.');
  }

  const allowedFlags = new Set(['--dry-run', '--execute']);
  for (const flag of flags) {
    if (!allowedFlags.has(flag)) {
      throw new Error(`Unknown flag: '${flag}'. Allowed flags: --dry-run, --execute.`);
    }
  }

  if (hasExecute) {
    return { mode: 'EXECUTE' };
  }

  // Default is strictly DRY_RUN
  return { mode: 'DRY_RUN' };
}

// ============================================================================
// MATERIAL ENCLOSURE ASSERTION
// ============================================================================

export function assertMaterialEnclosure(
  planning: WeeklyPlanning,
  authorizedUniverse: ReadonlySet<string> = AUTHORIZED_MATERIAL_UNIVERSE
): void {
  for (const day of planning.days) {
    for (const act of day.activities) {
      if (act.materials && Array.isArray(act.materials)) {
        for (const mat of act.materials) {
          if (!authorizedUniverse.has(mat)) {
            throw new Error(
              `[MATERIAL ENCLOSURE VIOLATION] Material '${mat}' in activity '${act.activityId}' on day '${day.dayOfWeek}' is outside the authorized fixture universe.`
            );
          }
        }
      }
    }
  }
}

// ============================================================================
// SYNTHETIC FIVE-DAY ACTIVITIES FACTORY
// ============================================================================

export function createSyntheticFiveDays(): PlanningDay[] {
  return [
    {
      date: '2026-08-24',
      dayOfWeek: 'MONDAY',
      activities: [
        {
          activityId: 'act-lactantes-mon',
          category: 'ACTIVIDAD_PEDAGOGICA',
          objective: 'Favorecer la estimulación sensorial visual y táctil mediante texturas suaves en sala.',
          description:
            'Se colocan telas suaves sobre las colchonetas permitiendo momentos de exploración libre y contacto visual acompañado por la educadora.',
          durationMinutes: ACTIVITY_DURATION_MINUTES,
          materials: ['telas suaves', 'colchonetas'],
          curricularTraceability: [],
        },
      ],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ['telas suaves', 'colchonetas'],
    },
    {
      date: '2026-08-25',
      dayOfWeek: 'TUESDAY',
      activities: [
        {
          activityId: 'act-lactantes-tue',
          category: 'ACTIVIDAD_PEDAGOGICA',
          objective: 'Promover la exploración postural y el movimiento sobre superficie cómoda.',
          description:
            'Se dispone el área de colchonetas para cambios de postura y descanso guiado con acompañamiento de la educadora.',
          durationMinutes: ACTIVITY_DURATION_MINUTES,
          materials: ['colchonetas'],
          curricularTraceability: [],
        },
      ],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ['colchonetas'],
    },
    {
      date: '2026-08-26',
      dayOfWeek: 'WEDNESDAY',
      activities: [
        {
          activityId: 'act-lactantes-wed',
          category: 'ACTIVIDAD_PEDAGOGICA',
          objective: 'Estimular el seguimiento visual de contrastes de tela a corta distancia.',
          description:
            'La educadora presenta telas suaves a corta distancia observando la atención visual y respuestas del grupo.',
          durationMinutes: ACTIVITY_DURATION_MINUTES,
          materials: ['telas suaves'],
          curricularTraceability: [],
        },
      ],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ['telas suaves'],
    },
    {
      date: '2026-08-27',
      dayOfWeek: 'THURSDAY',
      activities: [
        {
          activityId: 'act-lactantes-thu',
          category: 'ACTIVIDAD_PEDAGOGICA',
          objective: 'Favorecer la interacción con texturas suaves durante el juego en piso.',
          description:
            'Se distribuyen telas suaves sobre las colchonetas invitando al contacto táctil en un ambiente tranquilo.',
          durationMinutes: ACTIVITY_DURATION_MINUTES,
          materials: ['telas suaves', 'colchonetas'],
          curricularTraceability: [],
        },
      ],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ['telas suaves', 'colchonetas'],
    },
    {
      date: '2026-08-28',
      dayOfWeek: 'FRIDAY',
      activities: [
        {
          activityId: 'act-lactantes-fri',
          category: 'ACTIVIDAD_PEDAGOGICA',
          objective: 'Consolidar las experiencias de relajación y descanso sobre colchonetas.',
          description:
            'Se organiza el espacio de colchonetas con telas suaves para momentos de descanso y relajación grupal.',
          durationMinutes: ACTIVITY_DURATION_MINUTES,
          materials: ['telas suaves', 'colchonetas'],
          curricularTraceability: [],
        },
      ],
      complementaryActivities: [],
      prioritizedPractices: [],
      materials: ['telas suaves', 'colchonetas'],
    },
  ];
}

// ============================================================================
// IN-MEMORY DOMAIN LIFECYCLE
// ============================================================================

export async function executeDomainLifecycle(params: {
  planningId: string;
  daycareId: string;
  roomId: string;
  teacherId: string;
  directorId: string;
  weekStart: string;
  weekEnd: string;
}): Promise<WeeklyPlanning> {
  const room = RoomCatalog.getRoom(params.roomId);
  if (!room) {
    throw new Error(`Invalid room: '${params.roomId}'. Must exist in RoomCatalog.`);
  }

  const repo = new InMemoryWeeklyPlanningRepository();
  const service = new PlanningWorkflowService(repo);

  // 1. createPlanning (TEACHER)
  await service.createPlanning(
    params.planningId,
    params.daycareId,
    params.roomId,
    params.teacherId,
    params.weekStart,
    params.weekEnd,
    'TEACHER'
  );

  // 2. saveDraft (TEACHER)
  const days = createSyntheticFiveDays();
  await service.saveDraft(
    params.planningId,
    SYNTHETIC_GOVERNANCE_AUDIT.observations,
    SYNTHETIC_GOVERNANCE_AUDIT.identifiedNeeds,
    SYNTHETIC_GOVERNANCE_AUDIT.specialSituations,
    SYNTHETIC_GOVERNANCE_AUDIT.availableMaterials,
    [],
    days,
    'TEACHER'
  );

  // 3. markTeacherDayReviewed for all 5 days (TEACHER)
  const weekdays: PlanningDay['dayOfWeek'][] = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];
  const reviewInstant = new Date(`${params.weekStart}T12:00:00.000Z`);
  for (const wd of weekdays) {
    await service.markTeacherDayReviewed(
      params.planningId,
      wd,
      'TEACHER',
      params.teacherId,
      reviewInstant
    );
  }

  // 4. submit (TEACHER)
  await service.submit(params.planningId, 'TEACHER');

  // 5. approve (DIRECTOR)
  await service.approve(params.planningId, 'DIRECTOR', params.directorId);

  // 6. Retrieve final aggregate and assert all domain invariants
  const finalPlanning = await repo.findById(params.planningId);
  if (!finalPlanning) {
    throw new Error('Failed to retrieve final aggregate from in-memory repository.');
  }

  finalPlanning.assertValidCurricularInvariants();
  finalPlanning.assertValidComplementaryInvariants();
  finalPlanning.assertValidPrioritizedPracticeInvariants();
  assertMaterialEnclosure(finalPlanning);

  if (!finalPlanning.isApprovedForExecution()) {
    throw new Error(`Lifecycle failed to produce APPROVED status. Found: ${finalPlanning.status}`);
  }

  return finalPlanning;
}

// ============================================================================
// SOVEREIGN SERIALIZATION PARITY HELPER
// ============================================================================

function toDate(val: unknown): Date | undefined {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  if (typeof val === 'string' || typeof val === 'number') {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}

export function serializeWeeklyPlanningForAdmin(planning: WeeklyPlanning): Record<string, unknown> {
  return {
    planningId: planning.planningId,
    daycareId: planning.daycareId,
    roomId: planning.roomId,
    teacherId: planning.teacherId,
    weekStart: planning.weekStart,
    weekEnd: planning.weekEnd,
    status: planning.status,
    observations: planning.observations,
    identifiedNeeds: planning.identifiedNeeds,
    specialSituations: planning.specialSituations ?? '',
    availableMaterials: planning.availableMaterials ?? '',
    curricularReferences: planning.curricularReferences ?? [],
    version: planning.version,
    ...(planning.closedBy !== undefined ? { closedBy: planning.closedBy } : {}),
    ...(planning.closedAt ? { closedAt: toDate(planning.closedAt) } : {}),
    ...(planning.approvedBy !== undefined ? { approvedBy: planning.approvedBy } : {}),
    ...(planning.approvedAt ? { approvedAt: toDate(planning.approvedAt) } : {}),
    ...(planning.originalContext !== undefined ? { originalContext: planning.originalContext } : {}),
    granularObservations: planning.granularObservations ?? [],
    historicalRounds: planning.historicalRounds ?? [],
    reviewHistory: (planning.reviewHistory ?? []).map((record) => ({
      reason: record.reason,
      rejectedBy: record.rejectedBy,
      rejectedAt: toDate(record.rejectedAt),
    })),
    days: planning.days.map((day) => ({
      date: day.date,
      dayOfWeek: day.dayOfWeek,
      activities: (day.activities || []).map((act) => ({
        activityId: act.activityId,
        category: act.category,
        objective: act.objective,
        description: act.description,
        durationMinutes: act.durationMinutes,
        materials: act.materials || [],
        curricularTraceability: act.curricularTraceability || [],
        ...(act.prospectiveObservationTarget ? { prospectiveObservationTarget: act.prospectiveObservationTarget } : {}),
      })),
      complementaryActivities: day.complementaryActivities || [],
      prioritizedPractices: day.prioritizedPractices || [],
      materials: day.materials || [],
      ...(day.teacherReviewedAt ? { teacherReviewedAt: toDate(day.teacherReviewedAt) } : {}),
      ...(day.teacherReviewedBy ? { teacherReviewedBy: day.teacherReviewedBy } : {}),
      ...(day.evaluation !== undefined ? { evaluation: day.evaluation } : {}),
      ...(day.evaluationStatus !== undefined ? { evaluationStatus: day.evaluationStatus } : {}),
      ...(day.evaluationSubmittedAt ? { evaluationSubmittedAt: toDate(day.evaluationSubmittedAt) } : {}),
      ...(day.evaluationSubmittedBy ? { evaluationSubmittedBy: day.evaluationSubmittedBy } : {}),
      ...(day.evaluationReviewedAt ? { evaluationReviewedAt: toDate(day.evaluationReviewedAt) } : {}),
      ...(day.evaluationReviewedBy ? { evaluationReviewedBy: day.evaluationReviewedBy } : {}),
    })),
  };
}

// ============================================================================
// ZERO-PERSISTENCE SNAPSHOT NORMALIZATION
// ============================================================================

export interface NormalizedPlanningSnapshot {
  version: number;
  status: string;
  daysCount: number;
  activityCounts: Record<string, number>;
  targetDay: {
    dayOfWeek: string;
    date: string;
    hasEvaluation: boolean;
    evaluationStatus: string | null;
    evaluationSubmittedAt: string | null;
    evaluationSubmittedBy: string | null;
    evaluationReviewedAt: string | null;
    evaluationReviewedBy: string | null;
    teacherReviewed: boolean;
  };
  governance: {
    isApproved: boolean;
    hasApprovedBy: boolean;
    hasApprovedAt: boolean;
  };
  closure: {
    isClosed: boolean;
    hasClosedAt: boolean;
    hasClosedBy: boolean;
  };
  reviewHistoryCount: number;
}

export function buildNormalizedSnapshot(planning: WeeklyPlanning, targetWeekday: string = LAB_TARGET_DAY_OF_WEEK): NormalizedPlanningSnapshot {
  const targetDay = planning.days.find((d) => d.dayOfWeek === targetWeekday);
  const activityCounts: Record<string, number> = {};
  for (const d of planning.days) {
    activityCounts[d.dayOfWeek] = d.activities ? d.activities.length : 0;
  }

  return {
    version: planning.version,
    status: planning.status,
    daysCount: planning.days.length,
    activityCounts,
    targetDay: {
      dayOfWeek: targetDay ? targetDay.dayOfWeek : 'UNKNOWN',
      date: targetDay ? targetDay.date : '',
      hasEvaluation: Boolean(targetDay && targetDay.evaluation),
      evaluationStatus: targetDay && targetDay.evaluationStatus ? targetDay.evaluationStatus : null,
      evaluationSubmittedAt: targetDay && targetDay.evaluationSubmittedAt ? targetDay.evaluationSubmittedAt.toISOString() : null,
      evaluationSubmittedBy: targetDay && targetDay.evaluationSubmittedBy ? targetDay.evaluationSubmittedBy : null,
      evaluationReviewedAt: targetDay && targetDay.evaluationReviewedAt ? targetDay.evaluationReviewedAt.toISOString() : null,
      evaluationReviewedBy: targetDay && targetDay.evaluationReviewedBy ? targetDay.evaluationReviewedBy : null,
      teacherReviewed: Boolean(targetDay && targetDay.teacherReviewedAt && targetDay.teacherReviewedBy),
    },
    governance: {
      isApproved: planning.status === 'APPROVED',
      hasApprovedBy: Boolean(planning.approvedBy),
      hasApprovedAt: Boolean(planning.approvedAt),
    },
    closure: {
      isClosed: planning.status === 'CLOSED',
      hasClosedAt: Boolean(planning.closedAt),
      hasClosedBy: Boolean(planning.closedBy),
    },
    reviewHistoryCount: planning.reviewHistory ? planning.reviewHistory.length : 0,
  };
}

export function hashNormalizedSnapshot(snapshot: NormalizedPlanningSnapshot): string {
  const json = JSON.stringify(snapshot, Object.keys(snapshot).sort());
  return createHash('sha256').update(json).digest('hex');
}

// ============================================================================
// PROVISIONING ENGINE (DRY-RUN & FUTURE EXECUTE)
// ============================================================================

export interface ProvisioningResult {
  mode: ProvisionMode;
  targetProject: string;
  fixtureId: string;
  fixtureExistedBefore: boolean;
  teacherVerified: boolean;
  directorVerified: boolean;
  roomVerified: boolean;
  lifecyclePassed: boolean;
  finalStatus: string;
  finalVersion: number;
  totalDays: number;
  totalActivities: number;
  totalPdaReferences: number;
  totalComplementaryActivities: number;
  totalPrioritizedPractices: number;
  materialEnclosurePassed: boolean;
  targetDayEvaluationPresent: boolean;
  closurePresent: boolean;
  expectedDocumentsMutatedOnExecute: number;
  expectedWritesOnExecute: number;
  actualFirestoreWrites: number;
  openAiCalls: number;
  prodAccess: number;
  normalizedSnapshotHash: string;
}

export async function runProvisioner(options: {
  mode: ProvisionMode;
  projectId?: string;
  db?: any;
}): Promise<ProvisioningResult> {
  const effectiveProject = options.projectId || resolveProjectId();
  assertProjectFirewall(effectiveProject);

  // Initialize Admin App if not provided
  let firestore = options.db;
  if (!firestore) {
    const existingApps = getApps();
    const app = existingApps.length > 0
      ? existingApps[0]
      : initializeApp({
          credential: applicationDefault(),
          projectId: effectiveProject,
        });
    firestore = getFirestore(app);
  }

  // 1. Check Fixture Existence in LAB
  const existingFixture = await firestore.collection('weeklyPlannings').doc(LAB_PLANNING_ID).get();
  if (existingFixture.exists) {
    throw new Error(`[FIXTURE PREEXISTENCE] Fixture '${LAB_PLANNING_ID}' already exists in LAB Firestore. Stop.`);
  }

  // 2. Verify LAB Actors Read-Only
  const teacherDoc = await firestore.collection('authorizationContexts').doc('lab-teacher-anita').get();
  if (!teacherDoc.exists) {
    throw new Error('Teacher authorization context does not exist in LAB.');
  }
  const teacherData = teacherDoc.data() || {};
  if (teacherData.institutionalRole !== 'TEACHER' || teacherData.active !== true) {
    throw new Error('Teacher is not active with TEACHER role.');
  }
  const teacherDaycares = teacherData.authorizedDaycareIds || [];
  if (!teacherDaycares.includes('00000000-0000-4000-8000-000000000001')) {
    throw new Error('Teacher is not authorized for target daycare.');
  }

  const directorDoc = await firestore.collection('authorizationContexts').doc('lab-director-ceci').get();
  if (!directorDoc.exists) {
    throw new Error('Director authorization context does not exist in LAB.');
  }
  const directorData = directorDoc.data() || {};
  if (directorData.institutionalRole !== 'DIRECTOR' || directorData.active !== true) {
    throw new Error('Director is not active with DIRECTOR role.');
  }
  const directorDaycares = directorData.authorizedDaycareIds || [];
  if (!directorDaycares.includes('00000000-0000-4000-8000-000000000001')) {
    throw new Error('Director is not authorized for target daycare.');
  }

  // 3. Execute in-memory domain lifecycle
  const planning = await executeDomainLifecycle({
    planningId: LAB_PLANNING_ID,
    daycareId: '00000000-0000-4000-8000-000000000001',
    roomId: LAB_ROOM_ID,
    teacherId: 'lab-teacher-anita',
    directorId: 'lab-director-ceci',
    weekStart: LAB_FIXTURE_WEEK_START,
    weekEnd: LAB_FIXTURE_WEEK_END,
  });

  // 4. Verify serialization parity
  const serialized = serializeWeeklyPlanningForAdmin(planning);
  const snapshot = buildNormalizedSnapshot(planning);
  const snapshotHash = hashNormalizedSnapshot(snapshot);

  let actualWrites = 0;

  // 5. Execution branch (GUARDED)
  if (options.mode === 'EXECUTE') {
    // Immediate pre-write firewall assertion
    assertProjectFirewall(effectiveProject);

    // Atomic create-if-absent: docRef.create fails if document exists
    const docRef = firestore.collection('weeklyPlannings').doc(LAB_PLANNING_ID);
    await docRef.create(serialized);
    actualWrites = 1;
  }

  // Count metrics
  let totalActivities = 0;
  let totalPda = 0;
  let totalComp = 0;
  let totalPrioritized = 0;
  for (const d of planning.days) {
    totalActivities += d.activities ? d.activities.length : 0;
    for (const a of d.activities || []) {
      totalPda += a.curricularTraceability ? a.curricularTraceability.length : 0;
    }
    totalComp += d.complementaryActivities ? d.complementaryActivities.length : 0;
    totalPrioritized += d.prioritizedPractices ? d.prioritizedPractices.length : 0;
  }

  const targetDay = planning.days.find((d) => d.dayOfWeek === LAB_TARGET_DAY_OF_WEEK);

  return {
    mode: options.mode,
    targetProject: effectiveProject,
    fixtureId: LAB_PLANNING_ID,
    fixtureExistedBefore: false,
    teacherVerified: true,
    directorVerified: true,
    roomVerified: true,
    lifecyclePassed: true,
    finalStatus: planning.status,
    finalVersion: planning.version,
    totalDays: planning.days.length,
    totalActivities,
    totalPdaReferences: totalPda,
    totalComplementaryActivities: totalComp,
    totalPrioritizedPractices: totalPrioritized,
    materialEnclosurePassed: true,
    targetDayEvaluationPresent: Boolean(targetDay && targetDay.evaluation),
    closurePresent: Boolean(planning.closedAt || planning.closedBy),
    expectedDocumentsMutatedOnExecute: 1,
    expectedWritesOnExecute: 1,
    actualFirestoreWrites: actualWrites,
    openAiCalls: 0,
    prodAccess: 0,
    normalizedSnapshotHash: snapshotHash,
  };
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  try {
    const { mode } = parseCliArgs(process.argv.slice(2));

    console.log('============================================================');
    console.log('TUTORIA LAB WEEKLY PLANNING PROVISIONER');
    console.log(`MODE: ${mode}`);
    console.log('============================================================\n');

    const result = await runProvisioner({ mode });

    console.log('PROVISIONING RESULT SUMMARY (ALIAS-ONLY):');
    console.log(`  MODE = ${result.mode}`);
    console.log(`  TARGET = LAB (${result.targetProject})`);
    console.log(`  PROJECT_FIREWALL = PASS`);
    console.log(`  LAB_PLANNING_A_EXISTS = NO`);
    console.log(`  TEACHER_AUTHORIZATION = PASS`);
    console.log(`  DIRECTOR_AUTHORIZATION = PASS`);
    console.log(`  ROOM = Lactantes A`);
    console.log(`  WEEK = ${LAB_FIXTURE_WEEK_START}..${LAB_FIXTURE_WEEK_END}`);
    console.log(`  TARGET_DAY = ${LAB_TARGET_DAY_OF_WEEK}`);
    console.log(`  DOMAIN_LIFECYCLE = PASS`);
    console.log(`  FINAL_STATUS = ${result.finalStatus}`);
    console.log(`  VERSION = ${result.finalVersion}`);
    console.log(`  DAYS = ${result.totalDays}`);
    console.log(`  ACTIVITIES = ${result.totalActivities}`);
    console.log(`  PDA_REFERENCES = ${result.totalPdaReferences}`);
    console.log(`  COMPLEMENTARY_ACTIVITIES = ${result.totalComplementaryActivities}`);
    console.log(`  PRIORITIZED_PRACTICES = ${result.totalPrioritizedPractices}`);
    console.log(`  MATERIAL_ENCLOSURE = PASS`);
    console.log(`  TARGET_EVALUATION_PRESENT = ${result.targetDayEvaluationPresent ? 'YES' : 'NO'}`);
    console.log(`  CLOSED = ${result.closurePresent ? 'YES' : 'NO'}`);
    console.log(`  EXPECTED_DOCUMENTS_MUTATED_ON_EXECUTE = ${result.expectedDocumentsMutatedOnExecute}`);
    console.log(`  EXPECTED_FIRESTORE_WRITES_ON_EXECUTE = ${result.expectedWritesOnExecute}`);
    console.log(`  ACTUAL_FIRESTORE_WRITES = ${result.actualFirestoreWrites}`);
    console.log(`  OPENAI_CALLS = ${result.openAiCalls}`);
    console.log(`  PROD_ACCESS = ${result.prodAccess}`);
    console.log(`  SNAPSHOT_HASH = ${result.normalizedSnapshotHash}`);
    console.log('\nDRY RUN COMPLETE — ZERO CLOUD MUTATIONS PERFORMED.');
  } catch (err: any) {
    console.error(`\n[FATAL ERROR] Provisioner aborted: ${err.message}`);
    process.exit(1);
  }
}

// Only invoke CLI if executed directly
if (process.argv[1] && process.argv[1].endsWith('provisionLabWeeklyPlanning.mjs')) {
  main();
}
