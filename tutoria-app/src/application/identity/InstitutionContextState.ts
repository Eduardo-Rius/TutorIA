import { ActiveContext } from '../../domain/identity/ActiveContext';
import { Membership } from '../../domain/identity/Membership';

export type InstitutionContextStatus =
  | 'UNKNOWN'
  | 'LOADING'
  | 'NO_MEMBERSHIPS'
  | 'SELECTING_CONTEXT'
  | 'CONTEXT_ACTIVE'
  | 'ERROR';

export interface InstitutionContextState {
  status: InstitutionContextStatus;
  availableMemberships: Membership[];
  activeContext?: ActiveContext;
  error?: string;
}
