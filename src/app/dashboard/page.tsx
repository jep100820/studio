
// @ts-nocheck
'use client';

import { useEffect, useState, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where, Timestamp, doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Search, Calendar, Zap, AlertTriangle, CheckCircle, Clock, PlusCircle, LayoutDashboard, Settings, Moon, Sun, Pencil, Eye, BarChart2, TrendingUp, Percent, Shuffle } from 'lucide-react';
import Link from 'next/link';
import { format, subDays, startOfDay, differenceInDays, isValid, parseISO, parse, eachDayOfInterval, endOfToday, isSameDay, isFriday, isSaturday, isAfter, isBefore, endOfDay, startOfWeek, getWeek, subWeeks, endOfWeek } from 'date-fns';
import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, Text } from 'recharts';
import { useTheme } from "next-themes";
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';


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
        // Handle both 'YYYY-MM-DD' and 'YYYY-MM-DDTHH:mm'
        let date = parseISO(dateInput); 
        if (isValid(date)) return date;

        date = parse(dateInput, 'dd/MM/yyyy', new Date()); // Try "dd/MM/yyyy"
        if (isValid(date)) return date;

        date = new Date(dateInput); // General fallback
        return isValid(date) ? date : null;
    }
    
    return null; // Return null if format is unknown
};


const formatDate = (dateInput, includeTime = false) => {
    const date = toDate(dateInput);
    if (!date) return '';
    const formatString = includeTime ? 'MMM d, yyyy, h:mm a' : 'MMM d, yyyy';
    return format(date, formatString);
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

function DailyActivityChart({ allTasks, startDate, endDate }) {
    const data = useMemo(() => {
        if (!startDate || !endDate || isBefore(endDate, startDate)) {
            return [];
        }

        const dateRange = eachDayOfInterval({
            start: startDate,
            end: endDate
        });

        return dateRange.map(day => {
            const createdCount = allTasks.filter(task => {
                const taskDate = toDate(task.date);
                return taskDate && isSameDay(day, taskDate);
            }).length;

            const completedCount = allTasks.filter(task => {
                const completionDate = toDate(task.completionDate);
                return completionDate && isSameDay(day, completionDate);
            }).length;

            const activeCount = allTasks.filter(task => {
                const taskStartDate = toDate(task.date);
                if (!taskStartDate || isAfter(taskStartDate, day)) {
                    return false; // Not created yet
                }
                const completionDate = toDate(task.completionDate);
                if (completionDate && isBefore(completionDate, day)) {
                    return false; // Already completed before this day
                }
                return true;
            }).length;

            return {
                date: format(day, 'MMM d'),
                Created: createdCount,
                Completed: completedCount,
                Active: activeCount
            };
        });
    }, [allTasks, startDate, endDate]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">Daily Activity Trend</CardTitle>
                <CardDescription>Created, completed, and total active tasks within the selected range.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="w-full h-full overflow-x-auto">
                    <ResponsiveContainer width="100%" height="100%" minWidth={800}>
                        <ComposedChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                            <Legend iconSize={10} />
                            <Bar dataKey="Created" barSize={20} fill="#3b82f6" name="Newly Created" />
                            <Bar dataKey="Completed" barSize={20} fill="#22c55e" name="Completed" />
                            <Line type="monotone" dataKey="Active" stroke="#f97316" strokeWidth={2} name="Total Active Tasks" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

function BidOriginChart({ tasks, settings }) {
    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];
    
    // Using the first custom tag category as Bid Origin for now
    const bidOriginCategory = settings.customTags?.[0];

    const data = useMemo(() => {
        if (!bidOriginCategory) return [];

        const originCounts = tasks
            .filter(task => task.status !== 'Completed' && task.tags && task.tags[bidOriginCategory.name])
            .reduce((acc, task) => {
                const origin = task.tags[bidOriginCategory.name];
                acc[origin] = (acc[origin] || 0) + 1;
                return acc;
            }, {});
        
        return Object.entries(originCounts).map(([name, value], index) => ({ 
            name, 
            value,
            fill: COLORS[index % COLORS.length]
        }));
    }, [tasks, bidOriginCategory]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">Performance by Source</CardTitle>
                <CardDescription>Distribution of active tasks based on their source.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%" label={(entry) => `${entry.name} (${entry.value})`}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                        <Legend />
                    </PieChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}


function WeeklyCompletionChart({ tasks }) {
    const data = useMemo(() => {
        const weeks = Array.from({ length: 12 }, (_, i) => subWeeks(new Date(), i)).reverse();
        
        return weeks.map(weekStartInput => {
            const weekStart = startOfWeek(weekStartInput);
            const weekEnd = endOfWeek(weekStartInput);
            const weekLabel = `W${getWeek(weekStart)}`;
            
            const completedCount = tasks.filter(task => {
                const completionDate = toDate(task.completionDate);
                if (!completionDate) return false;
                
                return (isAfter(completionDate, weekStart) || isSameDay(completionDate, weekStart)) && 
                       (isBefore(completionDate, weekEnd) || isSameDay(completionDate, weekEnd));
            }).length;
            
            return {
                name: weekLabel,
                'Tasks Completed': completedCount
            };
        });
    }, [tasks]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">Weekly Completion Trend</CardTitle>
                <CardDescription>Tasks completed per week over the last 12 weeks.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis allowDecimals={false} fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                        <Legend />
                        <Line type="monotone" dataKey="Tasks Completed" stroke="#8884d8" />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

function DayOfWeekCompletionChart({ tasks }) {
    const data = useMemo(() => {
        const dayCounts = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 };
        tasks
            .filter(t => t.completionDate)
            .forEach(t => {
                const dayName = format(toDate(t.completionDate), 'E');
                dayCounts[dayName]++;
            });
        
        return Object.entries(dayCounts).map(([name, count]) => ({ name, count }));
    }, [tasks]);
    
    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">Productivity by Day</CardTitle>
                <CardDescription>Total tasks completed on each day of the week.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} />
                        <YAxis allowDecimals={false} fontSize={12} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                        <Bar dataKey="count" fill="#82ca9d" name="Tasks Completed">
                            <Text dataKey="count" position="top" offset={5} className="text-sm" />
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

function CompletedTasksList({ tasks, settings }) {
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
                                    <p className="text-xs text-muted-foreground mt-2">Completed on: {formatDate(task.completionDate, settings?.enableTimeTracking) || 'Not set'}</p>
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

function StatsDisplay({ tasks, completedTasks, settings }) {
    const stats = useMemo(() => {
        const now = new Date();
        const startOfToday = startOfDay(now);
        const sevenDaysAgo = subDays(now, 7);

        const activeTasks = tasks.filter(t => t.status !== 'Completed');

        const overdueTasks = activeTasks.filter(t => {
            const dueDate = toDate(t.dueDate);
            return dueDate && dueDate < startOfToday;
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
        };

        const completedLast7d = filterCompletedByDays(7);
        const totalActive = activeTasks.length;
        const completionRate = totalActive > 0 ? ((completedLast7d / (totalActive + completedLast7d)) * 100).toFixed(0) : 0;
        
        const staleTasks = activeTasks.filter(t => {
            const lastModified = toDate(t.lastModified || t.date);
            return lastModified && lastModified < sevenDaysAgo;
        }).length;

        const totalSubStatusChanges = completedTasks.reduce((sum, task) => sum + (task.subStatusChangeCount || 0), 0);
        const avgSubStatusChanges = completedTasks.length > 0 ? (totalSubStatusChanges / completedTasks.length).toFixed(1) : 0;

        return {
            totalCompleted: completedTasks.length,
            overdue: overdueTasks,
            active: totalActive,
            avgTime: avgCompletionTime,
            last7: completedLast7d,
            completedToday: completedTasks.filter(t => isSameDay(toDate(t.completionDate), now)).length,
            createdToday: tasks.filter(t => isSameDay(toDate(t.date), now)).length,
            completionRate: completionRate,
            inReview: tasks.filter(t => t.status === 'For Review').length,
            stale: staleTasks,
            avgSubStatusChanges: avgSubStatusChanges
        };
    }, [tasks, completedTasks]);
    
    const statConfig = [
        { key: 'totalCompleted', label: 'Total Completed', icon: CheckCircle, color: 'text-green-500' },
        { key: 'overdue', label: 'Tasks Overdue', icon: AlertTriangle, color: 'text-red-500' },
        { key: 'active', label: 'Active Tasks', icon: Zap, color: 'text-blue-500' },
        { key: 'avgTime', label: 'Avg. Completion Time', icon: Clock, color: 'text-blue-500', suffix: 'd' },
        { key: 'last7', label: 'Completed Last 7d', icon: Calendar, color: 'text-purple-500' },
        { key: 'completedToday', label: 'Completed Today', icon: CheckCircle, color: 'text-green-500' },
        { key: 'createdToday', label: 'Created Today', icon: PlusCircle, color: 'text-blue-500' },
        { key: 'completionRate', label: 'Completion Rate (7d)', icon: Percent, color: 'text-green-500', suffix: '%' },
        { key: 'inReview', label: 'Tasks in Review', icon: Eye, color: 'text-yellow-500' },
        { key: 'stale', label: 'Stale Tasks (>7d)', icon: AlertTriangle, color: 'text-orange-500' },
        { key: 'avgSubStatusChanges', label: 'Avg. Sub-status Changes', icon: Shuffle, color: 'text-gray-500' },
    ];
    
    const visibleStats = useMemo(() => {
        if (!settings?.dashboardSettings?.stats) {
            return { totalCompleted: true, overdue: true, active: true, avgTime: true, last7: true };
        }
        return settings.dashboardSettings.stats;
    }, [settings]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader className="p-4 pb-2">
                 <CardTitle className="text-lg">Project Snapshot</CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2 flex-grow overflow-y-auto">
                 <div className="grid grid-cols-1 gap-4">
                    {statConfig.map(({ key, label, icon: Icon, color, suffix }) => {
                        if (visibleStats[key]) {
                            return (
                                <div key={key} className="p-3 bg-muted/50 rounded-lg flex items-center gap-4">
                                    <Icon className={cn("h-6 w-6 flex-shrink-0", color)} />
                                    <div className="flex-grow">
                                       <p className="text-lg font-bold">{stats[key]}{suffix || ''}</p>
                                       <p className="text-sm text-muted-foreground">{label}</p>
                                    </div>
                                </div>
                            );
                        }
                        return null;
                    })}
                 </div>
            </CardContent>
        </Card>
    );
}

export default function DashboardPage() {
    const [tasks, setTasks] = useState([]);
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const [dateRange, setDateRange] = useState({ from: null, to: null });

    useEffect(() => {
        const settingsUnsub = onSnapshot(doc(db, 'settings', 'workflow'), (doc) => {
            if (doc.exists()) {
                setSettings(doc.data());
            }
        });

        const tasksQuery = query(collection(db, 'tasks'));
        const unsubscribe = onSnapshot(tasksQuery, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => {
                const data = doc.data();
                return { ...data, id: doc.id };
            });
            setTasks(fetchedTasks);
            
            if (fetchedTasks.length > 0 && !dateRange.from && !dateRange.to) {
                const earliestDate = fetchedTasks
                    .map(t => toDate(t.date))
                    .filter(Boolean)
                    .reduce((earliest, current) => (current < earliest ? current : earliest), new Date());
                
                setDateRange({
                    from: startOfDay(earliestDate),
                    to: endOfToday()
                });
            }

            setIsLoading(false);
        });

        return () => {
            unsubscribe();
            settingsUnsub();
        }
    }, []);

    const completedTasks = useMemo(() => {
        return tasks
            .filter(t => t.status === 'Completed')
            .sort((a, b) => {
                const aHasDate = !!a.completionDate;
                const bHasDate = !!b.completionDate;
                if (!aHasDate && bHasDate) return -1; // a without date comes first
                if (aHasDate && !bHasDate) return 1;  // b without date comes first
                if (!aHasDate && !bHasDate) return 0; // both without dates, order doesn't matter

                const dateA = toDate(a.completionDate);
                const dateB = toDate(b.completionDate);
                if (!dateA && dateB) return 1;
                if (dateA && !dateB) return -1;
                if (!dateA && !dateB) return 0;
                return dateB.getTime() - dateA.getTime();
            });
    }, [tasks]);
    
    const handleOpenModal = () => {
        // This is a placeholder for a potential "Add Task" modal on the dashboard
        // For now, it will navigate to the main page to add a task.
        router.push('/');
    };

    const handleDateChange = (e, part) => {
        const { value } = e.target;
        // The input type="date" provides value in "YYYY-MM-DD" format
        const newDate = toDate(value);
        if (newDate) {
            setDateRange(prev => ({ ...prev, [part]: part === 'from' ? startOfDay(newDate) : endOfDay(newDate) }));
        }
    };
    
    const formatDateForInput = (date) => {
        if (!isValid(date)) return '';
        return format(date, 'yyyy-MM-dd');
    };
    
    const visibleCharts = useMemo(() => {
        const defaultCharts = { taskStatus: true, taskPriority: true, dailyActivity: true };
        if (!settings?.dashboardSettings?.charts) return defaultCharts;
        return settings.dashboardSettings.charts;
    }, [settings]);

    const activeCharts = useMemo(() => {
        return Object.entries(visibleCharts).filter(([key, value]) => value).map(([key]) => key);
    }, [visibleCharts]);

    const defaultTab = useMemo(() => {
        if (visibleCharts.dailyActivity) return "trend";
        if (visibleCharts.taskStatus) return "status";
        if (visibleCharts.taskPriority) return "priority";
        if (visibleCharts.bidOrigin) return "origin";
        if (visibleCharts.weeklyCompletion) return "weekly";
        if (visibleCharts.dayOfWeekCompletion) return "dayOfWeek";
        return "";
    }, [visibleCharts]);

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
                    <div className="flex-grow">
                        <StatsDisplay tasks={tasks} completedTasks={completedTasks} settings={settings} />
                    </div>
                </div>
                
                <div className="lg:col-span-5 flex flex-col min-h-0">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="space-y-1">
                            <Label htmlFor="from-date">From</Label>
                            <Input id="from-date" type="date" value={formatDateForInput(dateRange.from)} onChange={(e) => handleDateChange(e, 'from')} />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="to-date">To</Label>
                            <Input id="to-date" type="date" value={formatDateForInput(dateRange.to)} onChange={(e) => handleDateChange(e, 'to')} />
                        </div>
                    </div>
                    {defaultTab && (
                        <Tabs defaultValue={defaultTab} className="h-full flex flex-col flex-grow">
                            <TabsList className="mb-4 inline-flex h-auto">
                                {visibleCharts.taskStatus && <TabsTrigger value="status">Task Status</TabsTrigger>}
                                {visibleCharts.taskPriority && <TabsTrigger value="priority">Task Priority</TabsTrigger>}
                                {visibleCharts.dailyActivity && <TabsTrigger value="trend">Daily Activity</TabsTrigger>}
                                {visibleCharts.bidOrigin && <TabsTrigger value="origin">Bid Origin</TabsTrigger>}
                                {visibleCharts.weeklyCompletion && <TabsTrigger value="weekly">Weekly Trend</TabsTrigger>}
                                {visibleCharts.dayOfWeekCompletion && <TabsTrigger value="dayOfWeek">Day Productivity</TabsTrigger>}
                            </TabsList>
                            {visibleCharts.taskStatus && (
                                <TabsContent value="status" className="flex-grow">
                                    <TaskStatusChart tasks={tasks} />
                                </TabsContent>
                            )}
                            {visibleCharts.taskPriority && (
                                <TabsContent value="priority" className="flex-grow">
                                    <TaskPriorityChart tasks={completedTasks} />
                                </TabsContent>
                            )}
                            {visibleCharts.dailyActivity && (
                                <TabsContent value="trend" className="flex-grow">
                                    <DailyActivityChart allTasks={tasks} startDate={dateRange.from} endDate={dateRange.to} />
                                </TabsContent>
                            )}
                            {visibleCharts.bidOrigin && (
                                <TabsContent value="origin" className="flex-grow">
                                    <BidOriginChart tasks={tasks} settings={settings} />
                                </TabsContent>
                            )}
                            {visibleCharts.weeklyCompletion && (
                                <TabsContent value="weekly" className="flex-grow">
                                    <WeeklyCompletionChart tasks={completedTasks} />
                                </TabsContent>
                            )}
                             {visibleCharts.dayOfWeekCompletion && (
                                <TabsContent value="dayOfWeek" className="flex-grow">
                                    <DayOfWeekCompletionChart tasks={completedTasks} />
                                </TabsContent>
                            )}
                        </Tabs>
                    )}
                </div>

                <div className="lg:col-span-2 flex flex-col min-h-0">
                     <div className="flex-grow">
                        <CompletedTasksList tasks={completedTasks} settings={settings} />
                    </div>
                </div>
            </main>
        </div>
    );
}
