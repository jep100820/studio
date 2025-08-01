
// @ts-nocheck
'use client';

import { useEffect, useState, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Calendar, Zap, AlertTriangle, CheckCircle, Clock, PlusCircle, LayoutDashboard, Settings, Moon, Sun } from 'lucide-react';
import Link from 'next/link';
import { format, subDays, startOfDay, differenceInDays, isValid, parseISO, parse } from 'date-fns';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useTheme } from "next-themes";


// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_API_KEY",
    authDomain: "kanbanflow-6cvc6.firebaseapp.com",
    projectId: "kanbanflow-6cvc6",
    storageBucket: "kanbanflow-6cvc6.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// A robust, unified date parsing function
const toDate = (dateInput) => {
    if (!dateInput) return null;

    // Firestore Timestamp
    if (typeof dateInput === 'object' && dateInput.seconds) {
        return new Date(dateInput.seconds * 1000);
    }
    
    // Javascript Date object
    if (dateInput instanceof Date) {
        return isValid(dateInput) ? dateInput : null;
    }

    // Number (milliseconds or seconds)
    if (typeof dateInput === 'number') {
        // If it's likely seconds, convert to milliseconds
        return dateInput > 10000000000 ? new Date(dateInput) : new Date(dateInput * 1000);
    }
    
    // String
    if (typeof dateInput === 'string') {
        let date = parseISO(dateInput); // Try ISO format first (YYYY-MM-DD)
        if (isValid(date)) return date;

        date = parse(dateInput, 'dd/MM/yyyy', new Date()); // Try "dd/MM/yyyy"
        if (isValid(date)) return date;

        date = new Date(dateInput); // General fallback
        return isValid(date) ? date : null;
    }
    
    return null; // Return null if format is unknown
};

const formatDate = (dateInput, outputFormat = 'MMM d, yyyy') => {
    const date = toDate(dateInput);
    return date ? format(date, outputFormat) : '';
};


function TaskCompletionTable({ tasks }) {
    const data = useMemo(() => {
        const last14Days = Array.from({ length: 14 }, (_, i) => {
            const d = subDays(new Date(), i);
            return format(startOfDay(d), 'yyyy-MM-dd');
        }).reverse();

        const tasksPerDay = tasks
            .map(task => ({ ...task, completionDateObj: toDate(task.completionDate) }))
            .filter(task => task.completionDateObj && isValid(task.completionDateObj))
            .reduce((acc, task) => {
                const day = format(task.completionDateObj, 'yyyy-MM-dd');
                acc[day] = (acc[day] || 0) + 1;
                return acc;
            }, {});
            
        return last14Days.map(day => ({
            date: format(parseISO(day), 'MMM d'),
            completed: tasksPerDay[day] || 0,
        }));
    }, [tasks]);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">Productivity</CardTitle>
                <CardDescription>Tasks completed per day (last 14 days).</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="h-96 w-full overflow-y-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead className="text-right">Tasks Completed</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((row) => (
                                <TableRow key={row.date}>
                                    <TableCell className="font-medium">{row.date}</TableCell>
                                    <TableCell className="text-right">{row.completed}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

function TaskStatusChart({ tasks }) {
    const data = useMemo(() => {
        const statusCounts = tasks
            .filter(task => task.status !== 'Completed')
            .reduce((acc, task) => {
                acc[task.status] = (acc[task.status] || 0) + 1;
                return acc;
            }, {});
        
        return Object.entries(statusCounts).map(([name, value]) => ({ name, value }));
    }, [tasks]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF'];

    return (
       <Card>
            <CardHeader>
                <CardTitle className="text-lg">Active Task Distribution</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-60 w-full">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#8884d8" paddingAngle={5}>
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                            <Legend iconSize={10} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

function TaskPriorityChart({ tasks }) {
    const data = useMemo(() => {
        const priorityCounts = tasks
            .filter(task => task.status === 'Completed' && task.importance)
            .reduce((acc, task) => {
                acc[task.importance] = (acc[task.importance] || 0) + 1;
                return acc;
            }, { 'High': 0, 'Medium': 0, 'Low': 0 });
            
        return Object.entries(priorityCounts).map(([name, count]) => ({ name, count }));
    }, [tasks]);

    return (
         <Card>
            <CardHeader>
                <CardTitle className="text-lg">Completed by Priority</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="h-60 w-full">
                    <ResponsiveContainer>
                        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                            <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={20}>
                                 {data.map((entry, index) => {
                                    const colors = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
                                    return <Cell key={`cell-${index}`} fill={colors[entry.name]} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}


function CompletedTasksList({ tasks }) {
    const [searchTerm, setSearchTerm] = useState('');
    const router = useRouter();

    const filteredTasks = useMemo(() => {
        if (!searchTerm) return tasks;
        return tasks.filter(task => 
            (task.taskid?.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (task.remarks?.toLowerCase().includes(searchTerm.toLowerCase()))
        );
    }, [tasks, searchTerm]);
    
    const handleDoubleClick = (task) => {
        const password = prompt('Enter password to edit task:');
        if (password === 'abc') {
            router.push(`/?edit=${task.id}`);
        } else if (password !== null) {
            alert('Incorrect password.');
        }
    };

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle>Completed Tasks</CardTitle>
                <CardDescription>Search or double-click to edit.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow flex flex-col min-h-0">
                <div className="relative mb-4">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search by Task ID or Remarks..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                    />
                </div>
                <div className="flex-grow overflow-y-auto pr-2 -mr-2">
                    {filteredTasks.length > 0 ? (
                        <div className="space-y-3">
                            {filteredTasks.map(task => (
                                <div 
                                    key={task.id} 
                                    className="p-3 bg-muted/50 rounded-lg text-sm cursor-pointer hover:bg-muted"
                                    onDoubleClick={() => handleDoubleClick(task)}
                                >
                                    <p className="font-semibold text-foreground">{task.taskid}</p>
                                    <p className="text-muted-foreground mt-1 truncate">{task.remarks || 'No remarks'}</p>
                                    <p className="text-xs text-muted-foreground mt-2">Completed on: {formatDate(task.completionDate)}</p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            <p>No completed tasks found.</p>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

function StatsDisplay({ tasks, completedTasks }) {
    const stats = useMemo(() => {
        const now = new Date();
        const overdueTasks = tasks.filter(t => {
            if (t.status === 'Completed') return false;
            const dueDate = toDate(t.dueDate);
            return dueDate && dueDate < startOfDay(now);
        }).length;
        
        const completionTimes = completedTasks
            .map(t => {
                const startDate = toDate(t.date);
                const completionDate = toDate(t.completionDate);
                if (startDate && completionDate) {
                    return differenceInDays(completionDate, startDate);
                }
                return null;
            })
            .filter(d => d !== null && d >= 0);
        
        const avgCompletionTime = completionTimes.length > 0
            ? (completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length).toFixed(1)
            : 0;
            
        const filterCompletedByDays = (days) => {
            const dateLimit = subDays(now, days);
            return completedTasks.filter(t => {
                const completionDate = toDate(t.completionDate);
                return completionDate && completionDate >= dateLimit;
            }).length;
        }

        return {
            totalCompleted: completedTasks.length,
            overdue: overdueTasks,
            avgTime: avgCompletionTime,
            last7: filterCompletedByDays(7),
            last30: filterCompletedByDays(30)
        };
    }, [tasks, completedTasks]);

    return (
        <Card>
            <CardHeader className="p-4 pb-2">
                 <CardTitle className="text-lg">Project Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
                 <div className="grid grid-cols-5 gap-2 text-center">
                    <div className="p-2 bg-muted/50 rounded-lg">
                        <CheckCircle className="h-4 w-4 mx-auto text-green-500 mb-1" />
                        <p className="text-lg font-bold">{stats.totalCompleted}</p>
                        <p className="text-xs text-muted-foreground">Completed</p>
                    </div>
                     <div className="p-2 bg-muted/50 rounded-lg">
                        <AlertTriangle className="h-4 w-4 mx-auto text-red-500 mb-1" />
                        <p className="text-lg font-bold">{stats.overdue}</p>
                        <p className="text-xs text-muted-foreground">Overdue</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                        <Clock className="h-4 w-4 mx-auto text-blue-500 mb-1" />
                        <p className="text-lg font-bold">{stats.avgTime}d</p>
                        <p className="text-xs text-muted-foreground">Avg. Time</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                        <Zap className="h-4 w-4 mx-auto text-yellow-500 mb-1" />
                        <p className="text-lg font-bold">{stats.last7}</p>
                        <p className="text-xs text-muted-foreground">Last 7d</p>
                    </div>
                    <div className="p-2 bg-muted/50 rounded-lg">
                        <Calendar className="h-4 w-4 mx-auto text-purple-500 mb-1" />
                        <p className="text-lg font-bold">{stats.last30}</p>
                        <p className="text-xs text-muted-foreground">Last 30d</p>
                    </div>
                 </div>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const { theme, setTheme } = useTheme();

    useEffect(() => {
        const tasksQuery = query(collection(db, 'tasks'));
        const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => {
                const data = doc.data();
                return { ...data, id: doc.id };
            });
            setTasks(fetchedTasks);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const completedTasks = useMemo(() => {
        return tasks
            .filter(t => t.status === 'Completed' && toDate(t.completionDate))
            .sort((a, b) => {
                const dateA = toDate(a.completionDate);
                const dateB = toDate(b.completionDate);
                if (!dateA) return 1;
                if (!dateB) return -1;
                return dateB.getTime() - dateA.getTime();
            });
    }, [tasks]);

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading dashboard...</div>;
    }
    
    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            <header className="flex-shrink-0 flex justify-between items-center p-4 border-b">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                 <div className="flex items-center gap-2 flex-shrink-0">
                    <Link href="/">
                        <Button variant="outline" size="sm">
                            Back to Board
                        </Button>
                    </Link>
                    <Link href="/settings">
                      <Button variant="outline" size="sm">
                          <Settings className="h-4 w-4 mr-2" />
                          Settings
                      </Button>
                    </Link>
                    <Button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} variant="outline" size="icon">
                      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      <span className="sr-only">Toggle theme</span>
                    </Button>
                </div>
            </header>
            <main className="flex-grow p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 overflow-y-auto">
                {/* Left Column (1/3 width) */}
                 <div className="flex flex-col gap-6 lg:gap-8 min-h-0">
                    <StatsDisplay tasks={tasks} completedTasks={completedTasks} />
                    <TaskCompletionTable tasks={completedTasks} />
                </div>
                
                {/* Middle Column (1/3 width) */}
                <div className="flex flex-col gap-6 lg:gap-8 min-h-0">
                    <TaskStatusChart tasks={tasks} />
                    <TaskPriorityChart tasks={completedTasks} />
                </div>

                {/* Right Column (1/3 width) */}
                <div className="flex flex-col min-h-0">
                    <CompletedTasksList tasks={completedTasks} />
                </div>
            </main>
        </div>
    );
}
