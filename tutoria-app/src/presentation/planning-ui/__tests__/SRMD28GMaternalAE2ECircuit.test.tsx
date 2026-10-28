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
  WeeklyPlanningProposalRequest,
  WeeklyPlanningProposalResponse,
} from '../../../application/planning/WeeklyPlanningProposalSource';
import {
  FIRST_LIGHT_LAB_FLAG,
  FIRST_LIGHT_LAB_PROJECT_ID,
  FIRST_LIGHT_ANITA_EMAIL,
  FIRST_LIGHT_TEACHER_ID,
  FIRST_LIGHT_DAYCARE_ID,
  FIRST_LIGHT_G002_DAYCARE_ID,
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

// Propuesta real generada por OpenAI en LAB (SR-MD-28F) con 25 actividades
const realOpenAIProposalMaternalA: WeeklyPlanningProposalResponse = {
  days: [
    {
      dayOfWeek: 'MONDAY',
      date: '2026-08-24',
      activities: [
        {
          activityId: 'exp-d1-a1',
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Favorecer la atención compartida y el reconocimiento de personajes.',
          description:
            'Inicio: Preparar el entorno afectivo y presentar el cuento "¿Dónde está Spot?" de Eric Hill, permitiendo que los niños toquen el libro. Desarrollo: Leer el cuento con entonación, haciendo pausas para que los niños anticipen los giros de página. Cierre: Celebrar la lectura con aplausos y guardar el libro juntos. Adaptaciones: Permitir que los niños exploren el libro a su ritmo, ofreciendo apoyo si es necesario.',
          durationMinutes: 15,
          materials: ['cuentos infantiles de cartón grueso'],
        },
        {
          activityId: 'exp-d1-a2',
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Estimular la creatividad y la expresión a través del juego simbólico.',
          description:
            'Inicio: Presentar los muñecos de tela y crear un ambiente de juego. Desarrollo: Invitar a los niños a acunar y cuidar a los muñecos, modelando acciones de cuidado. Cierre: Celebrar el juego con una canción sobre el cuidado. Adaptaciones: Ofrecer apoyo a los niños que prefieran observar antes de participar.',
          durationMinutes: 20,
          materials: ['muñecos de tela'],
        },
        {
          activityId: 'exp-d1-a3',
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Fomentar la marcha autónoma y la coordinación motriz.',
          description:
            'Inicio: Preparar un espacio seguro con colchonetas. Desarrollo: Invitar a los niños a caminar sobre las colchonetas, alternando ritmos lentos y rápidos, y sortear pequeños obstáculos. Cierre: Aplaudir y celebrar los logros de los niños. Adaptaciones: Sostener la mano de los niños que necesiten apoyo en su marcha.',
          durationMinutes: 15,
          materials: ['colchonetas limpias'],
        },
        {
          activityId: 'exp-d1-a4',
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: 'Estimular la clasificación y el reconocimiento de formas.',
          description:
            'Inicio: Presentar los bloques grandes. Desarrollo: Invitar a los niños a clasificar los bloques por color o forma, modelando la acción. Cierre: Juntos, guardar los bloques en un lugar designado. Adaptaciones: Ofrecer bloques más grandes a quienes necesiten apoyo en la prensión.',
          durationMinutes: 15,
          materials: ['bloques grandes de plástico lavable'],
        },
        {
          activityId: 'exp-d1-a5',
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Fomentar hábitos de higiene y cuidado personal.',
          description:
            'Inicio: Preparar el lavabo infantil y el ambiente. Desarrollo: Guiar a los niños en el lavado de manos, cantando una canción de higiene. Cierre: Celebrar el lavado de manos con aplausos. Adaptaciones: Permitir que los niños jueguen con agua en sus manos antes de usar el jabón.',
          durationMinutes: 10,
          materials: ['lavabo o tarja infantil para hábitos de higiene'],
        },
      ],
    },
    {
      dayOfWeek: 'TUESDAY',
      date: '2026-08-25',
      activities: [
        {
          activityId: 'exp-d2-a1',
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Estimular la comprensión y la participación verbal.',
          description:
            'Inicio: Invitar a los niños a sentarse en círculo y mostrar la portada de "¿Dónde está Spot?" de Eric Hill. Desarrollo: Leer haciendo preguntas sencillas sobre los personajes y los lugares donde se esconde Spot. Cierre: Concluir con un juego de imitación de los sonidos de los animales. Adaptaciones: Repetir preguntas clave de manera personalizada.',
          durationMinutes: 15,
          materials: ['cuentos infantiles de cartón grueso'],
        },
        {
          activityId: 'exp-d2-a2',
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Promover la empatía y el juego colaborativo.',
          description:
            'Inicio: Presentar los muñecos de tela y recipientes con alimentos de juguete. Desarrollo: Invitar a los niños a alimentar a los muñecos usando cucharas de juguete, modelando turnos para compartir los utensilios. Cierre: Cantar una canción sobre la comida y ordenar juntos los platos. Adaptaciones: Facilitar cucharas más grandes a quienes requieran apoyo.',
          durationMinutes: 20,
          materials: ['muñecos de tela', 'platos y cucharas de plástico infantil'],
        },
        {
          activityId: 'exp-d2-a3',
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Consolidar la marcha autónoma y el equilibrio.',
          description:
            'Inicio: Colocar colchonetas y pequeños bloques de hule espuma. Desarrollo: Guiar a los niños a pasar por encima de las colchonetas y rodear los bloques caminando a paso firme. Cierre: Respiración suave sentados en la colchoneta. Adaptaciones: Ofrecer apoyo corporal a quien muestre inseguridad.',
          durationMinutes: 15,
          materials: ['colchonetas limpias'],
        },
        {
          activityId: 'exp-d2-a4',
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: 'Favorecer nociones espaciales dentro y fuera.',
          description:
            'Inicio: Presentar canastas y pelotas suaves. Desarrollo: Invitar a los niños a meter y sacar pelotas de las canastas, verbalizando "adentro" y "afuera". Cierre: Celebrar con aplausos al guardar la última pelota. Adaptaciones: Acercar la canasta a nivel del suelo para facilitar el alcance.',
          durationMinutes: 15,
          materials: ['pelotas suaves y canastas plásticas'],
        },
        {
          activityId: 'exp-d2-a5',
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Promover la autonomía en el secado de manos.',
          description:
            'Inicio: Acudir al área de higiene. Desarrollo: Practicar tomar su toalla individual y frotar las manos después del lavado, guiados con una rima infantil. Cierre: Colocar la toalla en su gancho asignado. Adaptaciones: Guiar mano sobre mano si se requiere.',
          durationMinutes: 10,
          materials: ['toallas individuales limpias'],
        },
      ],
    },
    {
      dayOfWeek: 'WEDNESDAY',
      date: '2026-08-26',
      activities: [
        {
          activityId: 'exp-d3-a1',
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Fomentar la anticipación de la narrativa.',
          description:
            'Inicio: Abrir el cuento "¿Dónde está Spot?" de Eric Hill en la página favorita del grupo. Desarrollo: Invitar a señalar a Spot antes de levantar las solapas del libro, celebrando cada hallazgo. Cierre: Despedir a Spot guardando el libro en su librero accesible. Adaptaciones: Proporcionar apoyo para manipular solapas.',
          durationMinutes: 15,
          materials: ['cuentos infantiles de cartón grueso'],
        },
        {
          activityId: 'exp-d3-a2',
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Desarrollar coordinación visomotriz mediante el juego simbólico.',
          description:
            'Inicio: Disponer ropitas sencillas de tela con velcro para los muñecos. Desarrollo: Invitar a poner gorritos o capas a los muñecos, practicando unir y despegar el velcro. Cierre: Desfile de muñecos vestidos con una canción rítmica. Adaptaciones: Usar piezas de tela amplias sin cierres complejos.',
          durationMinutes: 20,
          materials: ['muñecos de tela', 'ropitas sencillas de tela'],
        },
        {
          activityId: 'exp-d3-a3',
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Explorar cambios de dirección y velocidad en la marcha.',
          description:
            'Inicio: Marcar líneas suaves en el piso con cinta de color. Desarrollo: Invitar a caminar siguiendo las líneas curvas y detenerse suavemente cuando la música pare. Cierre: Estiramiento relajado de brazos y piernas. Adaptaciones: Caminar en parejas tomados de un aro suave.',
          durationMinutes: 15,
          materials: ['cinta de papel no resbalosa', 'colchonetas limpias'],
        },
        {
          activityId: 'exp-d3-a4',
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: 'Experimentar nociones de tamaño grande y pequeño.',
          description:
            'Inicio: Presentar cajas de cartón de dos tamaños. Desarrollo: Invitar a comparar objetos grandes y pequeños, colocándolos en su caja correspondiente. Cierre: Tapar las cajas juntos con alegría. Adaptaciones: Trabajar con pares de objetos de contraste evidente.',
          durationMinutes: 15,
          materials: ['cajas y objetos de dos tamaños claramente diferenciados'],
        },
        {
          activityId: 'exp-d3-a5',
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Fomentar el orden cooperativo al concluir la jornada de juegos.',
          description:
            'Inicio: Tocar una campana suave que indica la hora de ordenar. Desarrollo: Clasificar materiales en contenedores rotulados con imágenes visuales. Cierre: Agradecer la ayuda mutua con un aplauso colectivo. Adaptaciones: Asignar un solo objeto por viaje para evitar sobrecarga.',
          durationMinutes: 10,
          materials: ['contenedores con etiquetas visuales'],
        },
      ],
    },
    {
      dayOfWeek: 'THURSDAY',
      date: '2026-08-27',
      activities: [
        {
          activityId: 'exp-d4-a1',
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Asociar palabras con ilustraciones.',
          description:
            'Inicio: Presentar el cuento "¿Dónde está Spot?" de Eric Hill junto con un peluche suave de perrito. Desarrollo: Vincular las acciones de Spot en el cuento con el peluche del grupo. Cierre: Acariciar suavemente al perrito y despedir la lectura. Adaptaciones: Permitir sostener el peluche durante la narración.',
          durationMinutes: 15,
          materials: ['cuentos infantiles de cartón grueso', 'peluche suave de perro'],
        },
        {
          activityId: 'exp-d4-a2',
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Fomentar la expresión empática en el juego de roles.',
          description:
            'Inicio: Colocar un botiquín de tela de juguete y muñecos. Desarrollo: Invitar a jugar al médico/enfermero curando raspaduras imaginarias con toallitas secas. Cierre: Guardar el botiquín cantando una melodía de salud. Adaptaciones: Modelar la caricia y el cuidado suave.',
          durationMinutes: 20,
          materials: ['muñecos de tela', 'botiquín de juguete de tela'],
        },
        {
          activityId: 'exp-d4-a3',
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Fortalecer marcha esquivando pequeños módulos acolchados.',
          description:
            'Inicio: Disponer módulos de espuma en el área libre. Desarrollo: Caminar en zig-zag sin tocar los módulos, ajustando el paso autónomo. Cierre: Relajación sentados sobre colchonetas. Adaptaciones: Guiar verbalmente cada cambio de dirección.',
          durationMinutes: 15,
          materials: ['módulos de psicomotricidad de espuma suave'],
        },
        {
          activityId: 'exp-d4-a4',
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: 'Estimular la construcción vertical y el equilibrio.',
          description:
            'Inicio: Presentar los bloques grandes. Desarrollo: Invitar a los niños a apilar los bloques y derribarlos, modelando la acción. Cierre: Juntos, guardar los bloques en un lugar designado. Adaptaciones: Ofrecer bloques más grandes a quienes necesiten apoyo en la prensión.',
          durationMinutes: 15,
          materials: ['bloques grandes de plástico lavable'],
        },
        {
          activityId: 'exp-d4-a5',
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Fomentar hábitos de higiene y cuidado personal.',
          description:
            'Inicio: Preparar el lavabo infantil y el ambiente. Desarrollo: Guiar a los niños en el cepillado dental, cantando una canción de higiene. Cierre: Celebrar el cepillado con aplausos. Adaptaciones: Permitir que los niños jueguen con el cepillo antes de usarlo.',
          durationMinutes: 10,
          materials: ['cepillos dentales infantiles'],
        },
      ],
    },
    {
      dayOfWeek: 'FRIDAY',
      date: '2026-08-28',
      activities: [
        {
          activityId: 'exp-d5-a1',
          category: 'LECTURA EN VOZ ALTA',
          objective: 'Favorecer la anticipación y el reconocimiento de personajes.',
          description:
            'Inicio: Preparar el entorno y presentar nuevamente el cuento "¿Dónde está Spot?" de Eric Hill. Desarrollo: Leer el cuento, enfatizando los sonidos de los animales y haciendo pausas para que los niños participen. Cierre: Celebrar la lectura con una canción relacionada. Adaptaciones: Permitir que los niños pasen las páginas del libro.',
          durationMinutes: 15,
          materials: ['cuentos infantiles de cartón grueso'],
        },
        {
          activityId: 'exp-d5-a2',
          category: 'EXPERIENCIAS ARTÍSTICAS',
          objective: 'Estimular la creatividad a través del juego simbólico.',
          description:
            'Inicio: Presentar los muñecos de tela. Desarrollo: Invitar a los niños a jugar a ser padres, modelando la acción de cuidar a los muñecos. Cierre: Celebrar el juego con una canción sobre el cuidado. Adaptaciones: Ofrecer apoyo a los niños que prefieran observar antes de participar.',
          durationMinutes: 20,
          materials: ['muñecos de tela'],
        },
        {
          activityId: 'exp-d5-a3',
          category: 'ACTIVACIÓN FÍSICA',
          objective: 'Fomentar la marcha autónoma y la coordinación motriz.',
          description:
            'Inicio: Preparar un espacio seguro con colchonetas. Desarrollo: Invitar a los niños a correr suavemente sobre las colchonetas, alternando ritmos lentos y rápidos. Cierre: Aplaudir y celebrar los logros de los niños. Adaptaciones: Sostener la mano de los niños que necesiten apoyo en su marcha.',
          durationMinutes: 15,
          materials: ['colchonetas limpias'],
        },
        {
          activityId: 'exp-d5-a4',
          category: 'PENSAMIENTO MATEMÁTICO',
          objective: 'Estimular la clasificación y el reconocimiento de formas.',
          description:
            'Inicio: Presentar los bloques grandes. Desarrollo: Invitar a los niños a clasificar los bloques por color, modelando la acción. Cierre: Juntos, guardar los bloques en un lugar designado. Adaptaciones: Ofrecer bloques más grandes a quienes necesiten apoyo en la prensión.',
          durationMinutes: 15,
          materials: ['bloques grandes de plástico lavable'],
        },
        {
          activityId: 'exp-d5-a5',
          category: 'AMBIENTES DE APRENDIZAJE',
          objective: 'Fomentar hábitos de higiene y cuidado personal.',
          description:
            'Inicio: Preparar el lavabo infantil y el ambiente. Desarrollo: Guiar a los niños en el lavado de manos, cantando una canción de higiene. Cierre: Celebrar el lavado de manos con aplausos. Adaptaciones: Permitir que los niños jueguen con agua en sus manos antes de usar el jabón.',
          durationMinutes: 10,
          materials: ['lavabo o tarja infantil para hábitos de higiene'],
        },
      ],
    },
  ],
  progression: {
    weeklyFocus:
      'Consolidación de la marcha autónoma, juego simbólico y hábitos de higiene en un entorno afectivo y seguro.',
    experiences: [],
  },
};

function createMockProposalSource(): WeeklyPlanningProposalSource {
  return {
    propose: vi.fn().mockResolvedValue(realOpenAIProposalMaternalA),
  };
}

describe('SR-MD-28G — Prueba Funcional E2E de Maternal A (19 a 24 meses)', () => {
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
  // 1. SELECTOR DE SALAS EN G001 Y G002
  // =========================================================================
  it('1. Maternal A aparece correctamente en el selector de salas conforme a autorizaciones', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const recSource = new DeterministicPedagogicalRecommendationSource();

    // Caso A: Guardería 001 (Anita)
    const { unmount } = render(
      <PlanningDemoApp
        service={service}
        source={recSource}
        firstLightEnv={eligibleLabEnv}
        firstLightAuth={createMockAuth(FIRST_LIGHT_TEACHER_ID, FIRST_LIGHT_ANITA_EMAIL)}
      />
    );

    await waitFor(() => {
      const roomSelector = screen.getByTestId('teacher-room-selector');
      expect(roomSelector).toBeTruthy();
      const maternalTab = screen.getByTestId('room-tab-room-maternal-a');
      expect(maternalTab).toBeTruthy();
      expect(maternalTab.textContent).toContain('Maternal A');
    });

    unmount();

    // Caso B: Guardería 002 (Asistente G002)
    render(
      <PlanningDemoApp
        service={service}
        source={recSource}
        firstLightEnv={eligibleLabEnv}
        firstLightAuth={createMockAuth(FIRST_LIGHT_G002_TEACHER_ID, FIRST_LIGHT_G002_TEACHER_EMAIL)}
      />
    );

    await waitFor(() => {
      const roomSelector = screen.getByTestId('teacher-room-selector');
      expect(roomSelector).toBeTruthy();
      const maternalTab = screen.getByTestId('room-tab-room-maternal-a');
      expect(maternalTab).toBeTruthy();
      expect(maternalTab.textContent).toContain('Maternal A');
    });
  });

  // =========================================================================
  // 2 A 8. CIRCUITO COMPLETO DE MATERNAL A:
  // Asistente (Gen 25 acts) -> Enviar -> Educadora (Observar & Devolver) ->
  // Asistente (Atender & Reenviar) -> Educadora (Aprobar) -> Directora (IMSS PDF) ->
  // Persistencia y Aislamiento G001/G002
  // =========================================================================
  it('2 a 8. Circuito E2E institucional completo: Generación OpenAI -> Enviar -> Observar -> Atender -> Aprobar -> Formato IMSS -> Persistencia y Aislamiento', async () => {
    const repo = new InMemoryWeeklyPlanningRepository();
    const service = new PlanningWorkflowService(repo);
    const recSource = new DeterministicPedagogicalRecommendationSource();
    const proposalSource = createMockProposalSource();
    let trackedPlanId: string | null = null;

    // -------------------------------------------------------------------------
    // PASO 2: Asistente Educativa genera con OpenAI y comprueba 25 actividades
    // -------------------------------------------------------------------------
    const { unmount: unmountAsistente1 } = render(
      <PlanningDemoApp
        service={service}
        source={recSource}
        weeklyPlanningProposalSource={proposalSource}
        firstLightEnv={eligibleLabEnv}
        firstLightAuth={createMockAuth(FIRST_LIGHT_G002_TEACHER_ID, FIRST_LIGHT_G002_TEACHER_EMAIL)}
        onPlanPersisted={(id) => {
          trackedPlanId = id;
        }}
      />
    );

    // Seleccionar la sala Maternal A en el selector de la Asistente
    await waitFor(() => {
      expect(screen.getByTestId('room-tab-room-maternal-a')).toBeTruthy();
    });

    await act(async () => {
      fireEvent.click(screen.getByTestId('room-tab-room-maternal-a'));
    });

    // Iniciar nueva planeación
    await act(async () => {
      fireEvent.click(screen.getByTestId('list-new-planning-btn'));
    });

    await waitFor(() => {
      expect(screen.getByText(/Contexto Pedagógico Semanal/i)).toBeTruthy();
    });

    // Llenar contexto pedagógico de 19–24 meses
    const obsInput = screen.getByPlaceholderText(/Ej: Los niños muestran interés en los sonidos/i);
    await act(async () => {
      fireEvent.change(obsInput, {
        target: {
          value: 'Niñas y niños de 19 a 24 meses consolidando marcha autónoma y hábitos de higiene.',
        },
      });
    });

    const needsInput = screen.getByPlaceholderText(/Ej: Control postural, atención conjunta/i);
    await act(async () => {
      fireEvent.change(needsInput, {
        target: {
          value: 'Lavado de manos, cepillado dental y juego simbólico.',
        },
      });
    });

    // Solicitar generación con OpenAI
    const genBtn = screen.getByText(/Ayúdame con TutorIA/i);
    await act(async () => {
      fireEvent.click(genBtn);
    });

    // Aparece el Human Gate con la propuesta de OpenAI
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeTruthy();
      expect(screen.getByRole('button', { name: 'Usar esta propuesta' })).toBeTruthy();
    });

    // Asistente acepta la propuesta
    const acceptBtn = screen.getByRole('button', { name: 'Usar esta propuesta' });
    await act(async () => {
      fireEvent.click(acceptBtn);
    });

    // Esperar a que se cierre el modal y se carguen las 25 actividades
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // Comprobar que las actividades de Maternal A y el cuento "¿Dónde está Spot?" de Eric Hill están en pantalla
    expect(screen.getByText(/LECTURA EN VOZ ALTA/i)).toBeTruthy();
    expect(screen.getByText(/Favorecer la atención compartida y el reconocimiento de personajes/i)).toBeTruthy();

    // Obtener el planId persistido desde la URL o el tracking de persistencia
    const urlParams = new URLSearchParams(window.location.search);
    const createdPlanId = urlParams.get('planId') || trackedPlanId;
    expect(createdPlanId).toBeTruthy();

    // Verificar en el repositorio que se persistieron exactamente 5 días y 25 actividades
    const savedPlan = await service.getPlanning(createdPlanId!);
    expect(savedPlan).toBeTruthy();
    expect(savedPlan?.roomId).toBe('room-maternal-a');
    expect(savedPlan?.days).toHaveLength(5);
    const totalActs = savedPlan?.days.reduce((acc, d) => acc + (d.activities?.length || 0), 0);
    expect(totalActs).toBe(25);

    unmountAsistente1();

    // -------------------------------------------------------------------------
    // PASO 3: Guardar y Enviar la planeación a Educadora
    // -------------------------------------------------------------------------
    for (const day of savedPlan!.days) {
      await service.markTeacherDayReviewed(createdPlanId!, day.dayOfWeek, 'TEACHER', FIRST_LIGHT_G002_TEACHER_ID);
    }
    await service.submit(createdPlanId!, 'TEACHER');

    const inReviewPlan = await service.getPlanning(createdPlanId!);
    expect(inReviewPlan?.status).toBe('IN_REVIEW');

    // -------------------------------------------------------------------------
    // PASO 4: Educadora revisa, registra observación pedagógica y devuelve
    // -------------------------------------------------------------------------
    window.history.replaceState({}, '', `/?planId=${createdPlanId}`);

    const targetActivityId = savedPlan!.days[0].activities[1].activityId;
    const observationText =
      'Se solicita detallar en la actividad de muñecos el acompañamiento verbal sensible para el guardado de materiales.';

    await service.reject(
      createdPlanId!,
      observationText,
      FIRST_LIGHT_G002_DIRECTOR_ID,
      'DIRECTOR',
      [
        {
          targetId: targetActivityId,
          observation: observationText,
          originalContent: 'Actividad de muñecos de tela',
          status: 'PENDING_CORRECTION',
          reviewer: 'DIRECTOR',
          timestamp: new Date(),
        },
      ]
    );

    const returnedPlan = await service.getPlanning(createdPlanId!);
    expect(returnedPlan?.status).toBe('REJECTED');
    expect(returnedPlan?.reviewHistory[0].reason).toContain('Se solicita detallar');
    expect(returnedPlan?.granularObservations[0].observation).toContain('Se solicita detallar');

    // -------------------------------------------------------------------------
    // PASO 5: Asistente Educativa atiende la observación y reenvía
    // -------------------------------------------------------------------------
    const updatedDays = returnedPlan!.days.map((day) => {
      if (day.dayOfWeek === 'MONDAY') {
        return {
          ...day,
          activities: day.activities.map((act) => {
            if (act.activityId === targetActivityId) {
              return {
                ...act,
                description:
                  act.description +
                  ' La Asistente acompaña con palabras de afecto y canto suave el momento de guardar los muñecos en su canasta limpia.',
              };
            }
            return act;
          }),
        };
      }
      return day;
    });

    await service.saveDraft(
      createdPlanId!,
      returnedPlan!.observations,
      returnedPlan!.identifiedNeeds,
      returnedPlan!.specialSituations,
      returnedPlan!.availableMaterials,
      returnedPlan!.curricularReferences,
      updatedDays,
      'TEACHER'
    );

    await service.submit(createdPlanId!, 'TEACHER');

    const resubmittedPlan = await service.getPlanning(createdPlanId!);
    expect(resubmittedPlan?.status).toBe('IN_REVIEW');
    expect(
      resubmittedPlan?.days[0].activities[1].description
    ).toContain('La Asistente acompaña con palabras de afecto');

    // -------------------------------------------------------------------------
    // PASO 6: Educadora aprueba la planeación hacia Directora
    // -------------------------------------------------------------------------
    for (const day of resubmittedPlan!.days) {
      await service.markDirectorDayReviewed(createdPlanId!, day.dayOfWeek, 'DIRECTOR');
    }

    await service.approve(createdPlanId!, 'DIRECTOR', FIRST_LIGHT_G002_DIRECTOR_ID);

    const approvedPlan = await service.getPlanning(createdPlanId!);
    expect(approvedPlan?.status).toBe('APPROVED');
    expect(approvedPlan?.approvedBy).toBe(FIRST_LIGHT_G002_DIRECTOR_ID);

    // -------------------------------------------------------------------------
    // PASO 7: Directora revisa y verifica salida al Formato Oficial IMSS
    // -------------------------------------------------------------------------
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
      expect(screen.getByText('VER VERSIÓN OFICIAL IMSS')).toBeTruthy();
      expect(screen.getByText(/Guardería 002/i)).toBeTruthy();
      expect(screen.getByText(/Maternal A/i)).toBeTruthy();
    });

    const printBtn = screen.getByText('VER VERSIÓN OFICIAL IMSS');
    await act(async () => {
      fireEvent.click(printBtn);
    });

    await waitFor(() => {
      const printRoot = document.getElementById('printable-document-root');
      expect(printRoot).toBeTruthy();
      expect(printRoot?.textContent).toContain('Guardería 002');
      expect(printRoot?.textContent).toContain('Maternal A');
      expect(printRoot?.textContent).toContain('19 a 24 meses');
      expect(printRoot?.textContent).toContain('¿Dónde está Spot?');
      expect(printRoot?.textContent).toContain('Eric Hill');
    });

    unmountDirectora();

    // -------------------------------------------------------------------------
    // PASO 8: Persistencia tras recarga y Aislamiento entre Guarderías
    // -------------------------------------------------------------------------
    // A. Persistencia tras recarga: Se rehidrata por planId
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
      expect(screen.getByText(/Contexto Pedagógico Semanal/i)).toBeTruthy();
      expect(
        screen.getByDisplayValue(
          /Niñas y niños de 19 a 24 meses consolidando marcha autónoma y hábitos de higiene/i
        )
      ).toBeTruthy();
    });

    cleanup();

    // B. Aislamiento entre Guarderías: Usuaria de G001 (Anita) intenta acceder a plan de G002
    window.history.replaceState({}, '', `/?planId=${createdPlanId}`);

    render(
      <PlanningDemoApp
        service={service}
        source={recSource}
        initialRole="TEACHER"
        firstLightEnv={eligibleLabEnv}
        firstLightAuth={createMockAuth(FIRST_LIGHT_TEACHER_ID, FIRST_LIGHT_ANITA_EMAIL)}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/La planeación solicitada no pertenece a la estancia autorizada/i)
      ).toBeTruthy();
    });
    expect(screen.queryByText(/¿Dónde está Spot?/i)).toBeNull();
  });
});
