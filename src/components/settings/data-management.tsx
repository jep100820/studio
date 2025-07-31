"use client";

import React, { useRef } from "react";
import { useApp } from "@/contexts/app-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { defaultSettings, defaultTasks } from "@/lib/defaults";
import { useToast } from "@/hooks/use-toast";

export default function DataManagement() {
  const { tasks, settings, setTasks, setSettings } = useApp();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleExport = () => {
    const data = JSON.stringify({ tasks, settings }, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kanbanflow_data.json";
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Success", description: "Data exported successfully." });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const result = e.target?.result;
          if (typeof result === "string") {
            const { tasks: importedTasks, settings: importedSettings } = JSON.parse(result);
            // We need to be careful here. The AppProvider's setTasks and setSettings
            // now write to Firestore. We should use them.
            setTasks(importedTasks);
            setSettings(importedSettings);
            toast({ title: "Success", description: "Data imported successfully." });
          }
        } catch (error) {
          toast({ variant: "destructive", title: "Error", description: "Failed to import data. Invalid file format." });
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Data Management</CardTitle>
        <CardDescription>Import, export, or reset your application data.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="flex flex-col gap-2 p-4 border rounded-lg">
            <h3 className="font-semibold">Import/Export Data</h3>
            <p className="text-sm text-muted-foreground">Save your current data or load from a backup file. This operates on local data and Firestore.</p>
            <div className="flex gap-2 mt-2">
                <Button onClick={handleImportClick}>Import JSON</Button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
                <Button onClick={handleExport} variant="outline">Export JSON</Button>
            </div>
        </div>

        <div className="flex flex-col gap-2 p-4 border rounded-lg border-destructive/50">
            <h3 className="font-semibold text-destructive">Danger Zone</h3>
            <p className="text-sm text-muted-foreground">These actions are permanent and cannot be undone.</p>
            <div className="flex gap-2 mt-2">
                 <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive">Clear All Tasks</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will permanently delete all tasks from Firestore.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { setTasks([]); toast({title: "Success", description: "All tasks have been cleared."}) }}>Clear Tasks</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" >Reset Settings</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle><AlertDialogDescription>This will reset all settings to their default values in Firestore.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { setSettings(defaultSettings); toast({title: "Success", description: "Settings have been reset."}) }}>Reset Settings</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
                <AlertDialog>
                    <AlertDialogTrigger asChild><Button variant="destructive" >Factory Reset</Button></AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle><AlertDialogDescription>This will clear all tasks and reset all settings in Firestore. This is irreversible.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => { setTasks(defaultTasks); setSettings(defaultSettings); toast({title: "Success", description: "Application has been reset."}) }}>I'm sure, reset everything</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
      </CardContent>
    </Card>
  );
}
