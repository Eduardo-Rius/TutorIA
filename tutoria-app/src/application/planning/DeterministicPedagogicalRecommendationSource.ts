import { PedagogicalRecommendationSource } from './PedagogicalRecommendationSource';
import { PlanningDay } from '../../domain/planning/WeeklyPlanning';
import { Room } from '../../domain/planning/RoomCatalog';
import { IMSS_CATEGORIES } from '../../constants/imssCategories';

export class DeterministicPedagogicalRecommendationSource implements PedagogicalRecommendationSource {
  public async generateRecommendation(
    room: Room,
    observations: string,
    identifiedNeeds: string
  ): Promise<PlanningDay[]> {

    // DEMO DATA - NORMATIVA IMSS 5 CATEGORÍAS (Lactantes C)
    return [
      {
        date: '2024-10-14',
        dayOfWeek: 'MONDAY',
        activities: [
          {
            activityId: 'mon-ea',
            category: IMSS_CATEGORIES[0], // EXPERIENCIAS ARTÍSTICAS
            objective: 'Explorar sonidos con instrumentos de percusión simples',
            description: 'Se proporcionarán sonajas y cascabeles para que los lactantes sigan el ritmo de una melodía suave, estimulando su percepción auditiva.',
            materials: ['Sonajas', 'Cascabeles', 'Música suave'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-EA-01']
          },
          {
            activityId: 'mon-aa',
            category: IMSS_CATEGORIES[1], // AMBIENTES DE APRENDIZAJE
            objective: 'Fomentar la exploración libre y segura del entorno',
            description: 'Colocar colchonetas y juguetes llamativos a diferentes distancias para motivar el gateo y el desplazamiento autónomo.',
            materials: ['Colchonetas', 'Juguetes de colores vivos'],
            durationMinutes: 25,
            curricularTraceability: ['IMSS-LA-AA-01']
          },
          {
            activityId: 'mon-af',
            category: IMSS_CATEGORIES[2], // ACTIVACIÓN FÍSICA
            objective: 'Estimular el tono muscular de las extremidades inferiores',
            description: 'Juego de pataleo guiado sobre colchoneta mientras se canta una canción animada.',
            materials: ['Colchoneta'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-AF-01']
          },
          {
            activityId: 'mon-lva',
            category: IMSS_CATEGORIES[3], // LECTURA EN VOZ ALTA
            objective: 'Fomentar la atención conjunta y el vocabulario básico',
            description: 'Lectura de cuento de animales de granja, imitando sonidos y mostrando imágenes grandes y contrastantes.',
            materials: ['Cuento de granja con imágenes grandes'],
            durationMinutes: 15,
            curricularTraceability: ['IMSS-LA-LVA-01']
          },
          {
            activityId: 'mon-pm',
            category: IMSS_CATEGORIES[4], // PENSAMIENTO MATEMÁTICO
            objective: 'Experimentar la noción de dentro y fuera',
            description: 'Los niños introducen y sacan pelotas suaves de una caja grande, descubriendo la relación espacial.',
            materials: ['Caja de cartón decorada', 'Pelotas de tela'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-PM-01']
          }
        ],
        complementaryActivities: ['Bienvenida afectiva', 'Hábitos de higiene'],
        materials: ['Sonajas', 'Colchonetas', 'Cuento', 'Caja y pelotas'],
        evaluation: '',
        executionNotes: ''
      },
      {
        date: '2024-10-15',
        dayOfWeek: 'TUESDAY',
        activities: [
          {
            activityId: 'tue-ea',
            category: IMSS_CATEGORIES[0], // EXPERIENCIAS ARTÍSTICAS
            objective: 'Experimentar texturas mediante la manipulación guiada',
            description: 'Pintura dactilar comestible (yogur con colorante) sobre papel bond grande en el suelo.',
            materials: ['Yogur natural', 'Colorantes vegetales', 'Papel bond'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-EA-02']
          },
          {
            activityId: 'tue-aa',
            category: IMSS_CATEGORIES[1], // AMBIENTES DE APRENDIZAJE
            objective: 'Estimular el reconocimiento visual en el entorno',
            description: 'Juego frente al espejo de pared a nivel de piso para reconocer su propio rostro y gestos.',
            materials: ['Espejo irrompible de pared'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-AA-02']
          },
          {
            activityId: 'tue-af',
            category: IMSS_CATEGORIES[2], // ACTIVACIÓN FÍSICA
            objective: 'Fortalecer el control postural durante el gateo',
            description: 'Circuito pequeño con rodillos de espuma que los niños deben superar gateando o apoyándose.',
            materials: ['Rodillos de espuma suave'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-AF-02']
          },
          {
            activityId: 'tue-lva',
            category: IMSS_CATEGORIES[3], // LECTURA EN VOZ ALTA
            objective: 'Promover la escucha atenta y el interés por los libros',
            description: 'Lectura de cuento corto sobre rutinas (dormir, comer) utilizando un tono de voz suave y melódico.',
            materials: ['Libro de tela sobre rutinas diarias'],
            durationMinutes: 15,
            curricularTraceability: ['IMSS-LA-LVA-02']
          },
          {
            activityId: 'tue-pm',
            category: IMSS_CATEGORIES[4], // PENSAMIENTO MATEMÁTICO
            objective: 'Identificar nociones de cantidad: mucho y poco',
            description: 'Manipulación de bloques de ensamble grandes, separando un montón con muchos bloques y otro con pocos.',
            materials: ['Bloques de ensamble grandes tipo Mega Bloks'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-PM-02']
          }
        ],
        complementaryActivities: ['Alimentación guiada', 'Siesta'],
        materials: ['Yogur', 'Papel bond', 'Espejo', 'Rodillos', 'Libro de tela', 'Bloques grandes'],
        evaluation: '',
        executionNotes: ''
      },
      {
        date: '2024-10-16',
        dayOfWeek: 'WEDNESDAY',
        activities: [
          {
            activityId: 'wed-ea',
            category: IMSS_CATEGORIES[0], // EXPERIENCIAS ARTÍSTICAS
            objective: 'Fomentar la expresión corporal mediante la música',
            description: 'Bailar libremente al ritmo de música folklórica suave, apoyando el movimiento de manos.',
            materials: ['Música folklórica instrumental', 'Bocina'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-EA-03']
          },
          {
            activityId: 'wed-aa',
            category: IMSS_CATEGORIES[1], // AMBIENTES DE APRENDIZAJE
            objective: 'Interacción social positiva',
            description: 'Juego en círculo sobre un tapete texturizado, fomentando el contacto visual e interacción entre pares.',
            materials: ['Tapete texturizado'],
            durationMinutes: 25,
            curricularTraceability: ['IMSS-LA-AA-03']
          },
          {
            activityId: 'wed-af',
            category: IMSS_CATEGORIES[2], // ACTIVACIÓN FÍSICA
            objective: 'Favorecer la coordinación motriz gruesa',
            description: 'Lanzar y atrapar pelotas grandes de goma rodándolas por el piso en parejas con la educadora.',
            materials: ['Pelotas grandes de goma suave'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-AF-03']
          },
          {
            activityId: 'wed-lva',
            category: IMSS_CATEGORIES[3], // LECTURA EN VOZ ALTA
            objective: 'Vincular imágenes con palabras cotidianas',
            description: 'Cuento de rimas cortas sobre las partes del cuerpo, señalando las partes correspondientes en los niños.',
            materials: ['Cuento de rimas con imágenes del cuerpo'],
            durationMinutes: 15,
            curricularTraceability: ['IMSS-LA-LVA-03']
          },
          {
            activityId: 'wed-pm',
            category: IMSS_CATEGORIES[4], // PENSAMIENTO MATEMÁTICO
            objective: 'Explorar nociones de permanencia del objeto',
            description: 'Juego de esconder un juguete sonoro debajo de un pañuelo y animar al niño a encontrarlo.',
            materials: ['Juguetes sonoros', 'Pañuelos opacos'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-PM-03']
          }
        ],
        complementaryActivities: ['Cambiado de pañal afectivo'],
        materials: ['Tapete texturizado', 'Pelotas grandes', 'Cuento', 'Juguetes sonoros', 'Pañuelos'],
        evaluation: '',
        executionNotes: ''
      },
      {
        date: '2024-10-17',
        dayOfWeek: 'THURSDAY',
        activities: [
          {
            activityId: 'thu-ea',
            category: IMSS_CATEGORIES[0], // EXPERIENCIAS ARTÍSTICAS
            objective: 'Favorecer la coordinación fina y exploración creativa',
            description: 'Garabateo libre con crayones gruesos sobre cartulina pegada en la pared a su altura.',
            materials: ['Crayones gruesos', 'Cartulina grande', 'Cinta masking'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-EA-04']
          },
          {
            activityId: 'thu-aa',
            category: IMSS_CATEGORIES[1], // AMBIENTES DE APRENDIZAJE
            objective: 'Propiciar el descanso y relajación',
            description: 'Acondicionar un área con cojines, luz tenue y música de cuna para una transición tranquila hacia la siesta.',
            materials: ['Cojines suaves', 'Música de relajación'],
            durationMinutes: 25,
            curricularTraceability: ['IMSS-LA-AA-04']
          },
          {
            activityId: 'thu-af',
            category: IMSS_CATEGORIES[2], // ACTIVACIÓN FÍSICA
            objective: 'Desarrollar equilibrio en posición de pie con apoyo',
            description: 'Motivar a los niños a ponerse de pie apoyándose en un mueble bajo y seguro para alcanzar un juguete.',
            materials: ['Muebles seguros', 'Juguetes atractivos'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-AF-04']
          },
          {
            activityId: 'thu-lva',
            category: IMSS_CATEGORIES[3], // LECTURA EN VOZ ALTA
            objective: 'Estimular el lenguaje a través de la narrativa musical',
            description: 'Lectura de cuento cantado, acompañando la historia con movimientos de manos y expresiones faciales.',
            materials: ['Cuento musical interactivo'],
            durationMinutes: 15,
            curricularTraceability: ['IMSS-LA-LVA-04']
          },
          {
            activityId: 'thu-pm',
            category: IMSS_CATEGORIES[4], // PENSAMIENTO MATEMÁTICO
            objective: 'Explorar nociones de seriación básica',
            description: 'Jugar con aros apilables grandes, introduciéndolos en un poste con ayuda y supervisión.',
            materials: ['Aros apilables de plástico'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-PM-04']
          }
        ],
        complementaryActivities: ['Lavado de manos y cantos'],
        materials: ['Crayones', 'Cartulina', 'Cojines', 'Música de relajación', 'Cuento musical', 'Aros apilables'],
        evaluation: '',
        executionNotes: ''
      },
      {
        date: '2024-10-18',
        dayOfWeek: 'FRIDAY',
        activities: [
          {
            activityId: 'fri-ea',
            category: IMSS_CATEGORIES[0], // EXPERIENCIAS ARTÍSTICAS
            objective: 'Sensibilización visual con luces y colores',
            description: 'Exploración de botellas sensoriales con agua, brillantina y objetos pequeños de colores brillantes.',
            materials: ['Botellas sensoriales seguras'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-EA-05']
          },
          {
            activityId: 'fri-aa',
            category: IMSS_CATEGORIES[1], // AMBIENTES DE APRENDIZAJE
            objective: 'Fomentar la curiosidad y exploración táctil',
            description: 'Recorrido por un sendero corto de texturas en el suelo (alfombra, plástico de burbujas, foamy).',
            materials: ['Alfombra', 'Plástico de burbujas', 'Tapetes de foamy'],
            durationMinutes: 25,
            curricularTraceability: ['IMSS-LA-AA-05']
          },
          {
            activityId: 'fri-af',
            category: IMSS_CATEGORIES[2], // ACTIVACIÓN FÍSICA
            objective: 'Practicar la precisión en la motricidad gruesa',
            description: 'Actividad de intentar patear pelotas grandes suaves estando de pie o apoyados.',
            materials: ['Pelotas suaves y ligeras'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-AF-05']
          },
          {
            activityId: 'fri-lva',
            category: IMSS_CATEGORIES[3], // LECTURA EN VOZ ALTA
            objective: 'Reafirmar vínculos afectivos mediante cuentos',
            description: 'Cuento interactivo con títeres de dedo sobre emociones básicas, propiciando sonrisas y gestos.',
            materials: ['Cuento corto', 'Títeres de dedo'],
            durationMinutes: 15,
            curricularTraceability: ['IMSS-LA-LVA-05']
          },
          {
            activityId: 'fri-pm',
            category: IMSS_CATEGORIES[4], // PENSAMIENTO MATEMÁTICO
            objective: 'Distinguir texturas como atributo básico de objetos',
            description: 'Caja sorpresa de donde los niños sacan objetos duros (bloques) y suaves (peluches).',
            materials: ['Caja de sorpresas', 'Peluches pequeños', 'Bloques de madera'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-PM-05']
          }
        ],
        complementaryActivities: ['Despedida afectiva', 'Entrega a padres'],
        materials: ['Botellas sensoriales', 'Materiales de texturas', 'Pelotas', 'Títeres de dedo', 'Peluches', 'Bloques'],
        evaluation: '',
        executionNotes: ''
      }
    ];
  }
}
