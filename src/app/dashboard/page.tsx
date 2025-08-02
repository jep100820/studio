
// @ts-nocheck
'use client';

import { useEffect, useState, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Calendar, Zap, AlertTriangle, CheckCircle, Clock, PlusCircle, LayoutDashboard, Settings, Moon, Sun, Pencil } from 'lucide-react';
import Link from 'next/link';
import { format, subDays, startOfDay, differenceInDays, isValid, parseISO, parse, eachDayOfInterval, endOfToday, isSameDay, isFriday, isSaturday } from 'date-fns';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts';
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

function isColorLight(hexColor) {
    if (!hexColor) return true;
    const color = hexColor.charAt(0) === '#' ? hexColor.substring(1, 7) : hexColor;
    const r = parseInt(color.substring(0, 2), 16);
    const g = parseInt(color.substring(2, 4), 16);
    const b = parseInt(color.substring(4, 6), 16);
    return ((r * 0.299) + (g * 0.587) + (b * 0.114)) > 186;
}

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, value, fill }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const textColor = isColorLight(fill) ? '#000' : '#fff';

    return (
        <text x={x} y={y} fill={textColor} textAnchor="middle" dominantBaseline="central" className="text-sm font-bold">
            {value}
        </text>
    );
};


function TaskStatusChart({ tasks }) {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF', '#FF4560', '#775DD0'];
    const data = useMemo(() => {
        const statusCounts = tasks
            .filter(task => task.status !== 'Completed')
            .reduce((acc, task) => {
                acc[task.status] = (acc[task.status] || 0) + 1;
                return acc;
            }, {});
        
        return Object.entries(statusCounts).map(([name, value], index) => ({ 
            name, 
            value,
            fill: COLORS[index % COLORS.length]
        }));
    }, [tasks]);

    const totalValue = useMemo(() => data.reduce((sum, entry) => sum + entry.value, 0), [data]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">Active Task Distribution</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="w-full h-full relative">
                    {totalValue > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                             <div className="text-center">
                                <p className="text-4xl font-bold text-foreground">{totalValue}</p>
                                <p className="text-sm text-muted-foreground">Active Tasks</p>
                            </div>
                        </div>
                    )}
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                innerRadius="60%"
                                outerRadius="100%"
                                paddingAngle={2}
                                label={renderCustomizedLabel}
                                labelLine={false}
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute top-0 right-0 p-2 space-y-2 bg-background/80 rounded-bl-lg">
                        {data.map((entry) => (
                             <div 
                                key={entry.name}
                                className="text-xs px-2 py-1 rounded-md"
                                style={{ 
                                    backgroundColor: entry.fill,
                                    color: isColorLight(entry.fill) ? '#000' : '#fff'
                                }}
                            >
                                {entry.name}
                            </div>
                        ))}
                    </div>
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
         <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">Completed by Priority</CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                        <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={16}>
                             {data.map((entry, index) => {
                                const colors = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
                                return <Cell key={`cell-${index}`} fill={colors[entry.name]} />;
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

function DailyActivityChart({ allTasks, completedTasks }) {
    const data = useMemo(() => {
        const last7Days = eachDayOfInterval({
            start: subDays(endOfToday(), 6),
            end: endOfToday()
        });

        return last7Days.map(day => {
            const createdCount = allTasks.filter(task => {
                const taskDate = toDate(task.date);
                return taskDate && isSameDay(day, taskDate);
            }).length;

            const completedCount = completedTasks.filter(task => {
                const completionDate = toDate(task.completionDate);
                return completionDate && isSameDay(day, completionDate);
            }).length;

            return {
                date: format(day, 'MMM d'),
                Created: createdCount,
                Completed: completedCount,
            };
        });
    }, [allTasks, completedTasks]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">Daily Activity</CardTitle>
                 <CardDescription>Tasks created vs. completed in the last 7 days.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                        <Legend iconSize={10} />
                        <Line type="monotone" dataKey="Created" stroke="#3b82f6" strokeWidth={2} name="Created" />
                        <Line type="monotone" dataKey="Completed" stroke="#22c55e" strokeWidth={2} name="Completed" />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

function CompletionTrendChart({ completedTasks }) {
    const data = useMemo(() => {
        const last30Days = eachDayOfInterval({
            start: subDays(endOfToday(), 29),
            end: endOfToday()
        });

        const dailyData = last30Days.map(day => {
            const completedCount = completedTasks.filter(task => {
                const completionDate = toDate(task.completionDate);
                return completionDate && isSameDay(day, completionDate);
            }).length;

            return {
                date: format(day, 'EEE, MMM d'),
                Completed: completedCount,
                isWeekend: isFriday(day) || isSaturday(day)
            };
        });

        // Filter out weekends with no data
        return dailyData.filter(d => !d.isWeekend || d.Completed > 0);

    }, [completedTasks]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">30-Day Completion Trend</CardTitle>
                <CardDescription>Tasks completed per day. Excludes weekends with no activity.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} angle={-45} textAnchor="end" height={50} />
                        <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                        <Bar dataKey="Completed" fill="#8884d8" name="Completed" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
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
                                    <p className="text-xs text-muted-foreground mt-2">Completed on: {formatDate(task.completionDate) || 'Not set'}</p>
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

        const activeTasks = tasks.filter(t => t.status !== 'Completed').length;

        return {
            totalCompleted: completedTasks.length,
            overdue: overdueTasks,
            active: activeTasks,
            avgTime: avgCompletionTime,
            last7: filterCompletedByDays(7),
        };
    }, [tasks, completedTasks]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="p-4 pb-2">
                 <CardTitle className="text-lg">Project Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 flex-grow overflow-y-auto">
                 <div className="grid grid-cols-1 gap-4">
                    <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-4">
                        <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                        <div className="flex-grow">
                           <p className="text-lg font-bold">{stats.totalCompleted}</p>
                           <p className="text-sm text-muted-foreground">Total Completed</p>
                        </div>
                    </div>
                     <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-4">
                        <AlertTriangle className="h-6 w-6 text-red-500 flex-shrink-0" />
                        <div className="flex-grow">
                           <p className="text-lg font-bold">{stats.overdue}</p>
                           <p className="text-sm text-muted-foreground">Tasks Overdue</p>
                        </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-4">
                        <Zap className="h-6 w-6 text-blue-500 flex-shrink-0" />
                        <div className="flex-grow">
                           <p className="text-lg font-bold">{stats.active}</p>
                           <p className="text-sm text-muted-foreground">Active Tasks</p>
                        </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-4">
                        <Clock className="h-6 w-6 text-blue-500 flex-shrink-0" />
                        <div className="flex-grow">
                            <p className="text-lg font-bold">{stats.avgTime}d</p>
                            <p className="text-sm text-muted-foreground">Avg. Completion Time</p>
                        </div>
                    </div>
                    <div className="p-3 bg-muted/50 rounded-lg flex items-center gap-4">
                        <Calendar className="h-6 w-6 text-purple-500 flex-shrink-0" />
                        <div className="flex-grow">
                            <p className="text-lg font-bold">{stats.last7}</p>
                            <p className="text-sm text-muted-foreground">Completed Last 7d</p>
                        </div>
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
    const router = useRouter();

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
            .filter(t => t.status === 'Completed')
            .sort((a, b) => {
                const dateA = toDate(a.completionDate);
                const dateB = toDate(b.completionDate);
                if (!dateA && dateB) return -1;
                if (dateA && !dateB) return 1;
                if (!dateA && !dateB) return 0;
                return dateB.getTime() - dateA.getTime();
            });
    }, [tasks]);
    
    const handleOpenModal = () => {
        // This is a placeholder for a potential "Add Task" modal on the dashboard
        // For now, it will navigate to the main page to add a task.
        router.push('/');
    };

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading dashboard...</div>;
    }
    
    return (
        <div className="flex flex-col h-screen bg-background text-foreground">
            <header className="flex-shrink-0 flex justify-between items-center p-4 border-b">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                 <div className="flex items-center gap-2 flex-shrink-0">
                    <Button onClick={() => handleOpenModal()} size="sm">
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Task
                    </Button>
                    <Link href="/">
                        <Button variant="outline" size="sm">
                             <LayoutDashboard className="h-4 w-4 mr-2" />
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
            <main className="flex-grow p-4 md:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-9 gap-6 lg:gap-8 overflow-y-auto">
                 <div className="lg:col-span-2 flex flex-col gap-6 lg:gap-8 min-h-0">
                    <StatsDisplay tasks={tasks} completedTasks={completedTasks} />
                </div>
                
                <div className="lg:col-span-5 flex flex-col min-h-0">
                    <Tabs defaultValue="status" className="h-full flex flex-col">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="status">Task Status</TabsTrigger>
                            <TabsTrigger value="priority">Task Priority</TabsTrigger>
                            <TabsTrigger value="trend">Daily Activity</TabsTrigger>
                            <TabsTrigger value="completion">30-Day Trend</TabsTrigger>
                        </TabsList>
                        <TabsContent value="status" className="flex-grow">
                            <TaskStatusChart tasks={tasks} />
                        </TabsContent>
                        <TabsContent value="priority" className="flex-grow">
                            <TaskPriorityChart tasks={completedTasks} />
                        </TabsContent>
                        <TabsContent value="trend" className="flex-grow">
                            <DailyActivityChart allTasks={tasks} completedTasks={completedTasks} />
                        </TabsContent>
                         <TabsContent value="completion" className="flex-grow">
                            <CompletionTrendChart completedTasks={completedTasks} />
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="lg:col-span-2 flex flex-col min-h-0">
                    <CompletedTasksList tasks={completedTasks} />
                </div>
            </main>
        </div>
    );
}

    