
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
import { DndContext, useDraggable, useDroppable, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
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
import { PlusCircle, GripVertical, Moon, Sun, Settings, CheckCircle2, Pencil } from 'lucide-react';
import { useTheme } from "next-themes";
import { parse, isValid, format } from 'date-fns';
import Link from 'next/link';

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

const parseDateString = (dateString) => {
  if (!dateString) return null;
  const parsedDate = parse(dateString, 'dd/MM/yyyy', new Date());
  return isValid(parsedDate) ? Timestamp.fromDate(parsedDate) : null;
};

const formatDate = (timestamp) => {
    if (!timestamp) return '';
  
    let date;
    if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
      date = new Date(timestamp);
    } else {
      return '';
    }
  
    if (isValid(date)) {
      return format(date, 'MMM d, yyyy');
    }
    return '';
};

// Function to determine if a color is light or dark
function isColorLight(hexColor) {
    if (!hexColor) return true;
    const color = hexColor.charAt(0) === '#' ? hexColor.substring(1, 7) : hexColor;
    const r = parseInt(color.substring(0, 2), 16); // hexToR
    const g = parseInt(color.substring(2, 4), 16); // hexToG
    const b = parseInt(color.substring(4, 6), 16); // hexToB
    return ((r * 0.299) + (g * 0.587) + (b * 0.114)) > 186;
}


const seedDatabase = async () => {
  const settingsRef = doc(db, 'settings', 'workflow');
  const settingsSnap = await getDoc(settingsRef);

  if (!settingsSnap.exists()) {
    console.log('Settings not found, creating default settings...');
    const workflowCategories = [
      { name: 'Not Started', color: '#d1d5db', subStatuses: [] },
      { name: 'In Progress', color: '#60a5fa', subStatuses: [] },
      { name: 'For Review', color: '#facc15', subStatuses: [{ name: 'With Earl' }, { name: 'Pending Approval'}] },
      { name: 'Approved for Submission', color: '#4ade80', subStatuses: [{name: 'On-Hold'}, {name: 'On Tray'}] },
      { name: 'Completed', color: '#a78bfa', subStatuses: [] }
    ];
    await setDoc(settingsRef, {
      workflowCategories: workflowCategories,
      importanceLevels: [
        { name: 'High', color: '#ef4444' },
        { name: 'Medium', color: '#f59e0b' },
        { name: 'Low', color: '#10b981' },
      ],
      bidOrigins: [],
    });
    console.log('Default settings created.');
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


function TaskCard({ task, onEditClick, onCardClick, isExpanded, settings }) {
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
  
  const importance = settings.importanceLevels?.find(imp => imp.name === task.importance);
  const statusColor = settings.workflowCategories?.find(cat => cat.name === task.status)?.color || '#d1d5db';
  const textColor = isColorLight(statusColor) ? 'text-black' : 'text-white';


  return (
    <div
      ref={setNodeRef}
      style={{ ...style, backgroundColor: statusColor }}
      className={cn(
        `p-4 rounded-lg shadow-sm mb-4 flex items-start cursor-pointer`,
        isOverdue && "border-2 border-red-500",
        textColor
      )}
       onClick={() => onCardClick(task.id)}
    >
      <div className="flex-grow">
          <p className="font-bold text-sm">{task.taskid}</p>
          <div className="text-xs mt-1">
              <span>Due Date: {formatDate(task.dueDate)}</span>
          </div>

          <div className="mt-2 flex items-center gap-2">
            {task.subStatus && <span className="text-xs bg-black/20 px-2 py-1 rounded-full">{task.subStatus}</span>}
            {importance && (
              <div className="flex items-center text-xs">
                 <span style={{ backgroundColor: importance.color }} className="w-3 h-3 rounded-full mr-1.5"></span>
                 {task.importance}
              </div>
             )}
          </div>
        
         {isExpanded && (
            <div className="mt-4 pt-4 border-t border-black/20">
                <p className="text-sm font-semibold">Description:</p>
                <p className="text-sm mt-1">{task.desc || 'No description'}</p>
                
                <p className="text-sm font-semibold mt-2">Remarks:</p>
                <p className="text-sm mt-1">{task.remarks || 'No remarks'}</p>
                
                <p className="text-sm font-semibold mt-2">Date Started:</p>
                <p className="text-sm mt-1">{formatDate(task.date)}</p>

                {task.completionDate && (
                    <>
                        <p className="text-sm font-semibold mt-2">Completed:</p>
                        <p className="text-sm mt-1">{formatDate(task.completionDate)}</p>
                    </>
                )}
                
                <div className="mt-4 flex justify-end">
                    <Button 
                        onClick={(e) => { e.stopPropagation(); onEditClick(task); }} 
                        size="sm" 
                        className="bg-black/20 hover:bg-black/40"
                    >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit Task
                    </Button>
                </div>
            </div>
        )}
      </div>
       <div {...attributes} {...listeners} className="cursor-grab pl-2 self-start">
         <GripVertical className="h-5 w-5" />
      </div>
    </div>
  );
}

function KanbanColumn({ id, title, tasks, onEditClick, onCardClick, expandedTaskId, settings }) {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div ref={setNodeRef} className="bg-muted/50 rounded-lg p-4 w-full md:w-80 flex-shrink-0 flex flex-col">
      <h2 className="text-lg font-semibold mb-4 text-foreground flex items-center flex-shrink-0">
        {title}
        <span className="ml-2 bg-primary text-primary-foreground h-6 w-6 rounded-md flex items-center justify-center text-sm font-bold">
          {tasks.length}
        </span>
      </h2>
      <div className="flex-grow overflow-y-auto -mr-2 pr-2">
        {tasks.map((task) => (
            <TaskCard 
                key={task.id} 
                task={task} 
                onEditClick={onEditClick} 
                settings={settings}
                onCardClick={onCardClick}
                isExpanded={expandedTaskId === task.id}
            />
        ))}
      </div>
    </div>
  );
}

function CompletionZone({ isDragging }) {
    const { setNodeRef } = useDroppable({
        id: 'completion-zone',
    });

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'fixed top-0 right-0 h-full w-24 bg-green-500/20 flex items-center justify-center transition-transform duration-300 ease-in-out',
                isDragging ? 'translate-x-0' : 'translate-x-full'
            )}
        >
            <div className="text-center text-green-700">
                <CheckCircle2 className="h-8 w-8 mx-auto" />
                <p className="font-semibold mt-2">Complete</p>
            </div>
        </div>
    );
}

function TaskModal({ isOpen, onClose, task, setTask, onSave, onDelete, settings }) {
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
        if (!timestamp) return '';
        let date;
        if (timestamp.seconds) {
            date = new Date(timestamp.seconds * 1000);
        } else if (timestamp instanceof Date) {
            date = timestamp;
        } else if (typeof timestamp === 'string' || typeof timestamp === 'number') {
            date = new Date(timestamp);
        } else {
            return '';
        }
    
        if (isValid(date)) {
            return format(date, 'yyyy-MM-dd');
        }
        return '';
    };

    const currentSubStatuses = useMemo(() => {
        const category = settings.workflowCategories?.find(cat => cat.name === task?.status);
        return category?.subStatuses || [];
    }, [task?.status, settings.workflowCategories]);

    const isEditing = !!task?.id;
    const isSaveDisabled = !task?.taskid;
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Task' : 'Add Task'}</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
              {isEditing && (
                  <div className="text-sm text-muted-foreground">
                      <p>Date Started: {formatDate(task.date)}</p>
                  </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="taskid">Task ID</Label>
                    <Input id="taskid" name="taskid" value={task?.taskid || ''} onChange={handleChange} />
                 </div>
                 <div className="space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input id="dueDate" name="dueDate" type="date" value={formatDateForInput(task?.dueDate)} onChange={handleDateChange} className="w-full" />
                 </div>
              </div>
              
              <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" name="desc" value={task?.desc || ''} onChange={handleChange} rows={1} />
              </div>
              
               <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="status">Status</Label>
                       <select name="status" id="status" value={task?.status || 'Not Started'} onChange={handleChange} className="w-full border rounded px-2 py-2 bg-input">
                           {settings.workflowCategories?.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                       </select>
                    </div>
                   <div className="space-y-2">
                      <Label htmlFor="subStatus">Sub-Status</Label>
                      <select name="subStatus" id="subStatus" value={task?.subStatus || ''} onChange={handleChange} className="w-full border rounded px-2 py-2 bg-input" disabled={currentSubStatuses.length === 0}>
                            <option value="">None</option>
                           {currentSubStatuses.map(sub => <option key={sub.name} value={sub.name}>{sub.name}</option>)}
                       </select>
                   </div>
              </div>
               <div className="space-y-2">
                  <Label htmlFor="importance">Importance</Label>
                   <select name="importance" id="importance" value={task?.importance || ''} onChange={handleChange} className="w-full border rounded px-2 py-2 bg-input">
                        <option value="">None</option>
                       {settings.importanceLevels?.map(imp => <option key={imp.name} value={imp.name}>{imp.name}</option>)}
                   </select>
              </div>
              
               <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea id="remarks" name="remarks" value={task?.remarks || ''} onChange={handleChange} rows={1}/>
              </div>

              {isEditing && task.completionDate && (
                <div className="space-y-2">
                  <Label htmlFor="completionDate">Completion</Label>
                  <Input id="completionDate" name="completionDate" type="text" value={formatDate(task?.completionDate)} disabled className="bg-muted/50 w-auto" />
              </div>
              )}
          </div>
          <DialogFooter className="sm:justify-between">
            {isEditing && (
                <Button variant="destructive" onClick={() => onDelete(task.id)}>Delete</Button>
            )}
            {!isEditing && <div />}
            <div>
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={onSave} disabled={isSaveDisabled}>Save changes</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
}

function SubStatusModal({ isOpen, onClose, onSave, subStatuses }) {
    const [selectedSubStatus, setSelectedSubStatus] = useState('');

    useEffect(() => {
        if (subStatuses.length > 0) {
            setSelectedSubStatus(subStatuses[0].name);
        }
    }, [subStatuses]);

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Select Sub-Status</DialogTitle>
                </DialogHeader>
                <div className="py-4">
                    <Label htmlFor="subStatusSelect">Sub-Status</Label>
                    <select
                        id="subStatusSelect"
                        value={selectedSubStatus}
                        onChange={(e) => setSelectedSubStatus(e.target.value)}
                        className="w-full border rounded px-2 py-2 bg-input mt-2"
                    >
                        {subStatuses.map(sub => (
                            <option key={sub.name} value={sub.name}>{sub.name}</option>
                        ))}
                    </select>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(selectedSubStatus)}>Save</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function KanbanPage() {
  const [tasks, setTasks] = useState([]);
  const [settings, setSettings] = useState({ workflowCategories: [], importanceLevels: [], bidOrigins: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const { theme, setTheme } = useTheme();
  const [activeId, setActiveId] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);

  const [isSubStatusModalOpen, setIsSubStatusModalOpen] = useState(false);
  const [subStatusData, setSubStatusData] = useState({ task: null, newStatus: '', subStatuses: [] });
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    seedDatabase().then(() => {
        const settingsUnsub = onSnapshot(doc(db, 'settings', 'workflow'), (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                // Ensure subStatuses is an array for each category
                if (data.workflowCategories) {
                    data.workflowCategories = data.workflowCategories.map(cat => ({ ...cat, subStatuses: cat.subStatuses || [] }));
                }
                setSettings(data);
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

  const handleDragStart = (event) => {
      setActiveId(event.active.id);
      setExpandedTaskId(null);
  };

  const handleDragEnd = async (event) => {
    setActiveId(null);
    const { active, over } = event;

    if (!over) return;

    const taskToUpdate = tasks.find(t => t.id === active.id);
    if (!taskToUpdate) return;

    if (over.id === 'completion-zone') {
        if (window.confirm('Are you sure you want to complete this task?')) {
            const updatedTask = {
                ...taskToUpdate,
                status: 'Completed',
                completionDate: Timestamp.now(),
            };
            handleOpenModal(updatedTask);
        }
    } else if (active.id !== over.id && taskToUpdate.status !== over.id) {
        const newStatus = over.id;
        const targetCategory = settings.workflowCategories.find(cat => cat.name === newStatus);
        
        if (targetCategory?.subStatuses && targetCategory.subStatuses.length > 0) {
            setSubStatusData({ task: taskToUpdate, newStatus, subStatuses: targetCategory.subStatuses });
            setIsSubStatusModalOpen(true);
        } else {
            const taskRef = doc(db, 'tasks', active.id);
            await updateDoc(taskRef, { status: newStatus, subStatus: '' });
        }
    }
  };
  
  const handleCardClick = (taskId) => {
    setExpandedTaskId(prevId => (prevId === taskId ? null : taskId));
  };

  const handleSubStatusSave = async (selectedSubStatus) => {
      const { task, newStatus } = subStatusData;
      const taskRef = doc(db, 'tasks', task.id);
      await updateDoc(taskRef, { status: newStatus, subStatus: selectedSubStatus });
      setIsSubStatusModalOpen(false);
      setSubStatusData({ task: null, newStatus: '', subStatuses: [] });
  };
  
  const handleOpenModal = (task = null) => {
      const defaultTask = {
          taskid: '',
          date: Timestamp.now(),
          dueDate: null,
          status: settings.workflowCategories?.[0]?.name || 'Not Started',
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
      if (!selectedTask || !selectedTask.taskid) return;
      const taskToSave = { ...selectedTask };
      
      const currentCategory = settings.workflowCategories.find(cat => cat.name === taskToSave.status);
      if (!currentCategory?.subStatuses?.some(sub => sub.name === taskToSave.subStatus)) {
          taskToSave.subStatus = '';
      }

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
    return settings.workflowCategories?.map(cat => cat.name).filter(name => name !== 'Completed') || [];
  }, [settings.workflowCategories]);

  const activeTask = activeId ? tasks.find(t => t.id === activeId) : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex flex-col h-screen bg-background text-foreground">
        <header className="flex-shrink-0 flex justify-between items-center p-4 border-b">
          <h1 className="text-2xl font-bold">KanbanFlow</h1>
          <div className="flex items-center gap-4">
            <Button onClick={() => handleOpenModal()} size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Task
            </Button>
            <Link href="/settings">
              <Button variant="outline" size="sm">
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
              </Button>
            </Link>
            <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} variant="outline" size="icon">
              <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
              <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
              <span className="sr-only">Toggle theme</span>
            </Button>
          </div>
        </header>

        <main className="flex-grow p-4 overflow-x-auto">
          <div className="flex gap-6 h-full">
            {columns.map((status) => (
              <KanbanColumn
                key={status}
                id={status}
                title={status}
                tasks={tasks.filter((task) => task.status === status)}
                onEditClick={handleOpenModal}
                onCardClick={handleCardClick}
                expandedTaskId={expandedTaskId}
                settings={settings}
              />
            ))}
          </div>
        </main>
        <CompletionZone isDragging={!!activeId} />
      </div>
      <TaskModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        task={selectedTask}
        setTask={setSelectedTask}
        onSave={handleSaveTask}
        onDelete={handleDeleteTask}
        settings={settings}
       />
        <SubStatusModal 
            isOpen={isSubStatusModalOpen}
            onClose={() => setIsSubStatusModalOpen(false)}
            onSave={handleSubStatusSave}
            subStatuses={subStatusData.subStatuses}
        />
        <DragOverlay>
            {activeTask ? (
                <TaskCard 
                    task={activeTask} 
                    settings={settings} 
                    onEditClick={() => {}} 
                    onCardClick={() => {}}
                    isExpanded={false}
                />
            ) : null}
        </DragOverlay>
    </DndContext>
  );
}
