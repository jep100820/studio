"use client";

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppSettings, Task, AppFilters, KanbanFilter, SubCategory, WorkflowCategory, ImportanceLevel, BidOrigin } from '@/lib/types';
import { defaultSettings, defaultTasks } from '@/lib/defaults';
import useLocalStorage from '@/hooks/use-local-storage';

interface AppContextType {
  tasks: Task[];
  settings: AppSettings;
  filters: AppFilters;
  setTasks: (tasks: Task[]) => void;
  addTask: (task: Omit<Task, 'id'>) => void;
  updateTask: (task: Task) => void;
  deleteTask: (taskId: string) => void;
  setSettings: (settings: AppSettings) => void;
  updateWorkflowCategory: (category: WorkflowCategory) => void;
  addWorkflowCategory: (category: Omit<WorkflowCategory, 'id'>) => void;
  deleteWorkflowCategory: (categoryId: string) => void;
  updateSubCategory: (subcategory: SubCategory) => void;
  addSubCategory: (subcategory: Omit<SubCategory, 'id'>) => void;
  deleteSubCategory: (subcategoryId: string) => void;
  updateImportanceLevel: (level: ImportanceLevel) => void;
  addImportanceLevel: (level: Omit<ImportanceLevel, 'id'>) => void;
  deleteImportanceLevel: (levelId: string) => void;
  updateBidOrigin: (origin: BidOrigin) => void;
  addBidOrigin: (origin: Omit<BidOrigin, 'id'>) => void;
  deleteBidOrigin: (originId: string) => void;
  setKanbanFilter: (filter: KanbanFilter) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [tasks, setTasks] = useLocalStorage<Task[]>('tasks', defaultTasks);
  const [settings, setSettings] = useLocalStorage<AppSettings>('settings', defaultSettings);
  const [filters, setFilters] = useLocalStorage<AppFilters>('filters', { kanban: 'all' });

  const addTask = (task: Omit<Task, 'id'>) => {
    setTasks([...tasks, { ...task, id: uuidv4() }]);
  };

  const updateTask = (updatedTask: Task) => {
    setTasks(tasks.map((task) => (task.id === updatedTask.id ? updatedTask : task)));
  };
  
  const deleteTask = (taskId: string) => {
    setTasks(tasks.filter((task) => task.id !== taskId));
  }

  const addWorkflowCategory = (category: Omit<WorkflowCategory, 'id'>) => {
    setSettings({ ...settings, workflowCategories: [...settings.workflowCategories, { ...category, id: uuidv4() }] });
  }

  const updateWorkflowCategory = (updatedCategory: WorkflowCategory) => {
    setSettings({ ...settings, workflowCategories: settings.workflowCategories.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat) });
  }

  const deleteWorkflowCategory = (categoryId: string) => {
    setSettings({ ...settings, workflowCategories: settings.workflowCategories.filter(cat => cat.id !== categoryId) });
  }

  const addSubCategory = (subCategory: Omit<SubCategory, 'id'>) => {
    setSettings({ ...settings, subCategories: [...settings.subCategories, { ...subCategory, id: uuidv4() }] });
  }
  
  const updateSubCategory = (updatedSubCategory: SubCategory) => {
    setSettings({ ...settings, subCategories: settings.subCategories.map(sub => sub.id === updatedSubCategory.id ? updatedSubCategory : sub) });
  }

  const deleteSubCategory = (subcategoryId: string) => {
    setSettings({ ...settings, subCategories: settings.subCategories.filter(sub => sub.id !== subcategoryId) });
  }
  
  const addImportanceLevel = (level: Omit<ImportanceLevel, 'id'>) => {
    setSettings({ ...settings, importanceLevels: [...settings.importanceLevels, { ...level, id: uuidv4() }] });
  }

  const updateImportanceLevel = (updatedLevel: ImportanceLevel) => {
    setSettings({ ...settings, importanceLevels: settings.importanceLevels.map(l => l.id === updatedLevel.id ? updatedLevel : l) });
  }

  const deleteImportanceLevel = (levelId: string) => {
    setSettings({ ...settings, importanceLevels: settings.importanceLevels.filter(l => l.id !== levelId) });
  }

  const addBidOrigin = (origin: Omit<BidOrigin, 'id'>) => {
    setSettings({ ...settings, bidOrigins: [...settings.bidOrigins, { ...origin, id: uuidv4() }] });
  }

  const updateBidOrigin = (updatedOrigin: BidOrigin) => {
    setSettings({ ...settings, bidOrigins: settings.bidOrigins.map(o => o.id === updatedOrigin.id ? updatedOrigin : o) });
  }

  const deleteBidOrigin = (originId: string) => {
    setSettings({ ...settings, bidOrigins: settings.bidOrigins.filter(o => o.id !== originId) });
  }

  const setKanbanFilter = (filter: KanbanFilter) => {
    setFilters({ ...filters, kanban: filter });
  };

  const contextValue = useMemo(() => ({
    tasks,
    settings,
    filters,
    setTasks,
    addTask,
    updateTask,
    deleteTask,
    setSettings,
    addWorkflowCategory,
    updateWorkflowCategory,
    deleteWorkflowCategory,
    addSubCategory,
    updateSubCategory,
    deleteSubCategory,
    addImportanceLevel,
    updateImportanceLevel,
    deleteImportanceLevel,
    addBidOrigin,
    updateBidOrigin,
    deleteBidOrigin,
    setKanbanFilter,
  }), [tasks, settings, filters]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
