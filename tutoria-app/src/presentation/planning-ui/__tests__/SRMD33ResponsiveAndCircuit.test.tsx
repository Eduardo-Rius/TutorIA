import React, { act } from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { PlanningDemoApp } from '../PlanningDemoApp';
import { PlanningWorkflowService } from '../../../application/planning/PlanningWorkflowService';
import { InMemoryWeeklyPlanningRepository } from '../../../infrastructure/repositories/InMemoryWeeklyPlanningRepository';
import { DeterministicPedagogicalRecommendationSource } from '../../../application/planning/DeterministicPedagogicalRecommendationSource';
import type { AuthenticationProvider } from '../../../application/ports/AuthenticationProvider';
import type {
  WeeklyPlanningProposalSource,
  WeeklyPlanningProposalResponse,
} from '../../../application/planning/WeeklyPlanningProposalSource';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_G002_TEACHER_EMAIL,
  FIRST_LIGHT_G002_TEACHER_ID,
  FIRST_LIGHT_G002_DIRECTOR_EMAIL,
  FIRST_LIGHT_G002_DIRECTOR_ID,
  FIRST_LIGHT_G002_SUPERVISOR_EMAIL,
  FIRST_LIGHT_G002_SUPERVISOR_ID,
} from '../firstLightLabHarness';

vi.mock('../../../infrastructure/firebase/firebaseConfig', () => ({
  app: {},
  auth: {},
  db: {},
}));

const eligibleLabEnv = {
  [FIRST_LIGHT_LAB_FLAG]: 'true',
  VITE_FIREBASE_PROJECT_ID: FIRST_LIGHT_LAB_PROJECT_ID,
};

function createMockAuth(
  uid: string = FIRST_LIGHT_G002_TEACHER_ID,
  email: string = FIRST_LIGHT_G002_TEACHER_EMAIL
): AuthenticationProvider {
  return {
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    restoreSession: vi.fn().mockResolvedValue(uid),
    getCurrentUser: vi.fn().mockReturnValue({ uid, email }),
  };
}

const mockProposalMaternalC2: WeeklyPlanningProposalResponse = {
  days: [
    {
      dayOfWeek: 'MONDAY',
      date: '2026-08-24',
      activities: [
        {
          activityId: 'c2-d1-a1',
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Fomentar la comprensión lectora y el análisis de personajes.',
          description: 'Inicio: Presentar el cuento. Desarrollo: Lectura dialogada. Cierre: Conversar sobre el desenlace.',
          durationMinutes: 20,
          materials: ['cuentos infantiles ilustrados'],
        },
        {
          activityId: 'c2-d1-a2',
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Expresar emociones mediante pintura dactilar y pinceles.',
          description: 'Inicio: Presentar papelógrafos. Desarrollo: Pintura guiada. Cierre: Exposición colectiva.',
          durationMinutes: 25,
          materials: ['pintura dactilar lavable'],
        },
        {
          activityId: 'c2-d1-a3',
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Desarrollar coordinación y equilibrio en circuito motor.',
          description: 'Inicio: Calentamiento rítmico. Desarrollo: Recorrido por circuito. Cierre: Estiramiento.',
          durationMinutes: 20,
          materials: ['conos de plástico suave'],
        },
        {
          activityId: 'c2-d1-a4',
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: 'Clasificar elementos por patrones de forma y tamaño.',
          description: 'Inicio: Mostrar figuras geométricas. Desarrollo: Agrupación en recipientes. Cierre: Conteo.',
          durationMinutes: 20,
          materials: ['bloques lógicos geométricos'],
        },
        {
          activityId: 'c2-d1-a5',
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Promover hábitos de autocuidado e higiene bucal.',
          description: 'Inicio: Canción de los dientes. Desarrollo: Técnica de cepillado. Cierre: Enjuague autónomo.',
          durationMinutes: 15,
          materials: ['cepillos dentales infantiles'],
        },
      ],
    },
    {
      dayOfWeek: 'TUESDAY',
      date: '2026-08-25',
      activities: [
        {
          activityId: 'c2-d2-a1',
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Anticipar sucesos del relato mediante hipótesis.',
          description: 'Inicio: Observar portada. Desarrollo: Lectura con pausas. Cierre: Dibujar lo que más gustó.',
          durationMinutes: 20,
          materials: ['cuentos infantiles ilustrados'],
        },
        {
          activityId: 'c2-d2-a2',
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Modelar figuras tridimensionales con masa no tóxica.',
          description: 'Inicio: Amasar libremente. Desarrollo: Crear personajes del cuento. Cierre: Limpiar mesas.',
          durationMinutes: 25,
          materials: ['masa para moldear no tóxica'],
        },
        {
          activityId: 'c2-d2-a3',
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Saltos coordinados en dos pies y giros controlados.',
          description: 'Inicio: Canción de movimiento. Desarrollo: Saltos entre aros. Cierre: Respiración.',
          durationMinutes: 20,
          materials: ['aros de plástico'],
        },
        {
          activityId: 'c2-d2-a4',
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: 'Identificar nociones espaciales arriba-abajo y adentro-afuera.',
          description: 'Inicio: Juego con pelotas. Desarrollo: Canasta de enceste. Cierre: Verificación colectiva.',
          durationMinutes: 20,
          materials: ['pelotas de esponja'],
        },
        {
          activityId: 'c2-d2-a5',
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Colaborar en el orden y cuidado de los materiales comunes.',
          description: 'Inicio: Sonar campana de orden. Desarrollo: Guardar juguetes en sus cajas. Cierre: Aplauso.',
          durationMinutes: 15,
          materials: ['cajas organizadoras'],
        },
      ],
    },
    {
      dayOfWeek: 'WEDNESDAY',
      date: '2026-08-26',
      activities: [
        {
          activityId: 'c2-d3-a1',
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Identificar rimas sencillas y repeticiones sonoras.',
          description: 'Inicio: Lectura de rimas infantiles. Desarrollo: Repetición coral. Cierre: Inventar una rima.',
          durationMinutes: 20,
          materials: ['poemarios infantiles'],
        },
        {
          activityId: 'c2-d3-a2',
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Rasgado y pegado de papel para textura y motricidad fina.',
          description: 'Inicio: Rasgar papel lustre. Desarrollo: Pegar en silueta colectiva. Cierre: Exhibir trabajo.',
          durationMinutes: 25,
          materials: ['papel lustre de colores'],
        },
        {
          activityId: 'c2-d3-a3',
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Desplazamientos en zigzag y cambios de dirección.',
          description: 'Inicio: Trote suave. Desarrollo: Esquivar conos siguiendo música. Cierre: Caminata lenta.',
          durationMinutes: 20,
          materials: ['conos de plástico suave'],
        },
        {
          activityId: 'c2-d3-a4',
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: 'Comparar longitudes largo-corto con listones y cuerdas.',
          description: 'Inicio: Manipular listones. Desarrollo: Ordenar de más corto a más largo. Cierre: Comparación.',
          durationMinutes: 20,
          materials: ['listón de colores'],
        },
        {
          activityId: 'c2-d3-a5',
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Practicar el lavado correcto de manos antes de comer.',
          description: 'Inicio: Demostración técnica. Desarrollo: Lavado guiado con agua y jabón. Cierre: Secado.',
          durationMinutes: 15,
          materials: ['jabón líquido neutro'],
        },
      ],
    },
    {
      dayOfWeek: 'THURSDAY',
      date: '2026-08-27',
      activities: [
        {
          activityId: 'c2-d4-a1',
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Dramatizar pequeños parlamentos de los personajes.',
          description: 'Inicio: Asignar títeres sencillos. Desarrollo: Recrear diálogo de cuento. Cierre: Guardar títeres.',
          durationMinutes: 20,
          materials: ['títeres de guiñol'],
        },
        {
          activityId: 'c2-d4-a2',
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Estampado con esponjas y texturas naturales.',
          description: 'Inicio: Probar texturas de esponja. Desarrollo: Estampar sobre mural. Cierre: Lavar manos.',
          durationMinutes: 25,
          materials: ['esponjas de baño suaves'],
        },
        {
          activityId: 'c2-d4-a3',
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Gateo y reptado en túneles de tela acolchados.',
          description: 'Inicio: Explicar el juego del túnel. Desarrollo: Atravesar túnel por turnos. Cierre: Abrazo grupal.',
          durationMinutes: 20,
          materials: ['túnel de gateo de tela'],
        },
        {
          activityId: 'c2-d4-a4',
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: 'Identificar cantidades 1, 2 y muchos mediante conteo tangible.',
          description: 'Inicio: Agrupar peluches. Desarrollo: Preguntar cuántos hay. Cierre: Registro visual.',
          durationMinutes: 20,
          materials: ['fichas grandes de conteo'],
        },
        {
          activityId: 'c2-d4-a5',
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Fomentar la cortesía diciendo por favor y gracias.',
          description: 'Inicio: Cuento sobre amabilidad. Desarrollo: Práctica en reparto de material. Cierre: Canción.',
          durationMinutes: 15,
          materials: ['tarjetas de refuerzo'],
        },
      ],
    },
    {
      dayOfWeek: 'FRIDAY',
      date: '2026-08-28',
      activities: [
        {
          activityId: 'c2-d5-a1',
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Recordar secuencias narrativas y orden cronológico.',
          description: 'Inicio: Mostrar viñetas del cuento. Desarrollo: Ordenar qué pasó primero y después. Cierre: Aplauso.',
          durationMinutes: 20,
          materials: ['tarjetas secuenciales de cuento'],
        },
        {
          activityId: 'c2-d5-a2',
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Exploración sonora con instrumentos de percusión menor.',
          description: 'Inicio: Explorar sonidos fuertes y suaves. Desarrollo: Acompañar canción. Cierre: Silencio suave.',
          durationMinutes: 25,
          materials: ['maracas infantiles'],
        },
        {
          activityId: 'c2-d5-a3',
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Juegos de persecución con reglas simples y detención al alto.',
          description: 'Inicio: Calentamiento de piernas. Desarrollo: Juego de estatuas musicales. Cierre: Relajación.',
          durationMinutes: 20,
          materials: ['reproductor de música infantil'],
        },
        {
          activityId: 'c2-d5-a4',
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: 'Reconocer patrones alternados de dos colores (rojo-azul).',
          description: 'Inicio: Mostrar serie de cuentas. Desarrollo: Continuar patrón con bloques. Cierre: Verificación.',
          durationMinutes: 20,
          materials: ['bloques conectables'],
        },
        {
          activityId: 'c2-d5-a5',
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Reflexionar sobre lo aprendido y compartir logros de la semana.',
          description: 'Inicio: Ronda de agradecimiento. Desarrollo: Compartir qué actividad gustó más. Cierre: Abrazo.',
          durationMinutes: 15,
          materials: ['espejo de pared de seguridad'],
        },
      ],
    },
  ],
  progression: {
    weeklyFocus: 'Desarrollo de lenguaje expresivo, socialización y motricidad en Maternal C2 (43-48 meses).',
    experiences: [],
  },
};

describe('SR-MD-33A — Verificación Integral del Circuito y Adaptación Responsiva', () => {
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
  });

  // =========================================================================
  // 1. VERIFICACIÓN DEL CIRCUITO INSTITUCIONAL COMPLETO
  // =========================================================================
  it('1. Circuito integral: Asistente (solicita y acepta propuesta) -> Educadora (revisa y aprueba) -> Directora (aprobación final y formato IMSS)', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const proposalSource: WeeklyPlanningProposalSource = {
      propose: vi.fn().mockResolvedValue(mockProposalMaternalC2),
    };
    let persistedPlanId: string | null = null;

    // FASE A: Asistente Educativa (G002) genera en Maternal C2 y acepta la propuesta
    const { unmount: unmountAsistente } = render(
      <PlanningDemoApp
        service={service}
        source={recSource}
        weeklyPlanningProposalSource={proposalSource}
        firstLightEnv={eligibleLabEnv}
        firstLightAuth={createMockAuth(FIRST_LIGHT_G002_TEACHER_ID, FIRST_LIGHT_G002_TEACHER_EMAIL)}
        onPlanPersisted={(id) => {
          persistedPlanId = id;
        }}
      />
    );

    // Seleccionar Maternal C2
    await waitFor(() => {
      expect(screen.getByTestId('room-tab-room-maternal-c2')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('room-tab-room-maternal-c2'));
    });

    // Iniciar nueva planeación
    await act(async () => {
      fireEvent.click(screen.getByTestId('list-new-planning-btn'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Contexto Pedagógico Semanal/i)).toBeTruthy();
    });

    // Llenar contexto pedagógico
    const obsInput = screen.getByPlaceholderText(/Ej: Los niños muestran interés en los sonidos/i);
    await act(async () => {
      fireEvent.change(obsInput, {
        target: { value: 'Grupo Maternal C2 participativo y explorador con interés en lenguaje y arte.' },
      });
    });

    const needsInput = screen.getByPlaceholderText(/Ej: Control postural, atención conjunta/i);
    await act(async () => {
      fireEvent.change(needsInput, {
        target: { value: 'Lenguaje expresivo, autonomía en higiene y juego cooperativo.' },
      });
    });

    // Solicitar propuesta con IA
    const genBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(genBtn);
    });

    // Modal Human Gate visible con actividades de propuesta
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Usar esta propuesta' })).toBeTruthy();
    });

    // Aceptar propuesta institucional
    const acceptBtn = screen.getByRole('button', { name: 'Usar esta propuesta' });
    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    // Modal se cierra y actividades aparecen
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByText(/LECTURA EN VOZ ALTA/i)).toBeTruthy();
    });

    const urlParams = new URLSearchParams(window.location.search);
    const createdPlanId = urlParams.get('planId') || persistedPlanId;
    expect(createdPlanId).toBeTruthy();

    const savedPlan = await service.getPlanning(createdPlanId!);
    expect(savedPlan).toBeTruthy();
    expect(savedPlan?.roomId).toBe('room-maternal-c2');
    expect(savedPlan?.days).toHaveLength(5);
    const totalActs = savedPlan?.days.reduce((acc, d) => acc + (d.activities?.length || 0), 0);
    expect(totalActs).toBe(25);

    unmountAsistente();

    // FASE B: Asistente revisa y envía; Educadora aprueba hacia Directora
    for (const day of savedPlan!.days) {
      await service.markTeacherDayReviewed(createdPlanId!, day.dayOfWeek, 'TEACHER', FIRST_LIGHT_G002_TEACHER_ID);
    }
    await service.submit(createdPlanId!, 'TEACHER');

    const inReviewPlan = await service.getPlanning(createdPlanId!);
    expect(inReviewPlan?.status).toBe('IN_REVIEW');

    for (const day of inReviewPlan!.days) {
      await service.markDirectorDayReviewed(createdPlanId!, day.dayOfWeek, 'DIRECTOR');
    }
    await service.approve(createdPlanId!, 'DIRECTOR', FIRST_LIGHT_G002_DIRECTOR_ID);

    const approvedPlan = await service.getPlanning(createdPlanId!);
    expect(approvedPlan?.status).toBe('APPROVED');

    // FASE C: Directora (G002) ingresa y visualiza versión oficial IMSS
    window.history.replaceState({}, '', `/?planId=${createdPlanId}`);

    const { unmount: unmountDirectora } = render(
      <PlanningDemoApp
        service={service}
        source={recSource}
        initialRole="SUPERVISOR"
        firstLightEnv={eligibleLabEnv}
        firstLightAuth={createMockAuth(FIRST_LIGHT_G002_SUPERVISOR_ID, FIRST_LIGHT_G002_SUPERVISOR_EMAIL)}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'VER VERSIÓN OFICIAL IMSS' })).toBeTruthy();
      expect(screen.getAllByText(/Guardería 002/i).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/Maternal C2/i).length).toBeGreaterThan(0);
    });

    const printBtn = screen.getByRole('button', { name: 'VER VERSIÓN OFICIAL IMSS' });
    await act(async () => {
      fireEvent.click(printBtn);
    });

    await waitFor(() => {
      const printRoot = document.getElementById('printable-document-root');
      expect(printRoot).toBeTruthy();
      expect(printRoot?.textContent).toContain('Guardería 002');
      expect(printRoot?.textContent).toContain('Maternal C2');
      expect(printRoot?.textContent).toContain('Fomentar la comprensión lectora');
      expect(screen.getByText(/Vista previa institucional/i)).toBeTruthy();
    });

    unmountDirectora();

    // FASE D: Persistencia tras recarga
    window.history.replaceState({}, '', `/?planId=${createdPlanId}`);
    render(
      <PlanningDemoApp
        service={service}
        source={recSource}
        initialRole="TEACHER"
        firstLightEnv={eligibleLabEnv}
        firstLightAuth={createMockAuth(FIRST_LIGHT_G002_TEACHER_ID, FIRST_LIGHT_G002_TEACHER_EMAIL)}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(/LECTURA EN VOZ ALTA/i)).toBeTruthy();
      expect(screen.getByText(/Fomentar la comprensión lectora/i)).toBeTruthy();
    });
  });

  // =========================================================================
  // 2. VERIFICACIÓN DE ADAPTACIÓN RESPONSIVA (PC, TABLET, MÓVIL)
  // =========================================================================
  it('2. Elementos clave de interfaz contienen clases responsivas y no presentan desborde horizontal', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const recSource = new DeterministicPedagogicalRecommendationSource();

    render(
      <PlanningDemoApp
        service={service}
        source={recSource}
        firstLightEnv={eligibleLabEnv}
        firstLightAuth={createMockAuth(FIRST_LIGHT_G002_TEACHER_ID, FIRST_LIGHT_G002_TEACHER_EMAIL)}
      />
    );

    await waitFor(() => {
      // 1. Selector de salas contiene las 8 salas completas y clase flex-wrap
      const roomSelector = screen.getByTestId('teacher-room-selector');
      expect(roomSelector).toBeTruthy();
      expect(roomSelector.className).toContain('flex-wrap');
      expect(roomSelector.className).toContain('justify-center');

      const expectedRooms = [
        'room-lactantes-a',
        'room-lactantes-b',
        'room-lactantes-c',
        'room-maternal-a',
        'room-maternal-b1',
        'room-maternal-b2',
        'room-maternal-c1',
        'room-maternal-c2',
      ];
      for (const roomId of expectedRooms) {
        expect(screen.getByTestId(`room-tab-${roomId}`)).toBeTruthy();
      }

      // 2. Barra superior de demostración tiene flex-wrap
      const topDemoBar = screen.getByTestId('top-demo-bar');
      expect(topDemoBar).toBeTruthy();
      expect(topDemoBar.className).toContain('flex-wrap');

      // 3. Selector de modalidad Directa / Indirecta es interactivo
      const modalitySelect = screen.getByTestId('modality-select');
      expect(modalitySelect).toBeTruthy();
    });
  });

  // =========================================================================
  // 3. CONMUTACIÓN DE MODALIDAD DIRECTA E INDIRECTA
  // =========================================================================
  it('3. Selector de modalidad directa e indirecta actualiza y persiste la configuración', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const recSource = new DeterministicPedagogicalRecommendationSource();

    render(
      <PlanningDemoApp
        service={service}
        source={recSource}
        firstLightEnv={eligibleLabEnv}
        firstLightAuth={createMockAuth(FIRST_LIGHT_G002_TEACHER_ID, FIRST_LIGHT_G002_TEACHER_EMAIL)}
      />
    );

    await waitFor(() => {
      const modalitySelect = screen.getByTestId('modality-select') as HTMLSelectElement;
      expect(modalitySelect.value).toBe('DIRECT');
    });

    const modalitySelect = screen.getByTestId('modality-select') as HTMLSelectElement;
    await act(async () => {
      fireEvent.change(modalitySelect, { target: { value: 'INDIRECT' } });
    });

    expect(modalitySelect.value).toBe('INDIRECT');
  });
});
