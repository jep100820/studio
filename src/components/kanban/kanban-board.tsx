
"use client";

import React from "react";
import { useApp } from "@/contexts/app-provider";
import KanbanColumn from "./kanban-column";
import type { Task } from "@/lib/types";

interface KanbanBoardProps {
  tasks: Task[];
}

export default function KanbanBoard({ tasks }: KanbanBoardProps) {
  const { settings, updateTask } = useApp();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, status: string) => {
    e.preventDefault();
    const taskId = e.dataTransfer.getData("taskId");
    const task = tasks.find((t) => t.id === taskId);
    if (task) {
        const updatedTask = { ...task, status };
        if (status.toLowerCase() === 'done' && !task.completionDate) {
            updatedTask.completionDate = new Date().toISOString();
        }
      updateTask(updatedTask);
    }
  };

  return (
    <div className="flex gap-4 h-full w-full">
      {(settings.workflowCategories || []).map((category) => (
        <KanbanColumn
          key={category.id}
          category={category}
          tasks={tasks.filter((task) => task.status === category.name)}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragStart={handleDragStart}
        />
      ))}
    </div>
  );
}
