'use client';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sparkles, Loader2, Plus } from 'lucide-react';
import { generateTasks, AITask } from '@/ai/flows/generate-tasks-flow';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export function AIAssistantModal({ isOpen, onClose, onAddTasks, settings }) {
    const [goal, setGoal] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [generatedTasks, setGeneratedTasks] = useState<AITask[]>([]);
    
    const handleGenerateTasks = async () => {
        if (!goal) return;
        setIsLoading(true);
        setError(null);
        setGeneratedTasks([]);

        try {
            const availableStatuses = settings.workflowCategories.map(cat => cat.name).filter(name => name !== 'Completed');
            const availableImportances = settings.importanceLevels.map(imp => imp.name);

            const result = await generateTasks({ goal, availableStatuses, availableImportances });
            if (result.tasks) {
                setGeneratedTasks(result.tasks);
            }
        } catch (e) {
            console.error(e);
            setError('An error occurred while generating tasks. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddClick = () => {
        onAddTasks(generatedTasks);
        resetState();
    };
    
    const resetState = () => {
        setGoal('');
        setIsLoading(false);
        setError(null);
        setGeneratedTasks([]);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Sparkles className="text-primary" />
                        AI Assistant
                    </DialogTitle>
                    <DialogDescription>
                        Describe a high-level goal, and the AI will break it down into actionable tasks for you.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="goal">Your Goal</Label>
                        <Textarea
                            id="goal"
                            placeholder="e.g., 'Launch a new marketing campaign for the Q3 product release' or 'Onboard the new client Acme Corp'"
                            value={goal}
                            onChange={(e) => setGoal(e.target.value)}
                            rows={3}
                            disabled={isLoading || generatedTasks.length > 0}
                        />
                    </div>

                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="ml-4 text-muted-foreground">Generating tasks...</p>
                        </div>
                    )}
                    
                    {error && (
                         <Alert variant="destructive">
                            <AlertTitle>Error</AlertTitle>
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}

                    {generatedTasks.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-semibold">Suggested Tasks</h3>
                             <div className="max-h-64 overflow-y-auto space-y-3 pr-2">
                                {generatedTasks.map((task, index) => (
                                    <div key={index} className="p-3 border rounded-lg bg-muted/50">
                                        <p className="font-semibold">{task.taskid}</p>
                                        <p className="text-sm text-muted-foreground mt-1">{task.desc}</p>
                                        <div className="flex items-center gap-4 mt-2 text-xs">
                                            <span className="bg-primary/20 text-primary-foreground px-2 py-0.5 rounded-full">{task.status}</span>
                                            {task.importance && <span className="font-medium">{task.importance}</span>}
                                            <span>Due in: {task.daysFromNow} days</span>
                                        </div>
                                    </div>
                                ))}
                             </div>
                        </div>
                    )}
                </div>
                <DialogFooter>
                    {generatedTasks.length > 0 ? (
                        <div className="w-full flex justify-between">
                            <Button variant="ghost" onClick={() => setGeneratedTasks([])}>
                                Regenerate
                            </Button>
                            <Button onClick={handleAddClick}>
                                <Plus className="h-4 w-4 mr-2" />
                                Add {generatedTasks.length} Tasks to Board
                            </Button>
                        </div>
                    ) : (
                        <Button onClick={handleGenerateTasks} disabled={isLoading || !goal}>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Tasks
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
