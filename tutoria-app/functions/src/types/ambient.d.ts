import '../../../src/domain/planning/CurricularPDAReference';
import '../../../src/domain/planning/ComplementaryProgramActivity';
import '../../../src/domain/planning/PrioritizedPractice';

declare module '../../../src/domain/planning/CurricularPDAReference' {
  interface CurricularPDAReference {
    readonly campoFormativoId?: string;
    readonly contenidoId?: string;
  }
}

declare module '../../../src/domain/planning/ComplementaryProgramActivity' {
  interface ComplementaryProgramActivity {
    readonly activityId?: string;
    readonly title?: string;
    readonly programType?: string;
  }
}

declare module '../../../src/domain/planning/PrioritizedPractice' {
  interface PrioritizedPractice {
    readonly practiceId?: string;
    readonly practiceText?: string;
    readonly source?: string;
  }
}
