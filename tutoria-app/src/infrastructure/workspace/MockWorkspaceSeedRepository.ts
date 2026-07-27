import { WorkspaceSeedRepository } from '../../application/ports/WorkspaceSeedRepository';
import { WorkspaceReadModel } from '../../application/workspace/WorkspaceReadModel';
import { ActiveContext } from '../../domain/identity/ActiveContext';

export class MockWorkspaceSeedRepository implements WorkspaceSeedRepository {
  async getWorkspaceForContext(context: ActiveContext): Promise<WorkspaceReadModel> {
    const role = context.membership.roleId;

    if (role === 'role-director') {
      return {
        focus: {
          title: '3 planeaciones esperan aprobación urgente para el ciclo de mañana.',
          actionLabel: 'Revisarlas ahora',
          actionId: 'action-approve-all'
        },
        continuityItems: [
          {
            id: 'cont-1',
            title: 'Reporte Mensual de Incidencias',
            pauseReason: 'Falta validación de Enfermería',
            lastModified: new Date(Date.now() - 3600000).toISOString()
          }
        ],
        workQueue: [
          {
            id: 'wq-1',
            type: 'planning_approval',
            title: 'Planeación Sala B (Semana 4)',
            description: 'Enviada por Ana Gómez. Requiere firma.',
            status: 'WAITING_APPROVAL',
            urgency: 'HIGH',
            createdAt: new Date().toISOString()
          },
          {
            id: 'wq-2',
            type: 'normativity_change',
            title: 'Actualización de Norma 043',
            description: 'Protección Civil requiere actualización del plan de emergencia.',
            status: 'PENDING',
            urgency: 'CRITICAL',
            createdAt: new Date(Date.now() - 86400000).toISOString()
          }
        ],
        nextActions: [
          { id: 'na-1', label: 'Revisar Planeaciones', priority: 1 },
          { id: 'na-2', label: 'Consultar Norma', priority: 2 },
          { id: 'na-3', label: 'Ver Asistencia', priority: 3 }
        ]
      };
    }

    // Default for Tutor
    return {
      focus: {
        title: 'La Planeación de la Sala A vence hoy a las 16:00 hrs.',
        actionLabel: 'Continuar Planeación',
        actionId: 'action-continue-planning'
      },
      continuityItems: [
        {
          id: 'cont-2',
          title: 'Borrador: Planeación Sala A',
          pauseReason: 'Interrumpida por atención a menores',
          lastModified: new Date(Date.now() - 1800000).toISOString()
        }
      ],
      workQueue: [
        {
          id: 'wq-3',
          type: 'planning_rejected',
          title: 'Planeación Sala A rechazada',
          description: 'Falta incluir actividad de motricidad fina.',
          status: 'BLOCKED',
          urgency: 'HIGH',
          createdAt: new Date(Date.now() - 7200000).toISOString()
        }
      ],
      nextActions: [
        { id: 'na-4', label: 'Continuar Planeación', priority: 1 },
        { id: 'na-5', label: 'Nueva Planeación', priority: 2 },
        { id: 'na-6', label: 'Registrar Incidencia', priority: 3 }
      ]
    };
  }
}
