import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import {
  PlanningDemoApp,
  getScopedSelectedRoomKey,
  getUrlParams,
} from '../PlanningDemoApp';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import { WeeklyPlanning } from '../../../domain/planning/WeeklyPlanning';
import { RoomCatalog, Room } from '../../../domain/planning/RoomCatalog';
import { PedagogicalAgePolicyCatalog } from '../../../domain/planning/PedagogicalAgePolicy';
import {
  WeeklyPlanningProposalSource,
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
} from '../../../application/planning/WeeklyPlanningProposalSource';
import { AuthenticationProvider } from '../../../application/ports/AuthenticationProvider';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_DAYCARE_ID,
  FIRST_LIGHT_ROOM_ID,
} from '../firstLightLabHarness';

describe('MASTER ARB — SR-MD-25B: Habilitar Lactantes C en la Interfaz de TutorIA', () => {
  const ROOM_A_ID = 'room-lactantes-a';
  const ROOM_B_ID = 'room-lactantes-b';
  const ROOM_C_ID = 'room-lactantes-c';
  const CURRENT_DATE = '2026-08-24';

  const defaultFirstLightEnv = {
    [FIRST_LIGHT_LAB_FLAG]: 'true',
    VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
  };

  const createMockAuth = (uid: string = FIRST_LIGHT_TEACHER_ID): AuthenticationProvider => ({
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(uid),
    getCurrentUser: vi.fn().mockReturnValue(uid),
  });

  const sampleProposal: WeeklyPlanningProposalResponse = {
    days: [
      {
        dayOfWeek: 'MONDAY',
        activities: [
          { category: 'Actividades de Exploración y Movimiento', objective: 'Exploración motriz activa 13-18m', description: 'Caminar sobre superficies variadas', durationMinutes: 15, materials: ['Cojines firmes'] },
          { category: 'Actividades Sensoriales y Cognitivas', objective: 'Manipulación de objetos encajables', description: 'Insertar figuras de madera', durationMinutes: 15, materials: ['Cajas con formas'] },
          { category: 'Actividades de Lenguaje y Comunicación', objective: 'Lectura en voz alta', description: 'Lectura interactiva de libro cartoné', durationMinutes: 15, materials: ['Libro de cartón rígido'] },
          { category: 'Actividades de Coordinación y Destreza', objective: 'Apilar bloques de madera', description: 'Construir torres pequeñas', durationMinutes: 15, materials: ['Cubos grandes'] },
          { category: 'Actividades de Integración y Cierre', objective: 'Cierre con música suave', description: 'Respiración y relajación en colchoneta', durationMinutes: 10, materials: ['Colchoneta firme'] },
        ],
      },
      {
        dayOfWeek: 'TUESDAY',
        activities: [
          { category: 'Actividades de Exploración y Movimiento', objective: 'Desplazamiento autónomo', description: 'Pasar bajo arcos acolchados', durationMinutes: 15, materials: ['Arcos de espuma'] },
          { category: 'Actividades Sensoriales y Cognitivas', objective: 'Exploración de texturas', description: 'Tocar telas suaves y ásperas', durationMinutes: 15, materials: ['Telas variadas'] },
          { category: 'Actividades de Lenguaje y Comunicación', objective: 'Canciones con gestos', description: 'Cantar señalando partes del cuerpo', durationMinutes: 15, materials: ['Voz humana'] },
          { category: 'Actividades de Coordinación y Destreza', objective: 'Pinza gruesa', description: 'Tomar pelotas medianas', durationMinutes: 15, materials: ['Pelotas blandas'] },
          { category: 'Actividades de Integración y Cierre', objective: 'Despedida rítmica', description: 'Mecer suavemente al ritmo de música', durationMinutes: 10, materials: ['Manta suave'] },
        ],
      },
      {
        dayOfWeek: 'WEDNESDAY',
        activities: [
          { category: 'Actividades de Exploración y Movimiento', objective: 'Subir desniveles pequeños', description: 'Subir rampa baja de hule espuma', durationMinutes: 15, materials: ['Rampa de espuma'] },
          { category: 'Actividades Sensoriales y Cognitivas', objective: 'Búsqueda de objetos', description: 'Descubrir juguetes tapados', durationMinutes: 15, materials: ['Telas y juguetes'] },
          { category: 'Actividades de Lenguaje y Comunicación', objective: 'Nombrar objetos cotidianos', description: 'Mostrar y decir el nombre de objetos', durationMinutes: 15, materials: ['Objetos de la sala'] },
          { category: 'Actividades de Coordinación y Destreza', objective: 'Garabateo inicial', description: 'Rayar con crayones gruesos', durationMinutes: 15, materials: ['Crayones triangulares'] },
          { category: 'Actividades de Integración y Cierre', objective: 'Masaje de cierre', description: 'Masaje relajante en piernas', durationMinutes: 10, materials: ['Colchoneta'] },
        ],
      },
      {
        dayOfWeek: 'THURSDAY',
        activities: [
          { category: 'Actividades de Exploración y Movimiento', objective: 'Patear pelotas suaves', description: 'Impulsar pelotas con los pies', durationMinutes: 15, materials: ['Pelotas de trapo'] },
          { category: 'Actividades Sensoriales y Cognitivas', objective: 'Sonidos de instrumentos', description: 'Sacudir maracas medianas', durationMinutes: 15, materials: ['Maracas de madera'] },
          { category: 'Actividades de Lenguaje y Comunicación', objective: 'Cuento rimado', description: 'Lectura con entonación variada', durationMinutes: 15, materials: ['Libro ilustrado'] },
          { category: 'Actividades de Coordinación y Destreza', objective: 'Vaciar y llenar recipientes', description: 'Colocar tapas dentro de una canasta', durationMinutes: 15, materials: ['Canasta plástica'] },
          { category: 'Actividades de Integración y Cierre', objective: 'Integración grupal suave', description: 'Ronda sentados en círculo', durationMinutes: 10, materials: ['Tapete'] },
        ],
      },
      {
        dayOfWeek: 'FRIDAY',
        activities: [
          { category: 'Actividades de Exploración y Movimiento', objective: 'Circuito psicomotriz libre', description: 'Recorrido con túneles de tela', durationMinutes: 15, materials: ['Túnel de tela'] },
          { category: 'Actividades Sensoriales y Cognitivas', objective: 'Descubrimiento táctil', description: 'Bolsas sensoriales selladas', durationMinutes: 15, materials: ['Bolsas sensoriales'] },
          { category: 'Actividades de Lenguaje y Comunicación', objective: 'Juegos de imitación vocal', description: 'Repetición de sonidos de animales', durationMinutes: 15, materials: ['Títeres de mano'] },
          { category: 'Actividades de Coordinación y Destreza', objective: 'Ensartar aros grandes', description: 'Colocar aros sobre poste', durationMinutes: 15, materials: ['Juguete de aros'] },
          { category: 'Actividades de Integración y Cierre', objective: 'Cierre semanal', description: 'Canción de despedida de la semana', durationMinutes: 10, materials: ['Música ambiental'] },
        ],
      },
    ],
  };

  const createMockProposalSource = (): WeeklyPlanningProposalSource & { propose: ReturnType<typeof vi.fn> } => ({
    propose: vi.fn().mockResolvedValue(sampleProposal),
  });

  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', '/');
    }
    vi.restoreAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
    sessionStorage.clear();
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState({}, '', '/');
    }
  });

  const setupEnvironment = async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const pedSource = new DeterministicPedagogicalRecommendationSource();
    const mockAuth = createMockAuth(FIRST_LIGHT_TEACHER_ID);
    const mockProposalSource = createMockProposalSource();

    // Plan en Lactantes A
    const planA = WeeklyPlanning.create('plan-la-01', FIRST_LIGHT_DAYCARE_ID, ROOM_A_ID, FIRST_LIGHT_TEACHER_ID, '2026-08-24', '2026-08-28');
    planA.status = 'APPROVED';
    await repo.save(planA);

    // Plan en Lactantes B
    const planB = WeeklyPlanning.create('plan-lb-01', FIRST_LIGHT_DAYCARE_ID, ROOM_B_ID, FIRST_LIGHT_TEACHER_ID, '2026-08-24', '2026-08-28');
    planB.status = 'APPROVED';
    await repo.save(planB);

    // Plan en Lactantes C
    const planC = WeeklyPlanning.create('plan-lc-01', FIRST_LIGHT_DAYCARE_ID, ROOM_C_ID, FIRST_LIGHT_TEACHER_ID, '2026-08-24', '2026-08-28');
    planC.status = 'APPROVED';
    await repo.save(planC);

    return { repo, service, pedSource, mockAuth, mockProposalSource, planA, planB, planC };
  };

  it('1. El selector SALA muestra simultáneamente y en orden: Lactantes A | Lactantes B | Lactantes C', async () => {
    const { service, pedSource, mockAuth } = await setupEnvironment();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    // Verificar que el contenedor del selector esté presente
    const selector = await screen.findByTestId('teacher-room-selector');
    expect(selector).toBeDefined();

    // Las 3 pestañas deben estar presentes y visibles
    const tabA = screen.getByTestId('room-tab-room-lactantes-a');
    const tabB = screen.getByTestId('room-tab-room-lactantes-b');
    const tabC = screen.getByTestId('room-tab-room-lactantes-c');

    expect(tabA).toBeDefined();
    expect(tabB).toBeDefined();
    expect(tabC).toBeDefined();

    expect(tabA.textContent).toBe('Lactantes A');
    expect(tabB.textContent).toBe('Lactantes B');
    expect(tabC.textContent).toBe('Lactantes C');

    // Estado inicial por defecto: Lactantes A seleccionado
    expect(tabA.className).toContain('bg-brand-primary');
    expect(tabB.className).not.toContain('bg-brand-primary');
    expect(tabC.className).not.toContain('bg-brand-primary');
  });

  it('2. Al seleccionar Lactantes C se actualiza la sala activa a room-lactantes-c (13 a 18 meses) y la identidad institucional', async () => {
    const { service, pedSource, mockAuth } = await setupEnvironment();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    // Clic en pestaña Lactantes C
    const tabC = await screen.findByTestId('room-tab-room-lactantes-c');
    await act(async () => {
      fireEvent.click(tabC);
    });

    // Identidad institucional para Lactantes C
    expect(screen.getByText('Asistente Educativa LC')).toBeDefined();
    expect(screen.getByText('Asistente Educativa · Lactantes C')).toBeDefined();

    // La pestaña Lactantes C queda visualmente activa
    expect(tabC.className).toContain('bg-brand-primary');

    // Aislamiento de planeaciones: sólo se muestra el plan de Lactantes C
    expect(screen.getByTestId('planning-card-plan-lc-01')).toBeDefined();
    expect(screen.queryByTestId('planning-card-plan-la-01')).toBeNull();
    expect(screen.queryByTestId('planning-card-plan-lb-01')).toBeNull();

    // Persistencia en URL y Storage
    expect(getUrlParams().roomId).toBe(ROOM_C_ID);
    const scopedKey = getScopedSelectedRoomKey(FIRST_LIGHT_TEACHER_ID, FIRST_LIGHT_DAYCARE_ID);
    expect(sessionStorage.getItem(scopedKey)).toBe(ROOM_C_ID);
    expect(localStorage.getItem(scopedKey)).toBe(ROOM_C_ID);
  });

  it('3. Persistencia de sala seleccionada: refrescar la interfaz (remount) mantiene Lactantes C activo', async () => {
    const { service, pedSource, mockAuth } = await setupEnvironment();

    // Simulamos que el usuario tenía seleccionada la sala Lactantes C
    window.history.replaceState({}, '', `/?roomId=${ROOM_C_ID}`);
    const scopedKey = getScopedSelectedRoomKey(FIRST_LIGHT_TEACHER_ID, FIRST_LIGHT_DAYCARE_ID);
    sessionStorage.setItem(scopedKey, ROOM_C_ID);

    const initialRender = render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByTestId('teacher-room-selector');
    expect(screen.getByText('Asistente Educativa LC')).toBeDefined();
    expect(screen.getByTestId('room-tab-room-lactantes-c').className).toContain('bg-brand-primary');

    // Remount simulando F5
    initialRender.unmount();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    await screen.findByTestId('teacher-room-selector');
    expect(screen.getByText('Asistente Educativa LC')).toBeDefined();
    expect(screen.getByTestId('room-tab-room-lactantes-c').className).toContain('bg-brand-primary');
    await screen.findByTestId('planning-card-plan-lc-01');
  });

  it('4. Abre el espacio de planeación de Lactantes C y expone el botón «Ayúdame con TutorIA (Generar Semana)»', async () => {
    const { service, pedSource, mockAuth, mockProposalSource } = await setupEnvironment();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        weeklyPlanningProposalSource={mockProposalSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    // 1. Cambiar a Lactantes C
    const tabC = await screen.findByTestId('room-tab-room-lactantes-c');
    await act(async () => {
      fireEvent.click(tabC);
    });

    // 2. Clic en Nueva planeación
    const newBtn = screen.getByTestId('list-new-planning-btn');
    await act(async () => {
      fireEvent.click(newBtn);
    });

    // 3. Confirmar que estamos en el espacio de planeación de Lactantes C
    expect(screen.getByText('Asistente Educativa · Lactantes C')).toBeDefined();

    // 4. Llenar observaciones pedagógicas para habilitar el botón de generación
    const obsTextarea = screen.getByPlaceholderText(/Ej: Los niños muestran interés en los sonidos/i);
    await act(async () => {
      fireEvent.change(obsTextarea, { target: { value: 'Grupo activo de 13 a 18 meses explorando marcha independiente.' } });
    });

    // 5. El botón «Ayúdame con TutorIA (Generar Semana)» está presente y habilitado
    const generateBtn = screen.getByText(/✨ Ayúdame con TutorIA \(Generar Semana\)/i);
    expect(generateBtn).toBeDefined();
    expect((generateBtn as HTMLButtonElement).disabled).toBe(false);

    // 6. Al hacer clic, se envía la solicitud con la sala y política correspondiente a Lactantes C
    await act(async () => {
      fireEvent.click(generateBtn);
    });

    expect(mockProposalSource.propose).toHaveBeenCalledTimes(1);
    const req: WeeklyPlanningProposalRequest = mockProposalSource.propose.mock.calls[0][0];

    expect(req.room).toBeDefined();
    expect(req.room.roomId).toBe(ROOM_C_ID);
    expect(req.room.name).toBe('Lactantes C');
    expect(req.room.minAgeMonths).toBe(13);
    expect(req.room.maxAgeMonths).toBe(18);

    // Política pedagógica institucional para Lactantes C
    const policy = PedagogicalAgePolicyCatalog.getPolicyForRoom(req.room);
    expect(policy).toBeDefined();
    expect(policy?.roomType).toBe('LACTANTES_C');
    expect(PedagogicalAgePolicyCatalog.isAiGenerationAuthorized('LACTANTES_C')).toBe(true);

    // 7. Human Gate: Modal de revisión presente con propuesta semanal completa
    expect(screen.getByText('Revisar propuesta de TutorIA')).toBeDefined();
  });

  it('5. Las opciones de Lactantes A y Lactantes B continúan 100% operativas y alternables', async () => {
    const { service, pedSource, mockAuth } = await setupEnvironment();

    render(
      <PlanningDemoApp
        service={service}
        source={pedSource}
        firstLightEnv={defaultFirstLightEnv}
        firstLightAuth={mockAuth}
        currentDate={CURRENT_DATE}
      />
    );

    // Inicia en Lactantes A
    await screen.findByTestId('teacher-room-selector');
    expect(screen.getByText('Asistente Educativa LA')).toBeDefined();
    await screen.findByTestId('planning-card-plan-la-01');

    // Cambiar a Lactantes B
    const tabB = screen.getByTestId('room-tab-room-lactantes-b');
    await act(async () => {
      fireEvent.click(tabB);
    });
    expect(screen.getByText('Asistente Educativa LB')).toBeDefined();
    await screen.findByTestId('planning-card-plan-lb-01');
    expect(screen.queryByTestId('planning-card-plan-la-01')).toBeNull();

    // Cambiar a Lactantes C
    const tabC = screen.getByTestId('room-tab-room-lactantes-c');
    await act(async () => {
      fireEvent.click(tabC);
    });
    expect(screen.getByText('Asistente Educativa LC')).toBeDefined();
    await screen.findByTestId('planning-card-plan-lc-01');
    expect(screen.queryByTestId('planning-card-plan-lb-01')).toBeNull();

    // Regresar a Lactantes A
    const tabA = screen.getByTestId('room-tab-room-lactantes-a');
    await act(async () => {
      fireEvent.click(tabA);
    });
    expect(screen.getByText('Asistente Educativa LA')).toBeDefined();
    await screen.findByTestId('planning-card-plan-la-01');
    expect(screen.queryByTestId('planning-card-plan-lc-01')).toBeNull();
  });

  it('6. Compatibilidad hacia atrás: reconoce el identificador histórico lactantes-c y lo resuelve a Lactantes C', () => {
    const historicalRoom = RoomCatalog.getRoom('lactantes-c');
    expect(historicalRoom).toBeDefined();
    expect(historicalRoom?.roomId).toBe('lactantes-c');
    expect(historicalRoom?.name).toBe('Lactantes C');
    expect(historicalRoom?.minAgeMonths).toBe(13);
    expect(historicalRoom?.maxAgeMonths).toBe(18);

    const canonicalRoom = RoomCatalog.getRoom('room-lactantes-c');
    expect(canonicalRoom).toBeDefined();
    expect(canonicalRoom?.roomId).toBe('room-lactantes-c');
    expect(canonicalRoom?.name).toBe('Lactantes C');
    expect(canonicalRoom?.minAgeMonths).toBe(13);
    expect(canonicalRoom?.maxAgeMonths).toBe(18);
  });
});
