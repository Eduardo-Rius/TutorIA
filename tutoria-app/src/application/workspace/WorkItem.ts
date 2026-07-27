export type WorkItemStatus = 'PENDING' | 'IN_PROGRESS' | 'BLOCKED' | 'WAITING_APPROVAL' | 'COMPLETED';
export type WorkItemUrgency = 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface WorkItem {
  id: string;
  type: string; // e.g. 'planning_approval', 'document_incomplete'
  title: string;
  description: string;
  status: WorkItemStatus;
  urgency: WorkItemUrgency;
  createdAt: string;
  actionUrl?: string; // Where to go to resolve this
}
