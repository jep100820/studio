

// @ts-nocheck
'use client';

import { useEffect, useState, useMemo, Suspense, useRef } from 'react';
import {
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
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { DndContext, useDraggable, useDroppable, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { initialTasks } from '@/lib/seed-data';
import { cn } from '@/lib/utils';
import { PlusCircle, GripVertical, Moon, Sun, Settings, CheckCircle2, Pencil, LayoutDashboard, AlertTriangle, Calendar, Clock, Search, Sparkles, Plus, X, Filter as FilterIcon, Check } from 'lucide-react';
import { useTheme } from "next-themes";
import { parse, isValid, format, parseISO, startOfToday, isSameDay, isBefore, nextFriday, isFriday, isSaturday, addDays, endOfWeek, startOfWeek, isSunday, eachDayOfInterval, differenceInDays } from 'date-fns';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';


// A robust, unified date parsing function
const toDate = (dateInput) => {
    if (!dateInput) return null;

    // Firestore Timestamp
    if (typeof dateInput === 'object' && dateInput.seconds) {
        return new Date(dateInput.seconds * 1000);
    }
    
    // Javascript Date object
    if (dateInput instanceof Date) {
        return isValid(dateInput) ? dateInput : null;
    }

    // Number (milliseconds or seconds)
    if (typeof dateInput === 'number') {
        // If it's likely seconds, convert to milliseconds
        return dateInput > 10000000000 ? new Date(dateInput) : new Date(dateInput * 1000);
    }
    
    // String
    if (typeof dateInput === 'string') {
        // Handle both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm'
        let date = parseISO(dateInput); 
        if (isValid(date)) return date;

        date = parse(dateInput, 'dd/MM/yyyy', new Date()); // Try "dd/MM/yyyy"
        if (isValid(date)) return date;

        date = new Date(dateInput); // General fallback
        return isValid(date) ? date : null;
    }
    
    return null; // Return null if format is unknown
};

// Specifically for parsing strings into Timestamps for Firestore
const parseDateStringToTimestamp = (dateString) => {
    const date = toDate(dateString);
    return date ? Timestamp.fromDate(date) : null;
};

const formatDate = (dateInput, formatStr) => {
    const date = toDate(dateInput);
    if (!date) return '';
    return format(date, formatStr);
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
      urgencyLevels: [
        { name: 'Critical', color: '#dc2626' },
        { name: 'High', color: '#f97316' },
        { name: 'Medium', color: '#facc15' },
        { name: 'Low', color: '#4ade80' },
      ],
      customTags: [],
      enableTimeTracking: false,
    });
    console.log('Default settings created.');
  } else {
    // Logic to add urgencyLevels if they don't exist
    const settingsData = settingsSnap.data();
    if (!settingsData.urgencyLevels) {
        await updateDoc(settingsRef, {
            urgencyLevels: [
                { name: 'Critical', color: '#dc2626' },
                { name: 'High', color: '#f97316' },
                { name: 'Medium', color: '#facc15' },
                { name: 'Low', color: '#4ade80' },
            ]
        });
    }
  }
};

const getEffectiveUrgency = (task, urgencyLevels) => {
    if (!urgencyLevels || urgencyLevels.length === 0) {
        return { name: '', source: 'none' };
    }

    // --- Auto-calculated Urgency ---
    const dueDate = toDate(task.dueDate);
    let autoUrgencyName = urgencyLevels[urgencyLevels.length - 1]?.name || ''; // Default to lowest
    if (dueDate) {
        const today = startOfToday();
        const daysDiff = differenceInDays(dueDate, today);

        if (daysDiff < 0) autoUrgencyName = 'Critical';
        else if (daysDiff <= 2) autoUrgencyName = 'High';
        else if (daysDiff <= 5) autoUrgencyName = 'Medium';
        else autoUrgencyName = 'Low';
    }
    
    // --- Manual Urgency ---
    const manualUrgencyName = task.urgency;

    // If no manual urgency, return the auto-calculated one
    if (!manualUrgencyName) {
        return { name: autoUrgencyName, source: 'auto' };
    }

    // --- Comparison Logic ---
    // Lower index in the array means higher priority
    const manualIndex = urgencyLevels.findIndex(u => u.name === manualUrgencyName);
    const autoIndex = urgencyLevels.findIndex(u => u.name === autoUrgencyName);

    // If either isn't found in the settings, something is off, but we can provide fallbacks.
    if (manualIndex === -1) return { name: autoUrgencyName, source: 'auto' };
    if (autoIndex === -1) return { name: manualUrgencyName, source: 'manual' };

    // Compare indices: the lower index wins (higher priority)
    if (autoIndex < manualIndex) {
        return { name: autoUrgencyName, source: 'auto-override' };
    } else {
        return { name: manualUrgencyName, source: 'manual' };
    }
};


function TaskCard({ task, onEditClick, onCardClick, isExpanded, settings, isHighlighted }) {
  if (!task) {
    return null;
  }

  const cardRef = useRef(null);

  useEffect(() => {
    if (isHighlighted && cardRef.current) {
        cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [isHighlighted]);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: task.id,
    data: task,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
      }
    : undefined;

  const isOverdue = task.dueDate && toDate(task.dueDate) < startOfToday() && task.status !== 'Completed';
  
  const importance = settings.importanceLevels?.find(imp => imp.name === task.importance);
  
  const effectiveUrgency = getEffectiveUrgency(task, settings.urgencyLevels);
  const urgency = settings.urgencyLevels?.find(urg => urg.name === effectiveUrgency.name);

  const statusColor = settings.workflowCategories?.find(cat => cat.name === task.status)?.color || '#d1d5db';
  const textColor = isColorLight(statusColor) ? 'text-black' : 'text-white';
  const displayFormat = settings.enableTimeTracking ? 'MMM d, yyyy, h:mm a' : 'MMM d, yyyy';
  
  const indicatorStyle = {
    background: `linear-gradient(to right, ${importance?.color || 'transparent'} 50%, ${urgency?.color || 'transparent'} 50%)`,
  };


  return (
    <div
      ref={(node) => {
        setNodeRef(node);
        cardRef.current = node;
      }}
      style={{ backgroundColor: statusColor }}
      className={cn(
        `p-3 rounded-lg shadow-sm mb-4 flex items-start gap-3 transition-all duration-300 relative`,
        isOverdue && "border-2 border-red-500",
        isHighlighted && "ring-4 ring-offset-2 ring-primary ring-offset-background animate-pulse",
        textColor
      )}
    >
       <div
        title={`Importance: ${importance?.name || 'N/A'}\nUrgency: ${urgency?.name || 'N/A'}`}
        style={indicatorStyle}
        className="w-4 h-4 rounded-sm flex-shrink-0 mt-1 border border-black/20"
       />

      <div 
        className="flex-grow cursor-grab"
        onClick={() => onCardClick(task.id)}
        {...attributes} 
        {...listeners}
      >
          <p className="font-bold text-sm">{task.taskid}</p>
          <div className="text-xs mt-1">
              <span>Due: {formatDate(task.dueDate, displayFormat)}</span>
          </div>
          
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            {task.subStatus && <span className="text-xs bg-black/20 px-2 py-1 rounded-full">{task.subStatus}</span>}
             {task.tags && Object.entries(task.tags).map(([key, value]) => (
                value && <span key={key} className="text-xs bg-black/20 px-2 py-1 rounded-full">{value}</span>
             ))}
          </div>
        
        {isExpanded && (
            <div className="mt-4 pt-4 border-t border-black/20 space-y-1 text-sm">
                <p><span className="font-semibold">Description:</span> {task.desc || 'No description'}</p>
                <p><span className="font-semibold">Remarks:</span> {task.remarks || 'No remarks'}</p>
                <p><span className="font-semibold">Date Started:</span> {formatDate(task.date, displayFormat)}</p>

                {task.completionDate && (
                    <p><span className="font-semibold">Completed:</span> {formatDate(task.completionDate, displayFormat)}</p>
                )}

                {task.tags && Object.entries(task.tags).map(([key, value]) => (
                    value && <p key={key}><span className="font-semibold">{key}:</span> {value}</p>
                ))}
            </div>
        )}
      </div>
       <div 
          className="pl-2 self-start cursor-pointer" 
          onClick={(e) => { e.stopPropagation(); onEditClick(task); }}
        >
         <Pencil className="h-5 w-5" />
      </div>
    </div>
  );
}

function KanbanColumn({ id, title, tasks, onEditClick, onCardClick, expandedTaskId, settings, highlightedTaskId, activeId }) {
  const { setNodeRef } = useDroppable({
    id,
  });

  return (
    <div ref={setNodeRef} className="bg-muted/50 rounded-lg p-4 min-w-[300px] flex-1 flex flex-col h-full">
      <h2 className="text-lg font-semibold mb-4 text-foreground flex items-center flex-shrink-0">
        {title}
        <span className="ml-2 bg-primary text-primary-foreground h-6 w-6 rounded-md flex items-center justify-center text-sm font-bold">
          {tasks.length}
        </span>
      </h2>
      <div className="flex-grow overflow-y-auto -mr-2 pr-2">
        {tasks.map((task) => {
            if (activeId === task.id) {
                return null;
            }
            return (
                <TaskCard 
                    key={task.id} 
                    task={task} 
                    onEditClick={onEditClick} 
                    settings={settings}
                    onCardClick={onCardClick}
                    isExpanded={expandedTaskId === task.id}
                    isHighlighted={highlightedTaskId === task.id}
                />
            );
        })}
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

function TaskModal({ isOpen, onClose, task, setTask, onSave, onDelete, settings, isReadOnly, onSetReadOnly }) {
    if (!isOpen) return null;
    
    const isEditing = !!task?.id;
    
    const effectiveUrgency = getEffectiveUrgency(task, settings.urgencyLevels);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setTask(prev => ({ ...prev, [name]: value }));
    };

    const handleTagChange = (e) => {
        const { name, value } = e.target;
        setTask(prev => ({ 
            ...prev,
            tags: {
                ...prev.tags,
                [name]: value
            }
        }));
    };
    
    const handleDateChange = (e) => {
        const { name, value } = e.target;
        const timestamp = parseDateStringToTimestamp(value);
        setTask(prev => ({ ...prev, [name]: timestamp }));
    };

    const formatDateForInput = (timestamp) => {
        if (!timestamp) return '';
        const formatString = settings.enableTimeTracking ? "yyyy-MM-dd'T'HH:mm" : 'yyyy-dd-MM';
        return formatDate(timestamp, formatString);
    };

    const currentSubStatuses = useMemo(() => {
        const category = settings.workflowCategories?.find(cat => cat.name === task?.status);
        return category?.subStatuses || [];
    }, [task?.status, settings.workflowCategories]);

    const isSaveDisabled = !task?.taskid || !task?.dueDate;
    const displayFormat = settings.enableTimeTracking ? 'MMM d, yyyy, h:mm a' : 'MMM d, yyyy';
  
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{isEditing ? (isReadOnly ? 'View Task' : 'Edit Task') : 'Add Task'}</DialogTitle>
          </DialogHeader>
          <fieldset disabled={isReadOnly} className="py-4 space-y-6 max-h-[80vh] overflow-y-auto pr-4 group">
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4">
                  <div className="md:col-span-2 space-y-2">
                    <Label htmlFor="taskid">Task ID</Label>
                    <Input id="taskid" name="taskid" value={task?.taskid || ''} onChange={handleChange} />
                  </div>
                  <div className="md:col-span-1 space-y-2">
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input 
                      id="dueDate" 
                      name="dueDate" 
                      type={settings.enableTimeTracking ? "datetime-local" : "date"} 
                      value={formatDateForInput(task?.dueDate)} 
                      onChange={handleDateChange} 
                      className="w-full" 
                    />
                  </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                  <div className={cn("space-y-2", currentSubStatuses.length === 0 && "md:col-span-2")}>
                      <Label htmlFor="status">Status</Label>
                       <select name="status" id="status" value={task?.status || 'Not Started'} onChange={handleChange} className="w-full border rounded px-2 py-2.5 bg-input text-sm group-disabled:opacity-100">
                           {settings.workflowCategories?.map(cat => <option key={cat.name} value={cat.name}>{cat.name}</option>)}
                       </select>
                  </div>
                  {currentSubStatuses.length > 0 && (
                    <div className="space-y-2">
                        <Label htmlFor="subStatus">Sub-Status</Label>
                        <select name="subStatus" id="subStatus" value={task?.subStatus || ''} onChange={handleChange} className="w-full border rounded px-2 py-2.5 bg-input text-sm group-disabled:opacity-100">
                              <option value="">None</option>
                             {currentSubStatuses.map(sub => <option key={sub.name} value={sub.name}>{sub.name}</option>)}
                         </select>
                     </div>
                  )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(settings.importanceLevels && settings.importanceLevels.length > 0) && (
                    <div className="space-y-2">
                        <Label htmlFor="importance">Importance</Label>
                         <select name="importance" id="importance" value={task?.importance || ''} onChange={handleChange} className="w-full border rounded px-2 py-2.5 bg-input text-sm group-disabled:opacity-100">
                              <option value="">None</option>
                             {settings.importanceLevels?.map(imp => <option key={imp.name} value={imp.name}>{imp.name}</option>)}
                         </select>
                    </div>
                  )}
                   {(settings.urgencyLevels && settings.urgencyLevels.length > 0) && (
                    <div className="space-y-2">
                        <Label htmlFor="urgency">Urgency</Label>
                         <select name="urgency" id="urgency" value={task?.urgency || ''} onChange={handleChange} className="w-full border rounded px-2 py-2.5 bg-input text-sm group-disabled:opacity-100">
                              <option value="">Auto-Calculate</option>
                             {settings.urgencyLevels?.map(urg => <option key={urg.name} value={urg.name}>{urg.name}</option>)}
                         </select>
                         <p className="text-xs text-muted-foreground pt-1">Effective Urgency: <span className="font-bold">{effectiveUrgency.name}</span></p>
                    </div>
                  )}
                  {(settings.customTags && settings.customTags.length > 0) && settings.customTags?.map(mainTag => (
                    <div className="space-y-2" key={mainTag.name}>
                        <Label htmlFor={`tag-${mainTag.name}`}>{mainTag.name}</Label>
                        <select 
                            name={mainTag.name} 
                            id={`tag-${mainTag.name}`} 
                            value={task?.tags?.[mainTag.name] || ''} 
                            onChange={handleTagChange} 
                            className="w-full border rounded px-2 py-2.5 bg-input text-sm group-disabled:opacity-100"
                        >
                            <option value="">None</option>
                            {mainTag.tags.map(tag => <option key={tag.name} value={tag.name}>{tag.name}</option>)}
                        </select>
                    </div>
                  ))}
             </div>

              <div className="space-y-2">
                  <Label htmlFor="desc">Description</Label>
                  <Textarea id="desc" name="desc" value={task?.desc || ''} onChange={handleChange} />
              </div>
              
              <div className="space-y-2">
                  <Label htmlFor="remarks">Remarks</Label>
                  <Textarea id="remarks" name="remarks" value={task?.remarks || ''} onChange={handleChange} />
              </div>

              {isEditing && (
                 <div className="space-y-2">
                    <Label htmlFor="completionDate">Completion Date</Label>                    
                    <Input 
                      id="completionDate" 
                      name="completionDate" 
                      type={settings.enableTimeTracking ? "datetime-local" : "date"} 
                      value={formatDateForInput(task?.completionDate)} 
                      onChange={handleDateChange} 
                      className="w-full" 
                    />
                     <p className="text-xs text-muted-foreground pt-1">
                        Date Started: {formatDate(task.date, displayFormat)}
                    </p>
                </div>
              )}
          </fieldset>
          <DialogFooter className="sm:justify-between pt-4">
            <div>
                {isEditing && !isReadOnly && <Button variant="destructive" onClick={() => onDelete(task.id)}>Delete</Button>}
                {isEditing && isReadOnly && <Button variant="secondary" onClick={() => onSetReadOnly(false)}><Pencil className="h-4 w-4 mr-2"/>Edit</Button>}
                {!isEditing && <div />}
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              {!isReadOnly && <Button onClick={onSave} disabled={isSaveDisabled}>Save changes</Button>}
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

function DueDateWidget({ title, value, icon: Icon, color, onClick, disabled }) {
    return (
        <div
            onClick={!disabled ? onClick : undefined}
            className={cn(
                "flex items-center gap-2 p-2 rounded-md transition-colors",
                !disabled && "cursor-pointer hover:bg-muted",
                disabled && "cursor-not-allowed opacity-60"
            )}
        >
            <span className="font-semibold text-base">{value}</span>
            <span className="text-sm text-muted-foreground">{title}</span>
            <Icon className={cn("h-4 w-4", color)} />
        </div>
    );
}

function DueDateSummaryModal({ isOpen, onClose, title, tasks, onTaskClick, settings }) {
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                    <DialogDescription>
                        {tasks.length} task(s) in this category. Click a task to view it on the board.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-2 max-h-80 overflow-y-auto">
                    {tasks.length > 0 ? (
                        <ul className="space-y-2">
                            {tasks.map(task => (
                                <li key={task.id} onClick={() => onTaskClick(task.id)} className="text-sm p-3 rounded-md hover:bg-muted cursor-pointer border">
                                    <p className="font-semibold">{task.taskid}</p>
                                    <p className="text-xs text-muted-foreground mt-1">Status: {task.status}</p>
                                    <p className="text-xs text-muted-foreground">Due: {formatDate(task.dueDate, settings.enableTimeTracking ? 'MMM d, yyyy, h:mm a' : 'MMM d, yyyy')}</p>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No tasks in this category.</p>
                    )}
                </div>
                <DialogFooter>
                    <Button onClick={onClose}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

function DueDateSummary({ tasks, onTaskClick, settings }) {
    const [modalData, setModalData] = useState({ isOpen: false, title: '', tasks: [] });

    const { pastDue, dueToday, dueThisWeek } = useMemo(() => {
        const today = startOfToday();
        const workWeek = settings?.workWeek || ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const dayMapping = {'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3, 'Thursday': 4, 'Friday': 5, 'Saturday': 6};
        
        const workDayNumbers = workWeek.map(day => dayMapping[day]);
        const weekStart = startOfWeek(today);
        const weekEnd = endOfWeek(today);
        
        const allDaysInWeek = eachDayOfInterval({start: weekStart, end: weekEnd});
        const workDaysInWeek = allDaysInWeek.filter(day => workDayNumbers.includes(day.getDay()));
        const lastWorkDayOfWeek = workDaysInWeek[workDaysInWeek.length - 1] || today;

        const pastDue = tasks.filter(t => t.dueDate && isBefore(toDate(t.dueDate), today) && t.status !== 'Completed');
        const dueToday = tasks.filter(t => t.dueDate && isSameDay(toDate(t.dueDate), today) && t.status !== 'Completed');
        const dueThisWeek = tasks.filter(t => {
            if (!t.dueDate || t.status === 'Completed') return false;
            const dueDate = toDate(t.dueDate);
            // Check if the due date is after today and before or on the last workday of the week.
            return isBefore(today, dueDate) && !isSameDay(today, dueDate) && (isBefore(dueDate, lastWorkDayOfWeek) || isSameDay(dueDate, lastWorkDayOfWeek));
        });

        return { pastDue, dueToday, dueThisWeek };
    }, [tasks, settings]);

    const handleWidgetClick = (title, tasks) => {
        if (tasks.length > 0) {
            setModalData({ isOpen: true, title, tasks });
        }
    };

    const handleCloseModal = () => {
        setModalData({ isOpen: false, title: '', tasks: [] });
    };
    
    const handleTaskItemClick = (taskId) => {
        handleCloseModal();
        onTaskClick(taskId);
    };

    return (
        <div className="flex items-center gap-4">
            <DueDateWidget
                title="Past Due"
                value={pastDue.length}
                icon={AlertTriangle}
                color="text-red-500"
                onClick={() => handleWidgetClick('Past Due Tasks', pastDue)}
                disabled={pastDue.length === 0}
            />
            <DueDateWidget
                title="Due Today"
                value={dueToday.length}
                icon={Clock}
                color="text-amber-500"
                onClick={() => handleWidgetClick('Tasks Due Today', dueToday)}
                disabled={dueToday.length === 0}
            />
            <DueDateWidget
                title="Due this Week"
                value={dueThisWeek.length}
                icon={Calendar}
                color="text-blue-500"
                onClick={() => handleWidgetClick('Tasks Due this Week', dueThisWeek)}
                disabled={dueThisWeek.length === 0}
            />
            <DueDateSummaryModal 
                isOpen={modalData.isOpen}
                onClose={handleCloseModal}
                title={modalData.title}
                tasks={modalData.tasks}
                onTaskClick={handleTaskItemClick}
                settings={settings}
            />
        </div>
    );
}

function MultiSelectFilter({ options, selected, onSelectionChange }) {
    const selectedCount = Object.values(selected).reduce((acc, curr) => acc + curr.length, 0);

    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9">
                    <FilterIcon className="mr-2 h-4 w-4" />
                    Filter
                    {selectedCount > 0 && (
                        <>
                            <div className="mx-2 h-4 w-px bg-border" />
                            <Badge variant="secondary" className="rounded-sm px-1 font-normal">
                                {selectedCount}
                            </Badge>
                        </>
                    )}
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[250px] p-0" align="start" side="right">
                <Command>
                    <CommandInput placeholder="Search filters..." />
                    <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        {options.map((category) => (
                            <CommandGroup key={category.name} heading={category.name}>
                                {category.tags.map((tag) => {
                                    const isSelected = selected[category.name]?.includes(tag.name);
                                    return (
                                        <CommandItem
                                            key={tag.name}
                                            onSelect={() => onSelectionChange(category.name, tag.name)}
                                            className="flex items-center"
                                        >
                                            <Checkbox
                                                checked={isSelected}
                                                className="mr-2"
                                                id={`${category.name}-${tag.name}`}
                                            />
                                            <Label htmlFor={`${category.name}-${tag.name}`} className="flex-grow cursor-pointer">{tag.name}</Label>
                                        </CommandItem>
                                    );
                                })}
                            </CommandGroup>
                        ))}
                    </CommandList>
                    {selectedCount > 0 && (
                        <>
                            <CommandSeparator />
                            <CommandGroup>
                                <CommandItem
                                    onSelect={() => onSelectionChange('__clear__')}
                                    className="justify-center text-center"
                                >
                                    Clear filters
                                </CommandItem>
                            </CommandGroup>
                        </>
                    )}
                </Command>
            </PopoverContent>
        </Popover>
    );
}

function KanbanPageContent() {
  const [tasks, setTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [settings, setSettings] = useState({ workflowCategories: [], importanceLevels: [], urgencyLevels: [], customTags: [], enableTimeTracking: false, workWeek: [] });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModalReadOnly, setIsModalReadOnly] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const { theme, setTheme } = useTheme();
  const [activeId, setActiveId] = useState(null);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [highlightedTaskId, setHighlightedTaskId] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilters, setTagFilters] = useState({});

  const [isSubStatusModalOpen, setIsSubStatusModalOpen] = useState(false);
  const [subStatusData, setSubStatusData] = useState({ task: null, newStatus: '', subStatuses: [] });
  
  const searchParams = useSearchParams();
  const router = useRouter();

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
                if (data.workflowCategories) {
                    data.workflowCategories = data.workflowCategories.map(cat => ({ ...cat, subStatuses: cat.subStatuses || [] }));
                }
                setSettings(data);
            }
        });

        const tasksUnsub = onSnapshot(collection(db, 'tasks'), (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
            setAllTasks(fetchedTasks); // Store all tasks
            setTasks(fetchedTasks.filter(t => t.status !== 'Completed')); // For board display
            setIsLoading(false);
        });

        return () => {
            settingsUnsub();
            tasksUnsub();
        };
    });
  }, []);
  
  const handleOpenModal = (task = null) => {
      const defaultTask = {
          taskid: '',
          date: Timestamp.now(),
          dueDate: null,
          status: settings.workflowCategories?.[0]?.name || 'Not Started',
          subStatus: '',
          importance: '',
          urgency: '',
          desc: '',
          remarks: '',
          completionDate: null,
          tags: {},
          subStatusChangeCount: 0,
          lastModified: Timestamp.now(),
      };
      setSelectedTask(task ? { ...task } : defaultTask);
      setIsModalReadOnly(task ? (task.status === 'Completed' ? true : false) : false);
      setIsModalOpen(true);
  };
  
  useEffect(() => {
    const taskId = searchParams.get('taskId');
    const edit = searchParams.get('edit');

    if (taskId && allTasks.length > 0) {
        const taskToHandle = allTasks.find(t => t.id === taskId);

        if (taskToHandle) {
             handleOpenModal(taskToHandle);
             setIsModalReadOnly(edit !== 'true');
        }
        // Clean up URL to prevent re-triggering
        router.replace('/', {scroll: false});
    }
  }, [searchParams, allTasks]);


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

    const taskRef = doc(db, 'tasks', active.id);

    if (over.id === 'completion-zone') {
        if (window.confirm('Are you sure you want to complete this task?')) {
            const updatedTask = {
                ...taskToUpdate,
                status: 'Completed',
                completionDate: taskToUpdate.completionDate || Timestamp.now(),
                lastModified: Timestamp.now(),
            };
            await updateDoc(taskRef, { 
                status: 'Completed', 
                completionDate: updatedTask.completionDate,
                lastModified: updatedTask.lastModified,
            });
            handleOpenModal(updatedTask);
        }
    } else if (active.id !== over.id && taskToUpdate.status !== over.id) {
        const newStatus = over.id;
        const targetCategory = settings.workflowCategories.find(cat => cat.name === newStatus);
        
        if (targetCategory?.subStatuses && targetCategory.subStatuses.length > 0) {
            setSubStatusData({ task: taskToUpdate, newStatus, subStatuses: targetCategory.subStatuses });
            setIsSubStatusModalOpen(true);
        } else {
            await updateDoc(taskRef, { status: newStatus, subStatus: '', lastModified: Timestamp.now() });
        }
    }
  };
  
  const handleCardClick = (taskId) => {
    setExpandedTaskId(prevId => (prevId === taskId ? null : taskId));
  };
  
  const handleSummaryTaskClick = (taskId) => {
    setHighlightedTaskId(taskId);
    setExpandedTaskId(taskId);
    // Use a timer to remove the highlight class after the animation
    setTimeout(() => {
        setHighlightedTaskId(null);
    }, 2000); // The duration of your pulse/highlight effect
  };

  const handleSubStatusSave = async (selectedSubStatus) => {
      const { task, newStatus } = subStatusData;
      const taskRef = doc(db, 'tasks', task.id);
      const currentSubStatusChangeCount = task.subStatusChangeCount || 0;

      await updateDoc(taskRef, { 
          status: newStatus, 
          subStatus: selectedSubStatus,
          lastModified: Timestamp.now(),
          subStatusChangeCount: currentSubStatusChangeCount + 1
       });
      setIsSubStatusModalOpen(false);
      setSubStatusData({ task: null, newStatus: '', subStatuses: [] });
  };
  

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTask(null);
  };
  
  const handleSaveTask = async () => {
      if (!selectedTask || !selectedTask.taskid || !selectedTask.dueDate) return;
      const taskToSave = { 
          ...selectedTask,
          lastModified: Timestamp.now(),
      };
      
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

    const handleFilterChange = (category, value) => {
        if (category === '__clear__') {
            setTagFilters({});
            return;
        }

        setTagFilters(prev => {
            const newFilters = { ...prev };
            const currentSelection = newFilters[category] || [];
            
            if (currentSelection.includes(value)) {
                newFilters[category] = currentSelection.filter(item => item !== value);
            } else {
                newFilters[category] = [...currentSelection, value];
            }
            
            // If a category has no items selected, remove it from the filter object
            if (newFilters[category].length === 0) {
                delete newFilters[category];
            }
            
            return newFilters;
        });
    };

    const filterOptions = useMemo(() => {
        const options = [];

        if (settings.importanceLevels?.length > 0) {
            options.push({
                name: 'Importance',
                tags: settings.importanceLevels.map(imp => ({ name: imp.name }))
            });
        }
        
        if (settings.urgencyLevels?.length > 0) {
            options.push({
                name: 'Urgency',
                tags: settings.urgencyLevels.map(urg => ({ name: urg.name }))
            });
        }

        if (settings.customTags?.length > 0) {
            options.push(...settings.customTags);
        }

        return options;
    }, [settings]);


    const filteredTasks = useMemo(() => {
        let tasksToFilter = tasks;

        // Apply search term filter
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            tasksToFilter = tasksToFilter.filter(task => 
                (task.taskid?.toLowerCase().includes(lowercasedTerm)) ||
                (task.desc?.toLowerCase().includes(lowercasedTerm)) ||
                (task.remarks?.toLowerCase().includes(lowercasedTerm))
            );
        }

        // Apply tag filters
        const activeTagFilters = Object.entries(tagFilters);
        if (activeTagFilters.length > 0) {
            tasksToFilter = tasksToFilter.filter(task => {
                return activeTagFilters.every(([category, selectedValues]) => {
                    if (!selectedValues || selectedValues.length === 0) {
                        return true;
                    }
                    if (category === 'Importance') {
                        return selectedValues.includes(task.importance);
                    }
                    if (category === 'Urgency') {
                        const effectiveUrgency = getEffectiveUrgency(task, settings.urgencyLevels);
                        return selectedValues.includes(effectiveUrgency.name);
                    }
                    return selectedValues.includes(task.tags?.[category]);
                });
            });
        }
        
        return tasksToFilter;
    }, [tasks, searchTerm, tagFilters, settings.urgencyLevels]);


    const sortedTasks = useMemo(() => {
        const importanceOrder = { 'High': 1, 'Medium': 2, 'Low': 3 };
        
        return filteredTasks.slice().sort((a, b) => {
            const dateA = toDate(a.dueDate);
            const dateB = toDate(b.dueDate);
            if (dateA && !dateB) return -1;
            if (!dateA && dateB) return 1;
            if (dateA && dateB) {
                if (dateA < dateB) return -1;
                if (dateA > dateB) return 1;
            }
            const importanceA = importanceOrder[a.importance] || 4;
            const importanceB = importanceOrder[b.importance] || 4;
            if (importanceA < importanceB) return -1;
            if (importanceA > importanceB) return 1;
            
            return 0;
        });
    }, [filteredTasks]);

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
        <header className="flex-shrink-0 flex items-center justify-between p-4 border-b gap-4">
          <div className="flex items-center gap-4 flex-shrink-0">
            <h1 className="text-2xl font-bold">KanbanFlow</h1>
            <DueDateSummary tasks={tasks} onTaskClick={handleSummaryTaskClick} settings={settings} />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button onClick={() => handleOpenModal()} size="sm">
              <PlusCircle className="h-4 w-4 mr-2" />
              Add Task
            </Button>
            <Link href="/dashboard">
              <Button variant="outline" size="sm">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
              </Button>
            </Link>
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

        <div className="p-4 border-b flex items-center gap-4">
            <div className="relative flex-grow max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search by Task ID, Description, Remarks..."
                    className="pl-9"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            {filterOptions.length > 0 && (
                <MultiSelectFilter
                    options={filterOptions}
                    selected={tagFilters}
                    onSelectionChange={handleFilterChange}
                />
            )}
        </div>
        
        <main className="flex-grow p-4 flex gap-6 overflow-hidden">
          {columns.map((status) => (
            <KanbanColumn
              key={status}
              id={status}
              title={status}
              tasks={sortedTasks.filter((task) => task.status === status)}
              onEditClick={handleOpenModal}
              onCardClick={handleCardClick}
              expandedTaskId={expandedTaskId}
              settings={settings}
              highlightedTaskId={highlightedTaskId}
              activeId={activeId}
            />
          ))}
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
        isReadOnly={isModalReadOnly}
        onSetReadOnly={setIsModalReadOnly}
       />
        <SubStatusModal 
            isOpen={isSubStatusModalOpen}
            onClose={() => setIsSubStatusModalOpen(false)}
            onSave={handleSubStatusSave}
            subStatuses={subStatusData.subStatuses}
        />
        <DragOverlay dropAnimation={null}>
            {activeTask ? (
                <div style={{ transform: 'rotate(0deg)' }}>
                  <TaskCard 
                      task={activeTask} 
                      settings={settings} 
                      onEditClick={() => {}} 
                      onCardClick={() => {}}
                      isExpanded={false}
                  />
                </div>
            ) : null}
        </DragOverlay>
    </DndContext>
  );
}

export default function KanbanPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <KanbanPageContent />
        </Suspense>
    );
}

