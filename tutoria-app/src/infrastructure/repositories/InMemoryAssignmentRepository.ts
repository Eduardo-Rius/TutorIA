import { AssignmentRepository } from '../../application/ports/AssignmentRepository';
import { Assignment } from '../../domain/identity/assignment/Assignment';

export class InMemoryAssignmentRepository implements AssignmentRepository {
  private assignments: Map<string, Assignment> = new Map();

  async findById(assignmentId: string): Promise<Assignment | null> {
    const assignment = this.assignments.get(assignmentId);
    return assignment ? Assignment.reconstitute(assignment.props) : null;
  }

  async findActiveByPersonId(personId: string): Promise<Assignment[]> {
    return Array.from(this.assignments.values())
      .filter(a => a.status === 'ACTIVE' && a.personId === personId)
      .map(a => Assignment.reconstitute(a.props));
  }

  async findActiveByDaycareId(daycareId: string): Promise<Assignment[]> {
    return Array.from(this.assignments.values())
      .filter(a => a.status === 'ACTIVE' && a.daycareId === daycareId)
      .map(a => Assignment.reconstitute(a.props));
  }

  async findActiveByAuthUid(authUid: string): Promise<Assignment | null> {
    const activeAssignment = Array.from(this.assignments.values())
      .find(a => a.status === 'ACTIVE' && a.authUid === authUid);

    return activeAssignment ? Assignment.reconstitute(activeAssignment.props) : null;
  }

  async save(assignment: Assignment): Promise<void> {
    if (assignment.status === 'ACTIVE') {
      const existingActive = Array.from(this.assignments.values())
        .find(a => a.status === 'ACTIVE' && a.authUid === assignment.authUid && a.id !== assignment.id);

      if (existingActive) {
        throw new Error(`Cannot save ACTIVE assignment: authUid ${assignment.authUid} is already actively assigned to assignment ${existingActive.id}`);
      }
    }

    this.assignments.set(assignment.id, Assignment.reconstitute(assignment.props));
  }
}
