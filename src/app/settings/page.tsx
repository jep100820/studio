
// @ts-nocheck
'use client';

import { useEffect, useState } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X, Plus, Paintbrush, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

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

function SubStatusManager({ parentIndex, subStatuses, onUpdate }) {
    const [isOpen, setIsOpen] = useState(false);

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
        <div className="mt-4 pt-4 border-t">
            <Button 
                onClick={() => setIsOpen(!isOpen)} 
                variant="ghost" 
                className="w-full justify-between"
            >
                Manage Sub-Statuses ({subStatuses?.length || 0})
                <ChevronDown className={cn("h-4 w-4 transition-transform", isOpen && "rotate-180")} />
            </Button>
            {isOpen && (
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
            )}
        </div>
    );
}


function SettingsCard({ title, items, onUpdate, onAddItem, fieldName, hasSubStatuses = false }) {
    const handleItemChange = (index, value) => {
        const newItems = [...items];
        newItems[index].name = value;
        onUpdate(fieldName, newItems);
    };

    const handleColorChange = (index, value) => {
        const newItems = [...items];
        newItems[index].color = value;
        onUpdate(fieldName, newItems);
    }

    const handleRemoveItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        onUpdate(fieldName, newItems);
    };

    const handleAddItem = () => {
        onAddItem(fieldName);
    };

    const handleSubStatusUpdate = (parentIndex, newSubStatuses) => {
        const newItems = [...items];
        newItems[parentIndex].subStatuses = newSubStatuses;
        onUpdate(fieldName, newItems);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {items?.map((item, index) => (
                        <div key={index} className={cn("p-4 rounded-lg", hasSubStatuses ? "border bg-card" : "bg-card border")}>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={item.name}
                                    onChange={(e) => handleItemChange(index, e.target.value)}
                                    className="flex-grow"
                                />
                                {item.hasOwnProperty('color') && (
                                    <div className="relative">
                                         <Paintbrush className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                         <Input
                                            type="color"
                                            value={item.color}
                                            onChange={(e) => handleColorChange(index, e.target.value)}
                                            className="w-16 pl-8 p-1"
                                        />
                                    </div>
                                )}
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(index)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                            {hasSubStatuses && (
                                <SubStatusManager
                                    parentIndex={index}
                                    subStatuses={item.subStatuses || []}
                                    onUpdate={handleSubStatusUpdate}
                                />
                            )}
                        </div>
                    ))}
                </div>
                <Button onClick={handleAddItem} variant="outline" size="sm" className="mt-4">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New
                </Button>
            </CardContent>
        </Card>
    )
}

export default function SettingsPage() {
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'workflow');
        const unsubscribe = onSnapshot(settingsRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data();
                 if (data.workflowCategories) {
                    data.workflowCategories = data.workflowCategories.map(cat => ({ ...cat, subStatuses: cat.subStatuses || [] }));
                }
                setSettings(data);
            }
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSettingsUpdate = async (fieldName, updatedItems) => {
        if (!settings) return;
        const settingsRef = doc(db, 'settings', 'workflow');
        await updateDoc(settingsRef, {
            [fieldName]: updatedItems,
        });
    };
    
    const handleAddNewItem = (fieldName) => {
        const currentItems = settings[fieldName] || [];
        const newItem = { name: 'New Item' };

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

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading settings...</div>;
    }

    return (
        <div className="min-h-screen bg-background text-foreground p-4 md:p-8">
            <header className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Settings</h1>
                <Link href="/">
                    <Button variant="outline">Back to Kanban Board</Button>
                </Link>
            </header>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SettingsCard
                    title="Workflow Statuses"
                    items={settings?.workflowCategories}
                    onUpdate={handleSettingsUpdate}
                    onAddItem={handleAddNewItem}
                    fieldName="workflowCategories"
                    hasSubStatuses={true}
                />
                <div className="space-y-6">
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
                </div>
            </div>
        </div>
    );
}
