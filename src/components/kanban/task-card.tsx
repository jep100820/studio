"use client";

import React from "react";
import { format } from "date-fns";
import { Task } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import TaskForm from "./task-form";
import { useApp } from "@/contexts/app-provider";

interface TaskCardProps {
  task: Task;
}

export default function TaskCard({ task }: TaskCardProps) {
  const { settings } = useApp();
  const importance = settings.importanceLevels.find(
    (l) => l.name === task.importance
  );

  const isOverdue =
    new Date(task.dueDate) < new Date() && task.status.toLowerCase() !== "done";

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("taskId", task.id);
  };

  return (
    <TaskForm task={task}
      trigger={
        <Card
          draggable
          onDragStart={handleDragStart}
          className={cn(
            "cursor-pointer hover:shadow-md transition-shadow",
            isOverdue && "border-destructive"
          )}
        >
          <CardHeader className="p-4">
            <div className="flex justify-between items-start">
              <CardTitle className="text-base">{task.title}</CardTitle>
              {importance && (
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 mt-1"
                  style={{ backgroundColor: importance.color }}
                  title={`Importance: ${importance.name}`}
                ></span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{task.taskid}</p>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-sm">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Start: {format(new Date(task.date), "MMM d")}</span>
              <span>Due: {format(new Date(task.dueDate), "MMM d")}</span>
            </div>
            {task.subStatus && (
              <Badge variant="secondary">{task.subStatus}</Badge>
            )}
          </CardContent>
        </Card>
      }
    />
  );
}
