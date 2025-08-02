
// @ts-nocheck
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, updateDoc, getDoc, collection, getDocs, writeBatch, query, where, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as SettingsCardDescription } from '@/components/ui/card';
import { X, Plus, Paintbrush, GripVertical, ChevronDown, ChevronUp, Undo, Save, Upload, Download, Moon, Sun, LayoutDashboard, Settings, Info, Loader2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import isEqual from 'lodash.isequal';
import { format, parseISO, isValid } from 'date-fns';
import { useTheme } from 'next-themes';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';


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

// A more robust date parser for import
const parseDateString = (dateString) => {
    if (!dateString) return null;
    // Check for full ISO 8601 date-time string
    if (typeof dateString === 'string' && dateString.includes('T')) {
        const date = parseISO(dateString);
        return isValid(date) ? Timestamp.fromDate(date) : null;
    }
     // Check for date-only string
    if (typeof dateString === 'string' && dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = parseISO(dateString);
        return isValid(date) ? Timestamp.fromDate(date) : null;
    }
    const date = new Date(dateString); // General fallback
    return isValid(date) ? Timestamp.fromDate(date) : null;
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

function SubStatusManager({ parentId, subStatuses, onUpdate }) {
    const handleAdd = () => {
        const newSubStatus = { id: `sub-${Date.now()}`, name: 'New Sub-Status' };
        const newSubStatuses = [...subStatuses, newSubStatus];
        onUpdate(parentId, newSubStatuses);
    };

    const handleRemove = (subId) => {
        const newSubStatuses = subStatuses.filter((s) => s.id !== subId);
        onUpdate(parentId, newSubStatuses);
    };

    const handleChange = (subId, value) => {
        const newSubStatuses = subStatuses.map(s => s.id === subId ? { ...s, name: value } : s);
        onUpdate(parentId, newSubStatuses);
    };

    return (
        <div className="p-3 mt-2 space-y-3 bg-muted/50 rounded-lg ml-10">
            <div className="space-y-2">
                {subStatuses?.map((sub) => (
                    <div key={sub.id} className="flex items-center gap-2">
                        <Input
                            value={sub.name}
                            onChange={(e) => handleChange(sub.id, e.target.value)}
                            className="flex-grow bg-background h-9"
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(sub.id)} className="h-9 w-9">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
            <Button onClick={handleAdd} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Sub-Status
            </Button>
        </div>
    );
}

function SortableItem({ id, item, onUpdate, onRemove, onToggleExpand, hasSubStatuses, onSubStatusUpdate, hasColor = true }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(item.name);
    const inputRef = useRef(null);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };
    
    useEffect(() => {
        setName(item.name);
    }, [item.name]);

    const handleNameChange = (newName) => {
        setName(newName);
    };
    
    const handleBlur = () => {
        setIsEditing(false);
        if(name !== item.name) {
            onUpdate(id, { ...item, name });
        }
    };

    const handleColorChange = (newColor) => {
        onUpdate(id, { ...item, color: newColor });
    };

    const toggleEdit = () => {
        setIsEditing(true);
    };

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.select();
        }
    }, [isEditing]);

    const textColor = hasColor && item.color && !isColorLight(item.color) ? 'text-white' : 'text-foreground';
    const bgColor = hasColor ? item.color : 'hsl(var(--card))';
    
    const subStatusSummary = useMemo(() => {
        if (!hasSubStatuses || !item.subStatuses) return '';
        if (item.subStatuses.length === 0) return '(No substatus)';
        return `(${item.subStatuses.map(s => s.name).join(', ')})`;
    }, [item.subStatuses, hasSubStatuses]);

    return (
        <div className="mb-3">
             <div ref={setNodeRef} style={style} className="flex items-center gap-2">
                <div {...attributes} {...listeners} className="cursor-grab p-2 self-stretch flex items-center bg-card rounded-l-lg border-y border-l">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>

                <div 
                    className="flex-grow flex items-center p-3 rounded-r-lg shadow-sm"
                    style={{ backgroundColor: bgColor }}
                >
                    {isEditing ? (
                        <Input
                            ref={inputRef}
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                            onBlur={handleBlur}
                            className={cn("flex-grow font-semibold border-2 border-primary", textColor, "text-foreground")}
                        />
                    ) : (
                        <span className={cn("flex-grow font-semibold", textColor)}>{item.name}</span>
                    )}

                    <span className={cn("text-xs mx-4", textColor, "opacity-80")}>
                        {subStatusSummary}
                    </span>

                    <div className={cn("flex items-center gap-1 ml-auto", textColor)}>
                         <Button variant="ghost" size="icon" onClick={toggleEdit} className={cn("hover:bg-black/10 w-8 h-8", textColor)}>
                            <Pencil className="h-4 w-4" />
                        </Button>
                        {hasColor && (
                            <div className="relative w-8 h-8 flex items-center justify-center">
                                <label htmlFor={`color-${id}`} className="cursor-pointer w-full h-full flex items-center justify-center">
                                    <Paintbrush className="h-4 w-4" />
                                </label>
                                <Input
                                    id={`color-${id}`}
                                    type="color"
                                    value={item.color || '#ffffff'}
                                    onChange={(e) => handleColorChange(e.target.value)}
                                    className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                                />
                            </div>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => onRemove(id)} className={cn("hover:bg-black/10 w-8 h-8", textColor)}>
                            <X className="h-4 w-4" />
                        </Button>
                         {hasSubStatuses && (
                            <Button variant="ghost" size="icon" onClick={() => onToggleExpand(id)} className={cn("hover:bg-black/10 w-8 h-8", textColor)}>
                                {item.isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                        )}
                    </div>
                </div>
            </div>
             {hasSubStatuses && item.isExpanded && (
                 <SubStatusManager
                    parentId={id}
                    subStatuses={item.subStatuses || []}
                    onUpdate={onSubStatusUpdate}
                />
             )}
        </div>
    );
}

function SettingsSection({ items, onUpdate, onAddItem, fieldName, hasSubStatuses = false, hasColor = true }) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );
    
    const displayedItems = useMemo(() => {
        if (fieldName === 'workflowCategories') {
            return items?.filter(item => item.name !== 'Completed') || [];
        }
        return items || [];
    }, [items, fieldName]);

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const oldIndex = items.findIndex(item => item.id === active.id);
            const newIndex = items.findIndex(item => item.id === over.id);
            const newItems = arrayMove(items, oldIndex, newIndex);
            onUpdate(fieldName, newItems);
        }
    };
    
    const handleItemUpdate = (itemId, newItem) => {
        const newItems = items.map(item => (item.id === itemId ? newItem : item));
        onUpdate(fieldName, newItems);
    }
    
    const handleSubStatusUpdate = (parentItemId, newSubStatuses) => {
        const newItems = items.map(item =>
            item.id === parentItemId
                ? { ...item, subStatuses: newSubStatuses }
                : item
        );
        onUpdate(fieldName, newItems);
    };

    const handleToggleExpand = (itemId) => {
        const newItems = items.map(item =>
            item.id === itemId
                ? { ...item, isExpanded: !item.isExpanded }
                : item
        );
        onUpdate(fieldName, newItems);
    }
    
    const handleRemoveItem = (itemId) => {
        const newItems = items.filter((item) => item.id !== itemId);
        onUpdate(fieldName, newItems);
    };

    const itemIds = useMemo(() => displayedItems?.map(it => it.id) || [], [displayedItems]);
    
    return (
        <Card>
            <CardContent className="pt-6">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                        <div>
                           {displayedItems?.map((item, index) => (
                                <SortableItem
                                    key={item.id}
                                    id={item.id}
                                    item={item}
                                    onUpdate={handleItemUpdate}
                                    onRemove={() => handleRemoveItem(item.id)}
                                    onToggleExpand={handleToggleExpand}
                                    hasSubStatuses={hasSubStatuses}
                                    onSubStatusUpdate={handleSubStatusUpdate}
                                    hasColor={hasColor}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
                <Button onClick={() => onAddItem(fieldName)} variant="outline" size="sm" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New
                </Button>
            </CardContent>
        </Card>
    );
}

function CustomTagsSection({ settings, onUpdate }) {
    const customTags = settings.customTags || [];

    const handleAddMainTag = () => {
        if (customTags.length >= 4) return;
        const newMainTag = {
            id: `tagcat-${Date.now()}`,
            name: `New Tag Category ${customTags.length + 1}`,
            tags: [],
        };
        onUpdate('customTags', [...customTags, newMainTag]);
    };

    const handleRemoveMainTag = (id) => {
        const newCustomTags = customTags.filter((t) => t.id !== id);
        onUpdate('customTags', newCustomTags);
    };

    const handleMainTagUpdate = (id, updatedMainTag) => {
        const newCustomTags = customTags.map(t => t.id === id ? updatedMainTag : t);
        onUpdate('customTags', newCustomTags);
    };

    const handleAddSubTag = (mainId) => {
        const newCustomTags = [...customTags];
        const mainTagIndex = newCustomTags.findIndex(t => t.id === mainId);
        if (mainTagIndex === -1 || newCustomTags[mainTagIndex].tags.length >= 10) return;
        
        const newSubTag = { id: `subtag-${Date.now()}`, name: 'New Tag' };
        newCustomTags[mainTagIndex].tags.push(newSubTag);
        onUpdate('customTags', newCustomTags);
    };

    const handleRemoveSubTag = (mainId, subId) => {
        const newCustomTags = [...customTags];
        const mainTagIndex = newCustomTags.findIndex(t => t.id === mainId);
        if (mainTagIndex === -1) return;

        newCustomTags[mainTagIndex].tags = newCustomTags[mainTagIndex].tags.filter((st) => st.id !== subId);
        onUpdate('customTags', newCustomTags);
    };

    const handleSubTagUpdate = (mainId, subId, updatedSubTag) => {
        const newCustomTags = [...customTags];
        const mainTagIndex = newCustomTags.findIndex(t => t.id === mainId);
        if (mainTagIndex === -1) return;
        
        newCustomTags[mainTagIndex].tags = newCustomTags[mainTagIndex].tags.map(st => st.id === subId ? updatedSubTag : st);
        onUpdate('customTags', newCustomTags);
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-4">
                    {customTags.map((mainTag) => (
                        <div key={mainTag.id} className="p-4 border rounded-lg">
                            <SortableItem
                                id={mainTag.id}
                                item={mainTag}
                                onUpdate={handleMainTagUpdate}
                                onRemove={() => handleRemoveMainTag(mainTag.id)}
                                hasColor={false}
                                hasSubStatuses={false}
                            />
                            <div className="pl-10 mt-4 space-y-2">
                                {mainTag.tags.map(subTag => (
                                    <SortableItem
                                        key={subTag.id}
                                        id={subTag.id}
                                        item={subTag}
                                        onUpdate={(id, updated) => handleSubTagUpdate(mainTag.id, id, updated)}
                                        onRemove={() => handleRemoveSubTag(mainTag.id, subTag.id)}
                                        hasColor={false}
                                        hasSubStatuses={false}
                                    />
                                ))}
                                {mainTag.tags.length < 10 && (
                                     <Button variant="outline" size="sm" onClick={() => handleAddSubTag(mainTag.id)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Tag
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                 {customTags.length < 4 && (
                    <Button onClick={handleAddMainTag} variant="outline" size="sm" className="mt-4">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Tag Category
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}

function AccordionSection({ title, children, summary }) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="border rounded-lg mb-4">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex justify-between items-start text-left p-4"
            >
                <div className="flex flex-col">
                    <span className="font-semibold">{title}</span>
                     {!isOpen && (
                         <span className="text-sm text-muted-foreground mt-1 pr-4 truncate max-w-full">
                            {summary}
                        </span>
                     )}
                </div>
                {isOpen ? <ChevronUp className="h-5 w-5 flex-shrink-0" /> : <ChevronDown className="h-5 w-5 flex-shrink-0" />}
            </button>
            {isOpen && <div className="p-4 pt-0">{children}</div>}
        </div>
    );
}


function ImportConfirmationDialog({ isOpen, onCancel, onConfirm, fileName }) {
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onCancel}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Data Import</DialogTitle>
                    <DialogDescription>
                        You are about to import tasks from <strong>{fileName}</strong>. This will overwrite tasks with the same Task ID and add new ones. This action cannot be undone.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                    <Button variant="ghost" onClick={onCancel}>Cancel</Button>
                    <Button onClick={onConfirm}>Confirm & Import</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}


function ImportExportCard() {
    const importFileRef = useRef(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importDialog, setImportDialog] = useState({ isOpen: false, file: null });


    const handleExport = async () => {
        const tasksQuery = query(collection(db, 'tasks'));
        const querySnapshot = await getDocs(tasksQuery);
        const tasksToExport = querySnapshot.docs.map(doc => {
            const data = doc.data();
            // Convert Timestamps to ISO strings for JSON
            const convertedData = { ...data };
            for (const key in convertedData) {
                if (convertedData[key] instanceof Timestamp) {
                    convertedData[key] = convertedData[key].toDate().toISOString();
                }
            }
            delete convertedData.id; // Don't export the Firestore document ID
            return convertedData;
        });

        const jsonString = JSON.stringify(tasksToExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'tasks.json');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleFileSelect = (event) => {
        const file = event.target.files[0];
        if (!file) return;
        setImportDialog({ isOpen: true, file: file });
        event.target.value = ''; // Reset file input
    };


    const handleConfirmImport = () => {
        const { file } = importDialog;
        if (!file) return;
        
        setImportDialog({ isOpen: false, file: null });
        setIsImporting(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const importedTasks = JSON.parse(e.target.result);
                if (!Array.isArray(importedTasks)) {
                    alert('Error: JSON file should contain an array of tasks.');
                    return;
                }

                const batch = writeBatch(db);
                for (const task of importedTasks) {
                    if (!task.taskid) continue; // Skip tasks without a taskid

                    const taskData = {
                        ...task,
                        date: parseDateString(task.date),
                        dueDate: parseDateString(task.dueDate),
                        completionDate: parseDateString(task.completionDate),
                    };

                    const tasksRef = collection(db, 'tasks');
                    const q = query(tasksRef, where("taskid", "==", task.taskid));
                    const querySnapshot = await getDocs(q);

                    if (!querySnapshot.empty) {
                        const existingDoc = querySnapshot.docs[0];
                        batch.update(existingDoc.ref, taskData);
                    } else {
                        const newDocRef = doc(collection(db, 'tasks'));
                        batch.set(newDocRef, taskData);
                    }
                }

                await batch.commit();
                alert('Import complete!');
            } catch (error) {
                console.error("Error parsing or importing JSON:", error);
                alert('Error importing file. Please ensure it is a valid JSON file. Check console for details.');
            } finally {
                 setIsImporting(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <>
            <CardContent>
                <div className="flex items-center gap-4">
                     <input type="file" ref={importFileRef} onChange={handleFileSelect} accept=".json" style={{ display: 'none' }} />
                    <Button onClick={() => importFileRef.current?.click()} variant="outline" disabled={isImporting}>
                        {isImporting ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Importing...
                            </>
                        ) : (
                             <>
                                <Upload className="h-4 w-4 mr-2" />
                                Import JSON
                             </>
                        )}
                    </Button>
                    <Button onClick={handleExport} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export JSON
                    </Button>
                </div>
            </CardContent>
            <ImportConfirmationDialog
                isOpen={importDialog.isOpen}
                onCancel={() => setImportDialog({ isOpen: false, file: null })}
                onConfirm={handleConfirmImport}
                fileName={importDialog.file?.name}
            />
        </>
    );
}

function GeneralSettingsCard({ settings, onUpdate }) {
    const handleSwitchChange = (fieldName, checked) => {
        onUpdate(fieldName, checked);
    };
    
    const handleWorkWeekChange = (day, checked) => {
        const currentWeek = settings.workWeek || [];
        let newWeek;
        if (checked) {
            newWeek = [...currentWeek, day];
        } else {
            newWeek = currentWeek.filter(d => d !== day);
        }
        onUpdate('workWeek', newWeek);
    }
    
    const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    return (
        <CardContent className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                    <Label htmlFor="time-tracking" className="text-base">Track time alongside date</Label>
                     <SettingsCardDescription>
                        Enable to use date and time pickers for due dates and completion dates.
                    </SettingsCardDescription>
                </div>
                <Switch
                    id="time-tracking"
                    checked={settings?.enableTimeTracking || false}
                    onCheckedChange={(checked) => handleSwitchChange('enableTimeTracking', checked)}
                />
            </div>
             <div className="rounded-lg border p-4">
                <div className="space-y-2">
                   <Label className="text-base">Work Week Configuration</Label>
                    <SettingsCardDescription>
                       Select the days to be considered 'workdays' for 'Due this Week' calculations.
                    </SettingsCardDescription>
                </div>
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                    {daysOfWeek.map(day => (
                        <div key={day} className="flex items-center space-x-2">
                             <Checkbox
                                id={`workday-${day}`}
                                checked={settings?.workWeek?.includes(day) || false}
                                onCheckedChange={(checked) => handleWorkWeekChange(day, checked)}
                            />
                            <Label htmlFor={`workday-${day}`}>{day}</Label>
                        </div>
                    ))}
                </div>
            </div>
        </CardContent>
    );
}

function DashboardSettingsCard({ settings, onUpdate }) {
    const handleChartVisibilityChange = (chartName, checked) => {
        const newCharts = { ...settings.dashboardSettings.charts, [chartName]: checked };
        onUpdate('dashboardSettings', { ...settings.dashboardSettings, charts: newCharts });
    };

    const handleStatVisibilityChange = (statName, checked) => {
        const newStats = { ...settings.dashboardSettings.stats, [statName]: checked };
        onUpdate('dashboardSettings', { ...settings.dashboardSettings, stats: newStats });
    };

    const chartConfig = [
        { key: 'taskStatus', label: 'Active Task Distribution' },
        { key: 'taskPriority', label: 'Completed by Priority' },
        { key: 'dailyActivity', label: 'Daily Activity Trend' },
        { key: 'bidOrigin', label: 'Performance by Bid Origin' },
        { key: 'weeklyCompletion', label: 'Weekly Completion Trend' },
        { key: 'dayOfWeekCompletion', label: 'Productivity by Day' },
    ];

    const statConfig = [
        { key: 'totalCompleted', label: 'Total Completed' },
        { key: 'overdue', label: 'Tasks Overdue' },
        { key: 'active', label: 'Active Tasks' },
        { key: 'avgTime', label: 'Avg. Completion Time' },
        { key: 'last7', label: 'Completed Last 7d' },
        { key: 'completedToday', label: 'Completed Today' },
        { key: 'createdToday', label: 'Created Today' },
        { key: 'completionRate', label: 'Completion Rate (7d)' },
        { key: 'inReview', label: 'Tasks in Review' },
        { key: 'stale', label: 'Stale Tasks (>7d)' },
        { key: 'avgSubStatusChanges', label: 'Avg. Sub-status Changes' },
    ];

    const chartSettings = settings?.dashboardSettings?.charts || {};
    const statSettings = settings?.dashboardSettings?.stats || {};
    
    const checkedChartsCount = useMemo(() => Object.values(chartSettings).filter(Boolean).length, [chartSettings]);
    const checkedStatsCount = useMemo(() => Object.values(statSettings).filter(Boolean).length, [statSettings]);

    const isChartLimitReached = checkedChartsCount >= 3;
    const isStatLimitReached = checkedStatsCount >= 6;


    return (
        <CardContent className="space-y-6">
            <div className="rounded-lg border p-4">
                <Label className="text-base">Visible Charts</Label>
                <SettingsCardDescription>Select which charts to display on the dashboard (up to 3).</SettingsCardDescription>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {chartConfig.map(({ key, label }) => (
                         <div key={key} className="flex items-center space-x-2">
                            <Checkbox id={`chart-${key}`} checked={!!chartSettings[key]} onCheckedChange={(c) => handleChartVisibilityChange(key, c)} disabled={!chartSettings[key] && isChartLimitReached} />
                            <Label htmlFor={`chart-${key}`}>{label}</Label>
                        </div>
                    ))}
                </div>
            </div>
            <div className="rounded-lg border p-4">
                <Label className="text-base">Visible Statistics</Label>
                <SettingsCardDescription>Select which stats to display in the Project Snapshot (up to 6).</SettingsCardDescription>
                 <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {statConfig.map(({ key, label }) => (
                         <div key={key} className="flex items-center space-x-2">
                            <Checkbox id={`stat-${key}`} checked={!!statSettings[key]} onCheckedChange={(c) => handleStatVisibilityChange(key, c)} disabled={!statSettings[key] && isStatLimitReached} />
                            <Label htmlFor={`stat-${key}`}>{label}</Label>
                        </div>
                    ))}
                 </div>
            </div>
        </CardContent>
    );
}


function UpdateTasksConfirmationDialog({ isOpen, onClose, onConfirm, changes }) {
    if (!isOpen || changes.length === 0) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Setting Renaming</DialogTitle>
                    <DialogDescription>
                        You have renamed the following items. Do you want to update all existing tasks to match?
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2 max-h-60 overflow-y-auto">
                    {changes.map((change, index) => (
                        <div key={index} className="text-sm p-2 rounded-md bg-muted">
                            {change.type && <span className="font-bold text-xs uppercase text-muted-foreground mr-2">{change.type}</span>}
                            Rename "<strong>{change.from}</strong>" to "<strong>{change.to}</strong>"
                        </div>
                    ))}
                    <p className="text-xs text-muted-foreground pt-2">
                        This action cannot be undone. Choosing 'Cancel' will save the setting change but will not update existing tasks.
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>Cancel</Button>
                    <Button onClick={onConfirm}>Update Tasks</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function SettingsPage() {
    const [settings, setSettings] = useState(null); // Local, editable settings
    const [originalSettings, setOriginalSettings] = useState(null); // Settings from Firestore
    const [isLoading, setIsLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [renameChanges, setRenameChanges] = useState([]);
    
    // Counter for new item IDs
    const nextIdCounter = useRef(Date.now());
    const getNextId = (prefix = 'item') => {
        nextIdCounter.current += 1;
        return `${prefix}-${nextIdCounter.current}`;
    };

    const addIdsToData = (data) => {
        if (data.workflowCategories) {
            data.workflowCategories = data.workflowCategories.map(cat => ({
                ...cat,
                id: cat.id || getNextId('cat'),
                subStatuses: (cat.subStatuses || []).map(sub => ({ ...sub, id: sub.id || getNextId('sub') }))
            }));
        }
        if (data.importanceLevels) {
            data.importanceLevels = data.importanceLevels.map(imp => ({ ...imp, id: imp.id || getNextId('imp') }));
        }
        if (data.customTags) {
            data.customTags = data.customTags.map(tag => ({
                ...tag,
                id: tag.id || getNextId('tag'),
                tags: (tag.tags || []).map(subTag => ({ ...subTag, id: subTag.id || getNextId('subtag') }))
            }));
        }
        return data;
    };


    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'workflow');
        const unsubscribe = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                let data = doc.data();
                 // --- MIGRATION & DEFAULTS ---
                if (data.bidOrigins && !data.customTags) {
                    data.customTags = [{
                        id: 'tagcat-bidorigin-migrated',
                        name: "Bid Origin",
                        tags: data.bidOrigins.map(bo => ({ id: getNextId('subtag'), name: bo.name }))
                    }];
                    delete data.bidOrigins; // Clean up old field
                }

                 if (data.workflowCategories) {
                    data.workflowCategories = data.workflowCategories.map(cat => ({ ...cat, isExpanded: false, subStatuses: cat.subStatuses || [] }));
                }
                if (!data.hasOwnProperty('enableTimeTracking')) data.enableTimeTracking = false;
                if (!data.hasOwnProperty('workWeek')) data.workWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                if (!data.hasOwnProperty('dashboardSettings')) {
                    data.dashboardSettings = {
                        charts: { taskStatus: true, taskPriority: true, dailyActivity: true, bidOrigin: true, weeklyCompletion: true, dayOfWeekCompletion: true },
                        stats: { totalCompleted: true, overdue: true, active: true, avgTime: true, last7: true, completedToday: true, createdToday: true, completionRate: true, inReview: true, stale: true, avgSubStatusChanges: true },
                    };
                }
                 if (!data.hasOwnProperty('customTags')) data.customTags = [];
                // --- END MIGRATION & DEFAULTS ---
                
                const dataWithIds = addIdsToData(data);
                const deepCopy = JSON.parse(JSON.stringify(dataWithIds));
                setSettings(deepCopy);
                setOriginalSettings(JSON.parse(JSON.stringify(dataWithIds)));
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        if (settings && originalSettings) {
             // Create copies without transient properties like isExpanded for comparison
            const cleanSettings = JSON.parse(JSON.stringify(settings));
            const cleanOriginalSettings = JSON.parse(JSON.stringify(originalSettings));

            if (cleanSettings.workflowCategories) {
                cleanSettings.workflowCategories.forEach(cat => delete cat.isExpanded);
            }
            if (cleanOriginalSettings.workflowCategories) {
                cleanOriginalSettings.workflowCategories.forEach(cat => delete cat.isExpanded);
            }
            setIsDirty(!isEqual(cleanSettings, cleanOriginalSettings));
        }
    }, [settings, originalSettings]);

    const handleSettingsUpdate = (fieldName, updatedItems) => {
        if (!settings) return;
        setSettings(prev => ({
            ...prev,
            [fieldName]: updatedItems,
        }));
    };
    
    const handleAddNewItem = (fieldName) => {
        if (!settings) return;
        const currentItems = settings[fieldName] || [];
        
        let i = 1;
        let newItemName = 'New Item';
        while (currentItems.some(item => item.name === newItemName)) {
            newItemName = `New Item ${i++}`;
        }
        
        let newItem = { id: getNextId(fieldName), name: newItemName };

        if(fieldName === 'workflowCategories') {
            newItem.color = '#cccccc';
            newItem.subStatuses = [];
            newItem.isExpanded = false;
        } else if (fieldName === 'importanceLevels') {
            newItem.color = '#cccccc';
        }

        const newItems = [...currentItems, newItem];
        handleSettingsUpdate(fieldName, newItems);
    };

    const handleSaveChanges = async () => {
        if (!originalSettings || !settings) return;

        // Clean up transient state before saving
        const settingsToSave = JSON.parse(JSON.stringify(settings));
        if (settingsToSave.workflowCategories) {
            settingsToSave.workflowCategories.forEach(cat => delete cat.isExpanded);
        }
        // Also remove IDs as they are client-side only for now
        const removeIds = (obj) => {
             if (Array.isArray(obj)) {
                obj.forEach(removeIds);
            } else if (obj !== null && typeof obj === 'object') {
                delete obj.id;
                Object.values(obj).forEach(removeIds);
            }
            return obj;
        };

        const findRenames = (original, current, type) => {
            const changes = [];
            if (!original || !current) return changes;

            const originalMap = new Map(original.map(item => [item.id, item.name]));
            
            current.forEach((item) => {
                const originalName = originalMap.get(item.id);
                if (originalName && originalName !== item.name) {
                    if (!current.some(i => i.name === originalName)) {
                        changes.push({ from: originalName, to: item.name, type, id: item.id });
                    }
                }
            });
            return changes;
        }
        
        const findTagRenames = (original, current) => {
            let changes = [];
            if (!original || !current) return changes;
            
            // Main tag category renames
            const mainTagRenames = findRenames(original, current, 'Tag Category');
            changes = changes.concat(mainTagRenames);
            
            // Sub-tag renames
            current.forEach((tagCategory) => {
                const originalCategory = original.find(c => c.id === tagCategory.id);
                if (originalCategory && originalCategory.name === tagCategory.name) { // Only check sub-tags if main tag name is same
                    const subTagRenames = findRenames(originalCategory.tags, tagCategory.tags, `Tag in ${tagCategory.name}`);
                    changes = changes.concat(subTagRenames);
                }
            });
            return changes;
        }

        const detectedChanges = [
            ...findRenames(originalSettings.workflowCategories, settings.workflowCategories, 'Status'),
            ...findRenames(originalSettings.importanceLevels, settings.importanceLevels, 'Importance'),
            ...findTagRenames(originalSettings.customTags, settings.customTags)
        ];

        if (detectedChanges.length > 0) {
            setRenameChanges(detectedChanges);
            setIsConfirmModalOpen(true);
        } else {
            await updateSettingsInDb(settingsToSave);
        }
    };
    
    const updateSettingsInDb = async (settingsToSave) => {
        const settingsRef = doc(db, 'settings', 'workflow');
        // Cleanse IDs before saving to Firestore
        const cleanseIds = (data) => {
            const cleansedData = JSON.parse(JSON.stringify(data));
            const walker = (obj) => {
                if (Array.isArray(obj)) {
                    obj.forEach(walker);
                } else if (obj && typeof obj === 'object') {
                    delete obj.id;
                    Object.values(obj).forEach(walker);
                }
            };
            walker(cleansedData);
            return cleansedData;
        };
        await updateDoc(settingsRef, cleanseIds(settingsToSave));
    };

    const handleConfirmUpdate = async () => {
        const settingsToSave = JSON.parse(JSON.stringify(settings));
        if (settingsToSave.workflowCategories) {
            settingsToSave.workflowCategories.forEach(cat => delete cat.isExpanded);
        }
        
        await updateSettingsInDb(settingsToSave);

        const batch = writeBatch(db);
        const tasksRef = collection(db, 'tasks');
        const tasksSnapshot = await getDocs(tasksRef);

        tasksSnapshot.forEach(taskDoc => {
            const taskData = taskDoc.data();
            let needsUpdate = false;
            const updates = {};

            for (const change of renameChanges) {
                switch(change.type) {
                    case 'Status':
                        if (taskData.status === change.from) {
                            updates.status = change.to;
                            needsUpdate = true;
                        }
                        break;
                    case 'Importance':
                         if (taskData.importance === change.from) {
                            updates.importance = change.to;
                            needsUpdate = true;
                        }
                        break;
                    case 'Tag Category':
                        // This case is tricky. We'd need to know the ID mapping.
                        // Assuming we handle rename by changing the key in tags object.
                        if (taskData.tags && typeof taskData.tags[change.from] !== 'undefined') {
                            updates[`tags.${change.to}`] = taskData.tags[change.from];
                            // This would require a field deletion which is special
                            // For simplicity, we can set it to null or an empty string if deletion is complex.
                            // updates[`tags.${change.from}`] = deleteField(); // Firestore specific
                            needsUpdate = true;
                        }
                        break;
                    default: // Sub-tag
                         if (change.type.startsWith('Tag in')) {
                            const categoryName = change.type.replace('Tag in ', '');
                             if (taskData.tags && taskData.tags[categoryName] === change.from) {
                                updates[`tags.${categoryName}`] = change.to;
                                needsUpdate = true;
                            }
                        }
                        break;
                }
            }
             // For tag category renames, we need a more robust way to update the keys in the `tags` map.
             // The above `tags.${change.to}` works for adding, but not renaming a key.
             // A read-modify-write is safer here.
            const tagCategoryChange = renameChanges.find(c => c.type === 'Tag Category' && taskData.tags && taskData.tags.hasOwnProperty(c.from));
            if (tagCategoryChange) {
                const newTags = { ...taskData.tags };
                newTags[tagCategoryChange.to] = newTags[tagCategoryChange.from];
                delete newTags[tagCategoryChange.from];
                updates.tags = newTags;
                needsUpdate = true;
            }


            if (needsUpdate) {
                batch.update(taskDoc.ref, updates);
            }
        });

        await batch.commit();
        
        setIsConfirmModalOpen(false);
        setRenameChanges([]);
    };
    
    const handleCancelConfirmation = async () => {
        const settingsToSave = JSON.parse(JSON.stringify(settings));
        if (settingsToSave.workflowCategories) {
            settingsToSave.workflowCategories.forEach(cat => delete cat.isExpanded);
        }
        await updateSettingsInDb(settingsToSave);
        setIsConfirmModalOpen(false);
        setRenameChanges([]);
    }

    const handleCancelChanges = () => {
        setSettings(JSON.parse(JSON.stringify(originalSettings)));
    };

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading settings...</div>;
    }

    return (
        <>
            <div className="flex flex-col h-screen bg-background text-foreground">
                <header className="flex-shrink-0 flex justify-between items-center p-4 border-b">
                    <h1 className="text-2xl font-bold">Settings</h1>
                     <div className="flex items-center gap-2">
                        <Button onClick={handleSaveChanges} disabled={!isDirty}>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </Button>
                        <Button onClick={handleCancelChanges} variant="outline" disabled={!isDirty}>
                            <Undo className="h-4 w-4 mr-2" />
                            Cancel
                        </Button>
                        <Link href="/">
                            <Button variant="outline">Back to Board</Button>
                        </Link>
                        <Link href="/dashboard">
                          <Button variant="outline" size="sm">
                              <LayoutDashboard className="h-4 w-4 mr-2" />
                              Dashboard
                          </Button>
                        </Link>
                        <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} variant="outline" size="icon">
                          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                          <span className="sr-only">Toggle theme</span>
                        </Button>
                    </div>
                </header>
                <main className="flex-grow p-4 md:p-8 overflow-y-auto">
                    <div className="max-w-3xl mx-auto">
                        
                        <AccordionSection 
                            title="Workflow Statuses"
                            summary={settings?.workflowCategories?.filter(c => c.name !== 'Completed').map(c => c.name).join(', ') || 'No statuses configured.'}
                        >
                            <SettingsSection
                                items={settings?.workflowCategories}
                                onUpdate={handleSettingsUpdate}
                                onAddItem={handleAddNewItem}
                                fieldName="workflowCategories"
                                hasSubStatuses={true}
                            />
                        </AccordionSection>

                        <AccordionSection 
                            title="Importance Levels"
                            summary={settings?.importanceLevels?.map(c => c.name).join(', ') || 'No importance levels configured.'}
                        >
                            <SettingsSection
                                items={settings?.importanceLevels}
                                onUpdate={handleSettingsUpdate}
                                onAddItem={handleAddNewItem}
                                fieldName="importanceLevels"
                            />
                        </AccordionSection>

                         <AccordionSection 
                            title="Custom Tags"
                             summary={settings?.customTags?.map(c => c.name).join(', ') || 'No custom tags configured.'}
                        >
                            <CustomTagsSection
                                settings={settings}
                                onUpdate={handleSettingsUpdate}
                            />
                        </AccordionSection>

                        <AccordionSection title="General Settings" summary="Application-wide preferences">
                            <GeneralSettingsCard
                                settings={settings}
                                onUpdate={handleSettingsUpdate}
                            />
                        </AccordionSection>

                         <AccordionSection title="Dashboard Settings" summary="Customize dashboard charts and stats">
                            <DashboardSettingsCard
                                settings={settings}
                                onUpdate={handleSettingsUpdate}
                            />
                        </AccordionSection>
                        
                        <AccordionSection title="Data Management" summary="Import or export your task data">
                            <ImportExportCard />
                        </AccordionSection>

                    </div>
                </main>
            </div>
            <UpdateTasksConfirmationDialog
                isOpen={isConfirmModalOpen}
                onClose={handleCancelConfirmation}
                onConfirm={handleConfirmUpdate}
                changes={renameChanges}
            />
        </>
    );
}
