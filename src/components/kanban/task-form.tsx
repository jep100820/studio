"use client";

import React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { useApp } from "@/contexts/app-provider";
import type { Task } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../ui/alert-dialog";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  taskid: z.string().min(1, "Task ID is required"),
  status: z.string().min(1, "Status is required"),
  importance: z.string().min(1, "Importance is required"),
  bidOrigin: z.string().min(1, "Bid Origin is required"),
  subStatus: z.string().optional(),
  date: z.date({ required_error: "Start date is required"}),
  dueDate: z.date({ required_error: "Due date is required"}),
  desc: z.string().optional(),
  remarks: z.string().optional(),
});

interface TaskFormProps {
  task?: Task;
  trigger: React.ReactNode;
}

export default function TaskForm({ task, trigger }: TaskFormProps) {
  const { settings, addTask, updateTask, deleteTask } = useApp();
  const [isOpen, setIsOpen] = React.useState(false);

  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: task
      ? {
          ...task,
          date: new Date(task.date),
          dueDate: new Date(task.dueDate),
        }
      : {
          title: "",
          taskid: `PROJ-${Math.floor(100 + Math.random() * 900)}`,
          status: settings.workflowCategories?.[0]?.name || "",
          importance: settings.importanceLevels?.[1]?.name || settings.importanceLevels?.[0]?.name || "",
          bidOrigin: settings.bidOrigins?.[0]?.name || "",
          subStatus: "",
          date: new Date(),
          dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
          desc: "",
          remarks: "",
        },
  });

  React.useEffect(() => {
    if (isOpen && !task) {
      form.reset({
        title: "",
        taskid: `PROJ-${Math.floor(100 + Math.random() * 900)}`,
        status: settings.workflowCategories?.[0]?.name || "",
        importance: settings.importanceLevels?.[1]?.name || settings.importanceLevels?.[0]?.name || "",
        bidOrigin: settings.bidOrigins?.[0]?.name || "",
        subStatus: "",
        date: new Date(),
        dueDate: new Date(new Date().setDate(new Date().getDate() + 7)),
        desc: "",
        remarks: "",
      });
    } else if (isOpen && task) {
        form.reset({
            ...task,
            date: new Date(task.date),
            dueDate: new Date(task.dueDate),
        })
    }
  }, [isOpen, task, settings, form]);


  const onSubmit = (values: z.infer<typeof taskSchema>) => {
    const taskData = {
      ...values,
      date: values.date.toISOString(),
      dueDate: values.dueDate.toISOString(),
      desc: values.desc || "",
      remarks: values.remarks || "",
      subStatus: values.subStatus || "",
    };
    if (task) {
        const updatedTask = { ...task, ...taskData };
        if(taskData.status.toLowerCase() === 'done' && !task.completionDate) {
            updatedTask.completionDate = new Date().toISOString();
        } else if (taskData.status.toLowerCase() !== 'done') {
            delete updatedTask.completionDate;
        }
      updateTask(updatedTask);
    } else {
      addTask(taskData);
    }
    form.reset();
    setIsOpen(false);
  };
  
  const handleDelete = () => {
    if (task) {
      deleteTask(task.id);
      setIsOpen(false);
    }
  }
  
  const selectedStatus = form.watch("status");
  const availableSubStatuses = settings.subCategories.filter(
    (sc) => sc.parentCategory === selectedStatus
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild onClick={() => setIsOpen(true)}>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "Create Task"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input id="title" {...form.register("title")} />
                {form.formState.errors.title && <p className="text-destructive text-sm">{form.formState.errors.title.message}</p>}
             </div>
             <div className="space-y-2">
                <Label htmlFor="taskid">Task ID</Label>
                <Input id="taskid" {...form.register("taskid")} />
                {form.formState.errors.taskid && <p className="text-destructive text-sm">{form.formState.errors.taskid.message}</p>}
             </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Controller name="date" control={form.control} render={({ field }) => (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                    </Popover>
                )}/>
                {form.formState.errors.date && <p className="text-destructive text-sm">{form.formState.errors.date.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Controller name="dueDate" control={form.control} render={({ field }) => (
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value} onSelect={field.onChange} /></PopoverContent>
                    </Popover>
                )}/>
                {form.formState.errors.dueDate && <p className="text-destructive text-sm">{form.formState.errors.dueDate.message}</p>}
              </div>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
                <Label>Status</Label>
                <Controller name="status" control={form.control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                        <SelectContent>{settings.workflowCategories.map(cat => <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>)}</SelectContent>
                    </Select>
                )}/>
            </div>
            <div className="space-y-2">
                <Label>Sub-Status</Label>
                <Controller name="subStatus" control={form.control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value} disabled={availableSubStatuses.length === 0}>
                        <SelectTrigger><SelectValue placeholder="Sub-Status" /></SelectTrigger>
                        <SelectContent>{availableSubStatuses.map(sub => <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>)}</SelectContent>
                    </Select>
                )}/>
            </div>
             <div className="space-y-2">
                <Label>Importance</Label>
                <Controller name="importance" control={form.control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Importance" /></SelectTrigger>
                        <SelectContent>{settings.importanceLevels.map(level => <SelectItem key={level.id} value={level.name}>{level.name}</SelectItem>)}</SelectContent>
                    </Select>
                )}/>
            </div>
            <div className="space-y-2">
                <Label>Bid Origin</Label>
                <Controller name="bidOrigin" control={form.control} render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger><SelectValue placeholder="Bid Origin" /></SelectTrigger>
                        <SelectContent>{settings.bidOrigins.map(origin => <SelectItem key={origin.id} value={origin.name}>{origin.name}</SelectItem>)}</SelectContent>
                    </Select>
                )}/>
            </div>
          </div>
          <div className="space-y-2">
             <Label htmlFor="desc">Description</Label>
             <Textarea id="desc" {...form.register("desc")} />
          </div>
          <div className="space-y-2">
             <Label htmlFor="remarks">Remarks</Label>
             <Textarea id="remarks" {...form.register("remarks")} />
          </div>
          <DialogFooter className="!justify-between">
            <div>
            {task && (
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="destructive" type="button"><Trash2 className="h-4 w-4" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. This will permanently delete this task.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            )}
            </div>
            <div className="flex gap-2">
                <DialogClose asChild>
                    <Button variant="outline" type="button">Cancel</Button>
                </DialogClose>
                <Button type="submit">Save</Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
