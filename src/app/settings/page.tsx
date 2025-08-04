

// @ts-nocheck
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, updateDoc, getDoc, collection, getDocs, writeBatch, query, where, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as SettingsCardDescription } from '@/components/ui/card';
import { X, Plus, Paintbrush, GripVertical, ChevronDown, ChevronUp, Undo, Save, Upload, Download, Moon, Sun, LayoutDashboard, Settings, Info, Loader2, Pencil, BarChart2 } from 'lucide-react';
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
import Papa from 'papaparse';


// A more robust date parser for import
const parseDateString = (dateString) => {
    if (!dateString) return null;
    if(dateString instanceof Timestamp) return dateString;
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

function SubItemManager({ items, onUpdate, parentId, itemLabel = 'Sub-Status', maxItems = 10 }) {
    const handleAdd = () => {
        const newItem = { id: `sub-${Date.now()}`, name: `New ${itemLabel}` };
        onUpdate(parentId, [...items, newItem]);
    };

    const handleRemove = (itemId) => {
        onUpdate(parentId, items.filter((s) => s.id !== itemId));
    };

    const handleChange = (itemId, value) => {
        onUpdate(parentId, items.map(s => s.id === itemId ? { ...s, name: value } : s));
    };
    
    return (
        <div className="p-3 mt-2 space-y-3 bg-muted/50 rounded-lg ml-10">
            <div className="space-y-2">
                {items?.map((item) => (
                    <div key={item.id} className="flex items-center gap-2">
                        <Input
                            value={item.name}
                            onChange={(e) => handleChange(item.id, e.target.value)}
                            className="flex-grow bg-background h-9"
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(item.id)} className="h-9 w-9">
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ))}
            </div>
            {items.length < maxItems && (
                <Button onClick={handleAdd} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add {itemLabel}
                </Button>
            )}
        </div>
    );
}

function SortableItem({ id, item, onUpdate, onRemove, onToggleExpand, hasSubStatuses, onSubStatusUpdate, hasColor = true, subItemLabel, maxSubItems }) {
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

    const handleNameChange = (e) => {
        setName(e.target.value);
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
        setIsEditing(prev => !prev);
    };

    useEffect(() => {
        if (isEditing) {
            inputRef.current?.select();
        }
    }, [isEditing]);

    const textColor = hasColor && item.color && !isColorLight(item.color) ? 'text-white' : 'text-foreground';
    const bgColor = hasColor ? item.color : 'hsl(var(--card))';
    
    const subStatusSummary = useMemo(() => {
        const subItems = item.subStatuses || item.tags;
        if (!hasSubStatuses || !subItems) return '';
        if (subItems.length === 0) return `(No ${subItemLabel.toLowerCase()}es)`;
        return `(${subItems.map(s => s.name).join(', ')})`;
    }, [item, hasSubStatuses, subItemLabel]);

    return (
        <div className="mb-3">
             <div ref={setNodeRef} style={{...style, backgroundColor: bgColor}} className="flex items-center gap-0 rounded-lg shadow-sm border">
                <div {...attributes} {...listeners} className="cursor-grab p-3 self-stretch flex items-center bg-card rounded-l-md">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>

                <div className="flex-grow flex items-center p-2">
                    {isEditing ? (
                        <Input
                            ref={inputRef}
                            value={name}
                            onChange={handleNameChange}
                            onBlur={handleBlur}
                            onKeyDown={(e) => e.key === 'Enter' && handleBlur()}
                            className={cn(
                                "flex-grow font-semibold h-9",
                                !isColorLight(item.color) ? "text-foreground bg-background" : ""
                            )}
                        />
                    ) : (
                        <span className={cn("flex-grow font-semibold px-2", textColor)}>{item.name}</span>
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
                        <Button variant="ghost" size="icon" onClick={() => onRemove(id)} className={cn("hover-bg-black/10 w-8 h-8", textColor)}>
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
                 <SubItemManager
                    parentId={id}
                    items={item.subStatuses || item.tags || []}
                    onUpdate={onSubStatusUpdate}
                    itemLabel={subItemLabel}
                    maxItems={maxSubItems}
                />
            )}
        </div>
    );
}

function SettingsSection({ items, onUpdate, onAddItem, fieldName, hasSubStatuses = false, hasColor = true, subItemLabel, maxSubItems }) {
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
            const oldIndex = displayedItems.findIndex(item => item.id === active.id);
            const newIndex = displayedItems.findIndex(item => item.id === over.id);

            const reorderedOriginal = arrayMove(items, oldIndex, newIndex);

            onUpdate({ [fieldName]: reorderedOriginal });
        }
    };
    
    const handleItemUpdate = (itemId, newItem) => {
        const newItems = items.map(item => (item.id === itemId ? newItem : item));
        onUpdate({ [fieldName]: newItems });
    };
    
    const handleSubStatusUpdate = (parentItemId, newSubItems) => {
        const newItems = items.map(item => {
            if (item.id === parentItemId) {
                // Determine whether to update 'subStatuses' or 'tags'
                if (item.hasOwnProperty('subStatuses')) {
                    return { ...item, subStatuses: newSubItems };
                } else if (item.hasOwnProperty('tags')) {
                    return { ...item, tags: newSubItems };
                }
            }
            return item;
        });
        onUpdate({ [fieldName]: newItems });
    };


    const handleToggleExpand = (itemId) => {
        const newItems = items.map(item =>
            item.id === itemId
                ? { ...item, isExpanded: !item.isExpanded }
                : item
        );
        onUpdate({ [fieldName]: newItems });
    };
    
    const handleRemoveItem = (itemId) => {
        const newItems = items.filter((item) => item.id !== itemId);
        onUpdate({ [fieldName]: newItems });
    };

    const itemIds = useMemo(() => displayedItems?.map(it => it.id) || [], [displayedItems]);
    
    return (
        <Card>
            <CardContent className="pt-6">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                        <div>
                           {displayedItems?.map((item) => (
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
                                    subItemLabel={subItemLabel}
                                    maxSubItems={maxSubItems}
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
            isExpanded: false,
        };
        onUpdate({ customTags: [...customTags, newMainTag] });
    };
    
    return (
        <Card>
            <CardContent className="pt-6">
                <SettingsSection
                    items={customTags}
                    onUpdate={onUpdate}
                    onAddItem={handleAddMainTag}
                    fieldName="customTags"
                    hasSubStatuses={true}
                    hasColor={false}
                    subItemLabel="Tag"
                    maxSubItems={10}
                />
            </CardContent>
        </Card>
    );
}

function GeneralSettingsCard({ settings, onUpdate }) {
    const handleSwitchChange = (fieldName, checked) => {
        onUpdate({ [fieldName]: checked });
    };
    
    const handleWorkWeekChange = (day, checked) => {
        const currentWeek = settings.workWeek || [];
        let newWeek;
        if (checked) {
            newWeek = [...currentWeek, day];
        } else {
            newWeek = currentWeek.filter(d => d !== day);
        }
        onUpdate({ workWeek: newWeek });
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
        onUpdate({ dashboardSettings: { ...settings.dashboardSettings, charts: newCharts } });
    };

    const handleStatVisibilityChange = (statName, checked) => {
        const newStats = { ...settings.dashboardSettings.stats, [statName]: checked };
        onUpdate({ dashboardSettings: { ...settings.dashboardSettings, stats: newStats } });
    };

    const chartConfig = [
        { key: 'taskStatus', label: 'Task Status Overview' },
        { key: 'dailyActivity', label: 'Daily Activity Trend' },
        { key: 'weeklyProgress', label: 'Weekly Progress' },
        { key: 'dayOfWeekCompletion', label: 'Productivity by Day' },
        { key: 'completionPerformance', label: 'On-Time/Overdue Completion' },
        { key: 'activeWorkload', label: 'Active Workload by Importance' },
    ];

    const statConfig = [
        { key: 'totalTasks', label: 'Total Tasks' },
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

    return (
        <CardContent className="space-y-6">
            <div className="rounded-lg border p-4">
                <Label className="text-base">Visible Standard Charts</Label>
                <SettingsCardDescription>Select which standard charts to display on the dashboard.</SettingsCardDescription>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-6">
                    {chartConfig.map(({ key, label }) => (
                         <div key={key} className="flex items-center space-x-2">
                            <Checkbox id={`chart-${key}`} checked={!!chartSettings[key]} onCheckedChange={(c) => handleChartVisibilityChange(key, c)} />
                            <Label htmlFor={`chart-${key}`}>{label}</Label>
                        </div>
                    ))}
                </div>
            </div>
            
            <div className="rounded-lg border p-4">
                <Label className="text-base">Visible Statistics</Label>
                <SettingsCardDescription>Select which stats to display in the Project Snapshot.</SettingsCardDescription>
                 <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {statConfig.map(({ key, label }) => (
                         <div key={key} className="flex items-center space-x-2">
                            <Checkbox id={`stat-${key}`} checked={!!statSettings[key]} onCheckedChange={(c) => handleStatVisibilityChange(key, c)} />
                            <Label htmlFor={`stat-${key}`}>{label}</Label>
                        </div>
                    ))}
                 </div>
            </div>
        </CardContent>
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


function ImportConfirmationDialog({ isOpen, onCancel, onConfirm, fileName, fileType }) {
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onCancel}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Data Import</DialogTitle>
                    <DialogDescription>
                        You are about to import tasks from <strong>{fileName}</strong>. This will overwrite tasks with the same Task ID if they exist and add new ones if they don't. This action cannot be undone.
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
    const importJsonRef = useRef(null);
    const importCsvRef = useRef(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importDialog, setImportDialog] = useState({ isOpen: false, file: null, fileType: '' });


    const handleExportJson = async () => {
        const tasksQuery = query(collection(db, 'tasks'));
        const querySnapshot = await getDocs(tasksQuery);
        const tasksToExport = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const convertedData = { ...data };
            for (const key in convertedData) {
                if (convertedData[key] instanceof Timestamp) {
                    convertedData[key] = convertedData[key].toDate().toISOString();
                }
            }
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

    const handleExportCsv = async () => {
        const tasksQuery = query(collection(db, 'tasks'));
        const querySnapshot = await getDocs(tasksQuery);
        
        const settingsDoc = await getDoc(doc(db, 'settings', 'workflow'));
        const settings = settingsDoc.data();
        const customTagCategories = settings.customTags || [];

        const tasksToExport = querySnapshot.docs.map(doc => {
            const data = doc.data();
            let convertedData = { ...data };
            
            // Convert Timestamps to ISO strings
            for (const key in convertedData) {
                if (convertedData[key] instanceof Timestamp) {
                    convertedData[key] = convertedData[key].toDate().toISOString();
                }
            }
            
            // Flatten tags object into separate columns with descriptive headers
            const tags = convertedData.tags || {};
            customTagCategories.forEach((category, index) => {
                const header = `CustomTag${index + 1}: ${category.name}`;
                convertedData[header] = tags[category.name] || "";
            });
            delete convertedData.tags;

            return convertedData;
        });

        if (tasksToExport.length === 0) {
            alert("No tasks to export.");
            return;
        }

        const csv = Papa.unparse(tasksToExport);
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.setAttribute('download', 'tasks.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handleFileSelect = (event, fileType) => {
        const file = event.target.files[0];
        if (!file) return;
        setImportDialog({ isOpen: true, file: file, fileType: fileType });
        event.target.value = '';
    };


    const handleConfirmImport = () => {
        const { file, fileType } = importDialog;
        if (!file) return;
        
        setImportDialog({ isOpen: false, file: null, fileType: '' });
        setIsImporting(true);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                let importedTasks;
                if (fileType === 'json') {
                    importedTasks = JSON.parse(e.target.result);
                } else { // csv
                    const parseResult = Papa.parse(e.target.result, { header: true, skipEmptyLines: true });
                    importedTasks = parseResult.data;
                }
                
                if (!Array.isArray(importedTasks)) {
                    throw new Error('Imported file should contain an array of tasks.');
                }

                const settingsDoc = await getDoc(doc(db, 'settings', 'workflow'));
                const settings = settingsDoc.data();
                const customTagCategories = settings.customTags || [];

                let batch = writeBatch(db);
                let operationCount = 0;

                for (const task of importedTasks) {
                    if (!task.taskid) continue;

                    let taskData = { ...task };
                    
                     if (fileType === 'csv') {
                        taskData.tags = {};
                        for (const header in taskData) {
                            const match = header.match(/^(CustomTag(\d+)):/);
                            if (match) {
                                const tagIndex = parseInt(match[2], 10) - 1;
                                if (customTagCategories[tagIndex]) {
                                    const currentCategoryName = customTagCategories[tagIndex].name;
                                    const value = taskData[header];
                                    if (value) {
                                        taskData.tags[currentCategoryName] = value;
                                    }
                                }
                                delete taskData[header];
                            }
                        }
                    }

                    taskData.date = parseDateString(task.date);
                    taskData.dueDate = parseDateString(task.dueDate);
                    taskData.completionDate = parseDateString(task.completionDate);
                    taskData.lastModified = parseDateString(task.lastModified) || Timestamp.now();
                    taskData.subStatusChangeCount = Number(task.subStatusChangeCount) || 0;

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
                    operationCount++;

                    if (operationCount === 499) {
                        await batch.commit();
                        batch = writeBatch(db);
                        operationCount = 0;
                    }
                }
                
                if (operationCount > 0) {
                    await batch.commit();
                }

                alert('Import complete!');
            } catch (error) {
                console.error("Error parsing or importing file:", error);
                alert(`Error importing file. Please ensure it is a valid ${fileType.toUpperCase()} file. Check console for details.`);
            } finally {
                 setIsImporting(false);
            }
        };
        reader.readAsText(file);
    };

    return (
        <>
            <CardContent>
                <div className="grid grid-cols-2 gap-4">
                     <input type="file" ref={importJsonRef} onChange={(e) => handleFileSelect(e, 'json')} accept=".json" style={{ display: 'none' }} />
                     <input type="file" ref={importCsvRef} onChange={(e) => handleFileSelect(e, 'csv')} accept=".csv" style={{ display: 'none' }} />
                     
                    <Button onClick={() => importJsonRef.current?.click()} variant="outline" disabled={isImporting}>
                        {isImporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</> : <><Upload className="h-4 w-4 mr-2" /> Import JSON</>}
                    </Button>
                    <Button onClick={handleExportJson} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export JSON
                    </Button>
                    <Button onClick={() => importCsvRef.current?.click()} variant="outline" disabled={isImporting}>
                        {isImporting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Importing...</> : <><Upload className="h-4 w-4 mr-2" /> Import CSV</>}
                    </Button>
                    <Button onClick={handleExportCsv} variant="outline">
                        <Download className="h-4 w-4 mr-2" />
                        Export CSV
                    </Button>
                </div>
            </CardContent>
            <ImportConfirmationDialog
                isOpen={importDialog.isOpen}
                onCancel={() => setImportDialog({ isOpen: false, file: null, fileType: '' })}
                onConfirm={handleConfirmImport}
                fileName={importDialog.file?.name}
                fileType={importDialog.fileType}
            />
        </>
    );
}

function UpdateTasksDialog({ isOpen, onClose, onConfirm, changes, isUpdating }) {
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Setting Renaming</DialogTitle>
                    <DialogDescription>
                        You have renamed items that may be in use. Would you like to update all existing tasks to match?
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2 max-h-60 overflow-y-auto">
                    {changes.map((change, index) => (
                        <div key={index} className="text-sm p-2 rounded-md bg-muted">
                            <span className="font-bold text-xs uppercase text-muted-foreground mr-2">{change.type}</span>
                            Rename "<strong>{change.from}</strong>" to "<strong>{change.to}</strong>"
                        </div>
                    ))}
                    <p className="text-xs text-muted-foreground pt-2">
                        This action may take a moment and cannot be undone. Choosing 'Cancel' will save the setting change but will not update existing tasks.
                    </p>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isUpdating}>Cancel</Button>
                    <Button onClick={onConfirm} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        {isUpdating ? 'Updating...' : 'Confirm & Update Tasks'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

export default function SettingsPage() {
    const [settings, setSettings] = useState(null);
    const [originalSettings, setOriginalSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDirty, setIsDirty] = useState(false);
    const { theme, setTheme } = useTheme();
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isUpdatingTasks, setIsUpdatingTasks] = useState(false);
    const [renameChanges, setRenameChanges] = useState([]);
    
    const nextIdCounter = useRef(Date.now());
    const getNextId = (prefix = 'item') => {
        nextIdCounter.current += 1;
        return `${prefix}-${nextIdCounter.current}`;
    };
    
    const cleanseIdsForSave = (data) => {
        if (!data) return null;
        // Deep copy to avoid mutating the original object
        const cleansedData = JSON.parse(JSON.stringify(data));

        const walker = (obj) => {
            if (Array.isArray(obj)) {
                obj.forEach(walker);
            } else if (obj && typeof obj === 'object') {
                delete obj.id;
                delete obj.isExpanded;
                // Walk through the object's values
                Object.values(obj).forEach(walker);
            }
        };
        walker(cleansedData);
        return cleansedData;
    };


    const addIdsToData = (data) => {
        const dataCopy = JSON.parse(JSON.stringify(data)); // Deep copy to avoid mutation
        if (dataCopy.workflowCategories) {
            dataCopy.workflowCategories = dataCopy.workflowCategories.map(cat => ({
                ...cat,
                id: cat.id || getNextId('cat'),
                isExpanded: false,
                subStatuses: (cat.subStatuses || []).map(sub => ({ ...sub, id: sub.id || getNextId('sub') }))
            }));
        }
        if (dataCopy.importanceLevels) {
            dataCopy.importanceLevels = dataCopy.importanceLevels.map(imp => ({ ...imp, id: imp.id || getNextId('imp') }));
        }
        if (dataCopy.customTags) {
            dataCopy.customTags = dataCopy.customTags.map(tag => ({
                ...tag,
                id: tag.id || getNextId('tag'),
                isExpanded: false,
                tags: (tag.tags || []).map(subTag => ({ ...subTag, id: subTag.id || getNextId('subtag') }))
            }));
        }
        return dataCopy;
    };


    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'workflow');
        const unsubscribe = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                let data = doc.data();
                
                // --- Default and migration logic ---
                if (!data.hasOwnProperty('enableTimeTracking')) data.enableTimeTracking = false;
                if (!data.hasOwnProperty('workWeek')) data.workWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
                if (!data.hasOwnProperty('dashboardSettings')) {
                    data.dashboardSettings = {
                        charts: { taskStatus: true, dailyActivity: true, weeklyProgress: true, dayOfWeekCompletion: true, completionPerformance: true, activeWorkload: true },
                        stats: { totalTasks: true, totalCompleted: true, overdue: true, active: true, avgTime: true, last7: true, completedToday: true, createdToday: true, completionRate: true, inReview: true, stale: true, avgSubStatusChanges: true },
                    };
                }
                 if (!data.hasOwnProperty('customTags')) data.customTags = [];


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
            // Use the cleansed versions for a reliable comparison
            const cleanSettings = cleanseIdsForSave(settings);
            const cleanOriginal = cleanseIdsForSave(originalSettings);
            setIsDirty(!isEqual(cleanSettings, cleanOriginal));
        }
    }, [settings, originalSettings]);

    const handleSettingsUpdate = (updates) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };
    
    const handleAddNewItem = (fieldName) => {
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
        } else if (fieldName === 'customTags') {
            newItem.name = `New Tag Category ${currentItems.length + 1}`;
            newItem.tags = [];
            newItem.isExpanded = false;
        }

        handleSettingsUpdate({ [fieldName]: [...currentItems, newItem] });
    };

    const updateSettingsInDb = async (settingsToSave) => {
        const settingsRef = doc(db, 'settings', 'workflow');
        const finalData = cleanseIdsForSave(settingsToSave);
        await updateDoc(settingsRef, finalData);
    };

    const handleSaveChanges = async () => {
        if (!originalSettings || !settings) return;

        const findRenames = (originalItems, currentItems, type) => {
            const changes = [];
            if (!originalItems || !currentItems) return changes;
    
            const originalMap = new Map(originalItems.map(item => [item.id, item]));
    
            currentItems.forEach(currentItem => {
                const originalItem = originalMap.get(currentItem.id);
                if (originalItem) {
                    if (originalItem.name !== currentItem.name) {
                        changes.push({ from: originalItem.name, to: currentItem.name, type });
                    }
                    // Recursively check for renames in sub-items
                    if (originalItem.subStatuses && currentItem.subStatuses) {
                        changes.push(...findRenames(originalItem.subStatuses, currentItem.subStatuses, 'Sub-Status'));
                    }
                    if (originalItem.tags && currentItem.tags) { // For custom tags
                        changes.push(...findRenames(originalItem.tags, currentItem.tags, 'Tag'));
                    }
                }
            });
            return changes;
        };
        
        const mainTagRenames = findRenames(originalSettings.customTags, settings.customTags, 'Tag Category');
        
        let subTagRenames = [];
        originalSettings.customTags?.forEach(originalMainTag => {
            const currentMainTag = settings.customTags.find(t => t.id === originalMainTag.id);
            if (currentMainTag) {
                subTagRenames.push(...findRenames(originalMainTag.tags, currentMainTag.tags, 'Tag'));
            }
        });


        const detectedChanges = [
            ...findRenames(originalSettings.workflowCategories, settings.workflowCategories, 'Status'),
            ...findRenames(originalSettings.importanceLevels, settings.importanceLevels, 'Importance'),
            ...mainTagRenames,
            ...subTagRenames,
        ];
        
        if (detectedChanges.length > 0) {
            setRenameChanges(detectedChanges);
            setIsConfirmModalOpen(true);
        } else {
            await updateSettingsInDb(settings);
        }
    };

    const handleConfirmUpdate = async () => {
        setIsUpdatingTasks(true);
        try {
            await updateSettingsInDb(settings);

            for (const change of renameChanges) {
                let q;
                let updateData = {};
    
                switch(change.type) {
                    case 'Status':
                        q = query(collection(db, "tasks"), where("status", "==", change.from));
                        updateData = { status: change.to };
                        break;
                    case 'Sub-Status':
                        q = query(collection(db, "tasks"), where("subStatus", "==", change.from));
                        updateData = { subStatus: change.to };
                        break;
                    case 'Importance':
                        q = query(collection(db, "tasks"), where("importance", "==", change.from));
                        updateData = { importance: change.to };
                        break;
                    case 'Tag Category':
                        q = query(collection(db, "tasks"), where(`tags.${change.from}`, "!=", null));
                        break; // Special handling for map keys
                    case 'Tag':
                         // This case needs to find the parent category to construct the query path
                         let parentCategoryName = '';
                         for(const cat of originalSettings.customTags) {
                            if (cat.tags.some(t => t.name === change.from)) {
                                parentCategoryName = cat.name;
                                break;
                            }
                         }
                         if(parentCategoryName) {
                            q = query(collection(db, "tasks"), where(`tags.${parentCategoryName}`, "==", change.from));
                            updateData = { [`tags.${parentCategoryName}`]: change.to };
                         }
                        break;
                    default:
                        q = null;
                }
    
                if (q) {
                    const tasksToUpdateSnapshot = await getDocs(q);
                    if (tasksToUpdateSnapshot.empty) continue;

                    let batch = writeBatch(db);
                    let operationCount = 0;
                    
                    for (const taskDoc of tasksToUpdateSnapshot.docs) {
                        if (change.type === 'Tag Category') {
                            const taskData = taskDoc.data();
                            const newTags = { ...taskData.tags };
                            if (newTags[change.from] !== undefined) {
                                newTags[change.to] = newTags[change.from];
                                delete newTags[change.from];
                                batch.update(taskDoc.ref, { tags: newTags });
                            }
                        } else {
                            batch.update(taskDoc.ref, updateData);
                        }
                        
                        operationCount++;
                        if (operationCount >= 499) { 
                            await batch.commit();
                            batch = writeBatch(db);
                            operationCount = 0;
                        }
                    }
    
                    if (operationCount > 0) {
                        await batch.commit();
                    }
                }
            }

            alert("Settings and tasks updated successfully!");
        } catch (error) {
            console.error("Error updating tasks:", error);
            alert("An error occurred while updating tasks. Please check the console.");
        } finally {
            setIsUpdatingTasks(false);
            setIsConfirmModalOpen(false);
            setRenameChanges([]);
        }
    };
    
    const handleCancelConfirmation = async () => {
        // Just save the settings without updating tasks
        await updateSettingsInDb(settings);
        setIsConfirmModalOpen(false);
        setRenameChanges([]);
    };

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
                        <Button onClick={handleSaveChanges} disabled={!isDirty || isUpdatingTasks}>
                            {isUpdatingTasks ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Changes
                        </Button>
                        <Button onClick={handleCancelChanges} variant="outline" disabled={!isDirty || isUpdatingTasks}>
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
                                subItemLabel="Sub-Status"
                                maxSubItems={10}
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
            <UpdateTasksDialog
                isOpen={isConfirmModalOpen}
                onClose={handleCancelConfirmation}
                onConfirm={handleConfirmUpdate}
                changes={renameChanges}
                isUpdating={isUpdatingTasks}
            />
        </>
    );
}
