export interface Task {
  id: string;
  taskid: string;
  title: string;
  date: string; // ISO string
  dueDate: string; // ISO string
  status: string;
  subStatus?: string;
  importance: string;
  bidOrigin: string;
  desc: string;
  remarks: string;
  completionDate?: string; // ISO string
}

export interface WorkflowCategory {
  id: string;
  name: string;
  color: string;
}

export interface SubCategory {
  id: string;
  name: string;
  parentCategory: string; // The name of the parent workflow category
}

export interface ImportanceLevel {
  id: string;
  name: string;
  color: string;
}

export interface BidOrigin {
  id: string;
  name: string;
}

export interface AppSettings {
  workflowCategories: WorkflowCategory[];
  subCategories: SubCategory[];
  importanceLevels: ImportanceLevel[];
  bidOrigins: BidOrigin[];
}

export type KanbanFilter = "all" | "active" | "overdue" | "due-today" | "due-this-week" | "completed";

export interface AppFilters {
  kanban: KanbanFilter;
}
