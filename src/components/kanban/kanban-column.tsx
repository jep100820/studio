"use client";

import React from "react";
import { WorkflowCategory, Task } from "@/lib/types";
import TaskCard from "./task-card";

interface KanbanColumnProps {
  category: WorkflowCategory;
  tasks: Task[];
  onDrop: (e: React.DragEvent<HTMLDivElement>, status: string) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragStart: (e: React.DragEvent<HTMLDivElement>, taskId: string) => void;
}

export default function KanbanColumn({
  category,
  tasks,
  onDrop,
  onDragOver,
}: KanbanColumnProps) {
  return (
    <div
      onDrop={(e) => onDrop(e, category.name)}
      onDragOver={onDragOver}
      className="bg-muted/50 rounded-lg p-2 w-72 md:w-80 flex-shrink-0 flex flex-col"
    >
      <div className="flex items-center gap-2 p-2 font-semibold">
        <span
          className="w-3 h-3 rounded-full"
          style={{ backgroundColor: category.color }}
        />
        <h3>
          {category.name} ({tasks.length})
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 p-1">
        {tasks.map((task) => (
          <TaskCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && <div className="text-center text-sm text-muted-foreground pt-4">No tasks</div>}
      </div>
    </div>
  );
}
