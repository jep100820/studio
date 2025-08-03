
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
        if (!hasSubStatuses || !item.subStatuses) return '';
        if (item.subStatuses.length === 0) return '(No substatus)';
        return `(${item.subStatuses.map(s => s.name).join(', ')})`;
    }, [item.subStatuses, hasSubStatuses]);

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
    
    const handleDragEnd = (event, mainTagId) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            const newCustomTags = [...customTags];
            const mainTagIndex = newCustomTags.findIndex(t => t.id === mainTagId);
            if (mainTagIndex === -1) return;
            
            const oldIndex = newCustomTags[mainTagIndex].tags.findIndex(item => item.id === active.id);
            const newIndex = newCustomTags[mainTagIndex].tags.findIndex(item => item.id === over.id);
            newCustomTags[mainTagIndex].tags = arrayMove(newCustomTags[mainTagIndex].tags, oldIndex, newIndex);
            
            onUpdate('customTags', newCustomTags);
        }
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
                                onUpdate={(id, updated) => handleMainTagUpdate(id, updated)}
                                onRemove={() => handleRemoveMainTag(mainTag.id)}
                                hasColor={false}
                                hasSubStatuses={false}
                            />
                            <div className="pl-10 mt-4 space-y-2">
                                <DndContext onDragEnd={(e) => handleDragEnd(e, mainTag.id)}>
                                     <SortableContext items={mainTag.tags.map(t => t.id)} strategy={verticalListSortingStrategy}>
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
                                     </SortableContext>
                                </DndContext>
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
            // Convert Firestore Timestamps to ISO strings for JSON compatibility
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
        const customTagKeys = settings.customTags?.map(t => t.name) || [];

        const tasksToExport = querySnapshot.docs.map(doc => {
            const data = doc.data();
            const convertedData = { ...data };
            // Convert Timestamps to ISO strings
            for (const key in convertedData) {
                if (convertedData[key] instanceof Timestamp) {
                    convertedData[key] = convertedData[key].toDate().toISOString();
                }
            }
            // Flatten tags object into separate columns for CSV
            if (convertedData.tags) {
                for(const tagName of customTagKeys) {
                    convertedData[tagName] = convertedData.tags[tagName] || "";
                }
                delete convertedData.tags;
            }

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

                const batch = writeBatch(db);
                for (const task of importedTasks) {
                    if (!task.taskid) continue;

                    const taskData = { ...task };
                    
                    // On CSV import, group custom fields back into a 'tags' object
                    if (fileType === 'csv') {
                        const settingsDoc = await getDoc(doc(db, 'settings', 'workflow'));
                        const settings = settingsDoc.data();
                        const customTagKeys = settings.customTags?.map(t => t.name) || [];
                        
                        taskData.tags = {};
                        for (const key in taskData) {
                            if (customTagKeys.includes(key)) {
                                if (taskData[key]) {
                                   taskData.tags[key] = taskData[key];
                                }
                                delete taskData[key];
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
                }

                await batch.commit();
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

    const handleSelectChange = (e) => {
        const { value } = e.target;
        const newDashboardSettings = { ...settings.dashboardSettings, performanceChartSource: value };
        onUpdate('dashboardSettings', newDashboardSettings);
    };

    const chartConfig = [
        { key: 'taskStatus', label: 'Task Status Overview' },
        { key: 'dailyActivity', label: 'Daily Activity Trend' },
        { key: 'weeklyProgress', label: 'Weekly Progress' },
        { key: 'dayOfWeekCompletion', label: 'Productivity by Day' },
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
                <Label className="text-base">Visible Charts</Label>
                <SettingsCardDescription>Select which charts to display on the dashboard.</SettingsCardDescription>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        charts: { taskStatus: true, dailyActivity: true, weeklyProgress: true, dayOfWeekCompletion: true },
                        stats: { totalTasks: true, totalCompleted: true, overdue: true, active: true, avgTime: true, last7: true, completedToday: true, createdToday: true, completionRate: true, inReview: true, stale: true, avgSubStatusChanges: true },
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

        const findRenames = (original, current, type, context = '') => {
            const changes = [];
            if (!original || !current) return changes;
        
            const originalMap = new Map(original.map(item => [item.id, item.name]));
            
            current.forEach((item) => {
                const originalName = originalMap.get(item.id);
                const originalItem = original.find(o => o.id === item.id);

                if (originalName && originalName !== item.name) {
                    changes.push({ 
                        from: originalName, 
                        to: item.name, 
                        type: context ? `${type} in ${context}` : type,
                        id: item.id
                    });
                }
        
                if (item.subStatuses && originalItem?.subStatuses) {
                     // Use the *new* name as context for sub-status changes
                    changes.push(...findRenames(originalItem.subStatuses, item.subStatuses, 'Sub-Status', item.name));
                }
                if (item.tags && originalItem?.tags) {
                     // Use the *new* name as context for tag changes
                    changes.push(...findRenames(originalItem.tags, item.tags, 'Tag', item.name));
                }
            });
            return changes;
        };

        const detectedChanges = [
            ...findRenames(originalSettings.workflowCategories, settings.workflowCategories, 'Status'),
            ...findRenames(originalSettings.importanceLevels, settings.importanceLevels, 'Importance'),
            ...findRenames(originalSettings.customTags, settings.customTags, 'Tag Category'),
        ];
        
        // This is a special check for sub-status renames where the parent status was NOT renamed.
        originalSettings.workflowCategories?.forEach(originalCat => {
            const currentCat = settings.workflowCategories.find(c => c.id === originalCat.id);
            if(currentCat && originalCat.name === currentCat.name) { // Status not renamed
                 detectedChanges.push(...findRenames(originalCat.subStatuses, currentCat.subStatuses, 'Sub-Status', currentCat.name));
            }
        });


        if (detectedChanges.length > 0) {
            setRenameChanges(detectedChanges);
            setIsConfirmModalOpen(true);
        } else {
            await updateSettingsInDb(settingsToSave);
        }
    };
    
    const updateSettingsInDb = async (settingsToSave) => {
        const settingsRef = doc(db, 'settings', 'workflow');
        const cleanseIds = (data) => {
            const cleansedData = JSON.parse(JSON.stringify(data));
            const walker = (obj) => {
                if (Array.isArray(obj)) {
                    obj.forEach(walker);
                } else if (obj && typeof obj === 'object') {
                    delete obj.id;
                    delete obj.isExpanded; // Ensure this is also removed
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
                        if (taskData.tags && typeof taskData.tags[change.from] !== 'undefined') {
                            if(!updates.tags) updates.tags = { ...taskData.tags };
                            updates.tags[change.to] = updates.tags[change.from];
                            delete updates.tags[change.from];
                            needsUpdate = true;
                        }
                        break;
                     default:
                        if (change.type.startsWith('Sub-Status in')) {
                            // Find original status name for comparison, because it might have been renamed too
                            const statusChange = renameChanges.find(c => c.type === 'Status' && c.to === change.type.replace('Sub-Status in ', ''));
                            const originalStatusName = statusChange ? statusChange.from : change.type.replace('Sub-Status in ', '');

                            if (taskData.status === originalStatusName && taskData.subStatus === change.from) {
                                updates.subStatus = change.to;
                                needsUpdate = true;
                            }
                        } else if (change.type.startsWith('Tag in')) {
                            // This logic remains complex, but we can simplify by finding the original category name via ID
                            const tagCategoryChange = renameChanges.find(c => c.type === 'Tag Category' && c.to === change.type.replace('Tag in ', ''));
                            const originalCategoryName = tagCategoryChange ? tagCategoryChange.from : change.type.replace('Tag in ', '');
                            
                            if (taskData.tags && taskData.tags[originalCategoryName] === change.from) {
                               if(!updates.tags) updates.tags = { ...taskData.tags };
                               updates.tags[originalCategoryName] = change.to;
                               needsUpdate = true;
                            }
                        }
                        break;
                }
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
        // Just save the settings without updating tasks
        const settingsToSave = JSON.parse(JSON.stringify(settings));
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
