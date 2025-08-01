"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import type { Task, AppSettings } from "@/lib/types";

interface TaskDistributionChartProps {
  tasks: Task[];
  settings: AppSettings;
}

export default function TaskDistributionChart({ tasks, settings }: TaskDistributionChartProps) {
  const chartData = useMemo(() => {
    if (!settings?.workflowCategories) return [];
    
    const activeTasks = tasks.filter((task) => task.status.toLowerCase() !== 'done');
    const distribution = settings.workflowCategories
      .filter(cat => cat.name.toLowerCase() !== 'done')
      .map((category) => ({
        name: category.name,
        value: activeTasks.filter((task) => task.status === category.name).length,
        color: category.color,
      }))
      .filter(item => item.value > 0);

    return distribution;
  }, [tasks, settings]);

  if (chartData.length === 0) return <div className="text-center h-60 flex items-center justify-center">No active tasks.</div>

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            labelLine={false}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          >
            {chartData.map((entry) => (
              <Cell key={`cell-${entry.name}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
             contentStyle={{
                backgroundColor: "hsl(var(--background))",
                borderColor: "hsl(var(--border))",
            }}
          />
          <Legend wrapperStyle={{fontSize: "14px"}}/>
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
