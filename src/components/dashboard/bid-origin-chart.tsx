"use client";

import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Task, AppSettings } from "@/lib/types";

interface BidOriginChartProps {
  tasks: Task[];
  settings: AppSettings;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#AF19FF"];

export default function BidOriginChart({ tasks, settings }: BidOriginChartProps) {
  const chartData = useMemo(() => {
    return settings.bidOrigins
      .map((origin) => ({
        name: origin.name,
        value: tasks.filter((task) => task.bidOrigin === origin.name).length,
      }))
      .filter((item) => item.value > 0);
  }, [tasks, settings]);
  
  if (chartData.length === 0) return <div className="text-center h-60 flex items-center justify-center">No tasks to display.</div>

  return (
    <div style={{ width: "100%", height: 300 }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={60}
            outerRadius={80}
            fill="#8884d8"
            paddingAngle={5}
            dataKey="value"
            nameKey="name"
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
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
