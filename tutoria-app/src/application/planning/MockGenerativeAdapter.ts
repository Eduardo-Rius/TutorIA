export interface PlanningContext {
  groupId: string;
  period: string;
  observations: string;
}

export interface ProposedPlanning {
  id: string;
  generalPurpose: string;
  activities: Array<{ title: string; description: string; duration: string }>;
}

export class MockGenerativeAdapter {
  async generateProposal(context: PlanningContext, onProgress?: (msg: string) => void): Promise<ProposedPlanning> {
    const messages = [
      "Comprendiendo el contexto de tu grupo...",
      "Consultando conocimiento institucional...",
      "Revisando lineamientos aplicables...",
      "Preparando una propuesta pedagógica...",
      "Integrando la memoria de la institución...",
      "Todo listo."
    ];

    // Simulate progress updates every 1.2s
    for (const msg of messages) {
      if (onProgress) onProgress(msg);
      await new Promise(resolve => setTimeout(resolve, 1500));
    }

    // Return a beautifully structured proposal
    return {
      id: `plan-${Date.now()}`,
      generalPurpose: `Fortalecer la curiosidad natural de los niños de ${context.groupId} hacia el entorno natural, partiendo de sus intereses expresados (${context.observations}), promoviendo el respeto por los seres vivos y fomentando habilidades de observación, todo dentro del marco del Bloque "${context.period}".`,
      activities: [
        {
          title: "Exploradores de nuestro jardín",
          description: "Salida guiada al área verde de la institución con lupas de plástico. Los niños buscarán insectos sin tocarlos. La docente documentará las preguntas que surjan para integrarlas a la asamblea.",
          duration: "30 min"
        },
        {
          title: "Asamblea: ¿Qué descubrimos?",
          description: "Diálogo circular donde cada niño comparte lo que más le llamó la atención. Se utilizarán tarjetas visuales de diferentes insectos comunes para que ellos asocien lo que vieron con imágenes.",
          duration: "20 min"
        },
        {
          title: "Nuestro primer terrario",
          description: "Construcción grupal de un pequeño hábitat en un frasco grande (solo con elementos naturales, sin animales vivos por política de seguridad y respeto al entorno). Introducción al concepto de 'hábitat'.",
          duration: "40 min"
        }
      ]
    };
  }
}
