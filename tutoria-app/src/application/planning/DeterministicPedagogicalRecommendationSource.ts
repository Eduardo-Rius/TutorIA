import { PedagogicalRecommendationSource } from './PedagogicalRecommendationSource';
import { PlanningDay } from '../../domain/planning/WeeklyPlanning';
import { Room } from '../../domain/planning/RoomCatalog';

export class DeterministicPedagogicalRecommendationSource implements PedagogicalRecommendationSource {
  public async generateRecommendation(
    room: Room,
    observations: string,
    identifiedNeeds: string
  ): Promise<PlanningDay[]> {
    
    // DEMO DATA - NOT NORMATIVE
    return [
      {
        date: '2024-10-14',
        dayOfWeek: 'MONDAY',
        activities: [
          {
            activityId: 'm1',
            category: 'vínculo y sostenimiento afectivo',
            objective: 'Fomentar la seguridad emocional en la recepción',
            description: 'Recibir al niño con contacto visual a su altura, mencionando su nombre afectuosamente.',
            materials: [],
            durationMinutes: 15,
            curricularTraceability: ['IMSS-LA-VSA-01']
          },
          {
            activityId: 'm2',
            category: 'activación física',
            objective: 'Estimular el movimiento de miembros inferiores',
            description: 'Juego de pataleo en colchoneta siguiendo el ritmo de una canción suave.',
            materials: ['Colchoneta', 'Música instrumental'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-AF-02']
          }
        ],
        complementaryActivities: ['Lectura en voz alta durante la siesta'],
        materials: ['Colchoneta', 'Música instrumental'],
        evaluation: '',
        executionNotes: ''
      },
      {
        date: '2024-10-15',
        dayOfWeek: 'TUESDAY',
        activities: [
          {
            activityId: 't1',
            category: 'capacidades sensoriales / motricidad',
            objective: 'Exploración de texturas',
            description: 'Permitir al niño tocar diferentes telas (suave, rugosa) bajo supervisión directa.',
            materials: ['Retazos de tela de diferentes texturas'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-CS-03']
          }
        ],
        complementaryActivities: [],
        materials: ['Retazos de tela de diferentes texturas'],
        evaluation: '',
        executionNotes: ''
      },
      {
        date: '2024-10-16',
        dayOfWeek: 'WEDNESDAY',
        activities: [
          {
            activityId: 'w1',
            category: 'juego libre / material didáctico',
            objective: 'Fomentar la autonomía en el juego',
            description: 'Juego con bloques grandes y suaves de ensamble básico.',
            materials: ['Bloques de espuma grandes'],
            durationMinutes: 25,
            curricularTraceability: ['IMSS-LA-JL-04']
          }
        ],
        complementaryActivities: [],
        materials: ['Bloques de espuma grandes'],
        evaluation: '',
        executionNotes: ''
      },
      {
        date: '2024-10-17',
        dayOfWeek: 'THURSDAY',
        activities: [
          {
            activityId: 'th1',
            category: 'capacidades comunicativas / literatura',
            objective: 'Estimular el balbuceo y atención',
            description: 'Lectura de cuento con imágenes grandes y sonidos onomatopéyicos.',
            materials: ['Cuento de animales grandes'],
            durationMinutes: 15,
            curricularTraceability: ['IMSS-LA-CC-05']
          },
          {
            activityId: 'th2',
            category: 'ambiente de aprendizaje',
            objective: 'Interacción con el entorno',
            description: 'Juego con espejos irrompibles a nivel de piso.',
            materials: ['Espejos acrílicos de piso'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-AA-06']
          }
        ],
        complementaryActivities: [],
        materials: ['Cuento de animales grandes', 'Espejos acrílicos de piso'],
        evaluation: '',
        executionNotes: ''
      },
      {
        date: '2024-10-18',
        dayOfWeek: 'FRIDAY',
        activities: [
          {
            activityId: 'f1',
            category: 'experiencia artística',
            objective: 'Estimulación visual y musical',
            description: 'Escuchar música clásica mientras se mueven pañuelos de colores.',
            materials: ['Música', 'Pañuelos translúcidos'],
            durationMinutes: 20,
            curricularTraceability: ['IMSS-LA-EA-07']
          }
        ],
        complementaryActivities: ['Despedida afectiva y cierre de semana'],
        materials: ['Música', 'Pañuelos translúcidos'],
        evaluation: '',
        executionNotes: ''
      }
    ];
  }
}
