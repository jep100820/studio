"use client";

import React from "react";
import { useApp } from "@/contexts/app-provider";
import WeeklyCompletionChart from "./weekly-completion-chart";
import TaskDistributionChart from "./task-distribution-chart";
import BidOriginChart from "./bid-origin-chart";
import CompletedTasksTable from "./completed-tasks-table";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";

export default function DashboardClient() {
  const { tasks, settings } = useApp();

  return (
    <div className="grid gap-6">
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Active Task Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <TaskDistributionChart tasks={tasks} settings={settings} />
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Weekly Completion Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <WeeklyCompletionChart tasks={tasks} />
          </CardContent>
        </Card>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Completed Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <CompletedTasksTable tasks={tasks} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Performance by Bid Origin</CardTitle>
          </CardHeader>
          <CardContent>
            <BidOriginChart tasks={tasks} settings={settings} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
