import { logos } from '../../theme/logos';
import { personas } from '../../theme/personas';
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PlanningActorRole, PlanningWorkflowService } from '../../application/planning/PlanningWorkflowService';
import { PedagogicalRecommendationSource } from '../../application/planning/PedagogicalRecommendationSource';
import { WeeklyPlanning, PlanningDay } from '../../domain/planning/WeeklyPlanning';
import { RoomCatalog, Room } from '../../domain/planning/RoomCatalog';
import { PedagogicalAgePolicyCatalog } from '../../domain/planning/PedagogicalAgePolicy';
import { CurricularSelectionControl } from './CurricularSelectionControl';
import { CurricularRecommendationSource } from '../../application/planning/CurricularRecommendationSource';
import {
  evaluateFirstLightLabGuard,
  FirstLightLabBanner,
  FIRST_LIGHT_ANITA_EMAIL,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_CECI_EMAIL,
  FIRST_LIGHT_DIRECTOR_ID,
  FIRST_LIGHT_TERE_EMAIL,
  FIRST_LIGHT_SUPERVISOR_ID,
  FIRST_LIGHT_DAYCARE_ID,
  FIRST_LIGHT_ROOM_ID,
  FIRST_LIGHT_G002_DAYCARE_ID,
  FIRST_LIGHT_G002_TEACHER_EMAIL,
  FIRST_LIGHT_G002_TEACHER_ID,
  FIRST_LIGHT_G002_DIRECTOR_EMAIL,
  FIRST_LIGHT_G002_DIRECTOR_ID,
  FIRST_LIGHT_G002_SUPERVISOR_EMAIL,
  FIRST_LIGHT_G002_SUPERVISOR_ID,
} from './firstLightLabHarness';
import { AuthenticationProvider } from '../../application/ports/AuthenticationProvider';
import { FirebaseAuthenticationProvider } from '../../infrastructure/authentication/FirebaseAuthenticationProvider';
import { FirebaseCurricularRecommendationSource } from '../../infrastructure/ai/FirebaseCurricularRecommendationSource';
import { FirebaseWeeklyPlanningProposalSource } from '../../infrastructure/ai/FirebaseWeeklyPlanningProposalSource';
import { DeterministicCurricularRecommendationSource } from '../../application/planning/DeterministicCurricularRecommendationSource';
import { ComplementaryActivitiesControl } from './ComplementaryActivitiesControl';
import { PrioritizedPracticesControl } from './PrioritizedPracticesControl';
import { DIRECT_PDA_CATALOG } from '../../domain/planning/DirectCurricularCatalog';
import { composeAnversoPages, ComposedAnversoPage, AnversoBlockDescriptor, USABLE_HEIGHT_MM, USABLE_WIDTH_MM, LETTER_WIDTH_MM, LETTER_HEIGHT_MM, SAFE_MARGIN_MM } from './DirectPrintPaginationComposer';
import type {
  WeeklyPlanningProposalSource,
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
  ProposedPlanningDay,
  WeeklyPlanningWeekday,
} from '../../application/planning/WeeklyPlanningProposalSource';
import { IMSS_CATEGORIES, type ImssCategory } from '../../constants/imssCategories';
import { WeeklyPlanningProposalHumanGate } from './WeeklyPlanningProposalHumanGate';
import { DailyEvaluationHumanGate, type HumanEvidenceInputs } from './DailyEvaluationHumanGate';
import type { EvaluationRecommendationSource } from '../../infrastructure/ai/FirebaseEvaluationRecommendationSource';

const MOCK_START = '2026-08-10';
const MOCK_END = '2026-08-14';

export function calculateWeekEnd(startDateStr: string): string {
  try {
    const parts = startDateStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const start = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      const end = new Date(start.getTime() + 4 * 24 * 60 * 60 * 1000);
      return end.toISOString().split('T')[0];
    }
  } catch {}
  return '2026-08-28';
}

export function getMondayOfWeek(dateStr: string): string {
  try {
    const parts = dateStr.split('-').map(Number);
    if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) {
      const d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
      const day = d.getUTCDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      const monday = new Date(d.getTime() + diffToMonday * 24 * 60 * 60 * 1000);
      return monday.toISOString().split('T')[0];
    }
  } catch {}
  return '2026-08-24';
}

const LOADING_MESSAGES = [
  "Estoy leyendo tus observaciones...",
  "Estoy buscando actividades sugeridas para su edad...",
  "Estoy preparando la propuesta...",
  "Estoy organizando la semana..."
];

export function getAssistantRoleLabel(roomId?: string): string {
  if (!roomId) return 'Asistente Educativa';
  if (roomId === 'room-lactantes-a' || roomId === 'lactantes-a') return 'Asistente Educativa LA';
  if (roomId === 'room-lactantes-b' || roomId === 'lactantes-b') return 'Asistente Educativa LB';
  if (roomId === 'room-lactantes-c' || roomId === 'lactantes-c') return 'Asistente Educativa LC';
  if (roomId === 'room-maternal-a' || roomId === 'maternal-a') return 'Asistente Educativa MA';
  if (roomId === 'room-maternal-b1' || roomId === 'maternal-b1') return 'Asistente Educativa MB1';
  if (roomId === 'room-maternal-b2' || roomId === 'maternal-b2') return 'Asistente Educativa MB2';
  if (roomId === 'room-maternal-c1' || roomId === 'maternal-c1') return 'Asistente Educativa MC1';
  if (roomId === 'room-maternal-c2' || roomId === 'maternal-c2') return 'Asistente Educativa MC2';
  return 'Asistente Educativa';
}

export function formatInstitutionalDate(val?: any): string {
  if (!val) return '';
  try {
    let d: Date;
    if (val instanceof Date) {
      d = val;
    } else if (typeof val?.toDate === 'function') {
      d = val.toDate();
    } else if (typeof val?.seconds === 'number') {
      d = new Date(val.seconds * 1000);
    } else if (typeof val?._seconds === 'number') {
      d = new Date(val._seconds * 1000);
    } else {
      d = new Date(val);
    }
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return '';
  }
}

export function getInstitutionalActorLabel(actor: string | undefined | null, roomId?: string): string {
  if (!actor || !actor.trim()) return 'Personal Educativo';
  const a = actor.trim();
  if (
    a === 't1' ||
    a === 'Anita' ||
    a === FIRST_LIGHT_TEACHER_ID ||
    a === FIRST_LIGHT_ANITA_EMAIL ||
    a === 'TEACHER'
  ) {
    return getAssistantRoleLabel(roomId);
  }
  if (
    a === 'd1' ||
    a === 'Ceci' ||
    a === 'DIRECTOR' ||
    a === FIRST_LIGHT_DIRECTOR_ID ||
    a === FIRST_LIGHT_CECI_EMAIL
  ) {
    return 'Educadora';
  }
  if (
    a === 's1' ||
    a === 'Tere' ||
    a === 'SUPERVISOR' ||
    a === FIRST_LIGHT_SUPERVISOR_ID ||
    a === FIRST_LIGHT_TERE_EMAIL
  ) {
    return 'Directora';
  }
  return a;
}

export function formatPlanPeriod(plan: any): string {
  if (plan?.weekStart && plan?.weekEnd) {
    const s = String(plan.weekStart).split('-');
    const e = String(plan.weekEnd).split('-');
    if (s.length === 3 && e.length === 3 && s[2] && e[2] && e[1] && e[0]) {
      const sDay = parseInt(s[2], 10);
      const eDay = parseInt(e[2], 10);
      const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
      const monthIdx = parseInt(e[1], 10) - 1;
      const monthName = (monthIdx >= 0 && months[monthIdx]) ? months[monthIdx] : 'agosto';
      return `${sDay} al ${eDay} de ${monthName} de ${e[0]}`;
    }
  }
  return '24 al 28 de agosto de 2026';
}

const DAY_CONTEXT: Record<string, string> = {
  'MONDAY': 'Comenzamos despertando curiosidad.',
  'TUESDAY': 'Ahora profundizamos la exploración.',
  'WEDNESDAY': 'Fortalecemos la confianza.',
  'THURSDAY': 'Invitamos a crear.',
  'FRIDAY': 'Cerramos celebrando los logros.'
};

const VISUAL_STEPS = [
  'Conocer al grupo',
  'Construir la propuesta',
  'Revisarla juntas',
  'Compartirla'
];

export type FirstLightBootstrapStatus =
  | 'AUTH_PENDING'
  | 'PLANNING_PENDING'
  | 'EXISTING_PLANNING_FOUND'
  | 'NO_PLANNING_FOUND'
  | 'BOOTSTRAP_ERROR';

/**
 * Browser- and test-safe sovereign generator for unique planning identifiers.
 * Uses crypto.randomUUID() when available, with a resilient fallback for test runtimes.
 */
export function generateUniquePlanningId(prefix?: string): string {
  if (prefix) {
    return `${prefix}${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `p-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Safely extracts planId, action, and roomId search parameters from current window URL.
 */
export function getUrlParams(): { planId: string | null; action: string | null; roomId: string | null } {
  if (typeof window !== 'undefined' && window.location?.search) {
    try {
      const params = new URLSearchParams(window.location.search);
      return {
        planId: params.get('planId') || null,
        action: params.get('action') || null,
        roomId: params.get('roomId') || null,
      };
    } catch {
      return { planId: null, action: null, roomId: null };
    }
  }
  return { planId: null, action: null, roomId: null };
}

/**
 * Safely updates URL query parameters without full page reload.
 */
export function updateUrlParams(
  updates: { planId?: string | null; action?: string | null; roomId?: string | null },
  replace = false
) {
  if (typeof window !== 'undefined' && window.history) {
    try {
      const currentHref = window.location.href || 'http://localhost/';
      const url = new URL(currentHref);
      if ('planId' in updates) {
        if (updates.planId) {
          url.searchParams.set('planId', updates.planId);
        } else {
          url.searchParams.delete('planId');
        }
      }
      if ('action' in updates) {
        if (updates.action) {
          url.searchParams.set('action', updates.action);
        } else {
          url.searchParams.delete('action');
        }
      }
      if ('roomId' in updates) {
        if (updates.roomId) {
          url.searchParams.set('roomId', updates.roomId);
        } else {
          url.searchParams.delete('roomId');
        }
      }
      const newRelative = url.pathname + (url.search ? url.search : '') + (url.hash ? url.hash : '');
      if (replace) {
        window.history.replaceState({}, '', newRelative);
      } else {
        window.history.pushState({}, '', newRelative);
      }
    } catch {}
  }
}

export const SELECTED_ROOM_STORAGE_KEY_PREFIX = 'tutoria_selected_room';

/**
 * Generates a scoped storage key by daycareId and userId.
 * Prevents room selection leaking across different user identities or centers.
 */
export function getScopedSelectedRoomKey(userId?: string | null, daycareId?: string | null): string {
  const cleanDaycare = (typeof daycareId === 'string' && daycareId.trim()) || 'default';
  const cleanUser = (typeof userId === 'string' && userId.trim()) || 'anonymous';
  return `${SELECTED_ROOM_STORAGE_KEY_PREFIX}:${cleanDaycare}:${cleanUser}`;
}

/**
 * Reads and validates persisted selected room.
 * Priority:
 * 1. URL search parameter `roomId`
 * 2. sessionStorage for the scoped key
 * 3. localStorage for the scoped key
 *
 * Validation:
 * - If authorizedRooms is provided and not empty, the candidate room MUST belong to authorizedRooms.
 * - If candidate room is unauthorized, it is discarded and cleared from storage & URL.
 */
export function readPersistedSelectedRoom(
  userId?: string | null,
  daycareId?: string | null,
  authorizedRooms?: Room[] | null
): string | null {
  const scopedKey = getScopedSelectedRoomKey(userId, daycareId);
  const urlRoomId = getUrlParams().roomId;

  let candidate: string | null = urlRoomId;

  if (!candidate && typeof window !== 'undefined') {
    try {
      candidate = window.sessionStorage?.getItem(scopedKey) || null;
      if (!candidate) {
        candidate = window.localStorage?.getItem(scopedKey) || null;
      }
    } catch {}
  }

  if (!candidate) return null;

  if (authorizedRooms && authorizedRooms.length > 0) {
    const isAuthorized = authorizedRooms.some(r => r.roomId === candidate || (candidate === 'lactantes-c' && r.roomId === 'room-lactantes-c') || (candidate === 'room-lactantes-c' && r.roomId === 'lactantes-c'));
    if (!isAuthorized) {
      clearPersistedSelectedRoom(userId, daycareId);
      if (urlRoomId === candidate) {
        updateUrlParams({ roomId: null }, true);
      }
      return null;
    }
  }

  if (candidate === 'lactantes-c' && authorizedRooms?.some(r => r.roomId === 'room-lactantes-c')) {
    return 'room-lactantes-c';
  }

  return candidate;
}

/**
 * Persists selected room into sessionStorage, localStorage, and URL query params.
 */
export function persistSelectedRoom(
  roomId: string,
  userId?: string | null,
  daycareId?: string | null,
  updateUrl = true
) {
  if (!roomId) return;
  const scopedKey = getScopedSelectedRoomKey(userId, daycareId);

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage?.setItem(scopedKey, roomId);
      window.localStorage?.setItem(scopedKey, roomId);
    } catch {}
  }

  if (updateUrl) {
    updateUrlParams({ roomId }, true);
  }
}

/**
 * Clears persisted selected room from sessionStorage, localStorage, and URL.
 */
export function clearPersistedSelectedRoom(
  userId?: string | null,
  daycareId?: string | null,
  clearUrl = false
) {
  const scopedKey = getScopedSelectedRoomKey(userId, daycareId);

  if (typeof window !== 'undefined') {
    try {
      window.sessionStorage?.removeItem(scopedKey);
      window.localStorage?.removeItem(scopedKey);
    } catch {}
  }

  if (clearUrl) {
    updateUrlParams({ roomId: null }, true);
  }
}

/**
 * Resolves teacher planning session when no planId is specified in URL (SR-MD-03).
 *
 * Rules:
 * - Query only authorized plannings for this teacher (and daycare if provided).
 * - If exactly 1 active planning exists (!== 'CLOSED'): return ACTIVE_PLANNING mode.
 * - If >1 active plannings exist: return LIST mode for human selection.
 * - If 0 active plannings exist: return LIST mode (historical CLOSED plannings accessible from list,
 *   never auto-opened).
 * - If query fails: throw error (fail-closed, never swallow into empty list).
 */
export async function resolveTeacherPlanningSession(
  service: PlanningWorkflowService,
  teacherId: string,
  daycareId?: string
): Promise<{
  mode: 'ACTIVE_PLANNING' | 'LIST';
  selectedPlanId: string | null;
  view: 'CREATE' | 'LIST';
  activePlans: WeeklyPlanning[];
  allPlans: WeeklyPlanning[];
}> {
  const teacherPlans = await service.listTeacherPlanning(teacherId, daycareId);

  const authorizedPlans = (teacherPlans || []).filter((p) => {
    if (p.teacherId !== teacherId) return false;
    if (daycareId && p.daycareId !== daycareId) return false;
    return true;
  });

  const activePlans = authorizedPlans.filter((p) => p.status !== 'CLOSED');

  if (activePlans.length === 1) {
    return {
      mode: 'ACTIVE_PLANNING',
      selectedPlanId: activePlans[0].planningId,
      view: 'CREATE',
      activePlans,
      allPlans: authorizedPlans,
    };
  }

  return {
    mode: 'LIST',
    selectedPlanId: null,
    view: 'LIST',
    activePlans,
    allPlans: authorizedPlans,
  };
}

/**
 * Resolves director review session when no planId is specified in URL (SR-MD-03).
 *
 * Rules:
 * - Query authorized plannings pending review or follow-up:
 *   1. Plannings IN_REVIEW.
 *   2. Plannings APPROVED with daily evaluations pending review (evaluationStatus === 'IN_REVIEW').
 *   3. Plannings APPROVED ready for closure (5 approved days, not yet CLOSED).
 * - If exactly 1 pending planning exists: return ACTIVE_PLANNING mode for direct review.
 * - If >1 pending plannings exist: return LIST mode for human selection.
 * - If 0 pending plannings exist: return LIST mode for true empty state.
 * - Never auto-open a historical CLOSED planning as fallback.
 * - If query fails: throw error (fail-closed, never swallow into empty list).
 */
export async function resolveDirectorReviewSession(
  service: PlanningWorkflowService,
  daycareId?: string
): Promise<{
  mode: 'ACTIVE_PLANNING' | 'LIST';
  selectedPlanId: string | null;
  view: 'REVIEW' | 'LIST';
  pendingPlans: WeeklyPlanning[];
}> {
  const [inReviewPlans, approvedPlans] = await Promise.all([
    service.listDirectorReviewQueue('DIRECTOR', daycareId),
    service.listSupervisorApprovedPlanning('DIRECTOR', daycareId),
  ]);

  const map = new Map<string, WeeklyPlanning>();

  for (const p of inReviewPlans || []) {
    if (daycareId && p.daycareId !== daycareId) continue;
    if (p.status === 'IN_REVIEW') {
      map.set(p.planningId, p);
    }
  }

  for (const p of approvedPlans || []) {
    if (daycareId && p.daycareId !== daycareId) continue;
    if (p.status === 'CLOSED') continue; // Historical CLOSED is never pending review
    const isApproved = p.status === 'APPROVED' || p.status === 'APPROVED_FOR_EXECUTION';
    if (!isApproved) continue;

    const hasPendingDailyEval = Boolean(p.days && p.days.some((d) => d.evaluationStatus === 'IN_REVIEW'));
    const isReadyForClosure = Boolean(
      p.days &&
      p.days.length === 5 &&
      p.days.every((d) => d.evaluationStatus === 'APPROVED')
    );

    if (hasPendingDailyEval || isReadyForClosure) {
      map.set(p.planningId, p);
    }
  }

  const pendingPlans = Array.from(map.values());

  if (pendingPlans.length === 1) {
    return {
      mode: 'ACTIVE_PLANNING',
      selectedPlanId: pendingPlans[0].planningId,
      view: 'REVIEW',
      pendingPlans,
    };
  }

  return {
    mode: 'LIST',
    selectedPlanId: null,
    view: 'LIST',
    pendingPlans,
  };
}

export interface PlanningDemoAppProps {
  service: PlanningWorkflowService;
  source: PedagogicalRecommendationSource;
  curricularRecommendationSource?: CurricularRecommendationSource | undefined;
  effectiveWeeklyPlanningProposalSource?: WeeklyPlanningProposalSource | undefined;
  weeklyPlanningProposalSource?: WeeklyPlanningProposalSource | undefined;
  evaluationRecommendationSource?: EvaluationRecommendationSource | undefined;
  currentDate?: string | undefined;
  firstLightEnv?: Record<string, any> | undefined;
  firstLightAuth?: AuthenticationProvider | undefined;
  firstLightSource?: CurricularRecommendationSource | undefined;
  firstLightWeeklyPlanningSource?: WeeklyPlanningProposalSource | undefined;
  roomOverride?: Room | undefined;
  authorizedRooms?: Room[] | undefined;
  teacherId?: string | undefined;
  initialAction?: 'new' | 'continue' | string | undefined;
  role?: PlanningActorRole | undefined;
}

export const PlanningDemoApp: React.FC<PlanningDemoAppProps & { simulateMeasurementFailure?: boolean; anversoComposerOverride?: (day: any, plan: any) => ComposedAnversoPage[] }> = ({
  service,
  source,
  curricularRecommendationSource,
  effectiveWeeklyPlanningProposalSource: externalEffectiveWeeklyPlanningProposalSource,
  weeklyPlanningProposalSource,
  evaluationRecommendationSource,
  currentDate,
  simulateMeasurementFailure,
  anversoComposerOverride,
  firstLightEnv,
  firstLightAuth,
  firstLightSource,
  firstLightWeeklyPlanningSource,
  roomOverride,
  authorizedRooms: propsAuthorizedRooms,
  teacherId: propsTeacherId,
  initialAction,
  role: initialRole,
}) => {
  const [role, setRole] = useState<PlanningActorRole>(initialRole || 'TEACHER');
  const [simulatedDate, setSimulatedDate] = useState<string>(currentDate || '2026-08-24');

  useEffect(() => {
    if (currentDate) setSimulatedDate(currentDate);
  }, [currentDate]);

  useEffect(() => {
    if (initialRole && initialRole !== role) {
      setRole(initialRole);
    }
  }, [initialRole]);

  const [view, setView] = useState<'LIST' | 'CREATE' | 'REVIEW' | 'PRINT'>('LIST');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [sessionKey, setSessionKey] = useState<string>(() => {
    const { planId: urlPlanId } = getUrlParams();
    return urlPlanId || 'new-session';
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [modality, setModality] = useState<'DIRECT' | 'INDIRECT'>('DIRECT');

  // Detect explicit NEW intent from prop or browser URL search params
  const isNewIntent = React.useMemo(() => {
    if (initialAction === 'new') return true;
    const { action } = getUrlParams();
    return action === 'new';
  }, [initialAction]);

  // FIRST LIGHT LAB HARNESS
  const firstLightGuard = React.useMemo(() => evaluateFirstLightLabGuard(firstLightEnv), [firstLightEnv]);

  const [firstLightAuthInstance] = useState<AuthenticationProvider>(() => {
    return firstLightAuth || new FirebaseAuthenticationProvider();
  });

  const effectiveAuthorizedRooms = React.useMemo<Room[]>(() => {
    if (propsAuthorizedRooms && propsAuthorizedRooms.length > 0) {
      return propsAuthorizedRooms;
    }
    const list: Room[] = [
      RoomCatalog.getRoom(FIRST_LIGHT_ROOM_ID) || {
        roomId: FIRST_LIGHT_ROOM_ID,
        name: 'Lactantes A',
        minAgeMonths: 0,
        maxAgeMonths: 6,
      },
      RoomCatalog.getRoom('room-lactantes-b') || {
        roomId: 'room-lactantes-b',
        name: 'Lactantes B',
        minAgeMonths: 7,
        maxAgeMonths: 12,
      },
      RoomCatalog.getRoom('room-lactantes-c') || {
        roomId: 'room-lactantes-c',
        name: 'Lactantes C',
        minAgeMonths: 13,
        maxAgeMonths: 18,
      },
    ];
    if (roomOverride && !list.some(r => r.roomId === roomOverride.roomId)) {
      list.push(roomOverride);
    }
    return list;
  }, [propsAuthorizedRooms, roomOverride]);

  const [userSelectedRoomId, setUserSelectedRoomId] = useState<string | null>(() => {
    if (roomOverride) return roomOverride.roomId;
    const initialDaycare = firstLightGuard.isEligible ? FIRST_LIGHT_DAYCARE_ID : 'default';
    const initialUser = firstLightGuard.isEligible
      ? (firstLightAuthInstance.getCurrentUser?.() || null)
      : (propsTeacherId || 't1');
    return readPersistedSelectedRoom(initialUser, initialDaycare, effectiveAuthorizedRooms);
  });

  useEffect(() => {
    if (roomOverride) {
      setUserSelectedRoomId(null);
    }
  }, [roomOverride]);

  // CANONICAL ACTIVE ROOM: Single source of truth for presentation and generation
  const activeRoom = React.useMemo<Room>(() => {
    if (roomOverride) return roomOverride;
    if (userSelectedRoomId) {
      const found = effectiveAuthorizedRooms.find(r => r.roomId === userSelectedRoomId) || RoomCatalog.getRoom(userSelectedRoomId);
      if (found) return found;
      if (userSelectedRoomId === 'room-lactantes-b') {
        return { roomId: 'room-lactantes-b', name: 'Lactantes B', minAgeMonths: 7, maxAgeMonths: 12 };
      }
      if (userSelectedRoomId === 'room-lactantes-a') {
        return { roomId: 'room-lactantes-a', name: 'Lactantes A', minAgeMonths: 0, maxAgeMonths: 6 };
      }
      if (userSelectedRoomId === 'room-lactantes-c' || userSelectedRoomId === 'lactantes-c') {
        return { roomId: 'room-lactantes-c', name: 'Lactantes C', minAgeMonths: 13, maxAgeMonths: 18 };
      }
    }
    if (firstLightGuard.isEligible) {
      return (
        effectiveAuthorizedRooms[0] ||
        RoomCatalog.getRoom(FIRST_LIGHT_ROOM_ID) || {
          roomId: FIRST_LIGHT_ROOM_ID,
          name: 'Lactantes A',
          minAgeMonths: 0,
          maxAgeMonths: 6,
        }
      );
    }
    return (
      effectiveAuthorizedRooms[0] ||
      RoomCatalog.getRoom('room-lactantes-c') ||
      RoomCatalog.getRoom('lactantes-c') || {
        roomId: 'room-lactantes-c',
        name: 'Lactantes C',
        minAgeMonths: 13,
        maxAgeMonths: 18,
      }
    );
  }, [userSelectedRoomId, roomOverride, firstLightGuard.isEligible, effectiveAuthorizedRooms]);

  const [firstLightUser, setFirstLightUser] = useState<string | null>(null);
  const [authenticatedTeacherId, setAuthenticatedTeacherId] = useState<string | null>(() => {
    if (firstLightGuard.isEligible) {
      return null;
    }
    return 't1';
  });
  const [authenticatedDaycareId, setAuthenticatedDaycareId] = useState<string>(FIRST_LIGHT_DAYCARE_ID);

  const handleSelectRoom = (target: Room | string) => {
    const targetRoomId = typeof target === 'string' ? target : target.roomId;
    if (!targetRoomId) return;

    const isAuthorized = effectiveAuthorizedRooms.some(r => r.roomId === targetRoomId);
    if (!isAuthorized) return;

    setUserSelectedRoomId(targetRoomId);

    const activeUser = firstLightGuard.isEligible
      ? (authenticatedTeacherId || firstLightAuthInstance.getCurrentUser?.() || null)
      : (effectiveTeacherId || 't1');
    const activeDaycare = firstLightGuard.isEligible ? authenticatedDaycareId : 'default';

    persistSelectedRoom(targetRoomId, activeUser, activeDaycare, true);
  };
  const [firstLightLoginError, setFirstLightLoginError] = useState<string | null>(null);
  const [isFirstLightLoggingIn, setIsFirstLightLoggingIn] = useState(false);
  const [bootstrapStatus, setBootstrapStatus] = useState<FirstLightBootstrapStatus>(() => {
    if (firstLightGuard.isEligible) return 'AUTH_PENDING';
    const { planId: urlPlanId } = getUrlParams();
    return urlPlanId ? 'PLANNING_PENDING' : 'NO_PLANNING_FOUND';
  });
  const [bootstrapError, setBootstrapError] = useState<string | null>(null);
  const [bootstrapRetryCount, setBootstrapRetryCount] = useState(0);
  const [canonicalPlanningAggregate, setCanonicalPlanningAggregate] = useState<WeeklyPlanning | null>(null);
  const navigationRequestIdRef = React.useRef<number>(0);

  const isBootstrapLoading =
    (firstLightGuard.isEligible && (bootstrapStatus === 'AUTH_PENDING' || bootstrapStatus === 'PLANNING_PENDING')) ||
    (!firstLightGuard.isEligible && bootstrapStatus === 'PLANNING_PENDING');

  const effectiveCurricularSource = React.useMemo(() => {
    if (!firstLightGuard.isEligible) {
      return curricularRecommendationSource || new DeterministicCurricularRecommendationSource();
    }
    return firstLightSource || new FirebaseCurricularRecommendationSource();
  }, [firstLightGuard.isEligible, curricularRecommendationSource, firstLightSource]);

  const effectiveWeeklyPlanningProposalSource = React.useMemo(() => {
    if (externalEffectiveWeeklyPlanningProposalSource) {
      return externalEffectiveWeeklyPlanningProposalSource;
    }

    if (weeklyPlanningProposalSource) {
      return weeklyPlanningProposalSource;
    }

    if (firstLightGuard.isEligible) {
      const policy = PedagogicalAgePolicyCatalog.getPolicyForRoom(activeRoom);
      if (!policy || !PedagogicalAgePolicyCatalog.isAiGenerationAuthorized(policy.roomType)) {
        return undefined;
      }
      return (
        firstLightWeeklyPlanningSource ??
        new FirebaseWeeklyPlanningProposalSource({
          operationalContext: {
            daycareId: authenticatedDaycareId,
            roomId: activeRoom.roomId,
          },
        })
      );
    }

    return undefined;
  }, [
    firstLightGuard.isEligible,
    externalEffectiveWeeklyPlanningProposalSource,
    weeklyPlanningProposalSource,
    firstLightWeeklyPlanningSource,
    activeRoom,
    authenticatedDaycareId,
  ]);

  const handleFirstLightLogin = async (password: string, email: string = FIRST_LIGHT_ANITA_EMAIL) => {
    setIsFirstLightLoggingIn(true);
    setFirstLightLoginError(null);
    try {
      await firstLightAuthInstance.login(email, password);
      const uid = firstLightAuthInstance.getCurrentUser() || (
        email === FIRST_LIGHT_CECI_EMAIL ? FIRST_LIGHT_DIRECTOR_ID :
        email === FIRST_LIGHT_TERE_EMAIL ? FIRST_LIGHT_SUPERVISOR_ID :
        email === FIRST_LIGHT_G002_DIRECTOR_EMAIL ? FIRST_LIGHT_G002_DIRECTOR_ID :
        email === FIRST_LIGHT_G002_SUPERVISOR_EMAIL ? FIRST_LIGHT_G002_SUPERVISOR_ID :
        email === FIRST_LIGHT_G002_TEACHER_EMAIL ? FIRST_LIGHT_G002_TEACHER_ID :
        FIRST_LIGHT_TEACHER_ID
      );
      const isG002 = email.includes('g002') || uid.includes('g002');
      const targetDaycareId = isG002 ? FIRST_LIGHT_G002_DAYCARE_ID : FIRST_LIGHT_DAYCARE_ID;
      setAuthenticatedDaycareId(targetDaycareId);
      setFirstLightUser(email);
      setAuthenticatedTeacherId(uid);
      setBootstrapRetryCount(c => c + 1);
    } catch (err: unknown) {
      setFirstLightLoginError(err instanceof Error ? err.message : 'Error al autenticar en LAB');
    } finally {
      setIsFirstLightLoggingIn(false);
    }
  };

  const handleFirstLightLogout = async () => {
    try {
      const activeUser = authenticatedTeacherId || effectiveTeacherId;
      clearPersistedSelectedRoom(activeUser, authenticatedDaycareId, true);
      setUserSelectedRoomId(null);
      await firstLightAuthInstance.logout();
      setFirstLightUser(null);
      setAuthenticatedTeacherId(null);
      setAuthenticatedDaycareId(FIRST_LIGHT_DAYCARE_ID);
      setSelectedPlanId(null);
      setSessionKey('new-session');
      setView('LIST');
      setCanonicalPlanningAggregate(null);
      setBootstrapStatus('AUTH_PENDING');
      updateUrlParams({ planId: null, action: null, roomId: null }, true);
    } catch {
      // ignore
    }
  };

  const effectiveTeacherId = firstLightGuard.isEligible
    ? authenticatedTeacherId
    : (propsTeacherId || 't1');

  // NON-FIRST-LIGHT URL PERSISTENCE & RESOLUTION (SR-MD-02 & SR-MD-03 & SR-MD-05)
  useEffect(() => {
    if (firstLightGuard.isEligible) return;

    let isMounted = true;
    const currentReqId = ++navigationRequestIdRef.current;
    const { planId: urlPlanId, action: urlAction } = getUrlParams();

    if (urlAction === 'new' || isNewIntent) {
      setSelectedPlanId(null);
      setSessionKey(`new-${Date.now()}`);
      setView('CREATE');
      setBootstrapStatus('EXISTING_PLANNING_FOUND');
      setBootstrapError(null);
      return () => {
        isMounted = false;
      };
    }

    if (urlPlanId) {
      setBootstrapStatus('PLANNING_PENDING');
      setBootstrapError(null);
      service.getPlanning(urlPlanId)
        .then((plan) => {
          if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;
          if (!plan) {
            setBootstrapStatus('BOOTSTRAP_ERROR');
            setBootstrapError(`La planeación solicitada (${urlPlanId}) no fue encontrada.`);
            return;
          }
          if (role === 'TEACHER' && plan.teacherId && plan.teacherId !== (effectiveTeacherId || 't1')) {
            setBootstrapStatus('BOOTSTRAP_ERROR');
            setBootstrapError('La planeación solicitada no pertenece a la docente autenticada.');
            return;
          }
          if (plan.roomId) {
            setUserSelectedRoomId(plan.roomId);
            persistSelectedRoom(plan.roomId, effectiveTeacherId || 't1', 'default', true);
          }
          setCanonicalPlanningAggregate(plan);
          setSelectedPlanId(urlPlanId);
          setSessionKey(urlPlanId);
          setView(role === 'TEACHER' ? 'CREATE' : 'REVIEW');
          setBootstrapStatus('EXISTING_PLANNING_FOUND');
          setBootstrapError(null);
        })
        .catch(() => {
          if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;
          setBootstrapStatus('BOOTSTRAP_ERROR');
          setBootstrapError('No pudimos recuperar tu planeación. Intenta nuevamente.');
        });
      return () => {
        isMounted = false;
      };
    }

    // No planId: deterministic resolution (SR-MD-03 & SR-MD-05)
    if (role === 'TEACHER') {
      setBootstrapStatus('PLANNING_PENDING');
      setBootstrapError(null);
      resolveTeacherPlanningSession(service, effectiveTeacherId || 't1')
        .then((res) => {
          if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;
          const persistedRoom = readPersistedSelectedRoom(effectiveTeacherId || 't1', 'default', effectiveAuthorizedRooms);
          if (persistedRoom) {
            setUserSelectedRoomId(persistedRoom);
          }
          if (res.mode === 'ACTIVE_PLANNING' && res.selectedPlanId) {
            const plan = res.activePlans[0];
            if (persistedRoom && plan?.roomId && plan.roomId !== persistedRoom) {
              setSelectedPlanId(null);
              setView('LIST');
              setBootstrapStatus('EXISTING_PLANNING_FOUND');
              setBootstrapError(null);
              return;
            }
            if (plan?.roomId) {
              setUserSelectedRoomId(plan.roomId);
              persistSelectedRoom(plan.roomId, effectiveTeacherId || 't1', 'default', true);
            }
            if (plan) {
              setCanonicalPlanningAggregate(plan);
            }
            setSelectedPlanId(res.selectedPlanId);
            setSessionKey(res.selectedPlanId);
            setView('CREATE');
            setBootstrapStatus('EXISTING_PLANNING_FOUND');
            setBootstrapError(null);
          } else {
            setSelectedPlanId(null);
            setView('LIST');
            setBootstrapStatus('EXISTING_PLANNING_FOUND');
            setBootstrapError(null);
          }
        })
        .catch(() => {
          if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;
          setBootstrapStatus('BOOTSTRAP_ERROR');
          setBootstrapError('No pudimos consultar las planeaciones de la docente. Intenta nuevamente.');
        });
    } else if (role === 'DIRECTOR') {
      setBootstrapStatus('PLANNING_PENDING');
      setBootstrapError(null);
      resolveDirectorReviewSession(service)
        .then((res) => {
          if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;
          if (res.mode === 'ACTIVE_PLANNING' && res.selectedPlanId) {
            const plan = res.pendingPlans?.find(p => p.planningId === res.selectedPlanId);
            if (plan?.roomId) {
              setUserSelectedRoomId(plan.roomId);
            }
            if (plan) {
              setCanonicalPlanningAggregate(plan);
            }
            setSelectedPlanId(res.selectedPlanId);
            setSessionKey(res.selectedPlanId);
            setView('REVIEW');
            setBootstrapStatus('EXISTING_PLANNING_FOUND');
            setBootstrapError(null);
          } else {
            setSelectedPlanId(null);
            setView('LIST');
            setBootstrapStatus('EXISTING_PLANNING_FOUND');
            setBootstrapError(null);
          }
        })
        .catch(() => {
          if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;
          setBootstrapStatus('BOOTSTRAP_ERROR');
          setBootstrapError('No pudimos consultar las planeaciones pendientes de revisión. Intenta nuevamente.');
        });
    }

    return () => {
      isMounted = false;
    };
  }, [firstLightGuard.isEligible, service, role, isNewIntent, effectiveTeacherId, bootstrapRetryCount]);

  useEffect(() => {
    if (!firstLightGuard.isEligible) return;

    let isMounted = true;
    const currentReqId = ++navigationRequestIdRef.current;

    const runBootstrap = async () => {
      setBootstrapStatus('AUTH_PENDING');
      setBootstrapError(null);

      // STEP 1: RESOLVE FIREBASE AUTH
      let resolvedUid: string | null = null;
      try {
        resolvedUid = await firstLightAuthInstance.restoreSession();
      } catch (authErr) {
        if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;
        setBootstrapStatus('BOOTSTRAP_ERROR');
        setBootstrapError('Error al restaurar sesión en First Light LAB.');
        return;
      }

      if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;

      // Invariant: expected authenticated identity is Anita or Ceci
      if (!resolvedUid) {
        setFirstLightUser(null);
        setAuthenticatedTeacherId(null);
        setBootstrapStatus('BOOTSTRAP_ERROR');
        setBootstrapError('Sesión no autenticada en First Light LAB.');
        return;
      }

      if (
        resolvedUid !== FIRST_LIGHT_TEACHER_ID &&
        resolvedUid !== FIRST_LIGHT_DIRECTOR_ID &&
        resolvedUid !== FIRST_LIGHT_SUPERVISOR_ID &&
        resolvedUid !== FIRST_LIGHT_G002_TEACHER_ID &&
        resolvedUid !== FIRST_LIGHT_G002_DIRECTOR_ID &&
        resolvedUid !== FIRST_LIGHT_G002_SUPERVISOR_ID
      ) {
        setFirstLightUser(null);
        setAuthenticatedTeacherId(resolvedUid);
        setBootstrapStatus('BOOTSTRAP_ERROR');
        setBootstrapError('La identidad autenticada no corresponde a un usuario autorizado en First Light LAB.');
        return;
      }

      const isDirector = resolvedUid === FIRST_LIGHT_DIRECTOR_ID || resolvedUid === FIRST_LIGHT_G002_DIRECTOR_ID;
      const isSupervisor = resolvedUid === FIRST_LIGHT_SUPERVISOR_ID || resolvedUid === FIRST_LIGHT_G002_SUPERVISOR_ID;
      const isG002 =
        resolvedUid === FIRST_LIGHT_G002_TEACHER_ID ||
        resolvedUid === FIRST_LIGHT_G002_DIRECTOR_ID ||
        resolvedUid === FIRST_LIGHT_G002_SUPERVISOR_ID;
      const targetDaycareId = isG002 ? FIRST_LIGHT_G002_DAYCARE_ID : FIRST_LIGHT_DAYCARE_ID;
      setAuthenticatedDaycareId(targetDaycareId);

      const effectiveEmail =
        resolvedUid === FIRST_LIGHT_G002_SUPERVISOR_ID ? FIRST_LIGHT_G002_SUPERVISOR_EMAIL :
        resolvedUid === FIRST_LIGHT_G002_DIRECTOR_ID ? FIRST_LIGHT_G002_DIRECTOR_EMAIL :
        resolvedUid === FIRST_LIGHT_G002_TEACHER_ID ? FIRST_LIGHT_G002_TEACHER_EMAIL :
        isSupervisor ? FIRST_LIGHT_TERE_EMAIL :
        isDirector ? FIRST_LIGHT_CECI_EMAIL :
        FIRST_LIGHT_ANITA_EMAIL;

      // Successful auth for Anita, Ceci, Tere, or Andrea G002
      setFirstLightUser(effectiveEmail);
      setAuthenticatedTeacherId(resolvedUid);
      setRole(isSupervisor ? 'SUPERVISOR' : isDirector ? 'DIRECTOR' : 'TEACHER');

      const { planId: urlPlanId, action: urlAction } = getUrlParams();

      // =========================================================================
      // SR-MD-02: EXACT PLANID RESOLUTION FIRST
      // REGLA INNEGOCIABLE: SI LA URL CONTIENE planId=X, LA APLICACIÓN DEBE
      // INTENTAR RECUPERAR X. NUNCA SUSTITUIR X SILENCIOSAMENTE POR OTRO EXPEDIENTE.
      // =========================================================================
      if (urlPlanId) {
        setBootstrapStatus('PLANNING_PENDING');
        try {
          const requestedPlan = await service.getPlanning(urlPlanId);
          if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;

          if (!requestedPlan) {
            // REQUISITO 7: Si el ID solicitado no existe: mostrar error explícito. No cargar el seed histórico.
            setBootstrapStatus('BOOTSTRAP_ERROR');
            setBootstrapError(`La planeación solicitada (${urlPlanId}) no fue encontrada.`);
            return;
          }

          // Security & Authorization validation
          if (requestedPlan.daycareId !== targetDaycareId) {
            setBootstrapStatus('BOOTSTRAP_ERROR');
            setBootstrapError('La planeación solicitada no pertenece a la estancia autorizada.');
            return;
          }

          if (!isDirector && !isSupervisor && requestedPlan.teacherId !== resolvedUid) {
            // REQUISITO 6 & H: Acceso no autorizado: error visible y cero fallback histórico.
            setBootstrapStatus('BOOTSTRAP_ERROR');
            setBootstrapError('La planeación solicitada no pertenece a la docente autenticada.');
            return;
          }

          // Exact identity recovered!
          if (requestedPlan.roomId) {
            setUserSelectedRoomId(requestedPlan.roomId);
            persistSelectedRoom(requestedPlan.roomId, resolvedUid, targetDaycareId, true);
          }
          setCanonicalPlanningAggregate(requestedPlan);
          setSelectedPlanId(urlPlanId);
          setSessionKey(urlPlanId);
          setView(isDirector || isSupervisor ? 'REVIEW' : 'CREATE');
          setBootstrapStatus('EXISTING_PLANNING_FOUND');
          setBootstrapError(null);
          return;
        } catch (lookupErr) {
          if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;
          // REQUISITO 8: Si Firestore rechaza la lectura: mostrar error explícito. No sustituir por otro expediente.
          setBootstrapStatus('BOOTSTRAP_ERROR');
          setBootstrapError('No pudimos recuperar tu planeación. Intenta nuevamente.');
          return;
        }
      }

      // If action=new: do not load canonical plan into view
      if (urlAction === 'new' || isNewIntent) {
        if (!isDirector && !isSupervisor) {
          setSelectedPlanId(null);
          setSessionKey(`new-${Date.now()}`);
          setView('CREATE');
          setBootstrapStatus('EXISTING_PLANNING_FOUND');
          setBootstrapError(null);
          return;
        }
      }

      // STEP 2: DETERMINISTIC PLANNING RESOLUTION WITHOUT PLANID (SR-MD-03 & SR-MD-05)
      setBootstrapStatus('PLANNING_PENDING');

      try {
        if (isSupervisor) {
          // CASO SUPERVISIÓN SIN planId -> LISTA DE REGISTROS CERRADOS
          setSelectedPlanId(null);
          setSessionKey('supervisor-list');
          setView('LIST');
          setBootstrapStatus('EXISTING_PLANNING_FOUND');
          setBootstrapError(null);
          return;
        } else if (isDirector) {
          // CASO 4 — DIRECCIÓN SIN planId
          const resolution = await resolveDirectorReviewSession(service, targetDaycareId);
          if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;

          if (resolution.mode === 'ACTIVE_PLANNING' && resolution.selectedPlanId) {
            const plan = resolution.pendingPlans?.find(p => p.planningId === resolution.selectedPlanId);
            if (plan?.roomId) {
              setUserSelectedRoomId(plan.roomId);
              persistSelectedRoom(plan.roomId, resolvedUid, targetDaycareId, true);
            }
            if (plan) {
              setCanonicalPlanningAggregate(plan);
            }
            setSelectedPlanId(resolution.selectedPlanId);
            setSessionKey(resolution.selectedPlanId);
            setView('REVIEW');
            setBootstrapStatus('EXISTING_PLANNING_FOUND');
            setBootstrapError(null);
            updateUrlParams({ planId: resolution.selectedPlanId, action: null }, true);
            return;
          }

          // Multiple pending or zero pending -> LIST
          setSelectedPlanId(null);
          setSessionKey('director-list');
          setView('LIST');
          setBootstrapStatus('EXISTING_PLANNING_FOUND');
          setBootstrapError(null);
          return;
        } else {
          // CASO 3 — DOCENTE SIN planId
          const resolution = await resolveTeacherPlanningSession(service, resolvedUid, targetDaycareId);
          if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;

          const persistedRoom = readPersistedSelectedRoom(resolvedUid, targetDaycareId, effectiveAuthorizedRooms);
          if (persistedRoom) {
            setUserSelectedRoomId(persistedRoom);
          }

          if (resolution.mode === 'ACTIVE_PLANNING' && resolution.selectedPlanId) {
            const plan = resolution.activePlans[0];
            // If user explicitly has a selected room, and the active plan belongs to a different room:
            // do not jump into that plan! Stay in LIST mode in the selected room.
            if (persistedRoom && plan?.roomId && plan.roomId !== persistedRoom) {
              setSelectedPlanId(null);
              setSessionKey('teacher-list');
              setView('LIST');
              setBootstrapStatus('EXISTING_PLANNING_FOUND');
              setBootstrapError(null);
              return;
            }

            if (plan?.roomId) {
              setUserSelectedRoomId(plan.roomId);
              persistSelectedRoom(plan.roomId, resolvedUid, targetDaycareId, true);
            }
            if (plan) {
              setCanonicalPlanningAggregate(plan);
            }
            setSelectedPlanId(resolution.selectedPlanId);
            setSessionKey(resolution.selectedPlanId);
            setView('CREATE');
            setBootstrapStatus('EXISTING_PLANNING_FOUND');
            setBootstrapError(null);
            updateUrlParams({ planId: resolution.selectedPlanId, action: null }, true);
            return;
          }

          // Multiple active or zero active (only CLOSED or empty) -> LIST
          setSelectedPlanId(null);
          setSessionKey('teacher-list');
          setView('LIST');
          setBootstrapStatus('EXISTING_PLANNING_FOUND');
          setBootstrapError(null);
          return;
        }
      } catch (lookupErr) {
        if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;
        // STEP 3: LOOKUP ERROR (Fail closed)
        setBootstrapStatus('BOOTSTRAP_ERROR');
        setBootstrapError('No pudimos recuperar las planeaciones. Intenta nuevamente.');
      }
    };

    runBootstrap();

    return () => {
      isMounted = false;
    };
  }, [firstLightGuard.isEligible, firstLightAuthInstance, service, bootstrapRetryCount]);

  // BROWSER POPSTATE SYNCHRONIZATION (SR-MD-02 & SR-MD-05)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let isMounted = true;

    const handlePopState = async () => {
      const currentReqId = ++navigationRequestIdRef.current;
      const { planId: urlPlanId, action: urlAction } = getUrlParams();

      if (urlAction === 'new') {
        setSelectedPlanId(null);
        setSessionKey(`new-${Date.now()}`);
        setView('CREATE');
        setBootstrapStatus('EXISTING_PLANNING_FOUND');
        setBootstrapError(null);
        return;
      }

      if (urlPlanId) {
        try {
          const plan = await service.getPlanning(urlPlanId);
          if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;
          if (plan) {
            if (plan.roomId) {
              setUserSelectedRoomId(plan.roomId);
              const activeUser = firstLightGuard.isEligible
                ? (authenticatedTeacherId || firstLightAuthInstance.getCurrentUser?.() || null)
                : (effectiveTeacherId || 't1');
              const activeDaycare = firstLightGuard.isEligible ? authenticatedDaycareId : 'default';
              persistSelectedRoom(plan.roomId, activeUser, activeDaycare, false);
            }
            setCanonicalPlanningAggregate(plan);
            setSelectedPlanId(urlPlanId);
            setSessionKey(urlPlanId);
            setView(role === 'TEACHER' ? 'CREATE' : 'REVIEW');
            setBootstrapStatus('EXISTING_PLANNING_FOUND');
            setBootstrapError(null);
            return;
          }
          setBootstrapStatus('BOOTSTRAP_ERROR');
          setBootstrapError(`La planeación solicitada (${urlPlanId}) no fue encontrada.`);
        } catch {
          if (!isMounted || currentReqId !== navigationRequestIdRef.current) return;
          setBootstrapStatus('BOOTSTRAP_ERROR');
          setBootstrapError('No pudimos recuperar tu planeación. Intenta nuevamente.');
        }
        return;
      }

      // No planId and no action=new -> LIST view
      const activeUser = firstLightGuard.isEligible
        ? (authenticatedTeacherId || firstLightAuthInstance.getCurrentUser?.() || null)
        : (effectiveTeacherId || 't1');
      const activeDaycare = firstLightGuard.isEligible ? authenticatedDaycareId : 'default';
      const persisted = readPersistedSelectedRoom(activeUser, activeDaycare, effectiveAuthorizedRooms);
      if (persisted) {
        setUserSelectedRoomId(persisted);
      }
      setSelectedPlanId(null);
      setView('LIST');
      setBootstrapStatus('EXISTING_PLANNING_FOUND');
      setBootstrapError(null);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      isMounted = false;
      window.removeEventListener('popstate', handlePopState);
    };
  }, [role, service]);

  const triggerRefresh = () => setRefreshKey(k => k + 1);

  if (view === 'PRINT') {
    return (
      <div className="bg-white">
        <PrintableView service={service} planId={selectedPlanId!} modality={modality} activeRoom={activeRoom} onBack={() => setView(role === 'SUPERVISOR' ? 'REVIEW' : (role === 'DIRECTOR' ? 'REVIEW' : 'CREATE'))} simulateMeasurementFailure={simulateMeasurementFailure} anversoComposerOverride={anversoComposerOverride} />
      </div>
    );
  }

  const handleNew = () => {
    ++navigationRequestIdRef.current;
    updateUrlParams({ action: 'new', planId: null });
    setSelectedPlanId(null);
    setCanonicalPlanningAggregate(null);
    setSessionKey(`new-${Date.now()}`);
    setView('CREATE');
    setBootstrapStatus('EXISTING_PLANNING_FOUND');
    setBootstrapError(null);
    setRefreshKey(k => k + 1);
  };

  const handleBackToList = () => {
    ++navigationRequestIdRef.current;
    updateUrlParams({ action: null, planId: null });
    setSelectedPlanId(null);
    setView('LIST');
    setBootstrapStatus('EXISTING_PLANNING_FOUND');
    setBootstrapError(null);
  };

  const handleSelectPlan = async (id: string) => {
    const currentReqId = ++navigationRequestIdRef.current;
    updateUrlParams({ planId: id, action: null });
    setSelectedPlanId(id);
    setSessionKey(id);

    try {
      const plan = await service.getPlanning(id);
      if (currentReqId !== navigationRequestIdRef.current) return;
      if (!plan) {
        setBootstrapStatus('BOOTSTRAP_ERROR');
        setBootstrapError(`La planeación solicitada (${id}) no fue encontrada.`);
        return;
      }
      if (plan.roomId) {
        setUserSelectedRoomId(plan.roomId);
        setCanonicalPlanningAggregate(plan);
        const activeUser = firstLightGuard.isEligible
          ? (authenticatedTeacherId || firstLightAuthInstance.getCurrentUser?.() || null)
          : (effectiveTeacherId || 't1');
        const activeDaycare = firstLightGuard.isEligible ? authenticatedDaycareId : 'default';
        persistSelectedRoom(plan.roomId, activeUser, activeDaycare, true);
      }
      setView(role === 'TEACHER' ? 'CREATE' : 'REVIEW');
      setBootstrapStatus('EXISTING_PLANNING_FOUND');
      setBootstrapError(null);
    } catch {
      if (currentReqId !== navigationRequestIdRef.current) return;
      setBootstrapStatus('BOOTSTRAP_ERROR');
      setBootstrapError('No pudimos recuperar tu planeación. Intenta nuevamente.');
    }
  };

  const handlePlanPersisted = (persistedId: string) => {
    ++navigationRequestIdRef.current;
    setSelectedPlanId(persistedId);
    updateUrlParams({ planId: persistedId, action: null }, true);
  };

  const handleRoleChange = async (newRole: PlanningActorRole) => {
    if (newRole === role) return;
    const currentReqId = ++navigationRequestIdRef.current;

    if (selectedPlanId) {
      try {
        const plan = await service.getPlanning(selectedPlanId);
        if (currentReqId !== navigationRequestIdRef.current) return;
        let isCompatible = false;
        if (plan) {
          if (newRole === 'SUPERVISOR') {
            isCompatible = plan.status === 'CLOSED' && (!firstLightGuard.isEligible || plan.daycareId === authenticatedDaycareId);
          } else if (newRole === 'DIRECTOR') {
            isCompatible = !firstLightGuard.isEligible || plan.daycareId === authenticatedDaycareId;
          } else if (newRole === 'TEACHER') {
            const currentTeacherId = firstLightGuard.isEligible
              ? (authenticatedTeacherId || FIRST_LIGHT_TEACHER_ID)
              : (effectiveTeacherId || 't1');
            isCompatible = plan.teacherId === currentTeacherId;
          }
        }
        if (!isCompatible) {
          setSelectedPlanId(null);
          updateUrlParams({ planId: null, action: null });
          setView('LIST');
          setRole(newRole);
          setRefreshKey(k => k + 1);
          return;
        } else {
          if (plan?.roomId) {
            setUserSelectedRoomId(plan.roomId);
            setCanonicalPlanningAggregate(plan);
          }
          setView(newRole === 'TEACHER' ? 'CREATE' : 'REVIEW');
          setRole(newRole);
          setRefreshKey(k => k + 1);
          return;
        }
      } catch {
        if (currentReqId !== navigationRequestIdRef.current) return;
        setSelectedPlanId(null);
        updateUrlParams({ planId: null, action: null });
        setView('LIST');
        setRole(newRole);
        setRefreshKey(k => k + 1);
        return;
      }
    }

    setRole(newRole);
    setView('LIST');
    updateUrlParams({ planId: null, action: null });
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="font-poppins text-text-primary min-h-screen bg-surface-soft pb-12 print:hidden flex flex-col">
      {(firstLightGuard.isEligible || Boolean(firstLightGuard.error)) && (
        <FirstLightLabBanner
          isEligible={firstLightGuard.isEligible}
          guardError={firstLightGuard.error}
          authenticatedEmail={firstLightUser}
          onLogin={handleFirstLightLogin}
          onLogout={handleFirstLightLogout}
          isLoggingIn={isFirstLightLoggingIn}
          loginError={firstLightLoginError}
        />
      )}
      <div className="bg-[#f8f9fa] py-1.5 px-4 text-center text-xs print:hidden flex items-center justify-center gap-4 border-b border-gray-200/60">
        <span className="font-medium text-gray-400 uppercase tracking-widest text-[10px]">Modo Demo</span>
        <select value={modality} onChange={(e) => setModality(e.target.value as 'DIRECT' | 'INDIRECT')} className="text-xs bg-white border border-gray-300 rounded px-2 py-1 outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary">
          <option value="DIRECT">Prestación Directa (LAB)</option>
          <option value="INDIRECT">Prestación Indirecta (LAB)</option>
        </select>
        <div className="flex items-center gap-1 text-[10px] text-gray-400 ml-2">
          <span>Fecha Demo:</span>
          <button onClick={() => setSimulatedDate('2026-08-23')} className={`px-1.5 py-0.5 rounded font-bold ${simulatedDate === '2026-08-23' ? 'bg-teal-700 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>23</button>
          <button onClick={() => setSimulatedDate('2026-08-24')} className={`px-1.5 py-0.5 rounded font-bold ${simulatedDate === '2026-08-24' ? 'bg-teal-700 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>24 (L)</button>
          <button onClick={() => setSimulatedDate('2026-08-25')} className={`px-1.5 py-0.5 rounded font-bold ${simulatedDate === '2026-08-25' ? 'bg-teal-700 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>25 (M)</button>
          <button onClick={() => setSimulatedDate('2026-08-26')} className={`px-1.5 py-0.5 rounded font-bold ${simulatedDate === '2026-08-26' ? 'bg-teal-700 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>26 (X)</button>
          <button onClick={() => setSimulatedDate('2026-08-27')} className={`px-1.5 py-0.5 rounded font-bold ${simulatedDate === '2026-08-27' ? 'bg-teal-700 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>27 (J)</button>
          <button onClick={() => setSimulatedDate('2026-08-28')} className={`px-1.5 py-0.5 rounded font-bold ${simulatedDate === '2026-08-28' ? 'bg-teal-700 text-white' : 'text-gray-500 hover:bg-gray-200'}`}>28 (V)</button>
        </div>
        <button
          data-testid="role-btn-teacher"
          onClick={() => {
            if (!firstLightGuard.isEligible) {
              handleRoleChange('TEACHER');
            }
          }}
          disabled={firstLightGuard.isEligible && role !== 'TEACHER'}
          className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-2 ${
            role === 'TEACHER'
              ? 'bg-role-teacher text-white shadow-sm'
              : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
          } ${firstLightGuard.isEligible && role !== 'TEACHER' ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <img src={personas.anita} alt="Asistente Educativa" className="w-6 h-6 rounded-full object-cover bg-white/20" />
          <span>Asistente Educativa</span>
          <span className="sr-only">Anita (Pedagoga)</span>
        </button>
        <button
          data-testid="role-btn-director"
          onClick={() => {
            if (!firstLightGuard.isEligible) {
              handleRoleChange('DIRECTOR');
            }
          }}
          disabled={firstLightGuard.isEligible && role !== 'DIRECTOR'}
          className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-2 ${
            role === 'DIRECTOR'
              ? 'bg-role-director text-white shadow-sm'
              : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
          } ${firstLightGuard.isEligible && role !== 'DIRECTOR' ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <img src={personas.ceci} alt="Educadora" className="w-6 h-6 rounded-full object-cover bg-white/20" />
          <span>Educadora</span>
          <span className="sr-only">Ceci (Directora)</span>
        </button>
        <button
          data-testid="role-btn-supervisor"
          onClick={() => {
            if (!firstLightGuard.isEligible) {
              handleRoleChange('SUPERVISOR');
            }
          }}
          disabled={firstLightGuard.isEligible && role !== 'SUPERVISOR'}
          className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-2 ${
            role === 'SUPERVISOR'
              ? 'bg-role-supervisor text-white shadow-sm'
              : 'text-gray-500 hover:bg-gray-200/50 hover:text-gray-700'
          } ${firstLightGuard.isEligible && role !== 'SUPERVISOR' ? 'opacity-40 cursor-not-allowed' : ''}`}
        >
          <img src={personas.tere} alt="Directora" className="w-6 h-6 rounded-full object-cover bg-white/20" />
          <span>Directora</span>
          <span className="sr-only">Tere (Supervisora)</span>
        </button>
      </div>

      <div className="py-4 mb-8 bg-surface-warm print:hidden border-b border-border-soft relative">
        <div className="max-w-6xl mx-auto w-full px-4 flex flex-col md:flex-row items-center justify-between">
          <div className="w-full md:w-1/3 flex justify-start mb-4 md:mb-0">
            <button onClick={() => window.location.href = '/workspace'} className="flex items-center gap-2 bg-[#f9f7f2] hover:bg-white border border-[#e8e4d9] hover:border-[#d6d1c4] px-4 py-2 rounded-xl text-[#524b42] hover:text-[#3d3730] transition-all shadow-sm hover:shadow text-sm font-medium">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70"><path d="m15 18-6-6 6-6"/></svg>
              Mi espacio
            </button>
          </div>
          <div className="w-full md:w-1/3 flex flex-col items-center justify-center">
            <img src={logos.imagotypeTransparent || undefined} alt="TutorIA" className="h-14 mb-2" />
          </div>
          <div className="w-full md:w-1/3 flex justify-end">
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-semibold text-text-primary">
                  {isBootstrapLoading
                    ? (role === 'TEACHER' ? 'Asistente Educativa' : role === 'DIRECTOR' ? 'Educadora' : 'Directora')
                    : (role === 'TEACHER' ? getAssistantRoleLabel(activeRoom?.roomId) : role === 'DIRECTOR' ? 'Educadora' : 'Directora')}
                </p>
                <p className="text-xs font-medium text-text-muted">
                  {isBootstrapLoading
                    ? 'Cargando sala pedagógica...'
                    : (role === 'TEACHER' ? `Asistente Educativa · ${activeRoom?.name || 'Sala'}` : role === 'DIRECTOR' ? 'Educadora' : 'Directora')}
                </p>
              </div>
              <img src={role === 'TEACHER' ? personas.anita : role === 'DIRECTOR' ? personas.ceci : personas.tere} alt={role === 'TEACHER' ? 'Asistente Educativa' : role === 'DIRECTOR' ? 'Educadora' : 'Directora'} className="w-[128px] h-[128px] object-contain" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto w-full px-4 print:max-w-none print:px-0">
        {((firstLightGuard.isEligible && (bootstrapStatus === 'AUTH_PENDING' || bootstrapStatus === 'PLANNING_PENDING')) || (!firstLightGuard.isEligible && bootstrapStatus === 'PLANNING_PENDING')) && (
          <div data-testid="lab-bootstrap-loading" className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in">
            <div className="w-12 h-12 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-6"></div>
            <h2 className="text-2xl font-bold text-brand-dark mb-2">Cargando tu planeación pedagógica...</h2>
            <p className="text-text-muted text-sm max-w-md">
              Verificando las actividades y avances pedagógicos...
            </p>
          </div>
        )}

        {bootstrapStatus === 'BOOTSTRAP_ERROR' && (
          <div data-testid="lab-bootstrap-error" className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4 border border-red-200">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-brand-dark mb-2">No pudimos recuperar tu planeación. Intenta nuevamente.</h2>
            {bootstrapError && bootstrapError !== 'No pudimos recuperar tu planeación. Intenta nuevamente.' && (
              <p className="text-text-muted text-xs mb-6 max-w-md">{bootstrapError}</p>
            )}
            <button
              type="button"
              data-testid="lab-bootstrap-retry-btn"
              onClick={() => {
                setBootstrapError(null);
                setBootstrapRetryCount(c => c + 1);
              }}
              className="bg-brand-primary hover:bg-brand-dark text-white font-semibold px-6 py-2.5 rounded-xl shadow-sm transition text-sm flex items-center gap-2 cursor-pointer"
            >
              Reintentar
            </button>
          </div>
        )}

        {role === 'TEACHER' && bootstrapStatus !== 'BOOTSTRAP_ERROR' && (!firstLightGuard.isEligible || (bootstrapStatus !== 'AUTH_PENDING' && bootstrapStatus !== 'PLANNING_PENDING')) && (
          <>
            {view === 'LIST' && (
              <TeacherList
                service={service}
                roomName={activeRoom.name}
                activeRoom={activeRoom}
                authorizedRooms={effectiveAuthorizedRooms}
                onSelectRoom={handleSelectRoom}
                teacherId={firstLightGuard.isEligible ? (effectiveTeacherId || FIRST_LIGHT_TEACHER_ID) : (effectiveTeacherId || 't1')}
                onNew={handleNew}
                onSelect={handleSelectPlan}
                refreshKey={refreshKey}
                modality={modality}
                isFirstLight={firstLightGuard.isEligible}
                canonicalPlan={canonicalPlanningAggregate}
              />
            )}
            {view === 'CREATE' && (
              <TeacherWizard
                key={`${sessionKey}-${refreshKey}`}
                role={role}
                teacherId={firstLightGuard.isEligible ? (effectiveTeacherId || FIRST_LIGHT_TEACHER_ID) : (effectiveTeacherId || 't1')}
                service={service}
                source={source}
                curricularRecommendationSource={effectiveCurricularSource}
                effectiveWeeklyPlanningProposalSource={effectiveWeeklyPlanningProposalSource}
                weeklyPlanningProposalSource={effectiveWeeklyPlanningProposalSource}
                evaluationRecommendationSource={evaluationRecommendationSource}
                isFirstLight={firstLightGuard.isEligible}
                daycareId={firstLightGuard.isEligible ? authenticatedDaycareId : undefined}
                activeRoom={activeRoom}
                planId={selectedPlanId}
                canonicalPlan={canonicalPlanningAggregate}
                isNewIntent={isNewIntent}
                modality={modality}
                currentDate={simulatedDate}
                onBack={handleBackToList}
                onNew={handleNew}
                onSaved={triggerRefresh}
                onViewOfficial={() => setView('PRINT')}
                onPlanPersisted={handlePlanPersisted}
                onRoomResolved={handleSelectRoom}
              />
            )}
          </>
        )}
        {role === 'DIRECTOR' && bootstrapStatus !== 'BOOTSTRAP_ERROR' && (!firstLightGuard.isEligible || (bootstrapStatus !== 'AUTH_PENDING' && bootstrapStatus !== 'PLANNING_PENDING')) && (
          <>
            {view === 'LIST' && <DirectorList service={service} activeRoom={activeRoom} onSelect={handleSelectPlan} refreshKey={refreshKey} daycareId={firstLightGuard.isEligible ? authenticatedDaycareId : undefined} />}
            {view === 'REVIEW' && (
              <DirectorReview
                service={service}
                activeRoom={activeRoom}
                planId={selectedPlanId!}
                authenticatedDirectorId={firstLightGuard.isEligible ? authenticatedTeacherId : undefined}
                isFirstLight={firstLightGuard.isEligible}
                onBack={handleBackToList}
                onSaved={triggerRefresh}
                onViewOfficial={() => setView('PRINT')}
              />
            )}
          </>
        )}
        {role === 'SUPERVISOR' && bootstrapStatus !== 'BOOTSTRAP_ERROR' && view === 'LIST' && <SupervisorList service={service} activeRoom={activeRoom} onSelect={handleSelectPlan} refreshKey={refreshKey} daycareId={firstLightGuard.isEligible ? authenticatedDaycareId : undefined} />}
        {role === 'SUPERVISOR' && bootstrapStatus !== 'BOOTSTRAP_ERROR' && view === 'REVIEW' && <SupervisorReview service={service} activeRoom={activeRoom} planId={selectedPlanId!} modality={modality} onBack={handleBackToList} onViewOfficial={() => setView('PRINT')} />}

      </div>

      <footer
        data-testid="planning-ai-disclaimer-footer"
        className="w-full py-6 px-4 text-center mt-auto print:hidden"
      >
        <p className="text-[11px] sm:text-xs text-gray-500 max-w-2xl mx-auto leading-relaxed">
          La IA puede cometer errores. Toda propuesta requiere revisión y validación del personal educativo responsable.
        </p>
      </footer>
    </div>
  );
};

const TeacherList = ({
  service,
  onNew,
  onSelect,
  refreshKey,
  modality,
  roomName,
  activeRoom,
  authorizedRooms,
  onSelectRoom,
  teacherId = 't1',
  isFirstLight = false,
  canonicalPlan = null,
}: {
  service: PlanningWorkflowService;
  onNew: () => void;
  onSelect: (id: string) => void;
  refreshKey: number;
  modality: string;
  roomName?: string;
  activeRoom?: Room;
  authorizedRooms?: Room[];
  onSelectRoom?: (room: Room) => void;
  teacherId?: string;
  isFirstLight?: boolean;
  canonicalPlan?: WeeklyPlanning | null;
}) => {
  const [plans, setPlans] = useState<WeeklyPlanning[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadPlans = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    service.listTeacherPlanning(teacherId)
      .then((fetchedPlans) => {
        setPlans(fetchedPlans || []);
      })
      .catch((err) => {
        console.error('Failed to list plannings from service:', err);
        setError(err instanceof Error ? err.message : 'Error al consultar las planeaciones.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [service, teacherId]);

  useEffect(() => {
    loadPlans();
  }, [refreshKey, loadPlans]);

  const effectiveActiveRoomId = activeRoom?.roomId || (isFirstLight ? FIRST_LIGHT_ROOM_ID : 'lactantes-c');
  const effectiveRoomLabel = activeRoom?.name || roomName || 'Lactantes C';

  const authorizedRoomIds = React.useMemo(() => {
    if (!authorizedRooms || authorizedRooms.length === 0) return [];
    return authorizedRooms.map(r => r.roomId);
  }, [authorizedRooms]);

  // 1. Filtrar por salas autorizadas de la educadora (Validación B)
  const getPlanRoomId = (p: WeeklyPlanning): string => {
    return (p as any).roomId || (isFirstLight ? FIRST_LIGHT_ROOM_ID : 'room-lactantes-c');
  };

  const authorizedPlans = React.useMemo(() => {
    if (authorizedRoomIds.length === 0) return plans;
    return plans.filter(p => {
      const pRoom = getPlanRoomId(p);
      return (
        authorizedRoomIds.includes(pRoom) ||
        (pRoom === 'lactantes-c' && authorizedRoomIds.includes('room-lactantes-c')) ||
        (pRoom === 'room-lactantes-c' && authorizedRoomIds.includes('lactantes-c'))
      );
    });
  }, [plans, authorizedRoomIds]);

  // 2. Filtrar por sala activa (Validación A)
  const roomPlans = React.useMemo(() => {
    return authorizedPlans.filter(p => {
      const pRoom = getPlanRoomId(p);
      return (
        pRoom === effectiveActiveRoomId ||
        (pRoom === 'lactantes-c' && effectiveActiveRoomId === 'room-lactantes-c') ||
        (pRoom === 'room-lactantes-c' && effectiveActiveRoomId === 'lactantes-c')
      );
    });
  }, [authorizedPlans, effectiveActiveRoomId]);

  // 3. Orden cronológico usando fechas de semana disponibles (Requisito 4)
  const sortedPlans = React.useMemo(() => {
    return [...roomPlans].sort((a, b) => {
      const weekA = a.weekStart || '';
      const weekB = b.weekStart || '';
      if (weekA !== weekB) {
        return weekB.localeCompare(weekA); // Más reciente primero
      }
      return (a.planningId || '').localeCompare(b.planningId || '');
    });
  }, [roomPlans]);

  // Conteo de días con actividades y detección de borradores vacíos de pruebas
  const getDaysWithActivities = (p: WeeklyPlanning): number => {
    if (!p.days || p.days.length === 0) return 0;
    return p.days.filter((d: any) =>
      (Array.isArray(d.activities) && d.activities.length > 0) ||
      (Array.isArray(d.complementaryActivities) && d.complementaryActivities.length > 0)
    ).length;
  };

  const isPlanEmptyDraft = (p: WeeklyPlanning): boolean => {
    if (p.status !== 'DRAFT') return false;
    const daysCount = getDaysWithActivities(p);
    return daysCount === 0 && (!p.observations || p.observations.trim() === '') && (!p.identifiedNeeds || p.identifiedNeeds.trim() === '');
  };

  // 4. Separación visual en secciones requeridas (Requisito 5 y 6)
  const draftsWithContent = sortedPlans.filter(p => p.status === 'DRAFT' && !isPlanEmptyDraft(p));
  const submittedPlans = sortedPlans.filter(p => p.status === 'IN_REVIEW' || p.status === 'SUBMITTED' || p.status === 'REJECTED');
  const approvedPlans = sortedPlans.filter(p => p.status === 'APPROVED' || p.status === 'APPROVED_FOR_EXECUTION');
  const closedPlans = sortedPlans.filter(p => p.status === 'CLOSED');
  const emptyHistoricalDrafts = sortedPlans.filter(p => p.status === 'DRAFT' && isPlanEmptyDraft(p));

  const formatWeekRange = (start?: string, end?: string): string => {
    if (!start && !end) return 'Semana pedagógica no especificada';
    const fmt = (iso?: string) => {
      if (!iso) return '';
      const parts = iso.split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return iso;
    };
    return `Semana: ${fmt(start)} – ${fmt(end)}`;
  };

  const formatCreatedAt = (val?: any): string => {
    if (!val) return 'Fecha de creación no disponible';
    try {
      const d = val instanceof Date ? val : (val.toDate ? val.toDate() : new Date(val));
      if (isNaN(d.getTime())) return 'Fecha de creación no disponible';
      return `Creada: ${d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;
    } catch {
      return 'Fecha de creación no disponible';
    }
  };

  const renderPlanningCard = (p: WeeklyPlanning, isHistoricalEmpty = false) => {
    const daysWithAct = getDaysWithActivities(p);
    const totalDays = p.days?.length || 5;
    const pRoomId = getPlanRoomId(p);
    const cardRoomName = (RoomCatalog.getRoom(pRoomId)?.name) || effectiveRoomLabel;
    const daycareLabel = p.daycareId
      ? (p.daycareId.startsWith('0000') ? 'Guardería No. 1 (LAB)' : `Guardería ${p.daycareId.slice(0, 8)}`)
      : 'Guardería Institucional';

    let badgeClass = 'bg-amber-100 text-amber-800 border-amber-300';
    let badgeText = 'EN ELABORACIÓN';
    let titleText = 'Trabajando en la propuesta';
    let actionText = 'Continuar donde nos quedamos';

    if (p.status === 'IN_REVIEW' || p.status === 'SUBMITTED') {
      badgeClass = 'bg-blue-100 text-blue-800 border-blue-300';
      badgeText = 'EN REVISIÓN INSTITUCIONAL';
      titleText = 'La Directora la está leyendo';
      actionText = 'Ver detalle';
    } else if (p.status === 'REJECTED') {
      badgeClass = 'bg-rose-100 text-rose-800 border-rose-300';
      badgeText = 'REQUIERE AJUSTES';
      titleText = 'Revisar sugerencias de la Directora';
      actionText = 'Continuar donde nos quedamos';
    } else if (p.status === 'APPROVED' || p.status === 'APPROVED_FOR_EXECUTION') {
      badgeClass = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      badgeText = 'APROBADA INSTITUCIONALMENTE';
      titleText = 'Propuesta lista para usarse 🌟 (Aprobada para ejecución)';
      actionText = 'Ver detalle';
    } else if (p.status === 'CLOSED') {
      badgeClass = 'bg-teal-100 text-teal-800 border-teal-300';
      badgeText = 'CONCLUIDA';
      titleText = 'Semana cerrada ✓ (Registro completado)';
      actionText = 'Semana concluida y archivada';
    }

    return (
      <button
        key={p.planningId}
        data-testid={`planning-card-${p.planningId}`}
        onClick={() => onSelect(p.planningId)}
        className="bg-white border-2 border-border-soft hover:border-brand-primary focus:border-brand-primary p-5 rounded-xl shadow-sm text-left transition w-full outline-none flex flex-col gap-2 group"
      >
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Sala: {cardRoomName}
            </span>
            <span className="text-xs font-medium text-slate-500">
              {daycareLabel}
            </span>
          </div>
          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badgeClass}`}>
            {badgeText}
          </span>
        </div>

        <div className="flex justify-between items-center">
          <span className="font-bold text-text-primary text-base">
            {titleText}
          </span>
          {p.status === 'REJECTED' && <span className="w-3 h-3 bg-status-adjustment rounded-full"></span>}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
          <span className="font-semibold text-slate-700">
            📅 {formatWeekRange(p.weekStart, p.weekEnd)}
          </span>
          <span>
            📋 {daysWithAct} de {totalDays} días con actividades
          </span>
        </div>

        <div className="text-[11px] text-slate-500 font-medium">
          👤 Responsable: Educadora Titular — Sala {cardRoomName}
        </div>

        <div className="flex flex-wrap justify-between items-center pt-2 border-t border-slate-100 text-xs text-text-muted mt-1">
          <div className="flex items-center gap-2">
            <span>{formatCreatedAt((p as any).createdAt)}</span>
            <span className="font-mono text-[10px] text-slate-400">ID: {p.planningId.slice(0, 8)}...</span>
          </div>
          <span className="font-semibold text-brand-primary group-hover:underline">
            {actionText} →
          </span>
        </div>
      </button>
    );
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl max-w-md shadow-sm">
          <p className="text-red-800 font-bold mb-2">No pudimos consultar tus planeaciones.</p>
          <p className="text-red-600 text-sm mb-4">{error}</p>
          <button
            onClick={loadPlans}
            className="bg-brand-primary hover:bg-brand-dark text-white font-semibold px-6 py-2 rounded-xl text-sm"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-fade-in max-w-2xl mx-auto w-full">
      <h2 className="text-5xl font-bold mb-6 text-brand-dark tracking-tight">Hola, {getAssistantRoleLabel(effectiveActiveRoomId)} 👋</h2>
      <p className="text-2xl text-text-muted mb-6 max-w-xl leading-relaxed">
        Vamos a preparar tu semana.<br/>
        Del 24 al 28 de agosto para <span className="font-bold text-text-primary">{effectiveRoomLabel}</span>.<br/><span className="text-sm font-bold text-teal-700 bg-teal-50 px-3 py-1 rounded-full">{modality === 'DIRECT' ? 'Prestación Directa' : 'Prestación Indirecta'}</span>
      </p>

      {/* Selector interactivo de salas autorizadas (Validación A) */}
      {authorizedRooms && authorizedRooms.length > 1 && (
        <div className="flex items-center justify-center gap-2 mb-8 bg-white/70 p-1.5 rounded-full border border-slate-200/80 shadow-xs" data-testid="teacher-room-selector">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider px-3">
            Sala:
          </span>
          {authorizedRooms.map((room) => {
            const isSelected = effectiveActiveRoomId === room.roomId;
            return (
              <button
                key={room.roomId}
                type="button"
                data-testid={`room-tab-${room.roomId}`}
                onClick={() => onSelectRoom && onSelectRoom(room)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-brand-primary text-white shadow-sm ring-2 ring-brand-primary/20'
                    : 'bg-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {room.name}
              </button>
            );
          })}
        </div>
      )}

      <p className="text-sm font-medium text-brand-primary bg-surface-ivory px-6 py-3 rounded-full mb-10 shadow-sm border border-brand-primary/20">
        ✨ Podemos continuar fortaleciendo la exploración sensorial esta semana.
      </p>

      <div className="grid gap-4 w-full">
        <button
          onClick={onNew}
          data-testid="list-new-planning-btn"
          className="bg-brand-primary hover:bg-brand-dark focus:ring-4 focus:ring-brand-primary/30 text-white font-bold px-8 py-5 rounded-xl shadow-sm transition text-lg flex flex-col items-center justify-center gap-1 w-full"
        >
          <span className="flex items-center gap-2 text-xl font-bold">
            + Nueva planeación
          </span>
          <span className="text-xs text-white/80 font-normal">
            ✨ Comenzar nuestra semana
          </span>
        </button>

        {/* 1. SECCIÓN: PLANEACIONES EN ELABORACIÓN */}
        {draftsWithContent.length > 0 && (
          <div className="w-full text-left mt-4" data-testid="section-drafts-with-content">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>✏️</span> Planeaciones en elaboración ({draftsWithContent.length})
            </h3>
            <div className="grid gap-3 w-full">
              {draftsWithContent.map(p => renderPlanningCard(p))}
            </div>
          </div>
        )}

        {/* 2. SECCIÓN: ENVIADAS A DIRECCIÓN / EN REVISIÓN */}
        {submittedPlans.length > 0 && (
          <div className="w-full text-left mt-4" data-testid="section-submitted-plans">
            <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>📬</span> Enviadas a dirección ({submittedPlans.length})
            </h3>
            <div className="grid gap-3 w-full">
              {submittedPlans.map(p => renderPlanningCard(p))}
            </div>
          </div>
        )}

        {/* 3. SECCIÓN: APROBADAS INSTITUCIONALMENTE */}
        {approvedPlans.length > 0 && (
          <div className="w-full text-left mt-4" data-testid="section-approved-plans">
            <h3 className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>🌟</span> Aprobadas institucionalmente ({approvedPlans.length})
            </h3>
            <div className="grid gap-3 w-full">
              {approvedPlans.map(p => renderPlanningCard(p))}
            </div>
          </div>
        )}

        {/* 4. SECCIÓN: EXPEDIENTES CONCLUIDOS */}
        {closedPlans.length > 0 && (
          <div className="w-full text-left mt-4" data-testid="section-closed-plans">
            <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span>🔒</span> Expedientes concluidos ({closedPlans.length})
            </h3>
            <div className="grid gap-3 w-full">
              {closedPlans.map(p => renderPlanningCard(p))}
            </div>
          </div>
        )}

        {/* 5. SECCIÓN SECUNDARIA COLAPSABLE: BORRADORES HISTÓRICOS SIN ACTIVIDADES */}
        {emptyHistoricalDrafts.length > 0 && (
          <details
            className="w-full text-left mt-4 border border-amber-200/80 rounded-xl bg-amber-50/30 overflow-hidden"
            data-testid="empty-drafts-accordion"
            open={draftsWithContent.length === 0 && emptyHistoricalDrafts.length <= 2}
          >
            <summary className="p-3.5 cursor-pointer font-semibold text-xs text-amber-900 flex items-center justify-between hover:bg-amber-100/40 select-none">
              <span className="flex items-center gap-2">
                <span>📁</span> Borradores iniciales sin actividades ({emptyHistoricalDrafts.length})
              </span>
              <span className="text-[11px] font-normal text-amber-700">
                Registros previos recuperables
              </span>
            </summary>
            <div className="p-3 grid gap-3 border-t border-amber-200/60 bg-white/50">
              {emptyHistoricalDrafts.map(p => renderPlanningCard(p, true))}
            </div>
          </details>
        )}

        {roomPlans.length === 0 && (
          <p className="text-sm text-text-muted mt-6 font-medium">
            No hay planeaciones registradas para {effectiveRoomLabel}.
          </p>
        )}
      </div>
    </div>
  );
};

const WeekDayTabs = ({
  days,
  activeIndex,
  onSelect,
  reviewedDays,
  requiredCorrectionDays,
  isCorrectionRound,
  isApprovedPlanning,
  role
}: {
  days: PlanningDay[];
  activeIndex: number;
  onSelect: (idx: number) => void;
  reviewedDays?: Record<string, boolean>;
  requiredCorrectionDays?: string[];
  isCorrectionRound?: boolean;
  isApprovedPlanning?: boolean;
  role?: string;
}) => (
  <div className="max-w-4xl mx-auto flex justify-between gap-3 mb-10 overflow-x-auto pb-4 px-2" role="tablist">
    {days.map((d, idx) => {
      const isActive = idx === activeIndex;

      let bgClass = "bg-white text-text-muted border-border-default hover:border-brand-primary/50 hover:text-brand-dark hover:bg-surface-ivory shadow-sm";
      let icon = "";

      if (isApprovedPlanning) {
        // DAILY EVALUATION STATUS VISUAL NAVIGATION (H1R9-C.4.1 & H1R9-D.2)
        const isResubmitted = d.evaluationResubmitted || Boolean(d.evaluationHistory && d.evaluationHistory.length > 0);

        if (d.evaluationStatus === 'APPROVED') {
          bgClass = "bg-green-100 text-green-900 border-green-300 ring-green-200 hover:shadow-sm";
          icon = "✓ ";
          if (isActive) bgClass = "bg-green-600 text-white border-green-700 shadow-md ring-4 ring-green-600/20";
        } else if (d.evaluationStatus === 'CHANGES_REQUESTED') {
          bgClass = "bg-orange-100 text-orange-900 border-orange-300 ring-orange-200 hover:shadow-sm";
          icon = "🟠 ";
          if (isActive) bgClass = "bg-orange-500 text-white border-orange-600 shadow-md ring-4 ring-orange-500/20";
        } else if (d.evaluationStatus === 'IN_REVIEW') {
          if (role === 'DIRECTOR' && isResubmitted) {
            bgClass = "bg-orange-100 text-orange-900 border-orange-300 ring-orange-200 hover:shadow-sm";
            icon = "🟠 ";
            if (isActive) bgClass = "bg-orange-500 text-white border-orange-600 shadow-md ring-4 ring-orange-500/20";
          } else {
            bgClass = "bg-blue-100 text-blue-900 border-blue-300 ring-blue-200 hover:shadow-sm";
            icon = "⏳ ";
            if (isActive) bgClass = "bg-blue-600 text-white border-blue-700 shadow-md ring-4 ring-blue-600/20";
          }
        } else if (d.evaluationStatus === 'DRAFT') {
          bgClass = "bg-teal-50 text-teal-900 border-teal-200 hover:shadow-sm";
          icon = "📝 ";
          if (isActive) bgClass = "bg-teal-600 text-white border-teal-700 shadow-md ring-4 ring-teal-600/20";
        } else {
          if (isActive) bgClass = "bg-brand-primary text-white border-brand-primary shadow-md ring-4 ring-brand-primary/20";
        }
      } else {
        // PLANNING REVIEW WORKFLOW (Before APPROVED)
        const isReqCorrection = requiredCorrectionDays?.includes(d.dayOfWeek);
        const isReviewed = role === 'DIRECTOR'
          ? (reviewedDays?.[d.dayOfWeek] || (isCorrectionRound && !isReqCorrection))
          : Boolean(d.teacherReviewedAt && d.teacherReviewedBy);

        if (isReqCorrection) {
          bgClass = "bg-orange-100 text-orange-900 border-orange-300 ring-orange-200 hover:shadow-sm";
          icon = "🟠 ";
        } else if (isReviewed) {
          bgClass = "bg-green-100 text-green-900 border-green-300 ring-green-200 hover:shadow-sm";
          icon = "✓ ";
        }

        if (isActive) {
          if (isReqCorrection) bgClass = "bg-orange-500 text-white border-orange-600 shadow-md ring-4 ring-orange-500/20";
          else if (isReviewed) bgClass = "bg-green-600 text-white border-green-700 shadow-md ring-4 ring-green-600/20";
          else bgClass = "bg-brand-primary text-white border-brand-primary shadow-md ring-4 ring-brand-primary/20";
        }
      }

      const label = d.dayOfWeek === 'MONDAY' ? 'Lunes 24' :
                    d.dayOfWeek === 'TUESDAY' ? 'Martes 25' :
                    d.dayOfWeek === 'WEDNESDAY' ? 'Miércoles 26' :
                    d.dayOfWeek === 'THURSDAY' ? 'Jueves 27' : 'Viernes 28';
      const isTeacher = role === 'TEACHER';
      const isApproved = isApprovedPlanning;
      const isTeacherRev = Boolean(d.teacherReviewedAt && d.teacherReviewedBy);
      const tabSuffix = (!isApproved && isTeacher) ? (isTeacherRev ? " (Revisado)" : " (Pendiente)") : "";

      return (
        <button
          key={d.dayOfWeek}
          role="tab"
          aria-label={`${icon}${label}`}
          aria-selected={isActive}
          aria-controls={'panel-' + d.dayOfWeek}
          onClick={() => onSelect(idx)}
          className={`flex-1 min-w-[140px] px-6 py-4 rounded-full font-bold text-lg transition border whitespace-nowrap outline-none focus:ring-4 focus:ring-brand-primary/30 ${bgClass}`}
        >
          <span>{icon}{label}</span>
          {tabSuffix && <span className="text-xs block font-normal opacity-85 mt-0.5">{tabSuffix.replace(/[()]/g, '').trim()}</span>}
        </button>
      );
    })}
  </div>
);

const normalizeMaterial = (m: string) => m.trim().toLowerCase();

const getCommonWeeklyMaterials = (days: PlanningDay[]): string[] => {
  if (days.length !== 5) return [];

  const dayMaterialSets = days.map(d => {
    const set = new Set<string>();
    const originalNames = new Map<string, string>();
    d.activities.forEach(a => {
      a.materials.forEach(m => {
        if (!m.trim()) return;
        const norm = normalizeMaterial(m);
        set.add(norm);
        if (!originalNames.has(norm)) {
          originalNames.set(norm, m.trim());
        }
      });
    });
    return { set, originalNames };
  });

  const firstDay = dayMaterialSets[0];
  if (!firstDay) return [];

  const commonNormalized = Array.from(firstDay.set).filter(norm =>
    dayMaterialSets.every(d => d.set.has(norm))
  );

  return commonNormalized.map(norm => firstDay.originalNames.get(norm)!);
};

const getDaySpecificMaterials = (day: PlanningDay, commonMaterials: string[]): string[] => {
  const commonSet = new Set(commonMaterials.map(normalizeMaterial));
  const uniqueDayMaterials = new Map<string, string>();

  day.activities.forEach(a => {
    a.materials.forEach(m => {
      if (!m.trim()) return;
      const norm = normalizeMaterial(m);
      if (!commonSet.has(norm) && !uniqueDayMaterials.has(norm)) {
        uniqueDayMaterials.set(norm, m.trim());
      }
    });
  });

  return Array.from(uniqueDayMaterials.values());
};




export const formatDayDateMessage = (dateStr: string): string => {
  const parts = dateStr.split("-").map(Number);
  const y = parts[0] || 2026;
  const m = parts[1] || 1;
  const d = parts[2] || 1;
  const dateObj = new Date(Date.UTC(y, m - 1, d));
  const dayNames = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const monthNames = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];
  return `${dayNames[dateObj.getUTCDay()]} ${d} de ${monthNames[dateObj.getUTCMonth()]}`;
};

const createDefaultWeekDays = (): PlanningDay[] =>
  ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'].map(d => ({
    date: '',
    dayOfWeek: d as PlanningDay['dayOfWeek'],
    activities: [],
    complementaryActivities: [],
    prioritizedPractices: [],
    materials: [],
  }));

const TeacherWizard = ({ service, source, curricularRecommendationSource, effectiveWeeklyPlanningProposalSource, weeklyPlanningProposalSource, evaluationRecommendationSource, isFirstLight, daycareId, activeRoom, planId, canonicalPlan, isNewIntent, modality, onBack, onNew, onSaved, role, onViewOfficial, currentDate, teacherId, onPlanPersisted, onRoomResolved }: { service: PlanningWorkflowService, source: PedagogicalRecommendationSource, curricularRecommendationSource?: CurricularRecommendationSource | undefined, effectiveWeeklyPlanningProposalSource?: WeeklyPlanningProposalSource | undefined, weeklyPlanningProposalSource?: WeeklyPlanningProposalSource | undefined, evaluationRecommendationSource?: EvaluationRecommendationSource | undefined, isFirstLight?: boolean | undefined, daycareId?: string | undefined, activeRoom?: Room | undefined, planId: string | null, canonicalPlan?: WeeklyPlanning | null | undefined, isNewIntent?: boolean | undefined, modality: 'DIRECT'|'INDIRECT', onBack: () => void, onNew?: () => void, onSaved: () => void, role: string, onViewOfficial: () => void, currentDate?: string, teacherId?: string, onPlanPersisted?: (id: string) => void, onRoomResolved?: (roomId: string) => void }) => {
  const effectiveTeacher = teacherId || (isFirstLight ? FIRST_LIGHT_TEACHER_ID : 't1');
  const [obs, setObs] = useState('');
  const [needs, setNeeds] = useState('');
  const [specialSituations, setSpecialSituations] = useState('');
  const [availableMaterials, setAvailableMaterials] = useState('');
  const [originalContext, setOriginalContext] = useState<any>(null);

  const [days, setDays] = useState<PlanningDay[]>(() => {
    if (!planId) {
      return createDefaultWeekDays();
    }
    return [];
  });
  const [status, setStatus] = useState<string>('DRAFT');
  const [planningObj, setPlanningObj] = useState<any>(null);
  const initialMonday = currentDate ? getMondayOfWeek(currentDate) : MOCK_START;
  const initialFriday = calculateWeekEnd(initialMonday);
  const [weekStart, setWeekStart] = useState<string>(initialMonday);
  const [weekEnd, setWeekEnd] = useState<string>(initialFriday);
  const [granularObservations, setGranularObservations] = useState<any[]>([]);

  const [activeDayIndex, setActiveDayIndex] = useState<number>(0);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  const stableIdRef = useRef<string | null>(null);
  if (!stableIdRef.current) {
    if (planId) {
      stableIdRef.current = planId;
    } else if (isFirstLight) {
      stableIdRef.current = generateUniquePlanningId();
    } else {
      stableIdRef.current = generateUniquePlanningId('p-demo-');
    }
  }
  const currentPlanId = planId || stableIdRef.current;
  const evaluationTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const planRoomId = (planningObj as any)?.roomId || (planId ? canonicalPlan?.roomId : undefined);
  const effectiveRoom = (planRoomId && (RoomCatalog.getRoom(planRoomId) || (planRoomId === 'room-lactantes-b' ? { roomId: 'room-lactantes-b', name: 'Lactantes B', minAgeMonths: 7, maxAgeMonths: 12 } : undefined) || (planRoomId === 'room-lactantes-c' || planRoomId === 'lactantes-c' ? { roomId: 'room-lactantes-c', name: 'Lactantes C', minAgeMonths: 13, maxAgeMonths: 18 } : undefined)))
    || activeRoom
    || (isFirstLight ? RoomCatalog.getRoom(FIRST_LIGHT_ROOM_ID) : undefined)
    || RoomCatalog.getRoom('room-lactantes-c')
    || RoomCatalog.getRoom('lactantes-c')
    || {
      roomId: 'room-lactantes-c',
      name: 'Lactantes C',
      minAgeMonths: 13,
      maxAgeMonths: 18,
    };

  const effectiveWeekStart = weekStart || initialMonday;
  const effectiveWeekEnd = (weekEnd && weekEnd >= effectiveWeekStart)
    ? weekEnd
    : calculateWeekEnd(effectiveWeekStart);

  const evidenceContext = useMemo(() => ({
    room: effectiveRoom,
    modality,
    weekStart: effectiveWeekStart,
    weekEnd: effectiveWeekEnd,
  }), [effectiveRoom, modality, effectiveWeekStart, effectiveWeekEnd]);

  const [isGenerating, setIsGenerating] = useState(false);
  const isGeneratingRef = useRef(false);
  const [pendingWeeklyProposal, setPendingWeeklyProposal] = useState<WeeklyPlanningProposalResponse | null>(null);
  const [proposalSourceType, setProposalSourceType] = useState<'AI' | 'FALLBACK'>('AI');
  const [proposalError, setProposalError] = useState<string | null>(null);
  const [isAcceptingProposal, setIsAcceptingProposal] = useState<boolean>(false);

  const [contextLocked, setContextLocked] = useState(false);
  const [collapsedResolved, setCollapsedResolved] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState('');
  const [dailyEvaluations, setDailyEvaluations] = useState<Record<string, string>>({});
  const [evaluationEvidenceByDay, setEvaluationEvidenceByDay] = useState<Record<string, HumanEvidenceInputs>>({});
  const [evaluationDraftError, setEvaluationDraftError] = useState<string | null>(null);

  const ensurePlanningAggregateCreated = async () => {
    if (planningObj) return planningObj;
    try {
      const existing = await service.getPlanning(currentPlanId);
      if (existing) {
        setPlanningObj(existing);
        return existing;
      }
    } catch {}
    const initialRoomId = activeRoom?.roomId || (isFirstLight ? FIRST_LIGHT_ROOM_ID : 'room-lactantes-c');
    const initialDaycareId = isFirstLight ? (daycareId || FIRST_LIGHT_DAYCARE_ID) : 'd1';
    try {
      await service.createPlanning(currentPlanId, initialDaycareId, initialRoomId, effectiveTeacher, effectiveWeekStart, effectiveWeekEnd, 'TEACHER');
      const created = await service.getPlanning(currentPlanId);
      if (created) {
        setPlanningObj(created);
        return created;
      }
    } catch {}
    return null;
  };

  useEffect(() => {
    if (planId) {
      if (planningObj && planningObj.planningId === planId && days.some(d => d.activities && d.activities.length > 0)) {
        return;
      }
      service.getPlanning(planId).then((p: any) => {
        if (p) {
          setPlanningObj(p);
          if (onRoomResolved && p.roomId) {
            onRoomResolved(p.roomId);
          }
          setObs(p.observations || '');
          setNeeds(p.identifiedNeeds || '');
          setSpecialSituations(p.specialSituations || '');
          setAvailableMaterials(p.availableMaterials || '');
          setGranularObservations(p.granularObservations || []);
          if (p.originalContext) {
            setOriginalContext(p.originalContext);
          } else if (p.days && p.days.some((d: any) => d.activities && d.activities.length > 0)) {
            setOriginalContext({
              observations: p.observations || '',
              identifiedNeeds: p.identifiedNeeds || '',
              specialSituations: p.specialSituations || '',
              availableMaterials: p.availableMaterials || ''
            });
          }

          if (p.days.length === 0) {
            setDays(createDefaultWeekDays());
          } else {
            setDays(p.days);
            if (p.days.some((d: any) => d.activities && d.activities.length > 0)) {
              setContextLocked(true);
            }
          }
          setStatus(p.status);
          if (p.weekStart) setWeekStart(p.weekStart);
          if (p.weekEnd) setWeekEnd(p.weekEnd);
          if (p.days) {
            const evals: Record<string, string> = {};
            for (const d of p.days) {
              const text = d.evaluationDraft !== undefined ? d.evaluationDraft : (d.evaluation || '');
              if (text) evals[d.dayOfWeek] = text;
            }
            setDailyEvaluations(evals);
          }
        }
      }).catch(() => {});
    } else {
      if (role === 'TEACHER') {
        const initialRoomId = activeRoom?.roomId || (isFirstLight ? FIRST_LIGHT_ROOM_ID : 'lactantes-c');
        const initialDaycareId = isFirstLight ? (daycareId || FIRST_LIGHT_DAYCARE_ID) : 'd1';

        const initFreshSession = async () => {
          try {
            let existing = null;
            try {
              existing = await service.getPlanning(currentPlanId);
            } catch {
              // Non-existent document lookup safely handled
            }

            if (existing) {
              setPlanningObj(existing);
              setObs(existing.observations || '');
              setNeeds(existing.identifiedNeeds || '');
              setSpecialSituations(existing.specialSituations || '');
              setAvailableMaterials(existing.availableMaterials || '');
              setGranularObservations(existing.granularObservations || []);
              if (existing.weekStart) setWeekStart(existing.weekStart);
              if (existing.weekEnd) setWeekEnd(existing.weekEnd);
              if (existing.days && existing.days.length > 0) {
                setDays(existing.days);
              }
              setStatus(existing.status);
            } else {
              setDays(prev => prev.length === 5 ? prev : createDefaultWeekDays());
              setStatus('DRAFT');
            }
          } catch {
            setDays(prev => prev.length === 5 ? prev : createDefaultWeekDays());
            setStatus('DRAFT');
          }
        };

        initFreshSession();
      }
    }
  }, [planId, currentPlanId, service, role, isFirstLight, activeRoom, effectiveTeacher]);

  const handleGenerateWeek = async () => {
    if (isGeneratingRef.current || isGenerating) return;
    isGeneratingRef.current = true;
    setIsGenerating(true);
    setProposalError(null);

    const activeProposalSource = effectiveWeeklyPlanningProposalSource ?? weeklyPlanningProposalSource;

    // Governed WeeklyPlanningProposalSource Human Gate path
    if (activeProposalSource) {
      try {
        const req: WeeklyPlanningProposalRequest = {
          planningId: currentPlanId,
          ...(isFirstLight ? { daycareId: daycareId || FIRST_LIGHT_DAYCARE_ID } : {}),
          weekStart: effectiveWeekStart,
          weekEnd: effectiveWeekEnd,
          modality,
          room: effectiveRoom,
          currentContext: {
            observations: obs,
            identifiedNeeds: needs,
            specialSituations: specialSituations,
            availableMaterials: availableMaterials,
          },
          constraints: {
            minActivitiesPerDay: 5,
          },
        };
        const proposal = await activeProposalSource.propose(req);
        // Human Gate: Store proposal transiently in memory for Anita's review.
        // ZERO saveDraft, ZERO persistence, ZERO aggregate mutation!
        setProposalSourceType('AI');
        setPendingWeeklyProposal(proposal);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Error al generar la propuesta de planeación.';
        // Deterministic fallback path when AI fails, response is invalid, or provider is unavailable
        try {
          const targetRoom = effectiveRoom || activeRoom || RoomCatalog.getRoom('lactantes-b') || RoomCatalog.getRoom('lactantes-c')!;
          const recommended = await source.generateRecommendation(targetRoom, obs, needs, specialSituations, availableMaterials);
          const fallbackDays: ProposedPlanningDay[] = recommended.map((d) => ({
            dayOfWeek: d.dayOfWeek as WeeklyPlanningWeekday,
            activities: d.activities.map((a) => ({
              category: (a.category && (IMSS_CATEGORIES as readonly string[]).includes(a.category)
                ? a.category
                : 'AMBIENTES DE APRENDIZAJE') as ImssCategory,
              objective: a.objective || 'Estimulación del desarrollo integral infantil.',
              description: a.description || (a as any).procedure || '',
              durationMinutes: a.durationMinutes || 15,
              materials: a.materials || [],
            })),
          }));
          setProposalSourceType('FALLBACK');
          setPendingWeeklyProposal({ days: fallbackDays });
          setProposalError(`IA no disponible (${message}). Se activó la propuesta determinista de respaldo.`);
        } catch {
          setProposalError(message);
          setToastMessage(message);
        }
      } finally {
        isGeneratingRef.current = false;
        setIsGenerating(false);
      }
      return;
    }

    // Legacy fallback path for existing tests without weeklyPlanningProposalSource
    setProposalSourceType('FALLBACK');
    const recommended = await source.generateRecommendation(effectiveRoom || activeRoom || RoomCatalog.getRoom('lactantes-c')!, obs, needs, specialSituations, availableMaterials);
    const initialSnapshot = {
      observations: obs,
      identifiedNeeds: needs,
      specialSituations: specialSituations,
      availableMaterials: availableMaterials
    };
    setTimeout(async () => {
      setDays(recommended);
      setOriginalContext(initialSnapshot);
      setContextLocked(true);
      isGeneratingRef.current = false;
      setIsGenerating(false);
      try {
        await ensurePlanningAggregateCreated();
        await service.saveDraft(currentPlanId, obs, needs, specialSituations, availableMaterials, [], recommended, 'TEACHER', initialSnapshot);
        const updated = await service.getPlanning(currentPlanId);
        if (updated) {
          setPlanningObj(updated);
        }
      } catch (err) {}
    }, process.env.NODE_ENV === 'test' ? 0 : 2000);
  };

  const handleDiscardProposal = () => {
    setPendingWeeklyProposal(null);
    setProposalError(null);
    // Context (obs, needs, specialSituations, availableMaterials) is strictly preserved!
    // No saveDraft, no persistence, no aggregate mutation.
  };

  const handleAcceptProposal = async () => {
    if (!pendingWeeklyProposal || isAcceptingProposal) return;
    setIsAcceptingProposal(true);
    const initialSnapshot = {
      observations: obs,
      identifiedNeeds: needs,
      specialSituations: specialSituations,
      availableMaterials: availableMaterials,
    };

    // Existing complementary activities and prioritized practices preservation
    const existingComplementary: Record<string, any[]> = {};
    const existingPrioritized: Record<string, any[] | undefined> = {};
    for (const d of days) {
      if (d.complementaryActivities && d.complementaryActivities.length > 0) {
        existingComplementary[d.dayOfWeek] = d.complementaryActivities;
      }
      if (d.prioritizedPractices && d.prioritizedPractices.length > 0) {
        existingPrioritized[d.dayOfWeek] = d.prioritizedPractices;
      }
    }

    const convertedDays: PlanningDay[] = pendingWeeklyProposal.days.map((pDay, idx) => {
      const dNum = 24 + idx;
      const dateStr = pDay.date || `2026-08-${dNum}`;
      return {
        date: dateStr,
        dayOfWeek: pDay.dayOfWeek,
        activities: pDay.activities.map((a, aIdx) => ({
          activityId: `act-${pDay.dayOfWeek.toLowerCase()}-${aIdx + 1}-${Date.now()}`,
          category: a.category,
          objective: a.objective,
          description: a.description,
          durationMinutes: a.durationMinutes,
          materials: [...a.materials],
          curricularTraceability: [],
        })),
        complementaryActivities: existingComplementary[pDay.dayOfWeek] || [],
        ...(existingPrioritized[pDay.dayOfWeek] ? { prioritizedPractices: existingPrioritized[pDay.dayOfWeek] } : {}),
        materials: Array.from(new Set(pDay.activities.flatMap(a => a.materials))),
      };
    });

    // Call service.saveDraft EXACTLY ONCE upon human acceptance
    try {
      await ensurePlanningAggregateCreated();
      await service.saveDraft(
        currentPlanId,
        obs,
        needs,
        specialSituations,
        availableMaterials,
        [],
        convertedDays,
        'TEACHER',
        initialSnapshot
      );
      const updated = await service.getPlanning(currentPlanId);
      if (updated) {
        setPlanningObj(updated);
        updateUrlParams({ planId: currentPlanId, action: null });
        if (onPlanPersisted) onPlanPersisted(currentPlanId);
      }
      setDays(convertedDays);
      setOriginalContext(initialSnapshot);
      setContextLocked(true);
      setPendingWeeklyProposal(null);
      setToastMessage('✓ Propuesta incorporada a tu planeación como borrador.');
      setTimeout(() => setToastMessage(''), 3000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error al guardar el borrador.';
      setToastMessage(msg);
      setProposalError(msg);
    } finally {
      setIsAcceptingProposal(false);
    }
  };

  const handleSaveContextEdit = async () => {
    setContextLocked(true);
    if (!originalContext) {
      setOriginalContext({
        observations: obs,
        identifiedNeeds: needs,
        specialSituations: specialSituations,
        availableMaterials: availableMaterials
      });
    }
    try {
      if (days.length === 5 && days.some(d => d.activities && d.activities.length > 0)) {
        await ensurePlanningAggregateCreated();
        await service.saveDraft(currentPlanId, obs, needs, specialSituations, availableMaterials, [], days, 'TEACHER', originalContext || undefined);
      }
    } catch (err) {}
    setToastMessage('✓ Contexto semanal guardado.');
    setTimeout(() => setToastMessage(''), 2000);
  };

  const handleSaveDraft = async () => {
    if (days.length === 5) {
      await ensurePlanningAggregateCreated();
      await service.saveDraft(currentPlanId, obs, needs, specialSituations, availableMaterials, [], days, 'TEACHER', originalContext || undefined);

      // Auto-update local status for UX so color changes to yellow
      const updated = await service.getPlanning(currentPlanId);
      if (updated) {
        setGranularObservations(updated.granularObservations || []);
        updateUrlParams({ planId: currentPlanId, action: null });
        if (onPlanPersisted) onPlanPersisted(currentPlanId);
      }
    }
    onSaved();
    setToastMessage('✓ Avance del día guardado.');
    setTimeout(() => setToastMessage(''), 3000);
  };

  const handleSubmit = async () => {
    if (status === 'REJECTED') {
      await service.saveDraft(currentPlanId, obs, needs, specialSituations, availableMaterials, [], days, 'TEACHER');
      await service.submit(currentPlanId, 'TEACHER');
    } else {
      if (days.length === 5) {
        await ensurePlanningAggregateCreated();
        await service.saveDraft(currentPlanId, obs, needs, specialSituations, availableMaterials, [], days, 'TEACHER', originalContext || undefined);
      }
      await service.submit(currentPlanId, 'TEACHER');
    }
    setStatus('IN_REVIEW');
    setToastMessage('🎉 ¡Listo! Planeación enviada.');
    onSaved();
    setTimeout(() => {
      setToastMessage('');
      onBack();
    }, 2500);
  };

  const readOnly = status === 'IN_REVIEW' || status === 'APPROVED' || status === 'APPROVED_FOR_EXECUTION' || status === 'CLOSED' || role !== 'TEACHER';

  const requiredCorrectionDays = React.useMemo(() => {
    if (status !== 'REJECTED') return [];
    const req = new Set<string>();
    granularObservations.forEach((obs: any) => {
      if (obs.status === 'PENDING_CORRECTION') {
        for (const d of days) {
          if (d.activities && d.activities.some((a: any) => a.activityId === obs.targetId)) {
            req.add(d.dayOfWeek);
          }
        }
      }
    });
    return Array.from(req);
  }, [status, granularObservations, days]);

  return (
    <div className="flex flex-col relative animate-fade-in pb-20 max-w-4xl mx-auto">
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl z-50 font-bold flex items-center gap-3 text-lg">
          {toastMessage}
        </div>
      )}

      <div className="flex items-center justify-between mb-10">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-text-muted hover:text-gray-800 font-bold px-4 py-2 rounded-full hover:bg-gray-200 transition">← Volver al listado</button>
          {role === 'TEACHER' && onNew && (
            <button
              onClick={onNew}
              data-testid="wizard-new-planning-btn"
              className="bg-brand-primary hover:bg-brand-dark text-white font-bold px-5 py-2 rounded-full shadow-sm transition text-sm flex items-center gap-2 cursor-pointer"
            >
              + Nueva planeación
            </button>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-teal-700 bg-teal-50 px-4 py-2 rounded-full border border-teal-200">{modality === 'DIRECT' ? 'Prestación Directa' : 'Prestación Indirecta'}</span>
          {status === 'CLOSED' ? (
            <span className="text-sm font-bold text-teal-900 bg-teal-100 px-4 py-2 rounded-full border border-teal-300 shadow-sm flex items-center gap-1.5">
              <span>✓</span> Semana cerrada
            </span>
          ) : (status === 'APPROVED' || status === 'APPROVED_FOR_EXECUTION') && (
            <span className="text-sm font-bold text-green-800 bg-green-50 px-4 py-2 rounded-full border border-green-200">
              Aprobada para ejecución
            </span>
          )}
          {(status === 'APPROVED' || status === 'APPROVED_FOR_EXECUTION' || status === 'CLOSED' || role === 'SUPERVISOR') && (
            <button onClick={onViewOfficial} className="text-sm font-bold bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-full shadow-sm transition flex items-center gap-2">
              Versión Oficial IMSS
            </button>
          )}
        </div>
      </div>

      <h3 className="text-4xl font-bold text-text-primary mb-8 text-center">Planeación Semanal</h3>
      {role === 'SUPERVISOR' && <p className="text-center text-text-muted font-bold mb-8 uppercase tracking-widest text-sm">Vista de solo lectura (Supervisión)</p>}

      <div className="space-y-8 pb-8">
        {days.length > 0 && (
          <>

            <div className="bg-surface-ivory p-6 rounded-xl border border-teal-100 shadow-sm mb-8 animate-fade-in">
              <h4 className="text-xl font-bold text-teal-900 mb-4 border-b border-teal-50 pb-2">Contexto Pedagógico Semanal</h4>
              <div className="space-y-5">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-brand-dark uppercase tracking-wider">1. ¿Qué observaste en el grupo?</label>
                    <span className="text-xs text-text-muted">{obs.length}/1000</span>
                  </div>
                  <textarea maxLength={1000} disabled={readOnly || contextLocked} value={obs} onChange={e => setObs(e.target.value)} placeholder="Ej: Los niños muestran interés en los sonidos..." className="w-full text-base p-3 bg-white border border-border-default rounded-lg outline-none min-h-[80px] focus:border-brand-primary transition resize-y" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-brand-dark uppercase tracking-wider">2. ¿Qué necesitan fortalecer?</label>
                    <span className="text-xs text-text-muted">{needs.length}/1000</span>
                  </div>
                  <textarea maxLength={1000} disabled={readOnly || contextLocked} value={needs} onChange={e => setNeeds(e.target.value)} placeholder="Ej: Control postural, atención conjunta..." className="w-full text-base p-3 bg-white border border-border-default rounded-lg outline-none min-h-[80px] focus:border-brand-primary transition resize-y" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-brand-dark uppercase tracking-wider">3. ¿Hay situaciones a considerar?</label>
                    <span className="text-xs text-text-muted">{specialSituations.length}/1000</span>
                  </div>
                  <textarea maxLength={1000} disabled={readOnly || contextLocked} value={specialSituations} onChange={e => setSpecialSituations(e.target.value)} placeholder="Ej: Dos niños nuevos en adaptación..." className="w-full text-base p-3 bg-white border border-border-default rounded-lg outline-none min-h-[80px] focus:border-brand-primary transition resize-y" />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-bold text-brand-dark uppercase tracking-wider">4. ¿Qué materiales tienes disponibles?</label>
                    <span className="text-xs text-text-muted">{availableMaterials.length}/1000</span>
                  </div>
                  <textarea maxLength={1000} disabled={readOnly || contextLocked} value={availableMaterials} onChange={e => setAvailableMaterials(e.target.value)} placeholder="Ej: Sonajas, colchonetas, pelotas suaves, libros de tela..." className="w-full text-base p-3 bg-white border border-border-default rounded-lg outline-none min-h-[80px] focus:border-brand-primary transition resize-y" />
                </div>
              </div>

              {days.some(d => d.activities && d.activities.length > 0) && !readOnly && (
                <div className="mt-4 flex justify-end">
                  {contextLocked ? (
                    <button onClick={() => setContextLocked(false)} className="text-sm font-bold text-teal-700 hover:text-teal-900 flex items-center gap-2">
                      ✏️ Editar contexto semanal
                    </button>
                  ) : (
                    <button onClick={handleSaveContextEdit} className="text-sm font-bold bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-full shadow-sm flex items-center gap-2 transition">
                      💾 Guardar contexto semanal
                    </button>
                  )}
                </div>
              )}

              {!days.some(d => d.activities && d.activities.length > 0) && !isGenerating && !readOnly && (
                <div className="text-center mt-8 pt-6 border-t border-teal-100">
                  <button onClick={handleGenerateWeek} disabled={!obs || readOnly || isGenerating} className="bg-brand-primary hover:bg-brand-dark focus:ring-4 focus:ring-brand-primary/30 text-white font-bold text-xl px-8 py-4 rounded-full shadow-sm transition disabled:opacity-50 flex items-center justify-center gap-3 w-full max-w-md mx-auto">
                    {isGenerating ? 'Preparando propuesta semanal…' : '✨ Ayúdame con TutorIA (Generar Semana)'}
                  </button>
                  <p className="text-xs text-text-muted mt-3 uppercase tracking-wider font-bold">Generará los 5 días basándose en este contexto</p>
                </div>
              )}

              {proposalError && (
                <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm max-w-md mx-auto text-center" role="alert">
                  {proposalError}
                </div>
              )}
            </div>

            {days.some(d => d.activities && d.activities.length > 0) && status !== 'APPROVED' && status !== 'APPROVED_FOR_EXECUTION' && status !== 'CLOSED' && (
              <div className="flex flex-col sm:flex-row items-center justify-between bg-teal-50/80 border border-teal-200 px-6 py-3.5 rounded-xl mb-6 shadow-sm gap-2 animate-fade-in">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-teal-950 text-base">
                    Progreso de revisión: {days.filter(d => Boolean(d.teacherReviewedAt && d.teacherReviewedBy)).length}/5 días revisados
                  </span>
                  {days.filter(d => Boolean(d.teacherReviewedAt && d.teacherReviewedBy)).length === 5 ? (
                    <span className="text-xs font-bold bg-green-200 text-green-900 px-2.5 py-0.5 rounded-full">
                      ✓ Completo
                    </span>
                  ) : (
                    <span className="text-xs font-bold bg-amber-100 text-amber-900 px-2.5 py-0.5 rounded-full">
                      Pendiente
                    </span>
                  )}
                </div>
                <span className="text-xs text-teal-800 font-medium text-center sm:text-right">
                  {days.filter(d => Boolean(d.teacherReviewedAt && d.teacherReviewedBy)).length === 5
                    ? "✓ Todos los días revisados. Puedes enviar la planeación a la Educadora."
                    : "Revisa cada día antes de enviar la planeación a la Educadora."}
                </span>
              </div>
            )}

            <WeekDayTabs days={days} activeIndex={activeDayIndex} onSelect={setActiveDayIndex} requiredCorrectionDays={requiredCorrectionDays} isCorrectionRound={status === 'REJECTED'} isApprovedPlanning={status === 'APPROVED' || status === 'APPROVED_FOR_EXECUTION' || status === 'CLOSED'} role="TEACHER" />


            {(() => {
              const d = days[activeDayIndex];
              if (!d) return null;
              const isMonday = d.dayOfWeek === 'MONDAY';
              const hasActivities = d.activities && d.activities.length > 0;



              return (
                <div key={d.dayOfWeek} className="w-full bg-white rounded-xl shadow-sm border border-border-soft p-8 md:p-12 animate-fade-in-up">
                  {(() => {
                    const isRev = Boolean(d.teacherReviewedAt && d.teacherReviewedBy);
                    return (
                      <div className="flex items-center justify-between mb-4 border-b border-teal-50 pb-3">
                        <h4 className="text-3xl font-bold text-teal-900 uppercase tracking-widest">
                          {d.dayOfWeek === 'MONDAY' ? 'Lunes 24' : d.dayOfWeek === 'TUESDAY' ? 'Martes 25' : d.dayOfWeek === 'WEDNESDAY' ? 'Miércoles 26' : d.dayOfWeek === 'THURSDAY' ? 'Jueves 27' : 'Viernes 28'}
                        </h4>
                        {status === 'DRAFT' && (
                          <span className={`text-sm font-bold px-3 py-1 rounded-full flex items-center gap-1.5 ${isRev ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}`}>
                            <span>{isRev ? '✓' : '⏳'}</span>
                            {isRev ? 'Revisado' : 'Pendiente de revisión'}
                          </span>
                        )}
                      </div>
                    );
                  })()}

                  {!hasActivities && !isGenerating && (
                    <div className="mt-12 text-center text-text-muted text-lg italic">
                      Planeación pendiente para este día. Utiliza TutorIA para generar la semana.
                    </div>
                  )}
                  {isGenerating && (
                    <div className="mt-12 text-center text-brand-primary font-bold text-xl animate-pulse">
                      Preparando propuesta semanal…
                    </div>
                  )}

                  {hasActivities && (<>
                    <div className="space-y-4 mt-8">
                      {d.activities.map((a, j) => {
                         const isExpanded = expandedActivityId === a.activityId;
                         const gObs = granularObservations.find(o => o.targetId === a.activityId);

                         let highlightClass = "border-border-soft bg-surface-soft";
                         if (gObs && gObs.status === 'PENDING_CORRECTION') highlightClass = "border-orange-400 bg-orange-50 ring-2 ring-orange-200";
                         else if (gObs && gObs.status === 'CHANGED_BY_EDUCATOR') highlightClass = "border-yellow-400 bg-yellow-50";
                         else if (gObs && gObs.status === 'RESOLVED') highlightClass = "border-green-300 bg-green-50";

                         return (
                           <div key={a.activityId} className={`rounded-xl border overflow-hidden transition ${highlightClass}`}>
                             {gObs && (gObs.status === 'PENDING_CORRECTION' || gObs.status === 'CHANGED_BY_EDUCATOR') && (
                               <div className="bg-orange-100 border-b border-orange-200 p-4 text-orange-900">
                                 <span className="font-bold text-sm uppercase tracking-wider block mb-1">⚠️ OBSERVACIÓN DE LA DIRECTORA:</span>
                                 <p className="text-sm font-bold text-orange-950">{gObs.observation}</p>
                                 {gObs.status === 'CHANGED_BY_EDUCATOR' && <span className="text-xs font-bold bg-yellow-200 text-yellow-800 px-2 py-1 mt-2 inline-block rounded">✓ Modificado, pendiente de reenviar</span>}
                               </div>
                             )}
                             <button onClick={() => setExpandedActivityId(isExpanded ? null : a.activityId)} className="w-full text-left p-6 hover:bg-white/50 transition flex justify-between items-center group outline-none">
                               <div>
                                 <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">{a.category} • {a.durationMinutes} min</p>
                                 <p className="font-bold text-text-primary text-xl group-hover:text-teal-800 transition">{a.objective}</p>
                               </div>
                               <div className="text-teal-600 font-medium px-4 py-2 rounded-full bg-white border border-teal-100 shadow-sm flex-shrink-0 transition">
                                 {isExpanded ? 'Ocultar' : 'Revisar / Editar'}
                               </div>
                             </button>
                             {isExpanded && (
                               <div className="px-6 pb-6 pt-2 border-t border-teal-50 bg-white">
                                 <textarea disabled={readOnly} value={a.description} onChange={e => {
                                    const newDays = [...days];
                                    newDays[activeDayIndex]!.activities![j]!.description = e.target.value;
                                    newDays[activeDayIndex]!.teacherReviewedAt = undefined;
                                    newDays[activeDayIndex]!.teacherReviewedBy = undefined;
                                    setDays(newDays);

                                    // Update granular status to CHANGED_BY_EDUCATOR if it was PENDING_CORRECTION
                                    setGranularObservations(prev => prev.map(obs => {
                                      if (obs.targetId === a.activityId && obs.status === 'PENDING_CORRECTION') {
                                        return { ...obs, status: 'CHANGED_BY_EDUCATOR' };
                                      }
                                      return obs;
                                    }));
                                 }} className="w-full text-base p-4 bg-white border border-border-default focus:border-brand-primary rounded-lg outline-none min-h-[160px] resize-y transition" />

                                 {planningObj && (
                                   modality === 'INDIRECT' ? (
                                     <div
                                       data-testid="indirect-curricular-info-card"
                                       className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg text-left"
                                     >
                                       <h4 className="text-sm font-bold text-gray-900 mb-1">
                                         Referentes curriculares de la modalidad
                                       </h4>
                                       <p className="text-sm text-gray-700 mb-1 leading-relaxed">
                                         Para Prestación Indirecta no es necesario seleccionar elementos curriculares. El formato institucional incorpora automáticamente los referentes curriculares correspondientes.
                                       </p>
                                       <p className="text-xs text-gray-500 font-medium">
                                         No se requiere ninguna acción de tu parte.
                                       </p>
                                     </div>
                                   ) : (
                                     <CurricularSelectionControl
                                       activity={a}
                                       dayIdentifier={d.dayOfWeek}
                                       planning={planningObj}
                                       readOnly={readOnly || (status !== 'DRAFT' && status !== 'REJECTED')}
                                       modality={modality}
                                       recommendationSource={curricularRecommendationSource}
                                       onUpdate={async (updatedRefs) => {
                                         const updatedDays = planningObj.days.map((dayItem: PlanningDay) => {
                                           if (dayItem.dayOfWeek === d.dayOfWeek) {
                                             return {
                                               ...dayItem,
                                               teacherReviewedAt: undefined,
                                               teacherReviewedBy: undefined,
                                               activities: dayItem.activities.map((act) =>
                                                 act.activityId === a.activityId
                                                   ? { ...act, curricularTraceability: updatedRefs }
                                                   : act
                                               ),
                                             };
                                           }
                                           return dayItem;
                                         });
                                         setDays(updatedDays);
                                         try {
                                           await ensurePlanningAggregateCreated();
                                           await service.saveDraft(
                                             currentPlanId,
                                             obs,
                                             needs,
                                             specialSituations,
                                             availableMaterials,
                                             [],
                                             updatedDays,
                                             'TEACHER',
                                             originalContext || undefined
                                           );
                                         } catch (err) {}
                                       }}
                                     />
                                   )
                                 )}
                               </div>
                             )}
                           </div>
                         );
                      })}
                     </div>

                      <ComplementaryActivitiesControl
                        dayOfWeek={d.dayOfWeek}
                        activities={d.complementaryActivities || []}
                        planning={planningObj}
                        readOnly={readOnly || (status !== 'DRAFT' && status !== 'REJECTED')}
                        onSave={async (updatedActivities) => {
                          await ensurePlanningAggregateCreated();
                          await service.setDayComplementaryActivities(
                            currentPlanId,
                            d.dayOfWeek,
                            updatedActivities,
                            'TEACHER'
                          );
                          const updatedPlan = await service.getPlanning(currentPlanId);
                          if (updatedPlan) {
                            setPlanningObj(updatedPlan);
                            setDays(updatedPlan.days);
                          }
                        }}
                      />

                      <PrioritizedPracticesControl
                        dayOfWeek={d.dayOfWeek}
                        practices={d.prioritizedPractices || []}
                        planning={planningObj}
                        readOnly={readOnly || (status !== 'DRAFT' && status !== 'REJECTED')}
                        onSave={async (updatedPractices) => {
                          await ensurePlanningAggregateCreated();
                          await service.setDayPrioritizedPractices(
                            currentPlanId,
                            d.dayOfWeek,
                            updatedPractices,
                            'TEACHER'
                          );
                          const updatedPlan = await service.getPlanning(currentPlanId);
                          if (updatedPlan) {
                            setPlanningObj(updatedPlan);
                            setDays(updatedPlan.days);
                          }
                        }}
                      />

                      {status !== 'APPROVED' && status !== 'APPROVED_FOR_EXECUTION' && status !== 'CLOSED' && !readOnly && hasActivities && (
                        <div className="mt-8 pt-6 border-t border-teal-100 flex items-center justify-between flex-wrap gap-4">
                          {Boolean(d.teacherReviewedAt && d.teacherReviewedBy) ? (
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-bold text-green-800 bg-green-50 px-4 py-2 rounded-full border border-green-200 flex items-center gap-2">
                                <span>✓</span> Día revisado por {getAssistantRoleLabel(effectiveRoom?.roomId)}
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={async () => {
                                await ensurePlanningAggregateCreated();
                                await service.markTeacherDayReviewed(currentPlanId, d.dayOfWeek, 'TEACHER', effectiveTeacher, undefined, days);
                                const updatedPlan = await service.getPlanning(currentPlanId);
                                if (updatedPlan) {
                                  setPlanningObj(updatedPlan);
                                  setDays(updatedPlan.days);
                                }
                                setToastMessage('✓ Día marcado como revisado.');
                                setTimeout(() => setToastMessage(''), 2000);
                              }}
                              className="bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-full shadow-sm transition flex items-center gap-2 text-base"
                            >
                              ✓ Marcar día como revisado
                            </button>
                          )}
                        </div>
                      )}

                   {(status === 'APPROVED' || status === 'APPROVED_FOR_EXECUTION' || status === 'CLOSED') && (() => {
                        const evalStatus = planningObj && typeof planningObj.getEvaluationStatus === 'function'
                          ? planningObj.getEvaluationStatus(d.dayOfWeek, currentDate)
                          : {
                              isEligible: Boolean(planningObj && planningObj.canEvaluateDay && planningObj.canEvaluateDay(d.dayOfWeek, currentDate)),
                              isFuture: false,
                              isChronologicallyBlocked: false,
                              dayDate: (planningObj && planningObj.getDayDate ? planningObj.getDayDate(d) : d.date) || ""
                            };
                        const isEligible = evalStatus.isEligible;
                        const dayDate = evalStatus.dayDate || (planningObj && planningObj.getDayDate ? planningObj.getDayDate(d) : d.date);

                        const currentText = dailyEvaluations[d.dayOfWeek] !== undefined ? dailyEvaluations[d.dayOfWeek] : (d.evaluation || '');
                        const hasVisibleContent = Boolean(currentText.trim());

                        return (
                          <div className="mt-10 pt-8 border-t border-teal-100 bg-surface-ivory p-6 rounded-xl border">
                            <div className="flex items-center justify-between mb-4">
                              <h5 className="text-xl font-bold text-teal-900 flex items-center gap-2">
                                <span>📝</span> Evaluación del día
                              </h5>
                              <div className="flex items-center gap-2">
                                {d.evaluationStatus === 'APPROVED' ? (
                                  <span className="text-xs font-bold bg-green-100 text-green-800 border border-green-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                    <span>✓</span> Aprobada por Educadora
                                  </span>
                                ) : d.evaluationStatus === 'CHANGES_REQUESTED' ? (
                                  <span className="text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                    <span>⚠</span> Cambio solicitado por Educadora
                                  </span>
                                ) : d.evaluationStatus === 'IN_REVIEW' ? (
                                  <span className="text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                                    <span>⏳</span> En revisión por Educadora
                                  </span>
                                ) : !isEligible ? (
                                  <span className="text-xs font-bold bg-gray-100 text-gray-600 border border-gray-300 px-3 py-1 rounded-full flex items-center gap-1.5">
                                    <span>🔒</span> Bloqueado
                                  </span>
                                ) : (
                                  <span className="text-xs font-bold bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1 rounded-full flex items-center gap-1.5">
                                    <span>✏️</span> Disponible para evaluar
                                  </span>
                                )}
                              </div>
                            </div>

                            {d.evaluationStatus === 'APPROVED' ? (
                              <div className="bg-green-50/50 border border-green-200 rounded-lg p-6">
                                <div className="flex items-center justify-between mb-3 border-b border-green-100 pb-2">
                                  <span className="text-xs font-bold text-green-900 uppercase tracking-wider">
                                    Evaluación aprobada por la Educadora
                                  </span>
                                  <span className="text-[11px] font-medium text-green-700">
                                    {d.evaluationReviewedAt ? formatInstitutionalDate(d.evaluationReviewedAt) : 'Aprobada'}
                                  </span>
                                </div>
                                <div className="text-base text-gray-900 leading-relaxed font-medium whitespace-pre-wrap bg-white p-4 rounded-lg border border-green-100 shadow-inner min-h-[100px]">
                                  {dailyEvaluations[d.dayOfWeek] !== undefined ? dailyEvaluations[d.dayOfWeek] : (d.evaluation || '')}
                                </div>
                                <p className="text-xs text-green-800 mt-3 font-semibold flex items-center gap-1.5">
                                  <span>✓</span> Aprobada por {getInstitutionalActorLabel(d.evaluationReviewedBy, effectiveRoom?.roomId)}.
                                </p>
                              </div>
                            ) : !isEligible ? (
                              evalStatus.isChronologicallyBlocked && evalStatus.blockingDay ? (
                                <div className="bg-amber-50/70 border border-amber-200 rounded-lg p-6 text-center">
                                  <p className="text-amber-900 font-medium text-base mb-2">
                                    🔒 Evaluación bloqueada por orden cronológico.
                                  </p>
                                  <p className="text-sm font-bold text-amber-800">
                                    Completa primero la evaluación de {planningObj?.getDaySpanishName ? planningObj.getDaySpanishName(evalStatus.blockingDay.dayOfWeek) : evalStatus.blockingDay.dayOfWeek}.
                                  </p>
                                  <textarea
                                    disabled
                                    value={dailyEvaluations[d.dayOfWeek] || d.evaluation || ''}
                                    placeholder="La evaluación se habilitará cuando se completen las evaluaciones previas..."
                                    className="w-full text-base p-4 mt-4 bg-gray-100 border border-gray-300 rounded-lg outline-none min-h-[120px] resize-none text-gray-400 cursor-not-allowed"
                                  />
                                </div>
                              ) : (
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
                                  <p className="text-gray-600 font-medium text-base mb-2">
                                    🔒 Esta evaluación aún no está disponible.
                                  </p>
                                  <p className="text-sm font-bold text-gray-500">
                                    Evaluación disponible a partir del {formatDayDateMessage(dayDate)}. (Disponible el {formatDayDateMessage(dayDate)})
                                  </p>
                                  <textarea
                                    disabled
                                    value={dailyEvaluations[d.dayOfWeek] || d.evaluation || ''}
                                    placeholder="La evaluación se habilitará cuando llegue esta fecha..."
                                    className="w-full text-base p-4 mt-4 bg-gray-100 border border-gray-300 rounded-lg outline-none min-h-[120px] resize-none text-gray-400 cursor-not-allowed"
                                  />
                                </div>
                              )
                            ) : d.evaluationStatus === 'CHANGES_REQUESTED' ? (
                              <div className="bg-orange-50/50 border border-orange-200 rounded-lg p-6">
                                <div className="flex items-center justify-between mb-3 border-b border-orange-100 pb-2">
                                  <span className="text-xs font-bold text-orange-900 uppercase tracking-wider">
                                    Cambio solicitado por la Educadora
                                  </span>
                                  <span className="text-[11px] font-medium text-orange-700">
                                    {d.evaluationReviewedAt ? formatInstitutionalDate(d.evaluationReviewedAt) : 'Revisada'}
                                  </span>
                                </div>
                                <div className="mt-2 mb-4 p-4 bg-orange-100/70 border border-orange-200 rounded-lg text-sm text-orange-900">
                                  <span className="font-bold block mb-1">Observación de la Educadora:</span>
                                  <p>{d.evaluationDirectorComment}</p>
                                </div>
                                <p className="text-sm text-orange-900 font-semibold mb-3">
                                  ✏️ Edición habilitada por solicitud de la Educadora. Corrige tu evaluación y reenvíala a la Educadora:
                                </p>
                                <DailyEvaluationHumanGate
                                  planningId={currentPlanId}
                                  dayOfWeek={d.dayOfWeek}
                                  isEligible={
                                    role === 'TEACHER' &&
                                    (status === 'APPROVED' || status === 'APPROVED_FOR_EXECUTION') &&
                                    Boolean(isEligible)
                                  }
                                  {...(evaluationRecommendationSource ? { source: evaluationRecommendationSource } : {})}
                                  textareaRef={evaluationTextareaRef}
                                  initialEvidence={evaluationEvidenceByDay[d.dayOfWeek]}
                                  onEvidenceChange={(ev) => setEvaluationEvidenceByDay(prev => ({ ...prev, [d.dayOfWeek]: ev }))}
                                  onAccept={(suggestedText) => {
                                    setDailyEvaluations(prev => ({ ...prev, [d.dayOfWeek]: suggestedText }));
                                  }}
                                  onEdit={(suggestedText) => {
                                    setDailyEvaluations(prev => ({ ...prev, [d.dayOfWeek]: suggestedText }));
                                    setTimeout(() => evaluationTextareaRef.current?.focus(), 0);
                                  }}
                                />
                                <textarea
                                  ref={evaluationTextareaRef}
                                  value={dailyEvaluations[d.dayOfWeek] !== undefined ? dailyEvaluations[d.dayOfWeek] : (d.evaluationDraft !== undefined ? d.evaluationDraft : (d.evaluation || ''))}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setDailyEvaluations(prev => ({ ...prev, [d.dayOfWeek]: val }));
                                  }}
                                  placeholder="Describe de manera objetiva el desarrollo de las actividades, la respuesta de las niñas y niños, y cualquier observación relevante del día..."
                                  className="w-full text-base p-4 bg-white border border-orange-300 focus:border-brand-primary rounded-lg outline-none min-h-[120px] resize-y transition shadow-inner"
                                />

                                {evaluationDraftError && (
                                  <div role="alert" className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
                                    <span>⚠️</span>
                                    <span>{evaluationDraftError}</span>
                                  </div>
                                )}

                                <div className="mt-4 flex flex-wrap justify-between items-center gap-3">
                                  <button
                                    onClick={async () => {
                                      const evalText = (dailyEvaluations[d.dayOfWeek] !== undefined ? dailyEvaluations[d.dayOfWeek] : (d.evaluationDraft !== undefined ? d.evaluationDraft : (d.evaluation || ''))).trim();
                                      if (!evalText) {
                                        setEvaluationDraftError('⚠️ Escribe o incorpora una evaluación antes de guardar el borrador.');
                                        setTimeout(() => setEvaluationDraftError(null), 4000);
                                        return;
                                      }
                                      if (!currentDate) return;
                                      try {
                                        setEvaluationDraftError(null);
                                        await service.saveDailyEvaluationDraft(currentPlanId, d.dayOfWeek, evalText, "TEACHER", currentDate, effectiveTeacher);
                                        const updatedPlan = await service.getPlanning(currentPlanId);
                                        if (updatedPlan) {
                                          setPlanningObj(updatedPlan);
                                          setDays(updatedPlan.days);
                                        }
                                        setToastMessage('✓ Borrador de corrección guardado.');
                                        setTimeout(() => setToastMessage(''), 2000);
                                      } catch (err: any) {
                                        setEvaluationDraftError('⚠️ Error al guardar borrador: ' + (err?.message || 'Error de persistencia'));
                                      }
                                    }}
                                    className="bg-surface-ivory hover:bg-orange-50 border border-orange-300 text-orange-900 font-bold px-5 py-2.5 rounded-full shadow-sm transition flex items-center gap-2 text-sm"
                                  >
                                    💾 Guardar corrección como borrador
                                  </button>

                                  <button
                                    disabled={!hasVisibleContent}
                                    onClick={async () => {
                                      const evalText = (dailyEvaluations[d.dayOfWeek] !== undefined ? dailyEvaluations[d.dayOfWeek] : (d.evaluationDraft !== undefined ? d.evaluationDraft : (d.evaluation || ''))).trim();
                                      if (!currentDate || !evalText) return;
                                      await service.confirmAndResubmitDailyEvaluation(currentPlanId, d.dayOfWeek, evalText, "TEACHER", currentDate, effectiveTeacher);
                                      const updatedPlan = await service.getPlanning(currentPlanId);
                                      if (updatedPlan) {
                                        setPlanningObj(updatedPlan);
                                        setDays(updatedPlan.days);
                                      }
                                      setToastMessage('✓ Evaluación reenviada a la Educadora.');
                                      setTimeout(() => setToastMessage(''), 2000);
                                      onSaved();
                                    }}
                                    className="bg-brand-primary hover:bg-brand-dark text-white font-bold px-6 py-2.5 rounded-full shadow-md transition flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    🚀 Reenviar evaluación a la Educadora
                                  </button>
                                </div>
                              </div>
                            ) : d.evaluationStatus === 'IN_REVIEW' ? (
                              <div className="bg-blue-50/50 border border-blue-200 rounded-lg p-6">
                                <div className="flex items-center justify-between mb-3 border-b border-blue-100 pb-2">
                                  <span className="text-xs font-bold text-blue-900 uppercase tracking-wider">
                                    Evaluación enviada a la Educadora
                                  </span>
                                  <span className="text-[11px] font-medium text-blue-700">
                                    {d.evaluationSubmittedAt ? formatInstitutionalDate(d.evaluationSubmittedAt) : 'Enviada'}
                                  </span>
                                </div>
                                <div className="text-base text-gray-900 leading-relaxed font-medium whitespace-pre-wrap bg-white p-4 rounded-lg border border-blue-100 shadow-inner min-h-[100px]">
                                  {dailyEvaluations[d.dayOfWeek] !== undefined ? dailyEvaluations[d.dayOfWeek] : (d.evaluation || '')}
                                </div>
                                <div className="flex items-center justify-between mt-3 text-xs">
                                  <p className="text-blue-800 font-semibold flex items-center gap-1.5">
                                    <span>🔒</span> Evaluación registrada y en revisión por Educadora. No se permiten modificaciones.
                                  </p>
                                  {d.evaluationSubmittedBy && (
                                    <span className="text-teal-700 font-medium bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                                      ✓ Enviada por {getInstitutionalActorLabel(d.evaluationSubmittedBy, effectiveRoom?.roomId)}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div>
                                <p className="text-sm text-text-muted mb-3 font-medium">
                                  Registra cómo se desarrollaron las actividades y observaciones pedagógicas clave de este día:
                                </p>
                                <DailyEvaluationHumanGate
                                  planningId={currentPlanId}
                                  dayOfWeek={d.dayOfWeek}
                                  isEligible={
                                    role === 'TEACHER' &&
                                    (status === 'APPROVED' || status === 'APPROVED_FOR_EXECUTION') &&
                                    (d.evaluationStatus === undefined || d.evaluationStatus === 'DRAFT') &&
                                    Boolean(isEligible)
                                  }
                                  {...(evaluationRecommendationSource ? { source: evaluationRecommendationSource } : {})}
                                  textareaRef={evaluationTextareaRef}
                                  initialEvidence={evaluationEvidenceByDay[d.dayOfWeek]}
                                  onEvidenceChange={(ev) => setEvaluationEvidenceByDay(prev => ({ ...prev, [d.dayOfWeek]: ev }))}
                                  onAccept={(suggestedText) => {
                                    setDailyEvaluations(prev => ({ ...prev, [d.dayOfWeek]: suggestedText }));
                                  }}
                                  onEdit={(suggestedText) => {
                                    setDailyEvaluations(prev => ({ ...prev, [d.dayOfWeek]: suggestedText }));
                                    setTimeout(() => evaluationTextareaRef.current?.focus(), 0);
                                  }}
                                />
                                <textarea
                                  ref={evaluationTextareaRef}
                                  value={dailyEvaluations[d.dayOfWeek] !== undefined ? dailyEvaluations[d.dayOfWeek] : (d.evaluation || '')}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setDailyEvaluations(prev => ({ ...prev, [d.dayOfWeek]: val }));
                                  }}
                                  placeholder="Describe de manera objetiva el desarrollo de las actividades, la respuesta de las niñas y niños, y cualquier observación relevante del día..."
                                  className="w-full text-base p-4 bg-white border border-border-default focus:border-brand-primary rounded-lg outline-none min-h-[120px] resize-y transition shadow-inner"
                                />

                                {evaluationDraftError && (
                                  <div role="alert" className="mt-3 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-center gap-2">
                                    <span>⚠️</span>
                                    <span>{evaluationDraftError}</span>
                                  </div>
                                )}

                                <div className="mt-4 flex flex-wrap justify-between items-center gap-3">
                                  <button
                                    onClick={async () => {
                                      const evalText = (dailyEvaluations[d.dayOfWeek] !== undefined ? dailyEvaluations[d.dayOfWeek] : (d.evaluation || '')).trim();
                                      if (!evalText) {
                                        setEvaluationDraftError('⚠️ Escribe o incorpora una evaluación antes de guardar el borrador.');
                                        setTimeout(() => setEvaluationDraftError(null), 4000);
                                        return;
                                      }
                                      if (!currentDate) return;
                                      try {
                                        setEvaluationDraftError(null);
                                        await service.saveDailyEvaluationDraft(currentPlanId, d.dayOfWeek, evalText, "TEACHER", currentDate, effectiveTeacher);
                                        const updatedPlan = await service.getPlanning(currentPlanId);
                                        if (updatedPlan) {
                                          setPlanningObj(updatedPlan);
                                          setDays(updatedPlan.days);
                                        }
                                        setToastMessage('✓ Borrador de evaluación guardado.');
                                        setTimeout(() => setToastMessage(''), 2000);
                                      } catch (err: any) {
                                        setEvaluationDraftError('⚠️ Error al guardar borrador: ' + (err?.message || 'Error de persistencia'));
                                      }
                                    }}
                                    className="bg-surface-ivory hover:bg-teal-50 border border-teal-300 text-teal-800 font-bold px-5 py-2.5 rounded-full shadow-sm transition flex items-center gap-2 text-sm"
                                  >
                                    💾 Guardar borrador
                                  </button>

                                  <button
                                    disabled={!hasVisibleContent}
                                    onClick={async () => {
                                      const evalText = (dailyEvaluations[d.dayOfWeek] !== undefined ? dailyEvaluations[d.dayOfWeek] : (d.evaluation || '')).trim();
                                      if (!currentDate || !evalText) return;
                                      await service.confirmAndSubmitDailyEvaluation(currentPlanId, d.dayOfWeek, evalText, "TEACHER", currentDate, effectiveTeacher);
                                      const updatedPlan = await service.getPlanning(currentPlanId);
                                      if (updatedPlan) {
                                        setPlanningObj(updatedPlan);
                                        setDays(updatedPlan.days);
                                      }
                                      setToastMessage('✓ Evaluación enviada a la Educadora.');
                                      setTimeout(() => setToastMessage(''), 2000);
                                      onSaved();
                                    }}
                                    className="bg-brand-primary hover:bg-brand-dark text-white font-bold px-6 py-2.5 rounded-full shadow-md transition flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                                  >
                                    🚀 Enviar evaluación a Educadora
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {!readOnly && (
                        <div className="mt-8">
                          <div className="bg-teal-50 p-4 rounded-lg mb-6 border border-teal-100 text-center">
                            <p className="text-teal-900 font-medium text-sm">
                              Revisa y ajusta los días de la semana. Cuando la planeación esté lista, envíala a la Educadora para revisión.
                            </p>
                          </div>
                          <div className="text-center flex justify-center">
                            {(() => {
                              const revCount = days.filter(d => Boolean(d.teacherReviewedAt && d.teacherReviewedBy)).length;
                              const isSubmitDisabled = status === 'REJECTED'
                                ? requiredCorrectionDays.length > 0
                                : (!days || days.length < 5 || !days.every(d => d.activities && d.activities.length > 0) || revCount < 5);
                              return (
                                <button
                                  onClick={handleSubmit}
                                  disabled={isSubmitDisabled}
                                  className="bg-brand-primary hover:bg-brand-dark text-white font-bold px-8 py-4 rounded-full transition shadow-sm disabled:opacity-50"
                                >
                                  {status === 'REJECTED' ? 'Enviar correcciones a la Educadora' : 'Enviar a Revisión'}
                                </button>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })()}
          </>
        )}
      </div>
      {pendingWeeklyProposal && (
        <WeeklyPlanningProposalHumanGate
          proposal={pendingWeeklyProposal}
          sourceType={proposalSourceType}
          fallbackReason={proposalError}
          onAccept={handleAcceptProposal}
          onDiscard={handleDiscardProposal}
          isAccepting={isAcceptingProposal}
          isLabMode={Boolean(isFirstLight)}
          evidenceContext={evidenceContext}
        />
      )}
    </div>
  );
};
const DirectorList = ({
  service,
  onSelect,
  refreshKey,
  activeRoom,
  daycareId,
}: {
  service: PlanningWorkflowService;
  onSelect: (id: string) => void;
  refreshKey: number;
  activeRoom?: Room | undefined;
  daycareId?: string | undefined;
}) => {
  const [plans, setPlans] = useState<WeeklyPlanning[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadPlans = React.useCallback(() => {
    setIsLoading(true);
    setError(null);
    Promise.all([
      service.listDirectorReviewQueue('DIRECTOR', daycareId).catch(() => []),
      service.listSupervisorApprovedPlanning('DIRECTOR', daycareId).catch(() => [])
    ])
      .then(([reviewPlans, approvedPlans]) => {
        const map = new Map<string, WeeklyPlanning>();
        for (const p of reviewPlans || []) {
          if (daycareId && p.daycareId !== daycareId) continue;
          if (p.status === 'IN_REVIEW') map.set(p.planningId, p);
        }
        for (const p of approvedPlans || []) {
          if (daycareId && p.daycareId !== daycareId) continue;
          if (p.status !== 'CLOSED' && !map.has(p.planningId)) {
            map.set(p.planningId, p);
          }
        }
        setPlans(Array.from(map.values()));
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Error al consultar las propuestas pendientes.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [service, daycareId]);

  useEffect(() => {
    loadPlans();
  }, [refreshKey, loadPlans]);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <p className="text-red-800 font-bold mb-2">No pudimos cargar la lista de propuestas para revisar.</p>
        <p className="text-red-600 text-sm mb-4">{error}</p>
        <button
          onClick={loadPlans}
          className="bg-brand-primary hover:bg-brand-dark text-white font-semibold px-6 py-2 rounded-xl text-sm"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto animate-fade-in">
      <h1 className="text-4xl font-bold mb-10 text-center">Acompañamiento pedagógico</h1>
      <p className="text-center text-text-muted text-lg mb-8">Tus docentes han enviado estas propuestas para que las revisen juntas.</p>
      <div className="grid gap-4 w-full">
        {plans.map(p => {
          const hasPendingEval = (p.status === 'APPROVED' || p.status === 'APPROVED_FOR_EXECUTION') && p.days?.some(d => d.evaluationStatus === 'IN_REVIEW');
          const isReadyForClosure = (p.status === 'APPROVED' || p.status === 'APPROVED_FOR_EXECUTION') && p.days?.length === 5 && p.days.every(d => d.evaluationStatus === 'APPROVED');

          let badgeLabel = 'Lista para conversar';
          if (hasPendingEval) badgeLabel = 'Evaluación diaria pendiente';
          else if (isReadyForClosure) badgeLabel = 'Semana lista para cierre';
          else if (p.status === 'APPROVED' || p.status === 'APPROVED_FOR_EXECUTION') badgeLabel = 'Aprobada para ejecución';

          return (
            <button key={p.planningId} onClick={() => onSelect(p.planningId)} className="bg-white border-2 border-border-soft hover:border-brand-primary p-8 rounded-xl shadow-sm text-left transition w-full outline-none">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-text-primary text-2xl">
                  {getAssistantRoleLabel((p as any).roomId || activeRoom?.roomId)}
                  <span className="sr-only">Anita</span>
                </span>
                <span className="text-sm font-bold px-4 py-1.5 rounded-full bg-status-review/20 text-status-review">{badgeLabel}</span>
              </div>
              <p className="text-base text-text-muted font-medium">{((p as any).roomId && RoomCatalog.getRoom((p as any).roomId)?.name) || activeRoom?.name || 'Lactantes C'} • Semana del 24 al 28 de agosto</p>
            </button>
          );
        })}
        {plans.length === 0 && <p className="text-text-muted text-center mt-12 text-xl font-medium">No tenemos propuestas para conversar en este momento.</p>}
      </div>
    </div>
  );
};





const DirectorReview = ({
  service,
  planId,
  onBack,
  onSaved,
  onViewOfficial,
  activeRoom,
  authenticatedDirectorId,
  isFirstLight = false,
}: {
  service: PlanningWorkflowService;
  planId: string;
  onBack: () => void;
  onSaved: () => void;
  onViewOfficial: () => void;
  activeRoom?: Room | undefined;
  authenticatedDirectorId?: string | null | undefined;
  isFirstLight?: boolean | undefined;
}) => {
  const [plan, setPlan] = useState<any>(null);
  const [activeDayIndex, setActiveDayIndex] = useState(0);
  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);
  const [directorReviewedDays, setDirectorReviewedDays] = useState<Record<string, boolean>>({});
  const [markingDayOfWeek, setMarkingDayOfWeek] = useState<string | null>(null);

  // DRAFTING STATE (Review Round)
  const [newGranularObs, setNewGranularObs] = useState<Record<string, string>>({});
  const [preparedObservations, setPreparedObservations] = useState<Record<string, string>>({});

  const [collapsedResolved, setCollapsedResolved] = useState<Record<string, boolean>>({});
  const [toastMessage, setToastMessage] = useState('');
  const [evalDirectorComments, setEvalDirectorComments] = useState<Record<string, string>>({});
  const [requestingChangeForDay, setRequestingChangeForDay] = useState<string | null>(null);
  const [evalActionError, setEvalActionError] = useState<string | null>(null);
  const [isEvalActionPending, setIsEvalActionPending] = useState(false);

  const getEffectiveDirectorId = (): string => {
    if (authenticatedDirectorId && authenticatedDirectorId.trim()) {
      if (isFirstLight && authenticatedDirectorId.trim() !== FIRST_LIGHT_DIRECTOR_ID) {
        throw new Error('Identidad de Dirección no autorizada en First Light LAB.');
      }
      return authenticatedDirectorId.trim();
    }
    if (isFirstLight) {
      throw new Error('No hay una identidad de Dirección autenticada en First Light LAB.');
    }
    return 'Ceci';
  };

  if (isFirstLight && authenticatedDirectorId !== FIRST_LIGHT_DIRECTOR_ID) {
    return (
      <div data-testid="director-auth-error" className="p-8 text-center text-red-600 bg-red-50 border border-red-200 rounded-xl my-8">
        <h3 className="text-lg font-bold mb-2">Acceso No Autorizado</h3>
        <p className="text-sm">La sesión actual no corresponde a la Dirección autorizada en First Light LAB.</p>
      </div>
    );
  }

  const requiredCorrectionDays = React.useMemo(() => {
    const req = new Set<string>();
    for (const d of plan?.days || []) {
      for (const a of d.activities || []) {
        if (preparedObservations[a.activityId]) {
          req.add(d.dayOfWeek);
          continue;
        }
        const gObs = plan?.granularObservations?.find((o: any) => o.targetId === a.activityId);
        if (gObs && (gObs.status === 'PENDING_CORRECTION' || gObs.status === 'CHANGED_BY_EDUCATOR')) {
          req.add(d.dayOfWeek);
        }
      }
    }
    return Array.from(req);
  }, [plan, preparedObservations]);

  useEffect(() => {
    service.getPlanning(planId).then(p => {
      if (p) {
        setPlan(p);
        const initialReviewed: Record<string, boolean> = {};
        for (const d of p.days) {
          if (Boolean(d.directorReviewed)) {
            initialReviewed[d.dayOfWeek] = true;
          }
        }
        setDirectorReviewedDays(initialReviewed);
      }
    });

    // SR-MD-21 Phase 2: Restore private draft observations from institutional persistence
    if (typeof service.listDirectorDraftObservations === 'function') {
      let directorId = 'Ceci';
      try {
        directorId = getEffectiveDirectorId();
      } catch {
        // fallback
      }
      service.listDirectorDraftObservations(planId, directorId, 'DIRECTOR')
        .then(drafts => {
          if (drafts && drafts.length > 0) {
            const restored: Record<string, string> = {};
            for (const d of drafts) {
              restored[d.activityId] = d.observation;
            }
            setPreparedObservations(prev => ({
              ...restored,
              ...prev,
            }));
          }
        })
        .catch(err => {
          console.error("Error al recuperar borradores de observación:", err);
        });
    }
  }, [planId, service]);
  if (!plan) return <p className="p-8 text-center text-xl">Leyendo la propuesta...</p>;

  // SR-MD-21 Phase 2: PERSIST DRAFT OBSERVATIONS TO INSTITUTIONAL REPOSITORY
  const handleSavePrepared = async (activityId: string) => {
    const obsText = newGranularObs[activityId];
    if (!obsText || !obsText.trim()) return;

    const trimmed = obsText.trim();
    let directorId = 'Ceci';
    try {
      directorId = getEffectiveDirectorId();
    } catch {
      // fallback
    }

    const activeDay = plan?.days?.[activeDayIndex];

    try {
      if (typeof service.saveDirectorDraftObservation === 'function') {
        await service.saveDirectorDraftObservation(
          planId,
          activityId,
          trimmed,
          directorId,
          'DIRECTOR',
          activeDay?.dayOfWeek
        );
      }

      setPreparedObservations(prev => ({
        ...prev,
        [activityId]: trimmed
      }));
      setNewGranularObs(prev => { const n = {...prev}; delete n[activityId]; return n; });
      if (activeDay) {
        setDirectorReviewedDays(prev => ({ ...prev, [activeDay.dayOfWeek]: true }));
      }
      setToastMessage('✓ Observación preparada (Borrador guardado)');
      setTimeout(() => { setToastMessage(''); }, 2000);
    } catch (err) {
      console.error('Error al guardar borrador de observación:', err);
      setToastMessage('⚠️ Error al persistir borrador');
      setTimeout(() => { setToastMessage(''); }, 3000);
    }
  };

  const handleDiscardPrepared = async (activityId: string) => {
    let directorId = 'Ceci';
    try {
      directorId = getEffectiveDirectorId();
    } catch {
      // fallback
    }
    try {
      if (typeof service.deleteDirectorDraftObservation === 'function') {
        await service.deleteDirectorDraftObservation(planId, activityId, directorId, 'DIRECTOR');
      }
      setPreparedObservations(prev => {
        const n = { ...prev };
        delete n[activityId];
        return n;
      });
      setToastMessage('✓ Borrador de observación eliminado');
      setTimeout(() => { setToastMessage(''); }, 2000);
    } catch (err) {
      console.error('Error al eliminar borrador:', err);
    }
  };

  // P0-4: ATOMIC "SEND OBSERVATIONS TO EDUCATOR"
  const handleSendRound = async () => {
    const granularObsArray = [];
    for (const [activityId, obsText] of Object.entries(preparedObservations)) {
      // Find original content
      let originalContent = '';
      for (const d of plan.days) {
        const act = d.activities.find((a: any) => a.activityId === activityId);
        if (act) originalContent = act.description;
      }
      granularObsArray.push({
        targetId: activityId,
        observation: obsText,
        originalContent: originalContent,
        currentContent: originalContent,
        status: 'PENDING_CORRECTION',
        reviewer: 'DIRECTOR',
        timestamp: new Date()
      });
    }

    let directorId = 'Ceci';
    try {
      directorId = getEffectiveDirectorId();
    } catch {
      // fallback
    }

    await service.reject(planId, "Se requieren ajustes en la planeación.", directorId, "DIRECTOR", granularObsArray);

    setPreparedObservations({});
    setToastMessage('✓ Observaciones enviadas a la asistente educativa.');
    onSaved();
    setTimeout(() => { setToastMessage(''); onBack(); }, 2000);
  };

  const handleResolve = async (activityId: string) => {
    try {
      await service.resolveGranularObservation(planId, activityId, "DIRECTOR", "Ceci");
      const updatedPlan = await service.getPlanning(planId);
      if (updatedPlan) {
        setPlan(updatedPlan);
        const newReviewed: Record<string, boolean> = {};
        for (const d of updatedPlan.days) {
          if (typeof updatedPlan.isDirectorDayReviewed === "function" ? updatedPlan.isDirectorDayReviewed(d.dayOfWeek) : Boolean(d.directorReviewed)) {
            newReviewed[d.dayOfWeek] = true;
          }
        }
        setDirectorReviewedDays(newReviewed);
      }
      setCollapsedResolved(prev => ({ ...prev, [activityId]: true }));
      setToastMessage("✅ OBSERVACIÓN ATENDIDA");
      onSaved();
      setTimeout(() => { setToastMessage(""); }, 2000);
    } catch (err: unknown) {
      console.error("[SR-MD-19-B] Error al resolver observación:", err);
      const errMsg = err instanceof Error ? err.message : "Error al guardar en el servidor";
      setToastMessage(`❌ Error al marcar atendida: ${errMsg}`);
      setTimeout(() => { setToastMessage(""); }, 4000);
    }
  };

  const preparedCount = Object.keys(preparedObservations).length;

  const isDayReviewedByDirector = (dayOfWeek: string) => {
    const day = plan?.days?.find((d: any) => d.dayOfWeek === dayOfWeek);
    if (!day) return false;

    const hasPrepared = day?.activities?.some((a: any) => Boolean(preparedObservations[a.activityId]));
    if (hasPrepared) return false;

    const hasPendingObservation = plan?.granularObservations?.some((o: any) =>
      (o.status === "CHANGED_BY_EDUCATOR" || o.status === "PENDING_CORRECTION") &&
      day?.activities?.some((a: any) => a.activityId === o.targetId)
    );
    if (hasPendingObservation) {
      return false;
    }

    if (directorReviewedDays[dayOfWeek] !== undefined) {
      return Boolean(directorReviewedDays[dayOfWeek]);
    }

    if (typeof plan?.isDirectorDayReviewed === 'function') {
      return plan.isDirectorDayReviewed(dayOfWeek);
    }

    return Boolean(day?.directorReviewed);
  };

  const reviewedDirectorCount = (plan?.days || []).filter((d: any) => isDayReviewedByDirector(d.dayOfWeek)).length;

  return (
    <div className="max-w-5xl mx-auto pb-32 animate-fade-in relative">
      {toastMessage && (
        <div role="status" aria-live="polite" className="fixed top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-full shadow-2xl z-50 font-bold flex items-center gap-3 text-lg">
          {toastMessage}
        </div>
      )}

      {(() => {
        const existingObsList = plan?.granularObservations || [];
        const pendingCount = existingObsList.filter((o: any) => o.status === 'PENDING_CORRECTION' || o.status === 'CHANGED_BY_EDUCATOR').length;
        const resolvedCount = existingObsList.filter((o: any) => o.status === 'RESOLVED').length;
        if (pendingCount > 0 || resolvedCount > 0) {
          return (
            <div className="flex justify-center gap-6 mb-8 -mt-4">
               {pendingCount > 0 && <span className="px-4 py-2 bg-yellow-100 text-yellow-900 border border-yellow-300 font-bold rounded-full uppercase tracking-wider text-sm shadow-sm">{pendingCount} observaciones pendientes</span>}
               {resolvedCount > 0 && <span className="px-4 py-2 bg-green-100 text-green-900 border border-green-300 font-bold rounded-full uppercase tracking-wider text-sm shadow-sm">{resolvedCount} observación atendida</span>}
            </div>
          );
        }
        return null;
      })()}

      {/* Sticky Prepared Summary */}
      {preparedCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-orange-100 border-t-4 border-orange-500 p-4 shadow-[0_-10px_20px_rgba(0,0,0,0.1)] z-40 flex justify-center items-center gap-6">
          <p className="text-orange-900 font-bold text-lg uppercase tracking-wider">{preparedCount} observaciones preparadas</p>
          <button onClick={handleSendRound} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-8 py-3 rounded-full shadow-md transition">
            ENVIAR OBSERVACIONES A LA EDUCADORA
          </button>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <button onClick={onBack} className="text-text-muted hover:text-gray-800 font-bold px-4 py-2 rounded-full hover:bg-gray-200 transition">← Volver al listado</button>
        <div className="flex items-center gap-4">
          {plan.status === 'CLOSED' ? (
            <span className="text-sm font-bold text-teal-900 bg-teal-100 px-4 py-2 rounded-full border border-teal-300 shadow-sm flex items-center gap-1.5">
              <span>✓</span> Semana cerrada
            </span>
          ) : (plan.status === 'APPROVED' || plan.status === 'APPROVED_FOR_EXECUTION') && (
            <span className="text-sm font-bold text-green-800 bg-green-50 px-4 py-2 rounded-full border border-green-200">
              Aprobada para ejecución
            </span>
          )}
          {(plan.status === 'APPROVED' || plan.status === 'APPROVED_FOR_EXECUTION' || plan.status === 'CLOSED') && (
            <button onClick={onViewOfficial} className="text-sm font-bold bg-gray-900 hover:bg-black text-white px-6 py-2 rounded-full shadow-sm transition flex items-center gap-2">
              Versión Oficial IMSS
            </button>
          )}
        </div>
      </div>

      <div className="text-center mb-12">
        <h2 className="text-5xl font-bold mb-4">{getAssistantRoleLabel((plan as any)?.roomId || activeRoom?.roomId)}</h2>
        <p className="text-text-muted font-bold text-2xl uppercase tracking-widest">{((plan as any)?.roomId && RoomCatalog.getRoom((plan as any)?.roomId)?.name) || activeRoom?.name || 'Lactantes C'}</p>
      </div>

      {(() => {
        const orig = plan.originalContext || {
          observations: plan.observations || '',
          identifiedNeeds: plan.identifiedNeeds || '',
          specialSituations: plan.specialSituations || '',
          availableMaterials: plan.availableMaterials || ''
        };

        const fields = [
          {
            key: 'observations',
            label: 'Observaciones del grupo',
            originalVal: orig.observations || '',
            currentVal: plan.observations || '',
            changed: Boolean(plan.originalContext && (orig.observations || '').trim() !== (plan.observations || '').trim())
          },
          {
            key: 'identifiedNeeds',
            label: 'Qué necesita fortalecer',
            originalVal: orig.identifiedNeeds || '',
            currentVal: plan.identifiedNeeds || '',
            changed: Boolean(plan.originalContext && (orig.identifiedNeeds || '').trim() !== (plan.identifiedNeeds || '').trim())
          },
          {
            key: 'specialSituations',
            label: 'Situaciones a considerar',
            originalVal: orig.specialSituations || '',
            currentVal: plan.specialSituations || '',
            changed: Boolean(plan.originalContext && (orig.specialSituations || '').trim() !== (plan.specialSituations || '').trim())
          },
          {
            key: 'availableMaterials',
            label: 'Materiales disponibles',
            originalVal: orig.availableMaterials || '',
            currentVal: plan.availableMaterials || '',
            changed: Boolean(plan.originalContext && (orig.availableMaterials || '').trim() !== (plan.availableMaterials || '').trim())
          }
        ];

        const hasContextChanged = fields.some(f => f.changed);

        return (
          <div className="max-w-4xl mx-auto mb-12">
            <div className={`rounded-xl border p-8 shadow-sm transition ${hasContextChanged ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-200' : 'bg-surface-ivory border-brand-primary/20'}`}>
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-teal-100 pb-3 gap-2">
                <h3 className="text-xl font-bold text-teal-800 uppercase tracking-widest">Contexto de la Educadora</h3>
                {hasContextChanged && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white font-bold text-xs uppercase tracking-wider rounded-full shadow-sm animate-pulse">
                    ⚠️ CONTEXTO SEMANAL MODIFICADO
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                {fields.map(f => {
                  if (f.changed) {
                    return (
                      <div key={f.key} className="bg-white rounded-lg border-2 border-amber-300 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-amber-900 uppercase tracking-wider">{f.label}</p>
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded">Modificado</span>
                        </div>
                        <div className="space-y-2 mt-2">
                          <div>
                            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">ANTES:</span>
                            <p className="text-sm text-gray-600 bg-gray-50 p-2.5 rounded border border-gray-200 italic">{f.originalVal || 'Sin especificar'}</p>
                          </div>
                          <div>
                            <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider block mb-0.5">AHORA:</span>
                            <p className="text-sm font-semibold text-amber-950 bg-amber-50/80 p-2.5 rounded border border-amber-200">{f.currentVal || 'Sin especificar'}</p>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={f.key} className="bg-white/60 rounded-lg border border-gray-200/70 p-4">
                      <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">{f.label}</p>
                      <p className="text-sm text-text-primary bg-white p-2.5 rounded border border-gray-100">{f.currentVal || 'Sin especificar'}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      <h3 className="text-3xl font-bold mb-8 text-text-primary text-center">Desarrollo de las acciones pedagógicas</h3>

      <div className="space-y-8 pb-8 max-w-4xl mx-auto">
        {(() => {
          const isClosed = plan.status === 'CLOSED';
          const isApprovedPlanning = plan.status === 'APPROVED' || plan.status === 'APPROVED_FOR_EXECUTION' || isClosed;
          const approvedEvaluationsCount = plan.days.filter((d: any) => d.evaluationStatus === 'APPROVED').length;
          const isReadyForClosure = !isClosed && (plan.status === 'APPROVED' || plan.status === 'APPROVED_FOR_EXECUTION') && plan.days.length === 5 && plan.days.every((d: any) => d.evaluationStatus === 'APPROVED');

          if (isApprovedPlanning) {
            return (
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-2">
                <span className="text-sm font-bold text-teal-800 bg-teal-50 border border-teal-200 px-5 py-2 rounded-full shadow-sm">
                  Evaluaciones aprobadas: {approvedEvaluationsCount}/5
                </span>
                {isClosed ? (
                  <span className="text-sm font-bold text-teal-900 bg-teal-100 border border-teal-300 px-5 py-2 rounded-full shadow-sm flex items-center gap-1.5 animate-fade-in">
                    <span>🔒</span> ✓ Semana cerrada
                  </span>
                ) : isReadyForClosure ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-green-800 bg-green-100 border border-green-300 px-5 py-2 rounded-full shadow-sm flex items-center gap-1.5 animate-fade-in">
                      <span>✓</span> Semana lista para cierre
                    </span>
                    <button
                      onClick={async () => {
                        const directorActorId = getEffectiveDirectorId();
                        await service.closeWeek(planId, "DIRECTOR", directorActorId);
                        const updated = await service.getPlanning(planId);
                        if (updated) setPlan(updated);
                        setToastMessage("✓ Semana cerrada exitosamente");
                        setTimeout(() => setToastMessage(""), 2000);
                        onSaved();
                      }}
                      className="bg-teal-700 hover:bg-teal-800 text-white font-bold px-6 py-2 rounded-full text-sm shadow-md transition flex items-center gap-2"
                    >
                      <span>🔒</span> Cerrar semana
                    </button>
                  </div>
                ) : null}
              </div>
            );
          }

          return (
            <div className="flex justify-center mb-2">
              <span className="text-sm font-bold text-teal-800 bg-teal-50 border border-teal-200 px-5 py-2 rounded-full shadow-sm">
                {reviewedDirectorCount}/5 días revisados
              </span>
            </div>
          );
        })()}
        <WeekDayTabs days={plan.days} activeIndex={activeDayIndex} onSelect={(idx) => { setActiveDayIndex(idx); setEvalActionError(null); }} reviewedDays={directorReviewedDays} requiredCorrectionDays={requiredCorrectionDays} isCorrectionRound={false} isApprovedPlanning={plan.status === 'APPROVED' || plan.status === 'APPROVED_FOR_EXECUTION' || plan.status === 'CLOSED'} role="DIRECTOR" />

        {(() => {
          const d = plan.days[activeDayIndex];
          if (!d) return null;
          const dayName = d.dayOfWeek === 'MONDAY' ? 'Lunes 24' : d.dayOfWeek === 'TUESDAY' ? 'Martes 25' : d.dayOfWeek === 'WEDNESDAY' ? 'Miércoles 26' : d.dayOfWeek === 'THURSDAY' ? 'Jueves 27' : 'Viernes 28';

          if (!d.activities || d.activities.length === 0) {
            return (
              <div key={d.dayOfWeek} className="w-full bg-surface-soft rounded-xl border border-border-soft p-12 text-center text-text-muted font-medium">
                <p className="text-xl">Día pendiente de planeación.</p>
              </div>
            );
          }

          return (
            <div key={d.dayOfWeek} className="w-full bg-white rounded-xl shadow-sm border border-border-soft p-8 md:p-12 animate-fade-in-up">
               <h4 className="text-3xl font-bold text-teal-900 mb-6 uppercase tracking-widest text-center">{dayName}</h4>
               <div className="space-y-4">
                 {d.activities.map((a: any) => {
                    const isExpanded = expandedActivityId === a.activityId;

                    // We must find the LATEST observation if there are multiple.
                    // For H1R3, finding the first (or last) is enough, assume findLast if JS supported it easily, we'll reverse.
                    const existingObs = [...plan.granularObservations].reverse().find((o: any) => o.targetId === a.activityId);

                    const isPrepared = !!preparedObservations[a.activityId];

                    let highlightClass = "bg-surface-soft border-border-soft";
                    let badge = null;
                    if (isPrepared) {
                       highlightClass = "bg-orange-50 border-orange-400 ring-2 ring-orange-200";
                       badge = <span className="bg-orange-200 text-orange-900 px-3 py-1 text-xs font-bold uppercase rounded-full tracking-widest">Observación preparada</span>;
                    } else if (existingObs) {
                      if (existingObs.status === 'CHANGED_BY_EDUCATOR') {
                         highlightClass = "bg-yellow-50 border-yellow-400 ring-2 ring-yellow-200";
                         badge = <span className="bg-yellow-200 text-yellow-900 px-3 py-1 text-xs font-bold uppercase rounded-full tracking-widest">CAMBIO SOLICITADO ANTERIORMENTE</span>;
                      } else if (existingObs.status === 'PENDING_CORRECTION') {
                         highlightClass = "bg-orange-50 border-orange-300";
                         badge = <span className="bg-orange-200 text-orange-900 px-3 py-1 text-xs font-bold uppercase rounded-full tracking-widest">Pendiente de corregir por educadora</span>;
                      } else if (existingObs.status === 'RESOLVED') {
                         highlightClass = "bg-green-50 border-green-300";
                         badge = <span className="bg-green-200 text-green-900 px-3 py-1 text-xs font-bold uppercase rounded-full tracking-widest">Observación atendida</span>;
                      }
                    }

                    if (existingObs && existingObs.status === 'RESOLVED' && collapsedResolved[a.activityId] && !isExpanded) {
                      return (
                        <div key={a.activityId} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-green-50 p-5 rounded-xl border border-green-200 mt-4 mb-4 shadow-sm transition">
                          <div>
                             <p className="font-bold text-green-900 text-lg">{a.objective}</p>
                             <span className="bg-green-200 text-green-900 px-3 py-1 text-xs font-bold uppercase rounded-full mt-2 inline-block tracking-widest shadow-sm">Observación atendida</span>
                          </div>
                          <button onClick={() => { setCollapsedResolved(prev => ({...prev, [a.activityId]: false})); setExpandedActivityId(a.activityId); }} className="text-green-700 hover:text-green-900 font-bold text-sm uppercase tracking-wider underline mt-3 sm:mt-0 px-4 py-2">
                            Ver detalle
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div key={a.activityId} className={`rounded-xl border overflow-hidden transition ${highlightClass}`}>
                        <button onClick={() => setExpandedActivityId(isExpanded ? null : a.activityId)} className="w-full text-left p-6 hover:bg-white/50 transition flex justify-between items-center outline-none">
                          <div>
                            {badge && <div className="mb-3">{badge}</div>}
                            <p className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-2">{a.category} • {a.durationMinutes} min</p>
                            <p className="font-bold text-text-primary text-xl">{a.objective}</p>
                          </div>
                          <div className="text-teal-600 font-medium px-4 py-2 rounded-full bg-white border border-teal-100 shadow-sm flex-shrink-0">
                            {isExpanded ? 'Ocultar' : 'Revisar'}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-6 pb-6 pt-2 border-t border-teal-50 bg-white animate-fade-in">
                            <p className="font-bold text-text-primary text-lg mb-2">{a.objective}</p>
                            <p className="text-base text-gray-800 leading-relaxed mb-4">{a.description}</p>
                            <p className="text-sm font-bold text-text-muted uppercase mb-6">Materiales: <span className="text-gray-800 normal-case font-medium">{a.materials.join(', ')}</span></p>

                            {plan && (
                              <CurricularSelectionControl
                                activity={a}
                                dayIdentifier={d.dayOfWeek}
                                planning={plan}
                                readOnly={true}
                              />
                            )}

                            {/* PREPARED STATE */}
                            {isPrepared && (
                              <div className="bg-orange-50 p-5 rounded-xl border border-orange-400 mt-4 mb-6 shadow-sm">
                                <h5 className="font-bold text-orange-900 text-sm uppercase tracking-wider mb-3">Observación preparada (Borrador):</h5>
                                <p className="text-orange-900 font-bold">{preparedObservations[a.activityId]}</p>
                                <button onClick={() => handleDiscardPrepared(a.activityId)} className="text-orange-700 text-sm font-bold uppercase tracking-wider mt-4 underline">
                                  Eliminar observación
                                </button>
                              </div>
                            )}

                            {/* RE-REVIEW STATE (P0-8) */}
                            {existingObs && (existingObs.status === 'CHANGED_BY_EDUCATOR' || existingObs.status === 'PENDING_CORRECTION' || existingObs.status === 'RESOLVED') && !isPrepared && (
                              <div className={`p-5 rounded-xl border mt-4 mb-6 ${existingObs.status === 'RESOLVED' ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-300 shadow-sm'}`}>
                                <div className="flex items-center justify-between mb-3">
                                  <h5 className={`font-bold text-sm uppercase tracking-wider ${existingObs.status === 'RESOLVED' ? 'text-green-900' : 'text-yellow-900'}`}>MI OBSERVACIÓN PREVIA:</h5>
                                  {existingObs.status === 'RESOLVED' && (
                                    <span className="bg-green-700 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider flex items-center gap-1 shadow-xs">
                                      <span>✓</span> OBSERVACIÓN ATENDIDA
                                    </span>
                                  )}
                                </div>
                                <p className={`mb-4 font-bold text-lg ${existingObs.status === 'RESOLVED' ? 'text-green-900' : 'text-yellow-900'}`}>{existingObs.observation}</p>
                                <div className="grid grid-cols-2 gap-4">
                                  <div className="bg-white p-4 rounded border border-gray-200">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Antes:</p>
                                    <p className="text-sm text-gray-700 font-normal leading-relaxed">{existingObs.originalContent}</p>
                                  </div>
                                  <div className="bg-white p-4 rounded border border-gray-200 shadow-sm">
                                    <p className="text-xs font-bold text-green-700 uppercase mb-2">AHORA:</p>
                                    <p className="text-base text-gray-900 font-bold leading-relaxed">{existingObs.currentContent}</p>
                                  </div>
                                </div>
                                {existingObs.status === 'CHANGED_BY_EDUCATOR' && (
                                  <div className="mt-4 flex flex-col gap-3">
                                    <button onClick={() => handleResolve(a.activityId)} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-3 rounded uppercase tracking-wider text-sm transition text-center shadow-sm">
                                      MARCAR COMO ATENDIDA
                                    </button>

                                    {/* P0-10: NEW ADJUSTMENT AFTER CORRECTION */}
                                    <div className="bg-orange-50 p-4 rounded mt-4 border border-orange-200">
                                      <label className="block text-sm font-bold text-orange-900 uppercase tracking-wider mb-2">
                                        NUEVA OBSERVACIÓN
                                      </label>
                                      <textarea
                                        value={newGranularObs[a.activityId] || ''}
                                        onChange={e => setNewGranularObs({ ...newGranularObs, [a.activityId]: e.target.value })}
                                        className="w-full text-base p-3 bg-white border border-orange-300 focus:border-orange-500 rounded outline-none transition min-h-[60px] resize-y mb-2"
                                        placeholder="Escribe un nuevo ajuste si es necesario..."
                                      />
                                      <button disabled={!newGranularObs[a.activityId]} onClick={() => handleSavePrepared(a.activityId)} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded text-sm transition disabled:opacity-50">
                                        SOLICITAR NUEVO AJUSTE (Guardar observación)
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* FIRST REVIEW STATE */}
                            {plan.status !== 'APPROVED' && !isPrepared && (!existingObs || existingObs.status === 'RESOLVED') && (
                              <div className="bg-orange-50 p-5 rounded-xl border border-orange-200 mt-4">
                                <label className="block text-sm font-bold text-orange-900 uppercase tracking-wider mb-3">
                                  Agregar observación a esta actividad
                                </label>
                                <textarea
                                  value={newGranularObs[a.activityId] || ''}
                                  onChange={e => setNewGranularObs({ ...newGranularObs, [a.activityId]: e.target.value })}
                                  className="w-full text-base p-4 bg-white border border-orange-300 focus:border-orange-500 rounded-lg outline-none transition min-h-[80px] resize-y mb-3"
                                  placeholder="¿Qué sugerencia tienes sobre esta actividad?"
                                />
                                <button disabled={!newGranularObs[a.activityId]} onClick={() => handleSavePrepared(a.activityId)} className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded text-sm transition disabled:opacity-50">
                                  Guardar observación
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                 })}
               </div>

                {/* DIRECTOR DAILY COMPLEMENTARY ACTIVITY REVIEW (H1R9-F.3) */}
                <div className="mt-8 pt-6 border-t border-border-soft">
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-lg font-bold text-teal-900 flex items-center gap-2">
                      <span>🧩</span> Actividades complementarias de otros programas
                    </h5>
                    <span className="text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-full uppercase tracking-wider">
                      Programa institucional
                    </span>
                  </div>

                  {(!d.complementaryActivities || d.complementaryActivities.length === 0) ? (
                    <div className="bg-surface-soft border border-border-soft rounded-xl p-5 text-center">
                      <p className="text-text-primary font-bold text-base mb-1">
                        Sin actividad complementaria propuesta para este día.
                      </p>
                      <p className="text-text-muted text-sm font-medium">
                        TutorIA no asignará actividades de otros programas hasta contar con una fuente institucional validada.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {d.complementaryActivities.map((ca: any, idx: number) => (
                        <div key={idx} className="bg-white border border-border-soft rounded-xl p-5 shadow-xs">
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              {ca.programArea}
                            </span>
                            {ca.sourceReference && (
                              <span className="text-xs text-text-muted font-medium">
                                Fuente: {ca.sourceReference}
                              </span>
                            )}
                          </div>
                          <h6 className="font-bold text-text-primary text-lg mb-1">
                            {ca.activityName}
                          </h6>
                          {ca.purpose && (
                            <p className="text-sm font-semibold text-teal-900 mb-2">
                              <strong>Propósito:</strong> {ca.purpose}
                            </p>
                          )}
                          {ca.description && (
                            <p className="text-sm text-gray-700 leading-relaxed font-normal">
                              {ca.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DIRECTOR DAILY PRIORITIZED PRACTICES REVIEW (H1R9-F.7.4) */}
                <div className="mt-8 pt-6 border-t border-border-soft" data-testid={`director-prioritized-practices-${d.dayOfWeek}`}>
                  <div className="flex items-center justify-between mb-4">
                    <h5 className="text-lg font-bold text-teal-900 flex items-center gap-2">
                      <span>🎯</span> Prácticas priorizadas
                    </h5>
                    <span className="text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 px-3 py-1 rounded-full uppercase tracking-wider">
                      Instrucción institucional
                    </span>
                  </div>

                  {(!d.prioritizedPractices || d.prioritizedPractices.length === 0) ? (
                    <div className="bg-surface-soft border border-border-soft rounded-xl p-5 text-center">
                      <p className="text-text-primary font-bold text-base mb-1">
                        Sin práctica priorizada registrada para este día.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {d.prioritizedPractices.map((practice: any, idx: number) => (
                        <div key={idx} className="bg-white border border-border-soft rounded-xl p-5 shadow-xs" data-testid={`ceci-prioritized-practice-entry-${idx}`}>
                          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                            <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                              Práctica priorizada
                            </span>
                            {practice.sourceReference && (
                              <span className="text-xs text-text-muted font-medium">
                                Referencia: {practice.sourceReference}
                              </span>
                            )}
                          </div>
                          <h6 className="font-bold text-text-primary text-lg mb-1">
                            {practice.practiceName}
                          </h6>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* DIRECTOR DAILY EVALUATION REVIEW (H1R9-C.4 & H1R9-D.2) */}
                {d.evaluationStatus === 'IN_REVIEW' && (() => {
                  const isResubmitted = d.evaluationResubmitted || Boolean(d.evaluationHistory && d.evaluationHistory.length > 0);
                  return (
                    <div className="mt-10 pt-8 border-t border-teal-100 bg-surface-ivory p-6 rounded-xl border">
                      <div className="flex items-center justify-between mb-4">
                        <h5 className="text-xl font-bold text-teal-900 flex items-center gap-2">
                          <span>📝</span> Evaluación del día
                        </h5>
                        {isResubmitted ? (
                          <span className="text-xs font-bold bg-orange-100 text-orange-900 border border-orange-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                            <span>🟠</span> Evaluación corregida por {getAssistantRoleLabel((plan as any)?.roomId || activeRoom?.roomId)} — requiere revisión
                          </span>
                        ) : (
                          <span className="text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                            <span>⏳</span> PENDIENTE DE MI REVISIÓN
                          </span>
                        )}
                      </div>

                      {isResubmitted && (
                        <div className="p-4 bg-orange-100/70 border border-orange-300 rounded-lg text-sm text-orange-950 mb-4">
                          <span className="font-bold block mb-1">Observación previa de la Educadora:</span>
                          <p>{(d.evaluationHistory && d.evaluationHistory[d.evaluationHistory.length - 1]?.directorComment) || d.evaluationDirectorComment}</p>
                        </div>
                      )}

                      <div className="bg-white p-5 rounded-lg border border-blue-100 shadow-inner mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block">
                            {isResubmitted ? `${getAssistantRoleLabel((plan as any)?.roomId || activeRoom?.roomId)} (Evaluación corregida):` : `${getAssistantRoleLabel((plan as any)?.roomId || activeRoom?.roomId)}:`}
                          </span>
                          {d.evaluationSubmittedBy && (
                            <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full border border-teal-200">
                              ✓ Enviada por {getInstitutionalActorLabel(d.evaluationSubmittedBy, (plan as any)?.roomId || activeRoom?.roomId)}
                            </span>
                          )}
                        </div>
                        <p className="text-base text-gray-900 leading-relaxed font-medium whitespace-pre-wrap">
                          {d.evaluation}
                        </p>
                      </div>

                      {requestingChangeForDay === d.dayOfWeek ? (
                        <div className="bg-orange-50 p-5 rounded-xl border border-orange-300 mt-4 animate-fade-in">
                          <label className="block text-sm font-bold text-orange-900 uppercase tracking-wider mb-2">
                            Comentario para la Asistente Educativa:
                          </label>
                          <textarea
                            value={evalDirectorComments[d.dayOfWeek] || ''}
                            onChange={e => setEvalDirectorComments({ ...evalDirectorComments, [d.dayOfWeek]: e.target.value })}
                            placeholder="Escribe la observación o ajuste solicitado para esta evaluación..."
                            className="w-full text-base p-4 bg-white border border-orange-300 focus:border-orange-500 rounded-lg outline-none min-h-[90px] resize-y mb-3 shadow-inner"
                          />
                          <div className="flex justify-end gap-3">
                            <button
                              disabled={isEvalActionPending}
                              onClick={() => {
                                setRequestingChangeForDay(null);
                                setEvalActionError(null);
                              }}
                              className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 disabled:opacity-50"
                            >
                              Cancelar
                            </button>
                            <button
                              disabled={isEvalActionPending || !((evalDirectorComments[d.dayOfWeek] || '').trim())}
                              onClick={async () => {
                                if (isEvalActionPending) return;
                                const comment = (evalDirectorComments[d.dayOfWeek] || '').trim();
                                if (!comment) return;
                                setIsEvalActionPending(true);
                                setEvalActionError(null);
                                try {
                                  const directorActorId = getEffectiveDirectorId();
                                  await service.requestDailyEvaluationChange(planId, d.dayOfWeek, comment, "DIRECTOR", directorActorId);
                                  const updated = await service.getPlanning(planId);
                                  if (updated) setPlan(updated);
                                  setRequestingChangeForDay(null);
                                  setToastMessage("✓ Solicitud de cambio enviada.");
                                  setTimeout(() => setToastMessage(""), 2000);
                                  onSaved();
                                } catch {
                                  setEvalActionError("No fue posible solicitar el cambio. Intenta nuevamente.");
                                } finally {
                                  setIsEvalActionPending(false);
                                }
                              }}
                              className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-6 py-2.5 rounded-full text-sm transition shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              Enviar solicitud de cambio
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-3 mt-4">
                          <button
                            disabled={isEvalActionPending}
                            onClick={() => {
                              setRequestingChangeForDay(d.dayOfWeek);
                              setEvalActionError(null);
                            }}
                            className="bg-surface-ivory hover:bg-orange-50 border border-orange-300 text-orange-800 font-bold px-5 py-2.5 rounded-full shadow-sm transition flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Solicitar cambio
                          </button>
                          <button
                            disabled={isEvalActionPending}
                            onClick={async () => {
                              if (isEvalActionPending) return;
                              setIsEvalActionPending(true);
                              setEvalActionError(null);
                              try {
                                const directorActorId = getEffectiveDirectorId();
                                await service.approveDailyEvaluation(planId, d.dayOfWeek, "DIRECTOR", directorActorId);
                                const updated = await service.getPlanning(planId);
                                if (updated) setPlan(updated);
                                setToastMessage("✓ Evaluación aprobada");
                                setTimeout(() => setToastMessage(""), 2000);
                                onSaved();
                              } catch {
                                setEvalActionError("No fue posible aprobar la evaluación. Intenta nuevamente.");
                              } finally {
                                setIsEvalActionPending(false);
                              }
                            }}
                            className="bg-brand-primary hover:bg-brand-dark text-white font-bold px-6 py-2.5 rounded-full shadow-md transition flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            ✓ Aprobar evaluación
                          </button>
                        </div>
                      )}

                      {evalActionError && (
                        <div
                          role="alert"
                          className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm font-medium flex items-center justify-center gap-2 animate-fade-in"
                        >
                          <span>⚠️</span>
                          <span>{evalActionError}</span>
                        </div>
                      )}
                    </div>
                  );
                })()}

               {d.evaluationStatus === 'APPROVED' && (
                 <div className="mt-10 pt-8 border-t border-teal-100 bg-surface-ivory p-6 rounded-xl border">
                   <div className="flex items-center justify-between mb-4">
                     <h5 className="text-xl font-bold text-teal-900 flex items-center gap-2">
                       <span>📝</span> Evaluación del día
                     </h5>
                     <span className="text-xs font-bold bg-green-100 text-green-800 border border-green-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                       <span>✓</span> Evaluación aprobada
                     </span>
                   </div>
                   <div className="bg-white p-5 rounded-lg border border-green-100 shadow-inner">
                     <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block mb-2">
                       {getAssistantRoleLabel((plan as any)?.roomId || activeRoom?.roomId)}:
                     </span>
                     <p className="text-base text-gray-900 leading-relaxed font-medium whitespace-pre-wrap">
                       {d.evaluation}
                     </p>
                   </div>
                   <p className="text-xs text-green-800 mt-3 font-semibold flex items-center gap-1.5">
                     <span>✓</span> Aprobada por {getInstitutionalActorLabel(d.evaluationReviewedBy, (plan as any)?.roomId || activeRoom?.roomId)}.
                   </p>
                 </div>
               )}

               {d.evaluationStatus === 'CHANGES_REQUESTED' && (
                 <div className="mt-10 pt-8 border-t border-teal-100 bg-surface-ivory p-6 rounded-xl border">
                   <div className="flex items-center justify-between mb-4">
                     <h5 className="text-xl font-bold text-teal-900 flex items-center gap-2">
                       <span>📝</span> Evaluación del día
                     </h5>
                     <span className="text-xs font-bold bg-orange-100 text-orange-800 border border-orange-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                       <span>⚠</span> CAMBIO SOLICITADO
                     </span>
                   </div>
                   <div className="bg-white p-5 rounded-lg border border-orange-100 shadow-inner mb-3">
                     <span className="text-xs font-bold text-teal-800 uppercase tracking-wider block mb-2">
                       {getAssistantRoleLabel((plan as any)?.roomId || activeRoom?.roomId)}:
                     </span>
                     <p className="text-base text-gray-900 leading-relaxed font-medium whitespace-pre-wrap">
                       {d.evaluation}
                     </p>
                   </div>
                   <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-900">
                     <span className="font-bold block mb-1">Observación de la Educadora:</span>
                     <p>{d.evaluationDirectorComment}</p>
                   </div>
                 </div>
               )}

               {(() => {
                 const isPostPlanningReview =
                   plan.status === 'APPROVED' ||
                   plan.status === 'APPROVED_FOR_EXECUTION' ||
                   (plan.status as string) === 'READY_FOR_CLOSURE' ||
                   plan.status === 'CLOSED' ||
                   Boolean(plan.isReadyForClosure);

                 if (isPostPlanningReview) {
                   return null;
                 }

                 const isOrange = requiredCorrectionDays.includes(d.dayOfWeek);
                 const isReviewed = isDayReviewedByDirector(d.dayOfWeek);

                 if (isOrange) {
                   return (
                     <div className="mt-10 pt-6 border-t border-border-soft flex justify-center">
                       <button disabled className="bg-orange-100 border border-orange-300 text-orange-800 font-bold px-8 py-3 rounded-full shadow-sm flex items-center gap-2 cursor-default opacity-90">
                         <span>🟠</span> Día con observaciones
                       </button>
                     </div>
                   );
                 }

                 if (isReviewed) {
                   return (
                     <div className="mt-10 pt-6 border-t border-border-soft flex justify-center">
                       <button disabled className="bg-green-100 border border-green-300 text-green-800 font-bold px-8 py-3 rounded-full shadow-sm flex items-center gap-2 cursor-default opacity-90">
                         <span className="text-xl">✓</span> Día revisado
                       </button>
                     </div>
                   );
                 }

                 return (
                   <div className="mt-10 pt-6 border-t border-border-soft flex justify-center">
                     <button
                       disabled={markingDayOfWeek === d.dayOfWeek || Boolean(markingDayOfWeek)}
                       onClick={async () => {
                         if (markingDayOfWeek) return;
                         setMarkingDayOfWeek(d.dayOfWeek);
                         try {
                           await service.markDirectorDayReviewed(planId, d.dayOfWeek, "DIRECTOR");
                           const updated = await service.getPlanning(planId);
                           if (!updated) {
                             throw new Error("No se pudo recuperar la planeación actualizada.");
                           }
                           const dayInUpdated = updated.days.find((day: any) => day.dayOfWeek === d.dayOfWeek);
                           const isPersisted = Boolean(dayInUpdated?.directorReviewed);
                           if (!isPersisted) {
                             throw new Error("La revisión del día no quedó persistida en el repositorio.");
                           }
                           setPlan(updated);
                           setDirectorReviewedDays(prev => ({ ...prev, [d.dayOfWeek]: true }));
                           setToastMessage("✓ Día marcado como revisado");
                           setTimeout(() => setToastMessage(""), 2000);
                         } catch (err: any) {
                           console.error("[SR-MD-19-E] Error al marcar día como revisado:", err);
                           setToastMessage(`❌ Error al marcar día revisado: ${err?.message || "Error de permisos o red"}`);
                           setTimeout(() => setToastMessage(""), 4000);
                         } finally {
                           setMarkingDayOfWeek(null);
                         }
                       }}
                       className="bg-surface-ivory hover:bg-teal-50 border border-teal-200 text-teal-700 font-bold px-8 py-3 rounded-full transition shadow-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                     >
                       <span className="text-xl">✓</span> {markingDayOfWeek === d.dayOfWeek ? "Guardando revisión..." : "Marcar día revisado"}
                     </button>
                   </div>
                 );
               })()}
            </div>
          );
        })()}
      </div>

      {plan.status === 'IN_REVIEW' && (
        <div className="mt-16 flex justify-center">
          <div className="flex flex-col gap-6 max-w-2xl w-full">
            <button
              onClick={handleSendRound}
              disabled={preparedCount === 0}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold text-lg px-8 py-4 rounded-full shadow-sm transition disabled:opacity-50 uppercase tracking-wider"
            >
              ENVIAR OBSERVACIONES A LA EDUCADORA
            </button>

            {(() => {
              const existingObsList = plan?.granularObservations || [];
              const pendingCount = existingObsList.filter((o: any) => o.status === 'PENDING_CORRECTION' || o.status === 'CHANGED_BY_EDUCATOR').length;

              const dayNames: Record<string, string> = {
                MONDAY: "Lunes",
                TUESDAY: "Martes",
                WEDNESDAY: "Miércoles",
                THURSDAY: "Jueves",
                FRIDAY: "Viernes",
              };

              const unreviewedDays = (plan?.days || [])
                .filter((d: any) => !isDayReviewedByDirector(d.dayOfWeek))
                .map((d: any) => dayNames[d.dayOfWeek] || d.dayOfWeek);

              const allDaysExplicitlyReviewed = (plan?.days || []).length === 5 && unreviewedDays.length === 0;
              const canApprove = allDaysExplicitlyReviewed && preparedCount === 0 && pendingCount === 0;

              return (
                <>
                  <button
                    onClick={async () => {
                      await service.approve(planId, "DIRECTOR", "Ceci");
                      const updated = await service.getPlanning(planId);
                      if (updated) setPlan(updated);
                      onSaved();
                      setToastMessage("🌟 Planeación aprobada para ejecución.");
                      setTimeout(() => { setToastMessage(''); onBack(); }, 2000);
                    }}
                    disabled={!canApprove}
                    className="w-full bg-brand-primary hover:bg-brand-dark text-white font-bold text-lg px-8 py-6 rounded-full shadow-lg transition flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>✓ APROBAR TODA LA PLANEACIÓN</span>
                    <span className="text-xs font-bold bg-white/25 px-3 py-1 rounded-full uppercase tracking-wider">Para Ejecución</span>
                  </button>
                  {!allDaysExplicitlyReviewed && (
                    <p className="text-center text-text-muted text-sm font-medium">
                      Debes marcar como revisados los 5 días en la planeación para poder aprobarla. {unreviewedDays.length > 0 && `(Días pendientes: ${unreviewedDays.join(", ")})`}
                    </p>
                  )}
                  {preparedCount > 0 && <p className="text-center text-orange-700 text-sm font-bold">La aprobación está bloqueada porque hay observaciones preparadas sin enviar.</p>}
                  {pendingCount > 0 && preparedCount === 0 && <p className="text-center text-orange-700 text-sm font-bold">La aprobación está bloqueada porque hay observaciones pendientes de revisar o atender.</p>}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

const SupervisorReview = ({ service, planId, modality, onBack, onViewOfficial, activeRoom }: { service: PlanningWorkflowService, planId: string, modality: 'DIRECT'|'INDIRECT', onBack: () => void, onViewOfficial: () => void, activeRoom?: Room | undefined }) => {
  const [plan, setPlan] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'PLAN' | 'HISTORY'>('PLAN');

  useEffect(() => { service.getPlanning(planId).then(setPlan); }, [planId, service]);
  if (!plan) return <p className="p-8 text-center text-xl">Cargando...</p>;

  return (
    <div className="max-w-5xl mx-auto pb-32 animate-fade-in">
      <div className="flex flex-wrap items-center justify-between mb-8 gap-4">
        <button onClick={onBack} className="text-text-muted hover:text-gray-800 font-bold px-4 py-2 rounded-full hover:bg-gray-200 transition">← Volver al listado</button>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-teal-900 bg-teal-100 px-4 py-2 rounded-full border border-teal-300 shadow-sm flex items-center gap-1.5">
            <span>🔒</span> ✓ Semana cerrada
          </span>
          {plan.closedBy && (
            <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-full border border-gray-200">
              Cerrada por: {getInstitutionalActorLabel(plan.closedBy, plan.roomId)} {plan.closedAt ? `• ${formatInstitutionalDate(plan.closedAt)}` : ''}
            </span>
          )}
        </div>
        <div className="flex gap-3">
          <button onClick={() => setActiveTab('PLAN')} className={`px-6 py-2 rounded-full font-bold transition ${activeTab === 'PLAN' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>VER PLANEACIÓN Y EVALUACIONES</button>
          <button onClick={() => setActiveTab('HISTORY')} className={`px-6 py-2 rounded-full font-bold transition ${activeTab === 'HISTORY' ? 'bg-gray-800 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>VER HISTORIAL DE CAMBIOS</button>
          <button onClick={onViewOfficial} className="px-6 py-2 rounded-full font-bold transition bg-teal-700 hover:bg-teal-800 text-white shadow-sm flex items-center gap-2">VER VERSIÓN OFICIAL IMSS</button>
        </div>
      </div>

      <div className="text-center mb-8">
        <h2 className="text-4xl font-bold mb-2">{getAssistantRoleLabel((plan as any)?.roomId || activeRoom?.roomId)}</h2>
        <p className="text-text-muted font-bold text-xl uppercase tracking-widest">
          Guardería IMSS Demo (001) • Sala: {((plan as any)?.roomId && RoomCatalog.getRoom((plan as any)?.roomId)?.name) || activeRoom?.name || 'Lactantes C'} • Periodo: {formatPlanPeriod(plan)}
        </p>
        <div className="flex items-center justify-center gap-3 mt-3">
          <span className="text-sm font-bold text-teal-800 bg-teal-50 px-4 py-1.5 rounded-full border border-teal-200">
            {modality === 'DIRECT' ? 'Prestación Directa' : 'Prestación Indirecta'}
          </span>
        </div>
      </div>

      {activeTab === 'PLAN' && (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-border-soft space-y-8">
          <h2 className="text-3xl font-bold mb-6 text-center text-text-primary">Contenido de la Planeación y Evaluaciones (Lectura Institucional)</h2>
          <div className="bg-surface-soft border border-border-soft p-6 rounded-xl mb-8 space-y-4">
            <h3 className="text-xl font-bold text-teal-800 uppercase tracking-widest border-b border-teal-100 pb-2">Contexto de la Asistente Educativa</h3>
            <div><p className="text-sm font-bold text-text-muted uppercase mb-1">1. ¿Qué observaste en el grupo? (Observaciones)</p><p className="text-text-primary font-medium">{plan.observations || 'Sin especificar'}</p></div>
            <div><p className="text-sm font-bold text-text-muted uppercase mb-1">2. ¿Qué necesitan fortalecer? (Necesidades)</p><p className="text-text-primary font-medium">{plan.identifiedNeeds || 'Sin especificar'}</p></div>
            <div><p className="text-sm font-bold text-text-muted uppercase mb-1">3. ¿Hay situaciones a considerar? (Situaciones especiales)</p><p className="text-text-primary font-medium">{plan.specialSituations || 'Sin especificar'}</p></div>
            <div><p className="text-sm font-bold text-text-muted uppercase mb-1">4. ¿Qué materiales tienes disponibles? (Materiales)</p><p className="text-text-primary font-medium">{plan.availableMaterials || 'Sin especificar'}</p></div>
          </div>

          <div className="space-y-10">
            {plan.days.map((d: any) => {
              const daySpanishNames: Record<string, string> = {
                MONDAY: 'Lunes 24',
                TUESDAY: 'Martes 25',
                WEDNESDAY: 'Miércoles 26',
                THURSDAY: 'Jueves 27',
                FRIDAY: 'Viernes 28'
              };
              const dayLabel = daySpanishNames[d.dayOfWeek] || d.dayOfWeek;

              return (
                <div key={d.dayOfWeek} className="border border-border-soft rounded-xl p-6 bg-surface-ivory/50">
                  <div className="flex justify-between items-center border-b border-gray-200 pb-3 mb-6">
                    <h3 className="text-2xl font-bold text-teal-900">{dayLabel}</h3>
                    <span className="text-xs font-bold bg-green-100 text-green-800 border border-green-300 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                      <span>✓</span> Evaluación aprobada
                    </span>
                  </div>

                  <div className="space-y-4 mb-6">
                    <h4 className="text-sm font-bold text-teal-800 uppercase tracking-wider">Actividades Pedagógicas Planificadas</h4>
                    {d.activities.length === 0 ? <p className="text-gray-500">Sin actividades</p> : d.activities.map((a: any) => (
                      <div key={a.activityId} className="bg-white p-4 rounded-lg border border-border-soft shadow-xs">
                        <div className="flex justify-between items-center mb-1">
                          <p className="font-bold text-lg text-gray-900">{a.objective}</p>
                          <span className="text-xs font-bold text-teal-700 bg-teal-50 px-2.5 py-0.5 rounded-full">{a.category} • {a.durationMinutes} min</span>
                        </div>
                        <p className="text-gray-700 font-normal mt-2">{a.description}</p>
                        {a.materials && a.materials.length > 0 && (
                          <p className="text-xs text-text-muted mt-2"><strong>Materiales:</strong> {a.materials.join(', ')}</p>
                        )}
                        {plan && modality === 'DIRECT' && (
                          <div className="mt-4 pt-3 border-t border-gray-100">
                            <CurricularSelectionControl
                              activity={a}
                              dayIdentifier={d.dayOfWeek}
                              planning={plan}
                              readOnly={true}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* SUPERVISOR DAILY COMPLEMENTARY ACTIVITY DETAIL (H1R9-F.4) */}
                  <div className="mt-6 mb-6 pt-5 border-t border-border-soft">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🧩</span> Actividades complementarias de otros programas
                      </h4>
                      <span className="text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Programa institucional
                      </span>
                    </div>

                    {(!d.complementaryActivities || d.complementaryActivities.length === 0) ? (
                      <div className="bg-white border border-border-soft rounded-lg p-4 text-center">
                        <p className="text-text-primary font-bold text-sm mb-1">
                          Sin actividad complementaria propuesta para este día.
                        </p>
                        <p className="text-text-muted text-xs font-medium">
                          TutorIA no asignará actividades de otros programas hasta contar con una fuente institucional validada.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {d.complementaryActivities.map((ca: any, idx: number) => (
                          <div key={idx} className="bg-white border border-border-soft rounded-lg p-4 shadow-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                              <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                {ca.programArea}
                              </span>
                              {ca.sourceReference && (
                                <span className="text-xs text-text-muted font-medium">
                                  Fuente: {ca.sourceReference}
                                </span>
                              )}
                            </div>
                            <h5 className="font-bold text-text-primary text-base mb-1">
                              {ca.activityName}
                            </h5>
                            {ca.purpose && (
                              <p className="text-xs font-semibold text-teal-900 mb-1.5">
                                <strong>Propósito:</strong> {ca.purpose}
                              </p>
                            )}
                            {ca.description && (
                              <p className="text-xs text-gray-700 leading-relaxed font-normal">
                                {ca.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* SUPERVISOR DAILY PRIORITIZED PRACTICES DETAIL (H1R9-F.7.4) */}
                  <div className="mt-6 mb-6 pt-5 border-t border-border-soft" data-testid={`supervisor-prioritized-practices-${d.dayOfWeek}`}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-teal-800 uppercase tracking-wider flex items-center gap-1.5">
                        <span>🎯</span> Prácticas priorizadas
                      </h4>
                      <span className="text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Instrucción institucional
                      </span>
                    </div>

                    {(!d.prioritizedPractices || d.prioritizedPractices.length === 0) ? (
                      <div className="bg-white border border-border-soft rounded-lg p-4 text-center">
                        <p className="text-text-primary font-bold text-sm mb-1">
                          Sin práctica priorizada registrada para este día.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {d.prioritizedPractices.map((practice: any, idx: number) => (
                          <div key={idx} className="bg-white border border-border-soft rounded-lg p-4 shadow-xs" data-testid={`tere-prioritized-practice-entry-${idx}`}>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                              <span className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                                Práctica priorizada
                              </span>
                              {practice.sourceReference && (
                                <span className="text-xs text-text-muted font-medium">
                                  Referencia: {practice.sourceReference}
                                </span>
                              )}
                            </div>
                            <h5 className="font-bold text-text-primary text-base mb-1">
                              {practice.practiceName}
                            </h5>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-green-50/60 border border-green-200 rounded-lg p-5">
                    <div className="flex items-center justify-between mb-2 border-b border-green-100 pb-2">
                      <span className="text-xs font-bold text-green-900 uppercase tracking-wider flex items-center gap-1.5">
                        <span>📝</span> Evaluación final del día
                      </span>
                      <span className="text-[11px] font-medium text-green-700">
                        {d.evaluationReviewedAt ? formatInstitutionalDate(d.evaluationReviewedAt) : 'Aprobada'}
                      </span>
                    </div>
                    <div className="text-base text-gray-900 leading-relaxed font-medium whitespace-pre-wrap bg-white p-4 rounded-lg border border-green-100 shadow-inner min-h-[60px]">
                      {d.evaluation || 'Sin evaluación registrada'}
                    </div>
                    <p className="text-xs text-green-800 mt-2.5 font-semibold flex items-center gap-1.5">
                      <span>✓</span> Aprobada por {getInstitutionalActorLabel(d.evaluationReviewedBy, plan.roomId)}.
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'HISTORY' && (() => {
        const hasGranular = Boolean(plan.granularObservations && plan.granularObservations.length > 0);
        const hasRounds = Boolean(plan.historicalRounds && plan.historicalRounds.length > 0);
        const daysWithEvalHistory = (plan.days || []).filter(
          (d: any) => d.evaluationHistory && d.evaluationHistory.length > 0
        );
        const hasAnyHistory = hasGranular || hasRounds || daysWithEvalHistory.length > 0;

        const daySpanishNames: Record<string, string> = {
          MONDAY: 'Lunes 24',
          TUESDAY: 'Martes 25',
          WEDNESDAY: 'Miércoles 26',
          THURSDAY: 'Jueves 27',
          FRIDAY: 'Viernes 28'
        };

        return (
          <div className="bg-white p-8 rounded-xl shadow-sm border border-border-soft space-y-12" data-testid="supervisor-history-container">
            <div className="text-center border-b border-gray-200 pb-4">
              <h2 className="text-3xl font-bold text-text-primary uppercase tracking-wide">HISTORIAL DE REVISIONES</h2>
              <p className="text-text-muted font-medium mt-1">
                Auditoría institucional de adecuaciones a la planeación pedagógica y modificaciones a las evaluaciones diarias.
              </p>
            </div>

            {!hasAnyHistory ? (
              <div className="p-8 text-center bg-gray-50 border border-gray-200 rounded-xl" data-testid="supervisor-no-history">
                <p className="text-gray-600 font-semibold text-lg">No hay observaciones registradas.</p>
                <p className="text-gray-400 text-sm mt-1">La planeación y sus evaluaciones fueron concluidas en su primera versión institucional sin ajustes registrados.</p>
              </div>
            ) : (
              <div className="space-y-12">
                {/* SECCIÓN 1: MODIFICACIONES DE LA PLANEACIÓN PEDAGÓGICA */}
                <div className="space-y-6" data-testid="supervisor-planning-history-section">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                      <span>📋</span> Modificaciones de la Planeación Pedagógica
                    </h3>
                    <span className="text-xs font-bold px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-full uppercase tracking-wider">
                      {hasRounds ? `${plan.historicalRounds.length} ronda(s) de revisión` : hasGranular ? `${plan.granularObservations.length} observación(es)` : 'Sin observaciones'}
                    </span>
                  </div>

                  {!hasGranular && !hasRounds ? (
                    <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center" data-testid="supervisor-empty-planning-history">
                      <p className="text-gray-600 font-semibold text-base">Sin modificaciones a las actividades pedagógicas registradas</p>
                      <p className="text-gray-400 text-xs mt-1">La planeación fue aprobada sin rondas de observaciones previas.</p>
                    </div>
                  ) : hasRounds ? (
                    <>
                      <div className="space-y-6">
                        <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest border-b border-gray-200 pb-2">
                          ▼ ÚLTIMA REVISIÓN — RONDA {plan.historicalRounds.length}
                        </h3>
                        {[...plan.historicalRounds[plan.historicalRounds.length - 1].observations].reverse().map((obs: any, idx: number) => (
                          <div key={idx} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm space-y-4">
                            <div className="flex justify-between items-center">
                              <span className="font-bold text-gray-800 uppercase tracking-wider text-sm">
                                Observación de la Educadora
                              </span>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${obs.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : obs.status === 'CHANGED_BY_EDUCATOR' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'}`}>
                                  {obs.status === 'RESOLVED' ? '✅ ATENDIDA' : 'Pendiente / Cambio solicitado'}
                                </span>
                                {obs.status === 'RESOLVED' && obs.resolvedBy && (
                                  <span className="text-xs text-green-700 font-bold">
                                    Atendida por: {getInstitutionalActorLabel(obs.resolvedBy, plan?.roomId)} • {formatInstitutionalDate(obs.resolvedAt)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <p className="text-lg font-black text-gray-900 leading-relaxed whitespace-pre-wrap">{obs.observation}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Antes (Original):</p>
                                <p className="text-sm text-gray-700 font-normal whitespace-pre-wrap leading-relaxed">{obs.originalContent}</p>
                              </div>
                              <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                                <p className="text-xs font-bold text-green-700 uppercase mb-2">Ahora ({getAssistantRoleLabel(plan?.roomId)}):</p>
                                <p className="text-sm text-gray-900 font-bold whitespace-pre-wrap leading-relaxed">{obs.currentContent}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {plan.historicalRounds.length > 1 && (
                        <div className="space-y-6">
                          <h3 className="text-xl font-bold text-gray-600 uppercase tracking-widest border-b border-gray-200 pb-2 mt-8">
                            REVISIONES ANTERIORES
                          </h3>
                          {[...plan.historicalRounds].reverse().slice(1).map((round: any, rIdx: number) => (
                            <details key={round.roundId || rIdx} className="group">
                              <summary className="font-bold text-gray-600 cursor-pointer mb-4 outline-none hover:text-gray-800 uppercase tracking-wider text-sm bg-gray-50 p-3 rounded-lg border border-gray-200 text-left flex items-center">
                                ▶ REVISIÓN ANTERIOR — RONDA {plan.historicalRounds.length - 1 - rIdx}
                              </summary>
                              <div className="space-y-6 mt-4">
                                {[...round.observations].reverse().map((obs: any, idx: number) => (
                                  <div key={idx} className="border border-gray-200 rounded-lg p-5 opacity-90 hover:opacity-100 transition bg-white space-y-4">
                                    <div className="flex justify-between items-center">
                                      <span className="font-bold text-gray-600 uppercase tracking-wider text-sm">Observación de la Educadora</span>
                                      {obs.status === 'RESOLVED' && (
                                        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full uppercase bg-green-50 text-green-700 border border-green-200">
                                          Atendida
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-base font-black text-gray-700 leading-relaxed whitespace-pre-wrap">{obs.observation}</p>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                        <p className="text-xs font-bold text-gray-500 uppercase mb-1">Antes:</p>
                                        <p className="text-xs text-gray-600 font-normal whitespace-pre-wrap">{obs.originalContent}</p>
                                      </div>
                                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                                        <p className="text-xs font-bold text-gray-700 uppercase mb-1">Después:</p>
                                        <p className="text-xs text-gray-800 font-bold whitespace-pre-wrap">{obs.currentContent}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </details>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="space-y-6">
                      <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest border-b border-gray-200 pb-2">
                        ▼ ÚLTIMA REVISIÓN
                      </h3>
                      {[...plan.granularObservations].reverse().map((obs: any, idx: number) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm space-y-4">
                          <div className="flex justify-between items-center">
                            <span className="font-bold text-gray-800 uppercase tracking-wider text-sm">
                              Observación de la Educadora
                            </span>
                            <div className="flex flex-col items-end gap-1">
                              <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest ${obs.status === 'RESOLVED' ? 'bg-green-100 text-green-800' : obs.status === 'CHANGED_BY_EDUCATOR' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'}`}>
                                {obs.status === 'RESOLVED' ? 'Atendida' : 'Pendiente / Cambio solicitado'}
                              </span>
                              {obs.status === 'RESOLVED' && obs.resolvedBy && (
                                <span className="text-xs text-green-700 font-bold">
                                  Atendida por: {getInstitutionalActorLabel(obs.resolvedBy, plan?.roomId)} • {formatInstitutionalDate(obs.resolvedAt)}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-lg font-black text-gray-900 leading-relaxed whitespace-pre-wrap">{obs.observation}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                              <p className="text-xs font-bold text-gray-500 uppercase mb-2">Antes (Original):</p>
                              <p className="text-sm text-gray-700 font-normal whitespace-pre-wrap leading-relaxed">{obs.originalContent}</p>
                            </div>
                            <div className="bg-white border border-gray-200 p-4 rounded-lg shadow-sm">
                              <p className="text-xs font-bold text-green-700 uppercase mb-2">Ahora ({getAssistantRoleLabel(plan?.roomId)}):</p>
                              <p className="text-sm text-gray-900 font-bold whitespace-pre-wrap leading-relaxed">{obs.currentContent}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECCIÓN 2: MODIFICACIONES DE LAS EVALUACIONES DIARIAS */}
                <div className="space-y-6 pt-6 border-t border-gray-200" data-testid="supervisor-evaluation-history-section">
                  <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-widest flex items-center gap-2">
                      <span>📝</span> Modificaciones de las Evaluaciones Diarias
                    </h3>
                    <span className="text-xs font-bold px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded-full uppercase tracking-wider">
                      {daysWithEvalHistory.length > 0 ? `${daysWithEvalHistory.length} día(s) con modificaciones` : 'Sin modificaciones'}
                    </span>
                  </div>

                  {daysWithEvalHistory.length === 0 ? (
                    <div className="p-6 bg-gray-50 border border-gray-200 rounded-xl text-center" data-testid="supervisor-empty-evaluation-history">
                      <p className="text-gray-600 font-semibold text-base">Sin modificaciones históricas de evaluación registradas</p>
                      <p className="text-gray-400 text-xs mt-1">Todas las evaluaciones diarias fueron aprobadas en su primera entrega institucional.</p>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {daysWithEvalHistory.map((d: any) => {
                        const dayLabel = daySpanishNames[d.dayOfWeek] || d.dayOfWeek;
                        return (
                          <div key={d.dayOfWeek} className="border border-border-soft rounded-xl p-6 bg-surface-ivory/50 shadow-xs space-y-6" data-testid={`eval-history-day-${d.dayOfWeek}`}>
                            <div className="flex justify-between items-center border-b border-gray-200 pb-3">
                              <h4 className="text-xl font-bold text-teal-900">{dayLabel}</h4>
                              <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider bg-orange-100 text-orange-900 border border-orange-300">
                                {d.evaluationHistory.length} {d.evaluationHistory.length === 1 ? 'modificación registrada' : 'modificaciones registradas'}
                              </span>
                            </div>

                            <div className="space-y-6">
                              {d.evaluationHistory.map((entry: any, eIdx: number) => (
                                <div key={eIdx} className="border border-gray-200 rounded-lg p-5 bg-white shadow-sm space-y-4">
                                  <div className="flex flex-wrap justify-between items-center gap-2 border-b border-gray-100 pb-3">
                                    <span className="font-bold text-gray-800 uppercase tracking-wider text-sm flex items-center gap-1.5">
                                      <span>💬</span> Observación de la Educadora
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest bg-orange-100 text-orange-900 border border-orange-300">
                                        {entry.status === 'CHANGES_REQUESTED' ? '🟠 Cambio solicitado' : entry.status || 'Modificación'}
                                      </span>
                                      {entry.reviewedAt && (
                                        <span className="text-xs text-gray-500 font-medium">
                                          {formatInstitutionalDate(entry.reviewedAt)}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {entry.directorComment && (
                                    <div className="p-4 bg-orange-50/80 border border-orange-200 rounded-lg text-sm text-orange-950 font-medium">
                                      <span className="text-xs font-bold text-orange-800 uppercase tracking-wider block mb-1">
                                        Instrucción de ajuste ({getInstitutionalActorLabel(entry.reviewedBy, plan?.roomId)}):
                                      </span>
                                      <p className="whitespace-pre-wrap">{entry.directorComment}</p>
                                    </div>
                                  )}

                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-gray-600 uppercase tracking-wider">
                                          Versión Anterior (Devuelta)
                                        </span>
                                        {entry.submittedAt && (
                                          <span className="text-[11px] text-gray-400 font-medium">
                                            {formatInstitutionalDate(entry.submittedAt)}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-700 font-normal whitespace-pre-wrap leading-relaxed">
                                        {entry.evaluation || 'Sin texto previo'}
                                      </p>
                                      <p className="text-[11px] text-gray-500 mt-3 pt-2 border-t border-gray-200">
                                        Enviada originalmente por: <strong>{getInstitutionalActorLabel(entry.submittedBy, plan?.roomId)}</strong>
                                      </p>
                                    </div>

                                    <div className="bg-emerald-50/30 p-4 rounded-lg border border-emerald-200 shadow-xs">
                                      <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                                          Versión Posterior (Corregida / Actual)
                                        </span>
                                        {(d.evaluationSubmittedAt || d.evaluationReviewedAt) && (
                                          <span className="text-[11px] text-emerald-700 font-medium">
                                            {formatInstitutionalDate(d.evaluationSubmittedAt || d.evaluationReviewedAt)}
                                          </span>
                                        )}
                                      </div>
                                      <p className="text-sm text-gray-900 font-medium whitespace-pre-wrap leading-relaxed">
                                        {d.evaluation || 'Sin evaluación registrada'}
                                      </p>
                                      <div className="mt-3 pt-2 border-t border-emerald-100 flex flex-wrap justify-between items-center gap-1 text-[11px] text-emerald-800 font-medium">
                                        <span>Corregida por: <strong>{getInstitutionalActorLabel(d.evaluationSubmittedBy || entry.submittedBy, plan?.roomId)}</strong></span>
                                        <span>✓ Aprobada por: <strong>{getInstitutionalActorLabel(d.evaluationReviewedBy || entry.reviewedBy, plan?.roomId)}</strong></span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
};
const SupervisorList = ({ service, onSelect, refreshKey, activeRoom, daycareId }: { service: PlanningWorkflowService, onSelect: (id: string) => void, refreshKey: number, activeRoom?: Room | undefined, daycareId?: string | undefined }) => {
  const [plans, setPlans] = useState<WeeklyPlanning[]>([]);
  useEffect(() => { service.listSupervisorClosedPlanning('SUPERVISOR', daycareId).then(setPlans); }, [refreshKey, service, daycareId]);
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <h1 className="text-4xl font-bold mb-4 text-center">Registros semanales cerrados</h1>
      <p className="text-center text-text-muted text-xl mb-12">Historial institucional de semanas concluidas y cerradas.</p>

      <div className="grid gap-6 w-full">
        {plans.map(p => (
           <button key={p.planningId} onClick={() => onSelect(p.planningId)} className="bg-white border border-border-default hover:border-gray-400 p-8 rounded-xl shadow-sm text-left transition w-full outline-none flex justify-between items-center">
             <div>
               <span className="font-bold text-text-primary text-2xl mb-1 block">{getAssistantRoleLabel((p as any).roomId || activeRoom?.roomId)}</span>
               <p className="text-sm font-semibold text-teal-800 mb-1">{p.daycareId === FIRST_LIGHT_G002_DAYCARE_ID ? 'Guardería 002' : 'Guardería IMSS Demo (001)'}</p>
               <p className="text-base text-text-muted font-medium">{((p as any).roomId && RoomCatalog.getRoom((p as any).roomId)?.name) || activeRoom?.name || 'Lactantes C'} • Semana del {formatPlanPeriod(p)}</p>
               {p.closedBy && (
                 <p className="text-xs text-text-muted mt-2 font-medium">Cerrada por: {getInstitutionalActorLabel(p.closedBy, (p as any).roomId)} {p.closedAt ? `• ${formatInstitutionalDate(p.closedAt)}` : ''}</p>
               )}
             </div>
             <span className="text-sm font-bold px-5 py-2 rounded-full bg-teal-100 text-teal-800 border border-teal-300 flex items-center gap-1.5 shadow-sm">
               <span>🔒</span> ✓ Semana cerrada
             </span>
           </button>
        ))}
        {plans.length === 0 && <p className="text-text-muted text-center mt-12 text-xl font-medium">Aún no hay semanas cerradas para supervisión.</p>}
      </div>
    </div>
  );
};




const PrintableView = ({
  service,
  planId,
  modality,
  onBack,
  simulateMeasurementFailure,
  anversoComposerOverride,
  activeRoom,
}: {
  service: PlanningWorkflowService;
  planId: string;
  modality: 'DIRECT' | 'INDIRECT';
  onBack: () => void;
  simulateMeasurementFailure?: boolean;
  anversoComposerOverride?: (day: any, plan: any) => ComposedAnversoPage[];
  activeRoom?: Room | undefined;
}) => {
  const [plan, setPlan] = useState<any>(null);
  useEffect(() => {
    service.getPlanning(planId).then(setPlan);
  }, [planId, service]);

  if (!plan) return null;

  const officialRoomName = ((plan as any)?.roomId && RoomCatalog.getRoom((plan as any)?.roomId)?.name) || activeRoom?.name || 'Lactantes C';

  const isDirect = modality === 'DIRECT';

  if (isDirect) {
    const daySpanishNames: Record<string, string> = {
      MONDAY: 'Lunes 24',
      TUESDAY: 'Martes 25',
      WEDNESDAY: 'Miércoles 26',
      THURSDAY: 'Jueves 27',
      FRIDAY: 'Viernes 28',
    };

    const measurementFailed = simulateMeasurementFailure === true;

    const renderPdaTable = (pdaEntries: typeof DIRECT_PDA_CATALOG, selectedPdaIds: Set<string>) => (
      <table className="direct-reverso-table w-full border border-black border-collapse text-xs print:text-[8px] leading-tight">
        <thead className="bg-gray-100 font-bold border-b border-black">
          <tr>
            <th className="w-[25%] p-1.5 text-left border-r border-black font-bold text-black">Campo Formativo</th>
            <th className="w-[33%] p-1.5 text-left border-r border-black font-bold text-black">Contenidos</th>
            <th className="w-[33%] p-1.5 text-left border-r border-black font-bold text-black">Procesos de Desarrollo de Aprendizaje</th>
            <th className="w-[9%] p-1.5 text-center font-bold text-black">En la Planeación</th>
          </tr>
        </thead>
        <tbody>
          {pdaEntries.map((entry, idx) => {
            const isMarked = selectedPdaIds.has(entry.id);
            const isFirstInCampo = idx === 0 || pdaEntries[idx - 1]!.campoFormativo !== entry.campoFormativo;
            const isFirstInContenido = idx === 0 || pdaEntries[idx - 1]!.contenido !== entry.contenido;

            return (
              <tr
                key={entry.id}
                data-testid={`pda-row-${entry.id}`}
                className={`border-b border-gray-200 ${
                  idx % 2 === 1 ? 'bg-gray-50/50' : 'bg-white'
                }`}
              >
                <td className="w-[25%] p-1.5 align-top font-bold text-teal-900 border-r border-gray-200">
                  {isFirstInCampo ? entry.campoFormativo : ''}
                </td>
                <td className="w-[33%] p-1.5 align-top text-gray-800 border-r border-gray-200">
                  {isFirstInContenido ? entry.contenido : ''}
                </td>
                <td className="w-[33%] p-1.5 align-top text-gray-900 font-normal border-r border-gray-200">
                  {entry.pda}
                </td>
                <td
                  data-testid={isMarked ? `pda-mark-${entry.id}` : `pda-unmarked-${entry.id}`}
                  className="w-[9%] p-1.5 align-top text-center font-bold text-sm print:text-xs"
                >
                  {isMarked ? '✓' : ''}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    );

    const getComposedAnversoPages = (d: any): ComposedAnversoPage[] => {
      if (anversoComposerOverride) {
        return anversoComposerOverride(d, plan);
      }

      // Authoritative normal Anverso: single explicit Letter page containing all official sections
      const blockIds: string[] = ['header', 'obs'];
      if (!d.activities || d.activities.length === 0) {
        blockIds.push('act_empty');
      } else {
        blockIds.push('act_heading');
        d.activities.forEach((_: any, idx: number) => {
          blockIds.push(`act_${idx}`);
        });
      }
      blockIds.push('eval', 'comp', 'mat', 'practices', 'sigs');

      return [
        {
          pageNumber: 1,
          blockIds,
          totalHeightMm: 0,
          hasContinuationHeader: false,
        },
      ];
    };

    const renderAnversoBlock = (bId: string, d: any, dayLabel: string, roomDisplayName: string) => {
      const dayMaterials = (d.activities || []).flatMap((a: any) => a.materials || []).filter(Boolean);
      const uniqueMaterials = Array.from(new Set(dayMaterials));

      if (bId === 'header') {
        return (
          <div key="header" data-testid="section-header">
            {/* 1. Institutional identity & Title / Código */}
            <div className="border-b-2 border-black pb-2 mb-3 print:pb-1.5 print:mb-2 flex justify-between items-start">
              <div>
                <p className="font-bold text-base print:text-xs text-black tracking-tight leading-tight uppercase font-sans">
                  Instituto Mexicano del Seguro Social
                </p>
                <p className="text-xs print:text-[9px] text-gray-700 tracking-wider uppercase font-sans">
                  Seguridad y Solidaridad Social
                </p>
              </div>
              <div className="text-right">
                <h1 className="text-xl print:text-sm font-bold text-black leading-tight tracking-tight">
                  Planeación de Actividades Pedagógicas<br/>
                  <span className="text-sm print:text-xs font-normal text-gray-700">(Anverso)</span>
                </h1>
                <p className="text-xs print:text-[9px] text-gray-700 font-bold uppercase tracking-widest">
                  Código: 3D11-009-003
                </p>
              </div>
            </div>

            {/* 2. Official identification lines: Guardería, Sala, Periodo stacked vertically on own lines */}
            <div className="direct-anverso-ident-stack space-y-1 mb-2 print:space-y-0.5 print:mb-1.5 text-xs print:text-[9.5px]">
              <div data-testid="direct-ident-field-guarderia" className="direct-ident-row flex items-baseline gap-2">
                <span className="font-bold text-black whitespace-nowrap">Guardería No.:</span>
                <span className="border-b border-black flex-grow font-semibold text-black px-2 pb-0.5">
                  {plan?.daycareId === FIRST_LIGHT_G002_DAYCARE_ID ? 'Guardería 002' : 'Guardería IMSS Demo (001)'}
                </span>
              </div>
              <div data-testid="direct-ident-field-sala" className="direct-ident-row flex items-baseline gap-2">
                <span className="font-bold text-black whitespace-nowrap">Sala de atención o Grupo:</span>
                <span className="border-b border-black flex-grow font-semibold text-black px-2 pb-0.5">
                  {roomDisplayName}
                </span>
              </div>
              <div data-testid="direct-ident-field-periodo" className="direct-ident-row flex items-baseline gap-2">
                <span className="font-bold text-black whitespace-nowrap">Periodo:</span>
                <span className="border-b border-black flex-grow font-semibold text-black px-2 pb-0.5">
                  <span>24 al 28 de agosto de 2026</span> ({dayLabel})
                </span>
              </div>
            </div>

            {/* 3. Official PLANEACIÓN bar */}
            <div className="bg-gray-200 border-y border-black py-0.5 px-2 mb-2 print:py-0.5 print:mb-1 text-center font-bold uppercase text-xs print:text-[10px] tracking-wider text-black">
              Planeación
            </div>
          </div>
        );
      }

      if (bId === 'obs') {
        return (
          <div key="obs" data-testid="section-observaciones" className="mb-3 print:mb-1.5">
            <h3 className="text-sm print:text-[9.5px] font-bold bg-gray-200 text-black p-1 uppercase border-b border-black mb-1 print:mb-0.5">
              Observaciones de las y los niños
            </h3>
            <p className="text-xs print:text-[9px] text-black print:leading-snug">
              {plan.observations || 'N/A'}
            </p>
          </div>
        );
      }

      if (bId === 'act_heading') {
        return (
          <div key="act_heading" data-testid="section-actividades-heading" className="mb-1 print:mb-0.5">
            <h3 className="text-sm print:text-[9.5px] font-bold bg-gray-200 text-black p-1 uppercase border-b border-black mb-1 print:mb-0.5">
              Planteamiento de actividades a realizar con las niñas y niños durante su estancia en la guardería (actividades para la atención y el cuidado cariñoso y sensible, y pedagógicas)
            </h3>
          </div>
        );
      }

      if (bId === 'act_empty') {
        return (
          <div key="act_empty" className="mb-3 print:mb-1.5">
            <p className="text-black italic text-xs print:text-[9px]">Sin actividades pedagógicas planificadas para este día.</p>
          </div>
        );
      }

      if (bId.startsWith('act_')) {
        const actIdx = parseInt(bId.replace('act_', ''), 10);
        const a = d.activities && d.activities[actIdx];
        if (!a) return null;
        return (
          <div key={bId} className="direct-anverso-activity border-l-2 border-black pl-2.5 print:pl-2 mb-2 print:mb-1">
            <p className="font-bold text-xs print:text-[9px] text-black">
              {a.objective} <span className="font-bold">({a.durationMinutes} min)</span>
            </p>
            <p className="text-xs print:text-[8.5px] text-black font-normal leading-snug print:leading-tight whitespace-pre-line">
              {a.description}
            </p>
          </div>
        );
      }

      if (bId === 'eval') {
        return (
          <div key="eval" data-testid="section-evaluacion" className="mb-3 print:mb-1.5">
            <h3 className="text-sm print:text-[9.5px] font-bold bg-gray-200 text-black p-1 uppercase border-b border-black mb-1 print:mb-0.5">
              Evaluación:
            </h3>
            <div className="text-xs print:text-[9px] text-black leading-snug min-h-[24px] print:min-h-[16px]">
              {d.evaluation ? (
                <p className="whitespace-pre-wrap">{d.evaluation}</p>
              ) : (
                <p className="italic text-gray-700">Espacio para la evaluación posterior a la implementación.</p>
              )}
            </div>
          </div>
        );
      }

      if (bId === 'comp') {
        return (
          <div key="comp" data-testid="section-complementarias" className="mb-3 print:mb-1.5">
            <h3 className="text-sm print:text-[9.5px] font-bold bg-gray-200 text-black p-1 uppercase border-b border-black mb-1 print:mb-0.5">
              Actividades complementarias de otros programas
            </h3>
            {(!d.complementaryActivities || d.complementaryActivities.length === 0) ? (
              <p className="text-black italic text-xs print:text-[9px]">Sin actividad complementaria registrada para este día.</p>
            ) : (
              <div className="space-y-1.5 print:space-y-0.5">
                {d.complementaryActivities.map((ca: any, idx: number) => (
                  <div key={idx} className="border-l-2 border-teal-800 pl-2 print:pl-1.5">
                    <p className="font-bold text-xs print:text-[8.5px] text-black">
                      <span className="text-teal-900">[{ca.programArea}]</span> {ca.activityName}
                    </p>
                    {ca.purpose && (
                      <p className="text-[11px] print:text-[8px] text-gray-800"><strong>Propósito:</strong> {ca.purpose}</p>
                    )}
                    {ca.description && (
                      <p className="text-[11px] print:text-[8px] text-gray-700">{ca.description}</p>
                    )}
                    {ca.sourceReference && (
                      <p className="text-[10px] print:text-[7px] text-gray-600">Fuente: {ca.sourceReference}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      if (bId === 'mat') {
        return (
          <div key="mat" data-testid="section-materiales" className="mb-3 print:mb-1.5">
            <h3 className="text-sm print:text-[9.5px] font-bold bg-gray-200 text-black p-1 uppercase border-b border-black mb-1 print:mb-0.5">
              Materiales requeridos para las Actividades Pedagógicas
            </h3>
            {uniqueMaterials.length > 0 ? (
              <p className="text-xs print:text-[8.5px] text-black">{uniqueMaterials.join(', ')}</p>
            ) : (
              <p className="text-black italic text-xs print:text-[9px]">Sin materiales registrados para este día.</p>
            )}
          </div>
        );
      }

      if (bId === 'practices') {
        const practices = d.prioritizedPractices || [];
        return (
          <div key="practices" data-testid="section-practicas" className="mb-3 print:mb-1.5">
            <h3 className="text-sm print:text-[9.5px] font-bold bg-gray-200 text-black p-1 uppercase border-b border-black mb-1 print:mb-0.5">
              Práctica(s) Priorizada(s) a implementar
            </h3>
            {practices.length > 0 ? (
              <div className="space-y-1 print:space-y-0.5">
                {practices.map((p: any, idx: number) => (
                  <p key={idx} className="text-xs print:text-[8.5px] text-black leading-snug">
                    {p.practiceName}
                  </p>
                ))}
              </div>
            ) : (
              <div className="min-h-[16px] print:min-h-[12px]" />
            )}
          </div>
        );
      }

      if (bId === 'sigs') {
        return (
          <div key="sigs" data-testid="section-firmas" className="direct-anverso-signatures mt-4 print:mt-2.5">
            <div className="grid grid-cols-2 gap-12 text-center pt-2 border-t-2 border-black">
              <div>
                <div className="border-b border-black mb-1 mx-8 h-8 print:h-6"></div>
                <p className="font-bold text-black text-xs print:text-[9.5px]">Educadora</p>
                <p className="text-gray-600 text-[11px] print:text-[8px]">Nombre y firma</p>
              </div>
              <div>
                <div className="border-b border-black mb-1 mx-8 h-8 print:h-6"></div>
                <p className="font-bold text-black text-xs print:text-[9.5px]">Oficial de Puericultura</p>
                <p className="text-gray-600 text-[11px] print:text-[8px]">Nombre y Firma</p>
              </div>
            </div>

            <div data-testid="section-footer-note" className="mt-2.5 print:mt-1.5 text-[9.5px] print:text-[7.5px] text-gray-500 space-y-0.5">
              <p>Se podrán utilizar los formatos que sean necesarios para la descripción detallada de actividades.</p>
              <p>Nota: El lenguaje empleado en el presente documento no busca generar distinción alguna entre hombres y mujeres, por lo que las referencias o alusiones en la redacción hechas a un género representan a ambos sexos.</p>
            </div>
          </div>
        );
      }

      return null;
    };
    return (
      <div className="bg-white font-serif w-full text-black">
        <div className="print:hidden mb-8 flex justify-between items-center p-6 bg-surface-soft border border-border-default rounded-xl max-w-5xl mx-auto">
          <button onClick={onBack} className="text-text-muted hover:text-text-primary font-bold px-6 py-3 rounded-full hover:bg-gray-200 transition text-lg">← Volver</button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold bg-teal-50 text-teal-800 px-3 py-1 rounded-full uppercase tracking-widest border border-teal-200">Vista previa institucional</span>
            {!measurementFailed && (
              <button onClick={() => {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write('<html><head><title>Imprimir Planeación</title>');
                    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join('');
                    printWindow.document.write(styles);
                    printWindow.document.write('<style>@page { size: letter; margin: 0; } @media print { html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; width: 215.9mm !important; } #printable-document-root { padding: 0 !important; margin: 0 !important; width: 215.9mm !important; max-width: 215.9mm !important; } .direct-daily-document { width: 215.9mm !important; box-sizing: border-box !important; } .direct-anverso-page, .direct-reverso-page { width: 215.9mm !important; min-height: 279.4mm !important; box-sizing: border-box !important; padding: 15mm !important; break-after: page; page-break-after: always; background: #ffffff !important; } .direct-reverso-table { width: 100% !important; border-collapse: collapse !important; } .direct-reverso-table thead { display: table-header-group !important; } .direct-reverso-table tr { break-inside: avoid !important; page-break-inside: avoid !important; } .direct-anverso-activity { break-inside: avoid !important; page-break-inside: avoid !important; } .direct-anverso-signatures { break-inside: avoid !important; page-break-inside: avoid !important; } }</style>');
                    printWindow.document.write('</head><body class="bg-white">');
                    const root = document.getElementById('printable-document-root');
                    printWindow.document.write(root ? root.outerHTML : '');
                    printWindow.document.write('</body></html>');
                    printWindow.document.close();
                    printWindow.focus();
                    setTimeout(() => { printWindow.print(); }, 1000);
                    printWindow.onafterprint = () => { printWindow.close(); };
                }
              }} className="bg-gray-900 hover:bg-black text-white font-bold px-10 py-4 rounded-full shadow-sm text-lg transition">Imprimir PDF</button>
            )}
          </div>
        </div>

        {/* OFFSCREEN MEASUREMENT SANDBOX WITH EXACT PRINT CLASSES */}
        <div
          data-testid="direct-measurement-sandbox"
          className="direct-measurement-sandbox bg-white font-serif text-black"
          style={{
            position: 'absolute',
            left: '-99999px',
            top: '-99999px',
            width: '185.9mm',
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          <div id="direct-measurement-ruler" style={{ width: '100mm', height: '100mm', padding: 0, margin: 0 }} />
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: letter;
            margin: 0;
          }
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              width: 215.9mm !important;
            }
            #printable-document-root {
              padding: 0 !important;
              margin: 0 !important;
              width: 215.9mm !important;
              max-width: 215.9mm !important;
            }
            .direct-daily-document {
              width: 215.9mm !important;
              box-sizing: border-box !important;
            }
            .direct-anverso-page,
            .direct-reverso-page {
              width: 215.9mm !important;
              min-height: 279.4mm !important;
              box-sizing: border-box !important;
              padding: 15mm !important;
              break-after: page;
              page-break-after: always;
              background: #ffffff !important;
            }
            .direct-reverso-table {
              width: 100% !important;
              border-collapse: collapse !important;
            }
            .direct-reverso-table thead {
              display: table-header-group !important;
            }
            .direct-reverso-table tr {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            .direct-anverso-activity {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
            .direct-anverso-signatures {
              break-inside: avoid !important;
              page-break-inside: avoid !important;
            }
          }
        `}} />

        {measurementFailed ? (
          <div
            data-testid="print-measurement-error"
            className="bg-red-50 border-2 border-red-500 p-6 rounded-xl text-red-900 font-bold text-center max-w-2xl mx-auto my-12"
          >
            <p className="text-xl mb-2">⚠️ Error de preparación de impresión</p>
            <p className="text-base">
              No fue posible preparar la paginación segura del documento. Intenta generar nuevamente la versión de impresión.
            </p>
          </div>
        ) : (
          <div id="printable-document-root" className="bg-white max-w-5xl mx-auto print:max-w-none print:w-full p-16 print:p-0 border border-border-default print:border-none print:shadow-none shadow-sm rounded-lg print:rounded-none space-y-16 print:space-y-0 print:m-0">
            {plan.days.map((d: any) => {
              const dayLabel = daySpanishNames[d.dayOfWeek] || d.dayOfWeek;
              const composedPages = getComposedAnversoPages(d);

              const dayRefs = (d.activities || []).flatMap((a: any) => a.curricularTraceability || []);
              const selectedPdaIds = new Set(dayRefs.map((r: any) => r.pdaId));

              // 19 PDA on Page 1 (Lenguajes 11 + Saberes 8)
              const pdaGroup1 = DIRECT_PDA_CATALOG.slice(0, 19);
              // 21 PDA on Page 2 (Ética 8 + De lo Humano 13)
              const pdaGroup2 = DIRECT_PDA_CATALOG.slice(19, 40);

              return (
                <div key={d.dayOfWeek} className="direct-daily-document" data-testid={`direct-day-${d.dayOfWeek}`}>
                  {/* --- DIRECT ANVERSO --- */}
                  <div className="direct-anverso-group" data-testid={`direct-anverso-${d.dayOfWeek}`}>
                    {composedPages.map((page) => (
                      <div
                        key={page.pageNumber}
                        className="direct-anverso-page mb-16 print:mb-0 border-b-2 print:border-none pb-12 print:pb-0"
                        data-testid={`direct-anverso-${d.dayOfWeek}-p${page.pageNumber}`}
                      >
                        {page.hasContinuationHeader && (
                          <div className="border-b-2 border-black pb-2 mb-4 flex justify-between items-end">
                            <div>
                              <h2 className="text-xl print:text-base font-bold text-black tracking-tight">
                                Planeación de Actividades Pedagógicas<br/>
                                <span className="text-sm print:text-xs font-normal text-gray-700">(Anverso — continuación)</span>
                              </h2>
                              <p className="text-xs print:text-[10px] text-gray-700 uppercase tracking-widest font-bold">Código: 3D11-009-003</p>
                            </div>
                            <div className="text-right">
                              <span className="text-xs print:text-[10px] font-bold uppercase tracking-wider text-gray-700">
                                {dayLabel} — {officialRoomName}
                              </span>
                            </div>
                          </div>
                        )}
                        {page.blockIds.map((bId) => (
                          <React.Fragment key={bId}>
                            {renderAnversoBlock(bId, d, dayLabel, officialRoomName)}
                          </React.Fragment>
                        ))}
                      </div>
                    ))}
                  </div>

                  {/* --- DIRECT REVERSO (EXPLICIT TWO-PAGE CANONICAL SPLIT) --- */}
                  <div className="direct-reverso-group print:break-after-page" data-testid={`direct-reverso-${d.dayOfWeek}`}>
                    {/* REVERSO PAGE 1 (19 PDA: Lenguajes 11 + Saberes 8) */}
                    <div
                      className="direct-reverso-page direct-reverso-p1 mb-16 print:mb-0 print:pt-0 border-b-4 print:border-none pb-12 print:pb-0"
                      data-testid={`direct-reverso-${d.dayOfWeek}-p1`}
                    >
                      <div className="border-b-4 border-black pb-8 mb-8 flex justify-between items-end print:pb-2 print:mb-3">
                        <div>
                          <h1 className="text-4xl print:text-xl font-bold text-black mb-1 tracking-tight">
                            Planeación de Actividades Pedagógicas<br/>
                            <span className="text-2xl print:text-sm">(Reverso)</span>
                          </h1>
                          <p className="text-lg print:text-sm text-gray-700 uppercase tracking-widest font-bold">Código: 3D11-009-003</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm print:text-xs font-bold uppercase tracking-wider text-gray-700">
                            {dayLabel}
                          </span>
                        </div>
                      </div>

                      <div className="mb-6 print:mb-3">
                        <h3 className="text-xl print:text-xs font-bold bg-gray-200 text-black p-2 uppercase border-b-2 border-black mb-4">
                          Elementos curriculares del Programa Sintético de la Fase 1 para educación inicial
                        </h3>
                      </div>

                      {renderPdaTable(pdaGroup1, selectedPdaIds)}
                    </div>

                    {/* REVERSO PAGE 2 (21 PDA: Ética 8 + De lo Humano 13) */}
                    <div
                      className="direct-reverso-page direct-reverso-p2 mb-16 print:mb-0 print:pt-0 border-b-4 print:border-none pb-12 print:pb-0"
                      data-testid={`direct-reverso-${d.dayOfWeek}-p2`}
                    >
                      <div className="border-b-2 border-black pb-4 mb-4 flex justify-between items-end print:pb-1.5 print:mb-2">
                        <div>
                          <h1 className="text-2xl print:text-base font-bold text-black mb-0.5 tracking-tight">
                            Planeación de Actividades Pedagógicas<br/>
                            <span className="text-lg print:text-xs font-normal text-gray-700">(Reverso — continuación)</span>
                          </h1>
                          <p className="text-sm print:text-[10px] text-gray-700 uppercase tracking-widest font-bold">Código: 3D11-009-003</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm print:text-xs font-bold uppercase tracking-wider text-gray-700">
                            {dayLabel}
                          </span>
                        </div>
                      </div>

                      {renderPdaTable(pdaGroup2, selectedPdaIds)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

    // INDIRECT VIEW (AUTHORITATIVE DAILY PAIR COMPOSITION DPES/CG/2020/PDG/04)
    const daySpanishNames: Record<string, string> = {
      MONDAY: 'Lunes 24',
      TUESDAY: 'Martes 25',
      WEDNESDAY: 'Miércoles 26',
      THURSDAY: 'Jueves 27',
      FRIDAY: 'Viernes 28',
    };

    return (
      <div className="bg-white font-serif w-full text-black">
        <div className="print:hidden mb-8 flex justify-between items-center p-6 bg-surface-soft border border-border-default rounded-xl max-w-5xl mx-auto">
          <button onClick={onBack} className="text-text-muted hover:text-text-primary font-bold px-6 py-3 rounded-full hover:bg-gray-200 transition text-lg">← Volver</button>
          <div className="flex items-center gap-4">
            <span className="text-sm font-bold bg-teal-50 text-teal-800 px-3 py-1 rounded-full uppercase tracking-widest border border-teal-200">Vista previa institucional</span>
            <button onClick={() => {
              const printWindow = window.open('', '_blank');
              if (printWindow) {
                  printWindow.document.write('<html><head><title>Imprimir Planeación</title>');
                  const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).map(s => s.outerHTML).join('');
                  printWindow.document.write(styles);
                  printWindow.document.write('<style>@page { size: letter; margin: 0; } @media print { html, body { margin: 0 !important; padding: 0 !important; background: #ffffff !important; width: 215.9mm !important; } #printable-document-root { padding: 0 !important; margin: 0 !important; width: 215.9mm !important; max-width: 215.9mm !important; } .indirect-daily-document { width: 215.9mm !important; box-sizing: border-box !important; } .indirect-anverso-page, .indirect-reverso-page { width: 215.9mm !important; min-height: 279.4mm !important; height: 279.4mm !important; box-sizing: border-box !important; padding: 15mm !important; break-after: page; page-break-after: always; background: #ffffff !important; overflow: hidden; } }</style>');
                  printWindow.document.write('</head><body class="bg-white">');
                  const root = document.getElementById('printable-document-root');
                  printWindow.document.write(root ? root.outerHTML : '');
                  printWindow.document.write('</body></html>');
                  printWindow.document.close();
                  printWindow.focus();
                  setTimeout(() => { printWindow.print(); }, 1000); printWindow.onafterprint = () => { printWindow.close(); };
              }
            }} className="bg-gray-900 hover:bg-black text-white font-bold px-10 py-4 rounded-full shadow-sm text-lg transition">Imprimir PDF</button>
          </div>
        </div>

        <style dangerouslySetInnerHTML={{ __html: `
          @page {
            size: letter;
            margin: 0;
          }
          @media print {
            html, body {
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              width: 215.9mm !important;
            }
            #printable-document-root {
              padding: 0 !important;
              margin: 0 !important;
              width: 215.9mm !important;
              max-width: 215.9mm !important;
            }
            .indirect-daily-document {
              width: 215.9mm !important;
              box-sizing: border-box !important;
            }
            .indirect-anverso-page,
            .indirect-reverso-page {
              width: 215.9mm !important;
              min-height: 279.4mm !important;
              height: 279.4mm !important;
              box-sizing: border-box !important;
              padding: 15mm !important;
              break-after: page;
              page-break-after: always;
              background: #ffffff !important;
              overflow: hidden;
            }
          }
        `}} />

        <div id="printable-document-root" className="bg-white max-w-5xl mx-auto print:max-w-none print:w-full p-16 print:p-0 border border-border-default print:border-none print:shadow-none shadow-sm rounded-lg print:rounded-none space-y-16 print:space-y-0 print:m-0">
          {plan.days.map((d: any) => {
            const dayLabel = daySpanishNames[d.dayOfWeek] || d.dayOfWeek;
            return (
              <div key={d.dayOfWeek} className="indirect-daily-document" data-testid={`indirect-day-${d.dayOfWeek}`}>
                {/* ========================================================================= */}
                {/* DAILY ANVERSO                                                             */}
                {/* ========================================================================= */}
                <div
                  className="indirect-anverso-page mb-16 print:mb-0 pb-12 print:pb-0"
                  data-testid="indirect-anverso-page"
                  data-day={d.dayOfWeek}
                >
                  {/* Title & Institutional identity */}
                  <div className="border-b-2 border-black pb-2 mb-3 print:pb-1.5 print:mb-2 flex justify-between items-start">
                    <div>
                      <p className="font-bold text-base print:text-xs text-black tracking-tight leading-tight uppercase font-sans">
                        Instituto Mexicano del Seguro Social
                      </p>
                      <p className="text-xs print:text-[9px] text-gray-700 tracking-wider uppercase font-sans">
                        Seguridad y Solidaridad Social
                      </p>
                    </div>
                    <div className="text-right">
                      <h1 className="text-xl print:text-sm font-bold text-black leading-tight tracking-tight">
                        Planeación de Acciones Pedagógicas<br/>
                        <span className="text-sm print:text-xs font-normal text-gray-700">(Anverso)</span>
                      </h1>
                      <p className="text-xs print:text-[10px] text-gray-700 font-bold uppercase tracking-wider mt-0.5">
                        {dayLabel}
                      </p>
                    </div>
                  </div>

                  {/* Context & Foundation Header: Left: Vertical Stack / Right: Referentes box */}
                  <div className="grid grid-cols-2 gap-4 items-start mb-3 print:mb-2">
                    {/* LEFT: Identification fields stacked vertically */}
                    <div className="direct-anverso-ident-stack space-y-1.5 text-xs print:text-[9.5px]">
                      <div data-testid="indirect-ident-field-guarderia" className="flex items-baseline gap-2">
                        <span className="font-bold text-black whitespace-nowrap">Guardería No.:</span>
                        <span className="border-b border-black flex-grow font-semibold text-black px-2 pb-0.5">
                          {plan?.daycareId === FIRST_LIGHT_G002_DAYCARE_ID ? 'Guardería 002' : 'Guardería IMSS Demo (001)'}
                        </span>
                      </div>
                      <div data-testid="indirect-ident-field-sala" className="flex items-baseline gap-2">
                        <span className="font-bold text-black whitespace-nowrap">Sala de atención o Grupo:</span>
                        <span className="border-b border-black flex-grow font-semibold text-black px-2 pb-0.5">
                          {officialRoomName}
                        </span>
                      </div>
                      <div data-testid="indirect-ident-field-periodo" className="flex items-baseline gap-2">
                        <span className="font-bold text-black whitespace-nowrap">Periodo:</span>
                        <span className="border-b border-black flex-grow font-semibold text-black px-2 pb-0.5 flex justify-between">
                          <span>24 al 28 de agosto de 2026</span>
                          <span className="uppercase text-gray-700 font-bold ml-2">({dayLabel})</span>
                        </span>
                      </div>
                    </div>

                    {/* RIGHT: Fixed institutional Referentes box */}
                    <div data-testid="indirect-referentes-curriculares" className="border border-black p-2 bg-gray-50/50">
                      <h4 className="font-bold text-[10px] print:text-[8px] uppercase border-b border-black pb-1 mb-1 text-black">
                        Referentes curriculares: Aprendizajes clave para niños de 0 a 3 años de edad
                      </h4>
                      <ul className="list-disc pl-4 text-[9px] print:text-[7.5px] text-black leading-tight space-y-0.5">
                        <li>Establecer vínculos afectivos y apegos seguros</li>
                        <li>Construir una base de seguridad y confianza en sí mismo y en los otros, que favorezca el desarrollo de un psiquismo sano</li>
                        <li>Desarrollar autonomía y autorregulación crecientes</li>
                        <li>Desarrollar la curiosidad, la exploración, la imaginación y la creatividad</li>
                        <li>Acceder al lenguaje en un sentido pleno, comunicacional y creador</li>
                        <li>Descubrir en los libros y la lectura el gozo y la riqueza de la ficción</li>
                        <li>Descubrir el propio cuerpo desde la libertad de movimiento y la expresividad motriz</li>
                        <li>Convivir con otros y compartir el aprendizaje, el juego, el arte y la cultura</li>
                      </ul>
                    </div>
                  </div>

                  {/* Official section bar: Planeación */}
                  <div data-testid="indirect-planeacion-bar" className="bg-gray-200 border-y border-black py-0.5 px-2 mb-2 text-center font-bold uppercase text-xs print:text-[10px] tracking-wider text-black">
                    Planeación
                  </div>

                  {/* Main Planning Area Box (STRICTLY THIS DAY ONLY) */}
                  <div data-testid="indirect-anverso-content" className="border border-black p-2.5 print:p-2 mb-2 print:mb-1.5 space-y-2.5 print:space-y-1.5">
                    <div>
                      <h3 className="font-bold text-xs print:text-[9.5px] uppercase text-black mb-1">
                        Observaciones de los niños:
                      </h3>
                      <p className="text-xs print:text-[9px] text-black leading-snug">
                        {plan.observations || 'N/A'}
                      </p>
                    </div>

                    <div className="border-t border-black pt-2 print:pt-1">
                      <h3 className="font-bold text-xs print:text-[9.5px] uppercase text-black mb-1.5">
                        Planteamiento de acciones pedagógicas (propuesta, organización y desarrollo):
                      </h3>
                      {(!d.activities || d.activities.length === 0) ? (
                        <p className="text-black italic text-xs print:text-[8.5px]">Pendiente de planeación.</p>
                      ) : (
                        <div className="space-y-1.5 print:space-y-1">
                          {d.activities.map((a: any) => (
                            <div key={a.activityId}>
                              <p className="font-bold text-xs print:text-[8.5px] text-black">
                                {a.objective} <span className="font-bold">({a.durationMinutes} min)</span>
                              </p>
                              <p className="text-black text-xs print:text-[8px] font-normal leading-tight whitespace-pre-line">
                                {a.description}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Formatting notice, code, and legal note */}
                  <div className="mt-2 print:mt-1 flex justify-between items-start text-[9.5px] print:text-[7.5px] text-gray-700">
                    <p data-testid="indirect-formatting-notice">
                      Se podrán utilizar los formatos que sean necesarios para la descripción detallada de actividades.
                    </p>
                    <p data-testid="indirect-anverso-code" className="font-bold text-black uppercase tracking-wider text-xs print:text-[9.5px] whitespace-nowrap ml-4">
                      DPES/CG/2020/PDG/04
                    </p>
                  </div>
                  <div data-testid="indirect-legal-note" className="mt-1 text-[9px] print:text-[7px] text-gray-500">
                    <p>
                      Nota: El lenguaje empleado en el presente documento no busca generar distinción alguna entre hombres y mujeres, por lo que las referencias o alusiones en la redacción hechas a un género representan a ambos sexos.
                    </p>
                  </div>
                </div>

                {/* ========================================================================= */}
                {/* DAILY REVERSO                                                             */}
                {/* ========================================================================= */}
                <div
                  className="indirect-reverso-page mb-16 print:mb-0 pb-12 print:pb-0"
                  data-testid="indirect-reverso-page"
                  data-day={d.dayOfWeek}
                >
                  {/* Title & Institutional identity */}
                  <div className="border-b-2 border-black pb-2 mb-3 print:pb-1.5 print:mb-2 flex justify-between items-start">
                    <div>
                      <p className="font-bold text-base print:text-xs text-black tracking-tight leading-tight uppercase font-sans">
                        Instituto Mexicano del Seguro Social
                      </p>
                      <p className="text-xs print:text-[9px] text-gray-700 tracking-wider uppercase font-sans">
                        Seguridad y Solidaridad Social
                      </p>
                    </div>
                    <div className="text-right">
                      <h1 className="text-xl print:text-sm font-bold text-black leading-tight tracking-tight">
                        Planeación de Acciones Pedagógicas<br/>
                        <span className="text-sm print:text-xs font-normal text-gray-700">(Reverso)</span>
                      </h1>
                      <p className="text-xs print:text-[10px] text-gray-700 font-bold uppercase tracking-wider mt-0.5">
                        {dayLabel}
                      </p>
                    </div>
                  </div>

                  {/* Section bar: Planeación (continúa) */}
                  <div data-testid="indirect-reverso-planeacion-continua" className="bg-gray-200 border-y border-black py-0.5 px-2 mb-2 text-center font-bold uppercase text-xs print:text-[10px] tracking-wider text-black">
                    Planeación (continúa)
                  </div>

                  {/* Section: Evaluación: (STRICTLY THIS DAY ONLY) */}
                  <div data-testid="indirect-section-evaluacion" className="mb-3 print:mb-2">
                    <h3 className="text-sm print:text-[9.5px] font-bold bg-gray-200 text-black p-1 uppercase border-b border-black mb-1">
                      Evaluación:
                    </h3>
                    <div className="border border-black p-2 min-h-[50px] print:min-h-[35px] text-xs print:text-[9px] text-black">
                      {d.evaluation ? (
                        <p className="text-black">{d.evaluation}</p>
                      ) : (
                        <p className="italic text-gray-700">Espacio para la evaluación posterior a la implementación.</p>
                      )}
                    </div>
                  </div>

                  {/* Section: Actividades complementarias de otros programas (STRICTLY THIS DAY ONLY) */}
                  <div data-testid="indirect-section-complementarias" className="mb-3 print:mb-2">
                    <h3 className="text-sm print:text-[9.5px] font-bold bg-gray-200 text-black p-1 uppercase border-b border-black mb-1">
                      Actividades complementarias de otros programas
                    </h3>
                    <div className="border border-black p-2 min-h-[50px] print:min-h-[35px] text-xs print:text-[9px] text-black">
                      {(!d.complementaryActivities || d.complementaryActivities.length === 0) ? (
                        <p className="text-black italic text-xs print:text-[8.5px]">Sin actividad complementaria registrada para este día.</p>
                      ) : (
                        <div className="space-y-1">
                          {d.complementaryActivities.map((ca: any, idx: number) => (
                            <div key={idx} className="pl-2 border-l-2 border-teal-800 ml-1">
                              <p className="font-bold text-xs print:text-[8.5px] text-black">
                                <span className="text-teal-900">[{ca.programArea}]</span> {ca.activityName}
                              </p>
                              {ca.purpose && (
                                <p className="text-[11px] print:text-[8px] text-gray-800"><strong>Propósito:</strong> {ca.purpose}</p>
                              )}
                              {ca.description && (
                                <p className="text-[11px] print:text-[8px] text-gray-700">{ca.description}</p>
                              )}
                              {ca.sourceReference && (
                                <p className="text-[10px] print:text-[7px] text-gray-600">Fuente: {ca.sourceReference}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Section: Materiales para ambientes de aprendizaje (STRICTLY THIS DAY ONLY) */}
                  <div data-testid="indirect-section-materiales" className="mb-3 print:mb-2">
                    <h3 className="text-sm print:text-[9.5px] font-bold bg-gray-200 text-black p-1 uppercase border-b border-black mb-1">
                      Materiales para ambientes de aprendizaje
                    </h3>
                    <div className="border border-black p-2 min-h-[50px] print:min-h-[35px] text-xs print:text-[9px] text-black">
                      {(() => {
                        const dayMaterials = (d.activities || []).flatMap((a: any) => a.materials || []).filter(Boolean);
                        const uniqueMat = Array.from(new Set(dayMaterials));
                        if (uniqueMat.length > 0) {
                          return <p className="text-black">{uniqueMat.join(', ')}</p>;
                        }
                        return <p className="italic text-gray-700">Sin materiales planeados para este día.</p>;
                      })()}
                    </div>
                  </div>

                  {/* Signatures Block: Educadora/Coordinadora... & Asistente educativa */}
                  <div data-testid="indirect-section-firmas" className="mt-8 print:mt-6">
                    <div className="grid grid-cols-2 gap-12 text-center pt-4 border-t-2 border-black">
                      <div>
                        <div className="border-b border-black mb-1 mx-8 h-10 print:h-8"></div>
                        <p className="font-bold text-black text-xs print:text-[9.5px]">
                          Educadora/Coordinadora del área para apoyo terapéutico
                        </p>
                        <p className="text-gray-600 text-[11px] print:text-[8px]">
                          Nombre y firma
                        </p>
                      </div>
                      <div>
                        <div className="border-b border-black mb-1 mx-8 h-10 print:h-8"></div>
                        <p className="font-bold text-black text-xs print:text-[9.5px]">
                          Asistente educativa
                        </p>
                        <p className="text-gray-600 text-[11px] print:text-[8px]">
                          Nombre y Firma
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };
