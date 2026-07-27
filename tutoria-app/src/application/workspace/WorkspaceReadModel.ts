import { WorkItem } from './WorkItem';

export interface FocusItem {
  title: string;
  actionLabel: string;
  actionId: string;
}

export interface ContinuityItem {
  id: string;
  title: string;
  pauseReason: string; // e.g. 'Interrupted by call', 'Waiting for signature'
  lastModified: string;
}

export interface NextActionItem {
  id: string;
  label: string;
  priority: number;
}

export interface WorkspaceReadModel {
  focus?: FocusItem; // Zone 2: The single most important thing
  continuityItems: ContinuityItem[]; // Zone 3: What I was doing
  workQueue: WorkItem[]; // Zone 4: Exceptions and pending work
  nextActions: NextActionItem[]; // Zone 5: Recommended next steps
}
