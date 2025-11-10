
export enum TaskStatus {
  InProgress = 'In Progress',
  Completed = 'Completed',
}

export interface TaskResult {
  id: string;
  type: 'file' | 'link';
  name: string;
  url?: string;
  file?: File;
  addedAt: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: string;
  assignedBy: string;
  results: TaskResult[];
}
