"use client";

import React, { useState, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowUpDown } from "lucide-react";
import { format } from "date-fns";
import { Task } from "@/lib/types";

interface CompletedTasksTableProps {
  tasks: Task[];
}

type SortKey = keyof Task | "";

export default function CompletedTasksTable({ tasks }: CompletedTasksTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  const completedTasks = useMemo(() => {
    return tasks.filter((task) => task.status.toLowerCase() === "done");
  }, [tasks]);

  const filteredAndSortedTasks = useMemo(() => {
    let result = completedTasks.filter((task) =>
      task.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (sortKey) {
      result.sort((a, b) => {
        const valA = a[sortKey];
        const valB = b[sortKey];
        if (valA === undefined || valB === undefined) return 0;

        let comparison = 0;
        if (valA > valB) {
          comparison = 1;
        } else if (valA < valB) {
          comparison = -1;
        }
        return sortOrder === "desc" ? comparison * -1 : comparison;
      });
    }

    return result;
  }, [completedTasks, searchTerm, sortKey, sortOrder]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
  };

  const renderSortIcon = (key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="ml-2 h-4 w-4" />;
    return sortOrder === "asc" ? "▲" : "▼";
  };

  return (
    <div>
      <Input
        placeholder="Search completed tasks..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="max-w-sm mb-4"
      />
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort("title")}>
                  Title {renderSortIcon("title")}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort("taskid")}>
                  Task ID {renderSortIcon("taskid")}
                </Button>
              </TableHead>
              <TableHead>
                <Button variant="ghost" onClick={() => handleSort("completionDate")}>
                  Completion Date {renderSortIcon("completionDate")}
                </Button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAndSortedTasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>{task.title}</TableCell>
                <TableCell>{task.taskid}</TableCell>
                <TableCell>
                  {task.completionDate
                    ? format(new Date(task.completionDate), "PPP")
                    : "N/A"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
       {filteredAndSortedTasks.length === 0 && <div className="text-center p-4">No completed tasks found.</div>}
    </div>
  );
}
