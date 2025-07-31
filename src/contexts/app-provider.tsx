
"use client";

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AppSettings, Task, AppFilters, KanbanFilter, SubCategory, WorkflowCategory, ImportanceLevel, BidOrigin } from '@/lib/types';
import { defaultSettings, defaultTasks } from '@/lib/defaults';
import useLocalStorage from '@/hooks/use-local-storage';
import { db } from '@/lib/firebase';
import { collection, doc, onSnapshot, addDoc, updateDoc, deleteDoc, setDoc, getDoc, writeBatch } from 'firebase/firestore';

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
  const [tasks, setTasks] = useState<Task[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [filters, setFilters] = useLocalStorage<AppFilters>('filters', { kanban: 'all' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const settingsDocRef = doc(db, 'settings', 'app-settings');
    const tasksCollectionRef = collection(db, 'tasks');

    const unsubscribeSettings = onSnapshot(settingsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setSettings(docSnap.data() as AppSettings);
      } else {
        console.log("No settings found, creating default settings...");
        setDoc(settingsDocRef, defaultSettings).then(() => setSettings(defaultSettings));
      }
    }, (error) => {
        console.error("Error fetching settings:", error);
    });

    const unsubscribeTasks = onSnapshot(tasksCollectionRef, (snapshot) => {
        if (snapshot.empty) {
            console.log("No tasks found, creating default tasks...");
            const batch = writeBatch(db);
            defaultTasks.forEach(task => {
                const { id, ...taskData } = task;
                const taskDocRef = doc(tasksCollectionRef, id); // Use explicit ID
                batch.set(taskDocRef, taskData);
            });
            batch.commit().then(() => {
                setTasks(defaultTasks);
                setLoading(false);
            });
        } else {
            const tasksData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Task));
            setTasks(tasksData);
            setLoading(false);
        }
    }, (error) => {
        console.error("Error fetching tasks:", error);
        setLoading(false);
    });

    return () => {
      unsubscribeSettings();
      unsubscribeTasks();
    };
  }, []);


  const addTask = async (task: Omit<Task, 'id'>) => {
    await addDoc(collection(db, 'tasks'), task);
  };

  const updateTask = async (updatedTask: Task) => {
    const { id, ...taskData } = updatedTask;
    await updateDoc(doc(db, 'tasks', id), taskData);
  };
  
  const deleteTask = async (taskId: string) => {
    await deleteDoc(doc(db, 'tasks', taskId));
  }

  const updateSettings = async (newSettings: AppSettings) => {
    await setDoc(doc(db, 'settings', 'app-settings'), newSettings);
  }

  const addWorkflowCategory = (category: Omit<WorkflowCategory, 'id'>) => {
    const newSettings = { ...settings, workflowCategories: [...settings.workflowCategories, { ...category, id: uuidv4() }] };
    updateSettings(newSettings);
  }

  const updateWorkflowCategory = (updatedCategory: WorkflowCategory) => {
    const newSettings = { ...settings, workflowCategories: settings.workflowCategories.map(cat => cat.id === updatedCategory.id ? updatedCategory : cat) };
    updateSettings(newSettings);
  }

  const deleteWorkflowCategory = (categoryId: string) => {
    const newSettings = { ...settings, workflowCategories: settings.workflowCategories.filter(cat => cat.id !== categoryId) };
    updateSettings(newSettings);
  }

  const addSubCategory = (subCategory: Omit<SubCategory, 'id'>) => {
    const newSettings = { ...settings, subCategories: [...settings.subCategories, { ...subCategory, id: uuidv4() }] };
    updateSettings(newSettings);
  }
  
  const updateSubCategory = (updatedSubCategory: SubCategory) => {
    const newSettings = { ...settings, subCategories: settings.subCategories.map(sub => sub.id === updatedSubCategory.id ? updatedSubCategory : sub) };
    updateSettings(newSettings);
  }

  const deleteSubCategory = (subcategoryId: string) => {
    const newSettings = { ...settings, subCategories: settings.subCategories.filter(sub => sub.id !== subcategoryId) };
    updateSettings(newSettings);
  }
  
  const addImportanceLevel = (level: Omit<ImportanceLevel, 'id'>) => {
    const newSettings = { ...settings, importanceLevels: [...settings.importanceLevels, { ...level, id: uuidv4() }] };
    updateSettings(newSettings);
  }

  const updateImportanceLevel = (updatedLevel: ImportanceLevel) => {
    const newSettings = { ...settings, importanceLevels: settings.importanceLevels.map(l => l.id === updatedLevel.id ? updatedLevel : l) };
    updateSettings(newSettings);
  }

  const deleteImportanceLevel = (levelId: string) => {
    const newSettings = { ...settings, importanceLevels: settings.importanceLevels.filter(l => l.id !== levelId) };
    updateSettings(newSettings);
  }

  const addBidOrigin = (origin: Omit<BidOrigin, 'id'>) => {
    const newSettings = { ...settings, bidOrigins: [...settings.bidOrigins, { ...origin, id: uuidv4() }] };
    updateSettings(newSettings);
  }

  const updateBidOrigin = (updatedOrigin: BidOrigin) => {
    const newSettings = { ...settings, bidOrigins: settings.bidOrigins.map(o => o.id === updatedOrigin.id ? updatedOrigin : o) };
    updateSettings(newSettings);
  }

  const deleteBidOrigin = (originId: string) => {
    const newSettings = { ...settings, bidOrigins: settings.bidOrigins.filter(o => o.id !== originId) };
    updateSettings(newSettings);
  }

  const setKanbanFilter = (filter: KanbanFilter) => {
    setFilters({ ...filters, kanban: filter });
  };
  
  const manualSetTasks = async (newTasks: Task[]) => {
    const batch = writeBatch(db);
    const tasksCollectionRef = collection(db, 'tasks');
    
    // Clear existing tasks
    const existingTasksSnapshot = await getDoc(tasksCollectionRef as any);
    existingTasksSnapshot.docs.forEach((doc: any) => {
      batch.delete(doc.ref);
    });

    // Add new tasks
    newTasks.forEach(task => {
      const { id, ...taskData } = task;
      const taskDocRef = doc(tasksCollectionRef, id); // Use explicit ID
      batch.set(taskDocRef, taskData);
    });

    await batch.commit();
  }

  const contextValue = useMemo(() => ({
    tasks,
    settings,
    filters,
    setTasks: manualSetTasks,
    addTask,
    updateTask,
    deleteTask,
    setSettings: updateSettings,
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

  if (loading) {
    return (
        <div className="flex h-screen items-center justify-center">
            <p>Loading...</p>
        </div>
    );
  }

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
