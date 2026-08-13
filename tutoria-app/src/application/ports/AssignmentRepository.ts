import { Assignment } from '../../domain/identity/assignment/Assignment';

export interface AssignmentRepository {
  findById(assignmentId: string): Promise<Assignment | null>;
  findActiveByPersonId(personId: string): Promise<Assignment[]>;
  findActiveByDaycareId(daycareId: string): Promise<Assignment[]>;
  findActiveByAuthUid(authUid: string): Promise<Assignment | null>;
  save(assignment: Assignment): Promise<void>;
}
