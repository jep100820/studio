
// @ts-nocheck
'use client';

import { useEffect, useState, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  addDoc,
  writeBatch,
  getDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { initialTasks } from '@/lib/seed-data';
import { cn } from '@/lib/utils';
import { PlusCircle, GripVertical, Moon, Sun } from 'lucide-react';
import { useTheme } from "next-themes";
import { parse, isValid, format } from 'date-fns';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "kanbanflow-6cvc6.firebaseapp.com",
  projectId: "kanbanflow-6cvc6",
  storageBucket: "kanbanflow-6cvc6.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const importanceColors = {
  High: 'bg-red-500',
  Medium: 'bg-yellow-500',
  Low: 'bg-green-500',
};

const parseDateString = (dateString) => {
  if (!dateString) return null;
  const parsedDate = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsedDate) ? Timestamp.fromDate(parsedDate) : null;
};

const formatDate = (timestamp) => {
  if (!timestamp) return '';
  // Handle Firestore Timestamp object
  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-GB');
  }
  // Handle Date object or valid date string
  const date = new Date(timestamp);
  if (isValid(date)) {
    return format(date, 'dd/MM/yyyy');
  }
  return '';
};


const seedDatabase = async () => {
  const settingsRef = doc(db, 'settings', 'workflow');
  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    console.log('Settings not found, creating default settings...');
    const workflowCategories = ['Not Started', 'In Progress', 'For Review', 'Approved for Submission', 'Completed'];
    await setDoc(settingsRef, {
      workflowCategories: workflowCategories.map(name => ({ name, color: '#d1d5db' })),
      importanceLevels: [
        { name: 'High', color: '#ef4444' },
        { name: 'Medium', color: '#f59e0b' },
        { name: 'Low', color: '#10b981' },
      ],
      bidOrigins: [],
    });
    console.log('Default settings created.');
  } else {
    console.log('Settings already exist.');
  }

  const tasksCollectionRef = collection(db, 'tasks');
  const tasksSnapshot = await getDocs(tasksCollectionRef);
  if (tasksSnapshot.empty) {
    console.log('Tasks collection is empty, seeding data...');
    const batch = writeBatch(db);
    initialTasks.forEach((task) => {
      const docRef = doc(collection(db, 'tasks'));
      const newTask = {
        ...task,
        date: parseDateString(task.date),
        dueDate: parseDateString(task.dueDate),
        completionDate: parseDateString(task.completionDate),
      }
      batch.set(docRef, newTask);
    });
    await batch.commit();
    console.log('Database seeded with initial tasks.');
  } else {
    console.log('Tasks collection is not empty.');
  }
};


function TaskCard({ task, onTaskClick }) {
  if (!task) {
    return null; 
  }

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: task,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const isOverdue = task.dueDate && task.dueDate.seconds && new Date(task.dueDate.seconds * 1000) < new Date() && task.status !== 'Completed';

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "bg-card text-card-foreground p-4 rounded-lg shadow-sm mb-4 flex items-start",
        isOverdue && "border-2 border-red-500"
      )}
    >
      <div className="flex-grow cursor-pointer" onClick={() => onTaskClick(task)}>
        <p className="font-bold text-sm">{task.taskid}</p>
        <p className="text-xs text-muted-foreground mt-1">{task.desc}</p>
         {task.remarks && <p className="text-xs text-muted-foreground mt-1">Remarks: {task.remarks}</p>}
        <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
          <span>Date: {formatDate(task.date)}</span>
          <span>Due Date: {formatDate(task.dueDate)}</span>
           {task.importance && (
            <div className="flex items-center">
               <span className={cn("w-3 h-3 rounded-full mr-1", importanceColors[task.importance])}></span>
               {task.importance}
            </div>
           )}
        </div>
      </div>
       <div {...attributes} {...listeners} className="cursor-grab pl-2">
         <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
    </div>
  );
}

function KanbanColumn({ id, title, tasks, onTaskClick }) {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div ref={setNodeRef} className="bg-muted/50 rounded-lg p-4 w-full md:w-1/4 flex-shrink-0">
      <h2 className="text-lg font-semibold mb-4 text-foreground">{title} ({tasks.length})</h2>
      <div className="space-y-4">
        {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onTaskClick={onTaskClick} />
        ))}
      </div>
    </div>
  );
}

function TaskModal({ isOpen, onClose, task, setTask, onSave, onDelete }) {
    if (!isOpen) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTask(prev => ({ ...prev, [name]: value }));
    };
    
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        if (value) {
            const [year, month, day] = value.split('-');
            const dateString = `${day}/${month}/${year}`;
            setTask(prev => ({ ...prev, [name]: parseDateString(dateString) }));
        } else {
            setTask(prev => ({ ...prev, [name]: null }));
        }
    };

    const formatDateForInput = (timestamp) => {
        if (!timestamp || typeof timestamp.seconds !== 'number') return '';
        const d = new Date(timestamp.seconds * 1000);
        return d.toISOString().split('T')[0];
    }
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{task?.id ? 'Edit Task' : 'Add Task'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="taskid" className="text-right">Task ID</Label>
                  <Input id="taskid" name="taskid" value={task?.taskid || ''} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="desc" className="text-right">Description</Label>
                  <Textarea id="desc" name="desc" value={task?.desc || ''} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="remarks" className="text-right">Remarks</Label>
                  <Textarea id="remarks" name="remarks" value={task?.remarks || ''} onChange={handleChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="date" className="text-right">Date</Label>
                  <Input id="date" name="date" type="date" value={formatDateForInput(task?.date)} onChange={handleDateChange} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="dueDate" className="text-right">Due Date</Label>
                  <Input id="dueDate" name="dueDate" type="date" value={formatDateForInput(task?.dueDate)} onChange={handleDateChange} className="col-span-3" />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="status" className="text-right">Status</Label>
                   <select name="status" id="status" value={task?.status || 'Not Started'} onChange={handleChange} className="col-span-3 border rounded px-2 py-1 bg-input">
                       <option>Not Started</option>
                       <option>In Progress</option>
                       <option>For Review</option>
                       <option>Approved for Submission</option>
                       <option>Completed</option>
                   </select>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="subStatus" className="text-right">Sub-Status</Label>
                  <Input id="subStatus" name="subStatus" value={task?.subStatus || ''} onChange={handleChange} className="col-span-3" />
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="importance" className="text-right">Importance</Label>
                   <select name="importance" id="importance" value={task?.importance || ''} onChange={handleChange} className="col-span-3 border rounded px-2 py-1 bg-input">
                        <option value="">None</option>
                       <option>Low</option>
                       <option>Medium</option>
                       <option>High</option>
                   </select>
              </div>
               <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="completionDate" className="text-right">Completion</Label>
                  <Input id="completionDate" name="completionDate" type="date" value={formatDateForInput(task?.completionDate)} onChange={handleDateChange} className="col-span-3" />
              </div>
          </div>
          <DialogFooter className="sm:justify-between">
            {task?.id && (
                <Button variant="destructive" onClick={() => onDelete(task.id)}>Delete</Button>
            )}
            <div>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={onSave}>Save changes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
}

export default function KanbanPage() {
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState({ workflowCategories: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    seedDatabase().then(() => {
        const settingsUnsub = onSnapshot(doc(db, 'settings', 'workflow'), (doc) => {
            if (doc.exists()) {
                setSettings(doc.data());
            }
            setIsLoading(false);
        });

        const tasksUnsub = onSnapshot(collection(db, 'tasks'), (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setTasks(fetchedTasks);
            setIsLoading(false);
        });

        return () => {
            settingsUnsub();
            tasksUnsub();
        };
    });
  }, []);

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
        const taskToUpdate = tasks.find(t => t.id === active.id);
        if (taskToUpdate && taskToUpdate.status !== over.id) {
            const taskRef = doc(db, 'tasks', active.id);
            await updateDoc(taskRef, { status: over.id });
        }
    }
  };
  
  const handleOpenModal = (task = null) => {
      const defaultTask = {
          taskid: '',
          date: Timestamp.now(),
          dueDate: null,
          status: 'Not Started',
          subStatus: '',
          importance: '',
          desc: '',
          remarks: '',
          completionDate: null
      };
      setSelectedTask(task ? { ...task } : defaultTask);
      setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };
  
  const handleSaveTask = async () => {
      if (!selectedTask) return;
      const taskToSave = { ...selectedTask };

      if (taskToSave.id) {
          const docRef = doc(db, 'tasks', taskToSave.id);
          const { id, ...dataToUpdate } = taskToSave;
          await updateDoc(docRef, dataToUpdate);
      } else {
          await addDoc(collection(db, 'tasks'), taskToSave);
      }
      handleCloseModal();
  };
  
  const handleDeleteTask = async (id) => {
      if (window.confirm('Are you sure you want to delete this task?')) {
          await deleteDoc(doc(db, 'tasks', id));
          handleCloseModal();
      }
  };

  const columns = useMemo(() => {
    return settings.workflowCategories.map(cat => cat.name);
  }, [settings.workflowCategories]);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="min-h-screen bg-background text-foreground p-4">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">KanbanFlow</h1>
          <div className="flex items-center gap-4">
            <Button onClick={() => handleOpenModal()} size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Task
            </Button>
            <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} variant="outline" size="icon">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </header>

        <main className="flex gap-6 overflow-x-auto pb-4">
          {columns.map((status) => (
            <KanbanColumn
              key={status}
              id={status}
              title={status}
              tasks={tasks.filter((task) => task.status === status)}
              onTaskClick={handleOpenModal}
            />
          ))}
        </main>
      </div>
      <TaskModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
        setTask={setSelectedTask}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
       />
    </DndContext>
  );
}
