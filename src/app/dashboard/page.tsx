
// @ts-nocheck
'use client';

import { useEffect, useState, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Calendar, Zap, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import Link from 'next/link';
import { format, subDays, startOfDay, differenceInDays, isValid } from 'date-fns';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

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

const formatDate = (timestamp) => {
    if (!timestamp) return '';
    let date;
    if (timestamp?.seconds) {
      date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
        date = timestamp;
    } else if (typeof timestamp === 'number') {
        date = new Date(timestamp * 1000);
    } else {
      return '';
    }
    
    if (!isValid(date)) return '';
    
    return format(date, 'MMM d, yyyy');
};

function TaskCompletionChart({ tasks }) {
    const data = useMemo(() => {
        const last14Days = Array.from({ length: 14 }, (_, i) => {
            const d = subDays(new Date(), i);
            return format(startOfDay(d), 'yyyy-MM-dd');
        }).reverse();

        const tasksPerDay = tasks
            .filter(task => task.completionDate && typeof task.completionDate === 'number')
            .reduce((acc, task) => {
                const date = new Date(task.completionDate * 1000);
                if (isValid(date)) {
                    const day = format(date, 'yyyy-MM-dd');
                    acc[day] = (acc[day] || 0) + 1;
                }
                return acc;
            }, {});

        return last14Days.map(day => ({
            date: format(new Date(day), 'MMM d'),
            completed: tasksPerDay[day] || 0,
        }));
    }, [tasks]);

    return (
        <div className="h-80 w-full">
            <ResponsiveContainer>
                <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="completed" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
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
        <div className="h-80 w-full">
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
        <div className="h-80 w-full">
            <ResponsiveContainer>
                <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} barSize={30}>
                         {data.map((entry, index) => {
                            const colors = { High: '#ef4444', Medium: '#f59e0b', Low: '#10b981' };
                            return <Cell key={`cell-${index}`} fill={colors[entry.name]} />;
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
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
                                    <p className="text-xs text-muted-foreground mt-2">Completed on: {formatDate({ seconds: task.completionDate})}</p>
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
            if (t.status === 'Completed' || !t.dueDate || typeof t.dueDate !== 'number') return false;
            const dueDate = new Date(t.dueDate * 1000);
            return isValid(dueDate) && dueDate < now;
        }).length;
        
        const completionTimes = completedTasks
            .filter(t => t.date && typeof t.date === 'number' && t.completionDate && typeof t.completionDate === 'number')
            .map(t => {
                const startDate = new Date(t.date * 1000);
                const completionDate = new Date(t.completionDate * 1000);
                if (isValid(startDate) && isValid(completionDate)) {
                    return differenceInDays(completionDate, startDate);
                }
                return null;
            }).filter(d => d !== null);
        
        const avgCompletionTime = completionTimes.length > 0
            ? (completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length).toFixed(1)
            : 0;
            
        const completedLast7Days = completedTasks.filter(t => {
            if (!t.completionDate || typeof t.completionDate !== 'number') return false;
            const completionDate = new Date(t.completionDate * 1000);
            return isValid(completionDate) && differenceInDays(now, completionDate) <= 7;
        }).length;

        const completedLast30Days = completedTasks.filter(t => {
            if (!t.completionDate || typeof t.completionDate !== 'number') return false;
            const completionDate = new Date(t.completionDate * 1000);
            return isValid(completionDate) && differenceInDays(now, completionDate) <= 30;
        }).length;

        return {
            totalCompleted: completedTasks.length,
            overdue: overdueTasks,
            avgTime: avgCompletionTime,
            last7: completedLast7Days,
            last30: completedLast30Days
        };
    }, [tasks, completedTasks]);

    return (
        <Card className="mb-6">
            <CardHeader>
                 <CardTitle>Project Snapshot</CardTitle>
                 <CardDescription>Key performance indicators for your project.</CardDescription>
            </CardHeader>
            <CardContent>
                 <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 text-center">
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <CheckCircle className="h-6 w-6 mx-auto text-green-500 mb-2" />
                        <p className="text-2xl font-bold">{stats.totalCompleted}</p>
                        <p className="text-sm text-muted-foreground">Tasks Completed</p>
                    </div>
                     <div className="p-4 bg-muted/50 rounded-lg">
                        <AlertTriangle className="h-6 w-6 mx-auto text-red-500 mb-2" />
                        <p className="text-2xl font-bold">{stats.overdue}</p>
                        <p className="text-sm text-muted-foreground">Tasks Overdue</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <Clock className="h-6 w-6 mx-auto text-blue-500 mb-2" />
                        <p className="text-2xl font-bold">{stats.avgTime}d</p>
                        <p className="text-sm text-muted-foreground">Avg. Completion</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <Zap className="h-6 w-6 mx-auto text-yellow-500 mb-2" />
                        <p className="text-2xl font-bold">{stats.last7}</p>
                        <p className="text-sm text-muted-foreground">Done (Last 7d)</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                        <Calendar className="h-6 w-6 mx-auto text-purple-500 mb-2" />
                        <p className="text-2xl font-bold">{stats.last30}</p>
                        <p className="text-sm text-muted-foreground">Done (Last 30d)</p>
                    </div>
                 </div>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const [tasks, setTasks] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const tasksQuery = query(collection(db, 'tasks'));
        const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => {
                const data = doc.data();
                // Serialize Timestamps
                const serializedData = {};
                for (const key in data) {
                    if (data[key] instanceof Timestamp) {
                        serializedData[key] = data[key].seconds;
                    } else {
                        serializedData[key] = data[key];
                    }
                }
                return { ...serializedData, id: doc.id };
            });
            setTasks(fetchedTasks);
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const completedTasks = useMemo(() => {
        return tasks
            .filter(t => t.status === 'Completed')
            .sort((a, b) => (b.completionDate || 0) - (a.completionDate || 0));
    }, [tasks]);

    if (isLoading) {
        return <div className="flex items-center justify-center min-h-screen">Loading dashboard...</div>;
    }
    
    return (
        <div className="flex flex-col h-screen bg-background text-foreground p-4 md:p-8 overflow-y-auto">
            <header className="flex-shrink-0 flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Dashboard</h1>
                <Link href="/">
                    <Button variant="outline">Back to Board</Button>
                </Link>
            </header>
            <main className="flex-grow flex flex-col min-h-0">
                <StatsDisplay tasks={tasks} completedTasks={completedTasks} />
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-grow">
                    <div className="lg:col-span-2">
                         <Card>
                            <CardHeader>
                                <CardTitle>Analytics</CardTitle>
                                <CardDescription>Visual summary of your project performance.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Tabs defaultValue="productivity">
                                    <TabsList className="grid w-full grid-cols-3">
                                        <TabsTrigger value="productivity">Productivity</TabsTrigger>
                                        <TabsTrigger value="distribution">Distribution</TabsTrigger>
                                        <TabsTrigger value="prioritization">Prioritization</TabsTrigger>
                                    </TabsList>
                                    <TabsContent value="productivity" className="pt-4">
                                        <h4 className="text-md font-semibold mb-4 text-center">Tasks Completed Per Day (Last 14 Days)</h4>
                                        <TaskCompletionChart tasks={completedTasks} />
                                    </TabsContent>
                                    <TabsContent value="distribution" className="pt-4">
                                         <h4 className="text-md font-semibold mb-4 text-center">Active Task Distribution</h4>
                                         <TaskStatusChart tasks={tasks} />
                                    </TabsContent>
                                     <TabsContent value="prioritization" className="pt-4">
                                        <h4 className="text-md font-semibold mb-4 text-center">Completed Tasks by Priority</h4>
                                        <TaskPriorityChart tasks={completedTasks} />
                                    </TabsContent>
                                </Tabs>
                            </CardContent>
                        </Card>
                    </div>
                    <div className="lg:col-span-1 flex flex-col min-h-0">
                        <CompletedTasksList tasks={completedTasks} />
                    </div>
                </div>
            </main>
        </div>
    );
}
