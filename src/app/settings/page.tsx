
// @ts-nocheck
'use client';

import { useEffect, useState, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, updateDoc, getDoc, collection, getDocs, writeBatch, query, where, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription as SettingsCardDescription } from '@/components/ui/card';
import { X, Plus, Paintbrush, GripVertical, ChevronDown, Undo, Save, Upload, Download, Moon, Sun, LayoutDashboard, Settings, Info, Loader2 } from 'lucide-react';
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


function SubStatusManager({ parentIndex, subStatuses, onUpdate }) {
    const handleAdd = () => {
        const newSubStatuses = [...subStatuses, { name: 'New Sub-Status' }];
        onUpdate(parentIndex, newSubStatuses);
    };

    const handleRemove = (subIndex) => {
        const newSubStatuses = subStatuses.filter((_, i) => i !== subIndex);
        onUpdate(parentIndex, newSubStatuses);
    };

    const handleChange = (subIndex, value) => {
        const newSubStatuses = [...subStatuses];
        newSubStatuses[subIndex].name = value;
        onUpdate(parentIndex, newSubStatuses);
    };

    return (
        <div className="p-2 mt-2 space-y-3 bg-muted/50 rounded-lg">
            <div className="space-y-2">
                {subStatuses?.map((sub, subIndex) => (
                    <div key={subIndex} className="flex items-center gap-2 p-2 bg-background rounded-md shadow-sm">
                        <Input
                            value={sub.name}
                            onChange={(e) => handleChange(subIndex, e.target.value)}
                            className="flex-grow"
                        />
                        <Button variant="ghost" size="icon" onClick={() => handleRemove(subIndex)}>
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


function SortableItem({ id, item, onUpdate, onRemove, fieldName, hasSubStatuses, onSubStatusUpdate }) {
    const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
    const [isOpen, setIsOpen] = useState(false);

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    const handleItemChange = (path, value) => {
        const newItem = { ...item, [path]: value };
        onUpdate(id, newItem);
    };

    return (
        <div ref={setNodeRef} style={style} className="p-4 rounded-lg border bg-card mb-4">
            <div className="flex items-center gap-2 flex-wrap">
                <div {...attributes} {...listeners} className="cursor-grab p-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-grow font-medium">{item.name}</div>
                {hasSubStatuses && item.subStatuses && item.subStatuses.length > 0 && !isOpen && (
                    <div className="flex items-center gap-1 flex-wrap ml-auto mr-2">
                        {item.subStatuses.map((sub, index) => (
                            <span key={index} className="text-xs bg-muted text-muted-foreground px-2 py-1 rounded-full">
                                {sub.name}
                            </span>
                        ))}
                    </div>
                )}
                <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} className={cn(hasSubStatuses && item.subStatuses?.length > 0 ? "" : "ml-auto")}>
                     <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
                </Button>
            </div>
             {isOpen && (
                <div className="mt-4 pt-4 border-t space-y-4">
                     <div className="flex items-center gap-2">
                        <Input
                            value={item.name}
                            onChange={(e) => handleItemChange('name', e.target.value)}
                            className="flex-grow"
                        />
                        {item.hasOwnProperty('color') && (
                            <div className="relative">
                                <Paintbrush className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    type="color"
                                    value={item.color}
                                    onChange={(e) => handleItemChange('color', e.target.value)}
                                    className="w-16 pl-8 p-1"
                                />
                            </div>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => onRemove(id)}>
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                    {hasSubStatuses && (
                         <SubStatusManager
                            parentIndex={id} // The ID here is the index in the original array
                            subStatuses={item.subStatuses || []}
                            onUpdate={onSubStatusUpdate}
                        />
                    )}
                </div>
             )}
        </div>
    );
}

function SettingsCard({ title, items, onUpdate, onAddItem, fieldName, hasSubStatuses = false }) {
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
            const oldIndex = items.findIndex(item => item.name === active.id);
            const newIndex = items.findIndex(item => item.name === over.id);
            const newItems = arrayMove(items, oldIndex, newIndex);
            onUpdate(fieldName, newItems);
        }
    };
    
    const handleItemUpdate = (index, newItem) => {
        const newItems = [...items];
        // Find the correct index in the original array
        const originalIndex = items.findIndex(item => item.name === displayedItems[index].name);
        if (originalIndex !== -1) {
            newItems[originalIndex] = newItem;
            onUpdate(fieldName, newItems);
        }
    }
    
    const handleSubStatusUpdate = (parentIndex, newSubStatuses) => {
        const newItems = [...items];
        // Find the correct index in the original array
        const originalIndex = items.findIndex(item => item.name === displayedItems[parentIndex].name);
        if (originalIndex !== -1) {
            newItems[originalIndex].subStatuses = newSubStatuses;
            onUpdate(fieldName, newItems);
        }
    };

    const handleRemoveItem = (index) => {
        const itemNameToRemove = displayedItems[index].name;
        const newItems = items.filter((item) => item.name !== itemNameToRemove);
        onUpdate(fieldName, newItems);
    };
    
    const itemIds = useMemo(() => displayedItems?.map(it => it.name) || [], [displayedItems]);

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                 <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={itemIds} strategy={verticalListSortingStrategy}>
                        <div className="space-y-4">
                           {displayedItems?.map((item, index) => (
                                <SortableItem
                                    key={item.name}
                                    id={item.name}
                                    item={item}
                                    onUpdate={(id, newItem) => handleItemUpdate(index, newItem)}
                                    onRemove={() => handleRemoveItem(index)}
                                    hasSubStatuses={hasSubStatuses}
                                    onSubStatusUpdate={(id, newSubstatuses) => handleSubStatusUpdate(index, newSubstatuses)}
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

function GeneralSettingsCard({ settings, onUpdate }) {
    const handleSwitchChange = (checked) => {
        onUpdate('enableTimeTracking', checked);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent>
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
                        onCheckedChange={handleSwitchChange}
                    />
                </div>
            </CardContent>
        </Card>
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
                if(importFileRef.current) {
                    importFileRef.current.value = '';
                }
            }
        };
        reader.readAsText(file);
    };

    return (
        <>
            <Card>
                <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center gap-4">
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
                </CardContent>
            </Card>
            <ImportConfirmationDialog
                isOpen={importDialog.isOpen}
                onCancel={() => {
                    setImportDialog({ isOpen: false, file: null });
                    if(importFileRef.current) {
                        importFileRef.current.value = '';
                    }
                }}
                onConfirm={handleConfirmImport}
                fileName={importDialog.file?.name}
            />
        </>
    );
}

function UpdateTasksConfirmationDialog({ isOpen, onClose, onConfirm, changes }) {
    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Confirm Status Renaming</DialogTitle>
                    <DialogDescription>
                        You have renamed the following statuses. Do you want to update all existing tasks to match?
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-2">
                    {changes.map((change, index) => (
                        <div key={index} className="text-sm p-2 rounded-md bg-muted">
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

    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'workflow');
        const unsubscribe = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                 if (data.workflowCategories) {
                    data.workflowCategories = data.workflowCategories.map(cat => ({ ...cat, subStatuses: cat.subStatuses || [] }));
                }
                setSettings(JSON.parse(JSON.stringify(data))); // Deep copy
                setOriginalSettings(JSON.parse(JSON.stringify(data))); // Deep copy
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);
    
    useEffect(() => {
        setIsDirty(!isEqual(settings, originalSettings));
    }, [settings, originalSettings]);

    const handleSettingsUpdate = (fieldName, updatedItems) => {
        if (!settings) return;
        setSettings(prev => ({
            ...prev,
            [fieldName]: updatedItems,
        }));
    };
    
    const handleAddNewItem = (fieldName) => {
        const currentItems = settings[fieldName] || [];
        // Prevent adding new item with duplicate name
        let i = 1;
        let newItemName = 'New Item';
        while (currentItems.some(item => item.name === newItemName)) {
            newItemName = `New Item ${i}`;
            i++;
        }
        
        const newItem = { name: newItemName };

        if(fieldName === 'workflowCategories') {
            newItem.color = '#cccccc';
            newItem.subStatuses = [];
        }
         if (fieldName === 'importanceLevels') {
            newItem.color = '#cccccc';
        }

        const newItems = [...currentItems, newItem];
        handleSettingsUpdate(fieldName, newItems);
    };

    const handleSaveChanges = async () => {
        if (!originalSettings || !settings) return;

        const originalNames = originalSettings.workflowCategories.map(c => c.name);
        const newNames = settings.workflowCategories.map(c => c.name);

        const changes = [];
        originalSettings.workflowCategories.forEach((origCat, index) => {
            if (settings.workflowCategories[index] && origCat.name !== settings.workflowCategories[index].name) {
                // This assumes order hasn't changed, which is a big assumption. A better check is needed.
                // Let's refine this to be more robust.
            }
        });
        
        const originalMap = new Map(originalSettings.workflowCategories.map((cat, index) => [index, cat.name]));
        const currentMap = new Map(settings.workflowCategories.map((cat, index) => [index, cat.name]));
        const detectedChanges = [];

        for (const [index, origName] of originalMap.entries()) {
            const newName = currentMap.get(index);
            if (newName && newName !== origName) {
                // Check if the original name is truly gone from the new list
                // to distinguish from reordering vs renaming
                if (!settings.workflowCategories.some(cat => cat.name === origName)) {
                    detectedChanges.push({ from: origName, to: newName });
                }
            }
        }


        if (detectedChanges.length > 0) {
            setRenameChanges(detectedChanges);
            setIsConfirmModalOpen(true);
        } else {
            await updateSettingsInDb();
        }
    };
    
    const updateSettingsInDb = async () => {
        const settingsRef = doc(db, 'settings', 'workflow');
        await updateDoc(settingsRef, settings);
    };

    const handleConfirmUpdate = async () => {
        // 1. Update tasks in DB
        const batch = writeBatch(db);
        const tasksRef = collection(db, 'tasks');
        
        for (const change of renameChanges) {
            const q = query(tasksRef, where("status", "==", change.from));
            const querySnapshot = await getDocs(q);
            querySnapshot.forEach((doc) => {
                batch.update(doc.ref, { status: change.to });
            });
        }
        await batch.commit();

        // 2. Update settings in DB
        await updateSettingsInDb();
        
        // 3. Close modal
        setIsConfirmModalOpen(false);
        setRenameChanges([]);
    };
    
    const handleCancelConfirmation = async () => {
        // Just save the settings without updating tasks
        await updateSettingsInDb();
        setIsConfirmModalOpen(false);
        setRenameChanges([]);
    }

    const handleCancelChanges = () => {
        setSettings(JSON.parse(JSON.stringify(originalSettings))); // Revert to original
    };

    const handleOpenModal = () => {
        router.push('/');
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
                <main className="flex-grow p-4 md:p-8 space-y-6 overflow-y-auto">
                    <GeneralSettingsCard
                        settings={settings}
                        onUpdate={handleSettingsUpdate}
                    />
                    <SettingsCard
                        title="Workflow Statuses"
                        items={settings?.workflowCategories}
                        onUpdate={handleSettingsUpdate}
                        onAddItem={handleAddNewItem}
                        fieldName="workflowCategories"
                        hasSubStatuses={true}
                    />
                    <SettingsCard
                        title="Importance Levels"
                        items={settings?.importanceLevels}
                        onUpdate={handleSettingsUpdate}
                        onAddItem={handleAddNewItem}
                        fieldName="importanceLevels"
                    />
                     <SettingsCard
                        title="Bid Origins"
                        items={settings?.bidOrigins}
                        onUpdate={handleSettingsUpdate}
                        onAddItem={handleAddNewItem}
                        fieldName="bidOrigins"
                    />
                    <ImportExportCard />
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
