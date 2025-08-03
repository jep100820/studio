
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
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line, ComposedChart, LabelList, AreaChart, Area } from 'recharts';
import { Text as RechartsText } from 'recharts';
import { useTheme } from "next-themes";
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


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

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, value, fill, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);
    const textColor = isColorLight(fill) ? '#000' : '#fff';

    return (
        <text x={x} y={y} fill={textColor} textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
            {value > 0 ? `${name} (${value})` : ''}
        </text>
    );
};


function TaskStatusOverviewChart({ tasks, completedTasks, settings }) {
    const COLORS = {
        Completed: '#a78bfa',
        Overdue: '#ef4444',
        // Default active colors
        'In Progress': '#60a5fa',
        'For Review': '#facc15',
        'Not Started': '#d1d5db',
        'Approved for Submission': '#4ade80'
    };

    const data = useMemo(() => {
        const today = startOfDay(new Date());
        
        // Process active tasks
        const statusCounts = tasks.reduce((acc, task) => {
            const isOverdue = toDate(task.dueDate) && isBefore(toDate(task.dueDate), today) && task.status !== 'Completed';
            
            if (isOverdue) {
                acc['Overdue'] = (acc['Overdue'] || 0) + 1;
            } else {
                acc[task.status] = (acc[task.status] || 0) + 1;
            }
            return acc;
        }, {});
        
        // Add completed tasks count from the pre-filtered list
        if (completedTasks.length > 0) {
            statusCounts['Completed'] = completedTasks.length;
        }

        return Object.entries(statusCounts).map(([name, value]) => {
            const workflowColor = settings.workflowCategories?.find(cat => cat.name === name)?.color;
            return { 
                name, 
                value,
                fill: COLORS[name] || workflowColor || '#8884d8'
            };
        });
    }, [tasks, completedTasks, settings]);


    const totalValue = useMemo(() => data.reduce((sum, entry) => sum + entry.value, 0), [data]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">Task Status Overview</CardTitle>
                <CardDescription>A complete snapshot of all tasks by their current status.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <div className="w-full h-full relative">
                    {totalValue > 0 && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                             <div className="text-center">
                                <p className="text-4xl font-bold text-foreground">{totalValue}</p>
                                <p className="text-sm text-muted-foreground">Total Tasks</p>
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
                const completionDate = toDate(task.completionDate);

                if (!taskStartDate || isAfter(taskStartDate, day)) {
                    return false; // Not created yet
                }
                
                // Active if it's not completed, OR if it was completed on or after this day
                if (!completionDate || isAfter(completionDate, day) || isSameDay(completionDate, day)) {
                    return true;
                }
                
                return false; // Completed before this day
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
                <CardDescription>Tasks created and completed daily within the selected range.</CardDescription>
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
                            <Bar dataKey="Created" barSize={20} fill="#3b82f6" name="Newly Created">
                                <LabelList dataKey="Created" position="top" className="fill-foreground" fontSize={12} formatter={(value) => value > 0 ? value : ''}/>
                            </Bar>
                            <Bar dataKey="Completed" barSize={20} fill="#22c55e" name="Completed">
                                <LabelList dataKey="Completed" position="top" className="fill-foreground" fontSize={12} formatter={(value) => value > 0 ? value : ''}/>
                            </Bar>
                            <Line type="monotone" dataKey="Active" stroke="#f97316" strokeWidth={2} name="Total Active Tasks" dot={false} />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}

function PerformanceBySourceChart({ tasks, settings }) {
    const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1'];
    
    const sourceCategoryName = settings?.dashboardSettings?.performanceChartSource;
    
    const data = useMemo(() => {
        if (!sourceCategoryName) return [];

        const sourceCounts = tasks
            .filter(task => task.status !== 'Completed' && task.tags && task.tags[sourceCategoryName])
            .reduce((acc, task) => {
                const source = task.tags[sourceCategoryName];
                acc[source] = (acc[source] || 0) + 1;
                return acc;
            }, {});
        
        return Object.entries(sourceCounts).map(([name, value], index) => ({ 
            name, 
            value,
            fill: COLORS[index % COLORS.length]
        }));
    }, [tasks, sourceCategoryName]);

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">Performance by Source</CardTitle>
                 <CardDescription>
                    {sourceCategoryName 
                        ? `Distribution of active tasks by '${sourceCategoryName}'.`
                        : 'Select a data source in dashboard settings.'}
                </CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                 {data.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius="80%">
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.fill} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                ) : (
                     <div className="flex items-center justify-center h-full text-muted-foreground">
                        <p>No data available for the selected source.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

const CustomizedLabel = (props) => {
    const { x, y, width, height, value, dataKey, fill } = props;
    
    if (value === 0) return null;

    return (
        <g>
             <rect x={x} y={y - 1} width={width} height={height + 2} fill={fill} rx="2" ry="2" />
             <RechartsText
                x={x + width / 2}
                y={y + height / 2}
                fill={'#000'}
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono text-xs"
            >
                {value}
            </RechartsText>
        </g>
    );
};


function WeeklyProgressChart({ allTasks }) {
    const data = useMemo(() => {
        const weeks = Array.from({ length: 12 }, (_, i) => subWeeks(new Date(), i)).reverse();
        
        return weeks.map(weekStartInput => {
            const weekStart = startOfWeek(weekStartInput, { weekStartsOn: 1 }); // Assuming Monday start
            const weekEnd = endOfWeek(weekStartInput, { weekStartsOn: 1 });
            const weekLabel = `W${getWeek(weekStart)}`;
            
            const completedCount = allTasks.filter(task => {
                const completionDate = toDate(task.completionDate);
                if (!completionDate) return false;
                
                return (isAfter(completionDate, weekStart) || isSameDay(completionDate, weekStart)) && 
                       (isBefore(completionDate, weekEnd) || isSameDay(completionDate, weekEnd));
            }).length;

            const activeCount = allTasks.filter(task => {
                 const startDate = toDate(task.date);
                 const completionDate = toDate(task.completionDate);

                 // Must have been created before the end of the week
                 if (!startDate || isAfter(startDate, weekEnd)) {
                     return false;
                 }

                 // Must either not be completed, or completed after this week ended
                 if (!completionDate || isAfter(completionDate, weekEnd)) {
                     return true;
                 }
                 return false;
            }).length;
            
            return {
                name: weekLabel,
                'Tasks Completed': completedCount,
                'Tasks Active': activeCount,
            };
        });
    }, [allTasks]);
    
    const activeColor = '#8884d8';
    const completedColor = '#82ca9d';
    
    const maxVal = Math.max(...data.map(d => d['Tasks Active']), ...data.map(d => d['Tasks Completed']));

    return (
        <Card className="h-full flex flex-col">
            <CardHeader>
                <CardTitle className="text-lg">Weekly Progress</CardTitle>
                <CardDescription>Active vs. completed tasks over the last 12 weeks.</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
                <ResponsiveContainer width="100%" height="100%">
                     <ComposedChart data={data} margin={{ top: 20, right: 30, left: -32, bottom: 40 }}>
                         <defs>
                            <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={completedColor} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={completedColor} stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={activeColor} stopOpacity={0.8}/>
                                <stop offset="95%" stopColor={activeColor} stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                        <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                        <Legend verticalAlign="top" align="right" wrapperStyle={{top: -4, right: 20}} />
                        
                        <Area type="monotone" dataKey="Tasks Active" stroke={activeColor} fillOpacity={1} fill="url(#colorActive)" />
                        <Area type="monotone" dataKey="Tasks Completed" stroke={completedColor} fillOpacity={1} fill="url(#colorCompleted)" />

                        {/* Transparent bars with labels to display data */}
                         <Bar dataKey="Tasks Active" fill="transparent" stackId="a">
                             <LabelList
                                dataKey="Tasks Active"
                                position="bottom"
                                content={<CustomizedLabel dataKey="Tasks Active" fill={activeColor} />}
                                offset={30}
                             />
                        </Bar>
                         <Bar dataKey="Tasks Completed" fill="transparent" stackId="b">
                             <LabelList
                                dataKey="Tasks Completed"
                                position="bottom"
                                content={<CustomizedLabel dataKey="Tasks Completed" fill={completedColor} />}
                                offset={10}
                            />
                        </Bar>

                    </ComposedChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
}

function DayOfWeekCompletionChart({ tasks }) {
    const data = useMemo(() => {
        const dayOrder = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const dayCounts = { 'Sun': 0, 'Mon': 0, 'Tue': 0, 'Wed': 0, 'Thu': 0, 'Fri': 0, 'Sat': 0 };
        tasks
            .filter(t => t.completionDate)
            .forEach(t => {
                const completionDate = toDate(t.completionDate);
                if (completionDate) {
                    const dayName = format(completionDate, 'E');
                    dayCounts[dayName]++;
                }
            });
        
        return dayOrder.map(dayName => ({ name: dayName, count: dayCounts[dayName] }));
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
                            <LabelList dataKey="count" position="top" className="fill-foreground" fontSize={12} formatter={(value) => value > 0 ? value : ''}/>
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
            totalTasks: tasks.length + completedTasks.length,
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
        { key: 'totalTasks', label: 'Total Tasks', icon: BarChart2, color: 'text-purple-500' },
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
            return { totalTasks: true, totalCompleted: true, overdue: true, active: true, avgTime: true, last7: true };
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
    const [allTasks, setAllTasks] = useState([]);
    const [settings, setSettings] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const [dateRange, setDateRange] = useState({ from: null, to: null });
    const [filterScope, setFilterScope] = useState({ charts: true, stats: true });


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
            setAllTasks(fetchedTasks);
            
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

    const { activeTasks, completedTasks } = useMemo(() => {
        const active = allTasks.filter(task => task.status !== 'Completed');
        const completed = allTasks
            .filter(t => t.status === 'Completed')
            .sort((a, b) => {
                const dateA = toDate(a.completionDate) || 0;
                const dateB = toDate(b.completionDate) || 0;
                return dateB - dateA;
            });
        return { activeTasks: active, completedTasks: completed };
    }, [allTasks]);


    const { filteredActive, filteredCompleted } = useMemo(() => {
        if (!dateRange.from || !dateRange.to) {
            return { filteredActive: activeTasks, filteredCompleted: completedTasks };
        }
        
        const start = startOfDay(dateRange.from);
        const end = endOfDay(dateRange.to);

        const filteredActiveTasks = activeTasks.filter(task => {
            const taskDate = toDate(task.date);
            if (!taskDate) return false;
            // A task is considered "active" in the range if it was created within it
            return isAfter(taskDate, start) && isBefore(taskDate, end);
        });

        const filteredCompletedTasks = completedTasks.filter(task => {
            const completionDate = toDate(task.completionDate);
            if (!completionDate) return false;
            return isAfter(completionDate, start) && isBefore(completionDate, end);
        });

        return { filteredActive: filteredActiveTasks, filteredCompleted: filteredCompletedTasks };
    }, [activeTasks, completedTasks, dateRange]);


    const { tasksForStats, completedTasksForStats, tasksForCharts, completedTasksForCharts, allTasksForCharts } = useMemo(() => {
        const tasksForStats = filterScope.stats ? filteredActive : activeTasks;
        const completedTasksForStats = filterScope.stats ? filteredCompleted : completedTasks;
        
        const tasksForCharts = filterScope.charts ? filteredActive : activeTasks;
        const completedTasksForCharts = filterScope.charts ? filteredCompleted : completedTasks;

        const allTasksForCharts = filterScope.charts ? [...tasksForCharts, ...completedTasksForCharts] : allTasks;


        return { tasksForStats, completedTasksForStats, tasksForCharts, completedTasksForCharts, allTasksForCharts };
    }, [filterScope, activeTasks, completedTasks, filteredActive, filteredCompleted, allTasks]);
    
    
    const handleOpenModal = () => {
        router.push('/');
    };

    const handleDateChange = (e, part) => {
        const { value } = e.target;
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
        const defaultCharts = { taskStatus: true, dailyActivity: true };
        if (!settings?.dashboardSettings?.charts) return defaultCharts;
        return settings.dashboardSettings.charts;
    }, [settings]);

    const defaultTab = useMemo(() => {
        if (visibleCharts.taskStatus) return "status";
        if (visibleCharts.dailyActivity) return "trend";
        if (visibleCharts.dayOfWeekCompletion) return "dayOfWeek";
        if (visibleCharts.performanceBySource) return "source";
        if (visibleCharts.weeklyProgress) return "weekly";
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
                    <div className="flex-grow min-h-0">
                        <StatsDisplay tasks={tasksForStats} completedTasks={completedTasksForStats} settings={settings} />
                    </div>
                </div>
                
                <div className="lg:col-span-5 flex flex-col min-h-0">
                    <div className="p-4 border rounded-lg mb-4 space-y-4">
                        <div className="flex items-center gap-4">
                            <div className="space-y-1 flex-grow">
                                <Label htmlFor="from-date">From</Label>
                                <Input id="from-date" type="date" value={formatDateForInput(dateRange.from)} onChange={(e) => handleDateChange(e, 'from')} />
                            </div>
                            <div className="space-y-1 flex-grow">
                                <Label htmlFor="to-date">To</Label>
                                <Input id="to-date" type="date" value={formatDateForInput(dateRange.to)} onChange={(e) => handleDateChange(e, 'to')} />
                            </div>
                        </div>
                        <div className="flex items-center space-x-4">
                             <div className="flex items-center space-x-2">
                                <Checkbox id="filter-charts" checked={filterScope.charts} onCheckedChange={(checked) => setFilterScope(prev => ({...prev, charts: checked}))} />
                                <Label htmlFor="filter-charts" className="text-sm font-normal">Filter Charts</Label>
                             </div>
                             <div className="flex items-center space-x-2">
                                <Checkbox id="filter-stats" checked={filterScope.stats} onCheckedChange={(checked) => setFilterScope(prev => ({...prev, stats: checked}))} />
                                <Label htmlFor="filter-stats" className="text-sm font-normal">Filter Stats</Label>
                             </div>
                        </div>
                    </div>
                    {defaultTab && (
                        <Tabs defaultValue={defaultTab} className="h-full flex flex-col flex-grow">
                            <TabsList className="mb-4 inline-flex h-auto flex-wrap">
                                {visibleCharts.taskStatus && <TabsTrigger value="status">Task Overview</TabsTrigger>}
                                {visibleCharts.dailyActivity && <TabsTrigger value="trend">Daily Activity</TabsTrigger>}
                                {visibleCharts.dayOfWeekCompletion && <TabsTrigger value="dayOfWeek">Day Productivity</TabsTrigger>}
                                {visibleCharts.performanceBySource && <TabsTrigger value="source">Performance</TabsTrigger>}
                                {visibleCharts.weeklyProgress && <TabsTrigger value="weekly">Weekly Progress</TabsTrigger>}
                            </TabsList>
                            {visibleCharts.taskStatus && (
                                <TabsContent value="status" className="flex-grow">
                                    <TaskStatusOverviewChart tasks={tasksForCharts} completedTasks={completedTasksForCharts} settings={settings} />
                                </TabsContent>
                            )}
                            {visibleCharts.dailyActivity && (
                                <TabsContent value="trend" className="flex-grow">
                                    <DailyActivityChart allTasks={allTasksForCharts} startDate={dateRange.from} endDate={dateRange.to} />
                                </TabsContent>
                            )}
                            {visibleCharts.performanceBySource && (
                                <TabsContent value="source" className="flex-grow">
                                    <PerformanceBySourceChart tasks={tasksForCharts} settings={settings} />
                                </TabsContent>
                            )}
                            {visibleCharts.weeklyProgress && (
                                <TabsContent value="weekly" className="flex-grow">
                                    <WeeklyProgressChart allTasks={allTasks} />
                                </TabsContent>
                            )}
                             {visibleCharts.dayOfWeekCompletion && (
                                <TabsContent value="dayOfWeek" className="flex-grow">
                                    <DayOfWeekCompletionChart tasks={completedTasksForCharts} />
                                </TabsContent>
                            )}
                        </Tabs>
                    )}
                </div>

                <div className="lg:col-span-2 flex flex-col min-h-0">
                     <div className="flex-grow min-h-0">
                        <CompletedTasksList tasks={filterScope.stats ? filteredCompleted : completedTasks} settings={settings} />
                    </div>
                </div>
            </main>
        </div>
    );
}
