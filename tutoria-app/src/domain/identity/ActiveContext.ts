import { Membership } from './Membership';

export interface ActiveContext {
  membership: Membership;
  // Future extensions for active policies or runtime overrides can live here
}
