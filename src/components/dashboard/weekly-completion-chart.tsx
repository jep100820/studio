"use client";

import React, { useMemo } from "react";
import { Bar, BarChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { getWeek, startOfWeek, format } from "date-fns";
import { Task } from "@/lib/types";

interface WeeklyCompletionChartProps {
  tasks: Task[];
}

export default function WeeklyCompletionChart({ tasks }: WeeklyCompletionChartProps) {
  const chartData = useMemo(() => {
    const completedTasks = tasks.filter((task) => task.completionDate);
    const weeklyCompletions = completedTasks.reduce((acc, task) => {
      const completionDate = new Date(task.completionDate!);
      const weekNumber = getWeek(completionDate);
      const year = completionDate.getFullYear();
      const weekKey = `${year}-W${weekNumber}`;

      if (!acc[weekKey]) {
        acc[weekKey] = {
          count: 0,
          date: startOfWeek(completionDate),
        };
      }
      acc[weekKey].count++;
      return acc;
    }, {} as Record<string, { count: number, date: Date }>);
    
    return Object.entries(weeklyCompletions)
        .map(([key, value]) => ({
            name: format(value.date, "MMM d"),
            completions: value.count,
        }))
        .sort((a,b) => new Date(a.name).getTime() - new Date(b.name).getTime());

  }, [tasks]);

  if(chartData.length === 0) return <div className="text-center h-60 flex items-center justify-center">No completion data available.</div>

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <ComposedChart data={chartData}>
          <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip
            contentStyle={{
                backgroundColor: "hsl(var(--background))",
                borderColor: "hsl(var(--border))",
            }}
           />
          <Legend wrapperStyle={{fontSize: "14px"}}/>
          <Bar dataKey="completions" fill="hsl(var(--primary))" name="Tasks Completed" barSize={20}/>
          <Line type="monotone" dataKey="completions" stroke="hsl(var(--accent))" name="Trend" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
