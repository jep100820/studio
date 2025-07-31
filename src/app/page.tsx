"use client";

import React from "react";
import { PlusCircle } from "lucide-react";
import { useApp } from "@/contexts/app-provider";
import KanbanBoard from "@/components/kanban/kanban-board";
import { Button } from "@/components/ui/button";
import TaskForm from "@/components/kanban/task-form";

export default function KanbanPage() {
  const { tasks, filters } = useApp();

  const filteredTasks = React.useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    switch (filters.kanban) {
      case "active":
        return tasks.filter((task) => task.status.toLowerCase() !== "done");
      case "overdue":
        return tasks.filter(
          (task) =>
            new Date(task.dueDate) < today &&
            task.status.toLowerCase() !== "done"
        );
      case "due-today":
        return tasks.filter(
          (task) =>
            new Date(task.dueDate).toDateString() === today.toDateString()
        );
      case "due-this-week":
        return tasks.filter((task) => {
          const dueDate = new Date(task.dueDate);
          return dueDate >= startOfWeek && dueDate <= endOfWeek;
        });
      case "completed":
        return tasks.filter((task) => task.status.toLowerCase() === "done");
      case "all":
      default:
        return tasks;
    }
  }, [tasks, filters.kanban]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h1 className="text-2xl font-bold">Kanban Board</h1>
        <TaskForm
          trigger={
            <Button>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Task
            </Button>
          }
        />
      </div>
      <div className="flex-1 overflow-x-auto p-4">
        <KanbanBoard tasks={filteredTasks} />
      </div>
    </div>
  );
}
