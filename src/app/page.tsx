"use client";

import { useEffect, useState, useRef } from 'react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot, writeBatch, query, addDoc } from "firebase/firestore";
import { startOfDay, startOfWeek, endOfWeek, isSameDay, format as formatDateFns } from 'date-fns';

// --- Your Firebase Configuration ---
const firebaseConfig = {
    "projectId": "kanbanflow-6cvc6",
    "appId": "1:674602332508:web:d5676390127c3e0b131199",
    "storageBucket": "kanbanflow-6cvc6.appspot.com",
    "apiKey": "AIzaSyCX81iJOmn0Dn9lH5EkYZBdSYNXqlpDU1c",
    "authDomain": "kanbanflow-6cvc6.firebaseapp.com",
    "messagingSenderId": "674602332508"
};

// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const tasksCollection = collection(db, 'tasks');
const settingsDoc = doc(db, 'settings', 'appSettings');

const defaultSettings = {
    workflowCategories: [
      { id: 'wc1', name: 'Not Started', color: '#EF4444' },
      { id: 'wc2', name: 'In Progress', color: '#F97316' },
      { id: 'wc3', name: 'Under Review', color: '#EAB308' },
      { id: 'wc4', name: 'Done', color: '#22C55E' },
    ],
    subCategories: [
      { id: 'sc1', name: 'Design', parentCategory: 'In Progress' },
      { id: 'sc2', name: 'Development', parentCategory: 'In Progress' },
      { id: 'sc3', name: 'QA', parentCategory: 'Under Review' },
    ],
    importanceLevels: [
      { id: 'il1', name: 'High', color: '#DC2626' },
      { id: 'il2', name: 'Medium', color: '#F59E0B' },
      { id: 'il3', name: 'Low', color: '#10B981' },
    ],
    bidOrigins: [
      { id: 'bo1', name: 'Client Request' },
      { id: 'bo2', name: 'Internal' },
      { id: 'bo3', name: 'Referral' },
    ],
};


export default function Home() {
    const [isLoading, setIsLoading] = useState(true);
    const [allTasks, setAllTasks] = useState<any[]>([]);
    const [settings, setSettings] = useState<any>(null);
    const [currentKanbanFilter, setCurrentKanbanFilter] = useState('active');
    const [currentView, setCurrentView] = useState('kanban'); // 'kanban', 'dashboard', 'settings'
    const [isClient, setIsClient] = useState(false);
    
    // State for modals
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<any | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [settingsModalType, setSettingsModalType] = useState('');
    const [editingSettingsItem, setEditingSettingsItem] = useState<any | null>(null);
    const [currentSettingsTab, setCurrentSettingsTab] = useState('workflow');


    // Refs for charts
    const charts = useRef({
        weekly: null,
        distribution: null,
        origin: null,
    });
    
    useEffect(() => {
        setIsClient(true);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const isDarkMode = localStorage.getItem('theme') === 'dark';
            document.documentElement.classList.toggle('dark', isDarkMode);
        }
    }, []);
    
    const toggleTheme = () => {
        const isDarkMode = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDarkMode ? 'light' : 'dark');
        document.documentElement.classList.toggle('dark');
    };
    
    useEffect(() => {
        const loadInitialData = async () => {
            setIsLoading(true);
            try {
                const settingsSnapshot = await getDoc(settingsDoc);
                if (!settingsSnapshot.exists()) {
                    await setDoc(settingsDoc, defaultSettings);
                }
                
                const settingsUnsubscribe = onSnapshot(settingsDoc, (doc) => {
                    setSettings(doc.data() || defaultSettings);
                });

                const tasksUnsubscribe = onSnapshot(query(tasksCollection), (snapshot) => {
                    const tasks = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                    setAllTasks(tasks);
                    setIsLoading(false);
                });
                
                return () => {
                    settingsUnsubscribe();
                    tasksUnsubscribe();
                };

            } catch (error) {
                console.error("Error loading initial data:", error);
                setIsLoading(false);
            }
        };

        loadInitialData();
    }, []);

    if (!isClient || isLoading || !settings) {
        return <div id="loader">Loading Application...</div>;
    }
    
    const getFilteredTasks = () => {
        if (!allTasks) return [];
        const now = new Date();
        const today = startOfDay(now);
        const startOfWeekValue = startOfWeek(today);
        const endOfWeekValue = endOfWeek(today);

        switch (currentKanbanFilter) {
            case "active":
                return allTasks.filter(task => task.status?.toLowerCase() !== "done");
            case "overdue":
                return allTasks.filter(task => new Date(task.dueDate) < today && task.status?.toLowerCase() !== "done");
            case "due-today":
                return allTasks.filter(task => isSameDay(new Date(task.dueDate), today));
            case "due-this-week":
                return allTasks.filter(task => {
                    const dueDate = new Date(task.dueDate);
                    return dueDate >= startOfWeekValue && dueDate <= endOfWeekValue;
                });
            default:
                return allTasks;
        }
    };
    
    const openTaskModal = (task = null) => {
        setEditingTask(task);
        setIsTaskModalOpen(true);
    };

    const closeTaskModal = () => setIsTaskModalOpen(false);
    
    const handleSaveTask = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const id = formData.get('task-id') as string;
        
        const taskData: any = {
            taskid: formData.get('task-taskid'),
            title: formData.get('task-title'),
            date: new Date(formData.get('task-date') as string).toISOString(),
            dueDate: new Date(formData.get('task-dueDate') as string).toISOString(),
            status: formData.get('task-status'),
            subStatus: formData.get('task-subStatus'),
            importance: formData.get('task-importance'),
            bidOrigin: formData.get('task-bidOrigin'),
            remarks: formData.get('task-remarks'),
        };

        if (taskData.status.toLowerCase() === 'done' && (!id || !allTasks.find(t=>t.id===id)?.completionDate)) {
             taskData.completionDate = new Date().toISOString();
        } else if (taskData.status.toLowerCase() !== 'done') {
            taskData.completionDate = null;
        }

        try {
            if (id) {
                const docRef = doc(db, 'tasks', id);
                await setDoc(docRef, taskData, { merge: true });
            } else {
                const docRef = await addDoc(tasksCollection, taskData);
                await setDoc(docRef, { id: docRef.id }, { merge: true }); // Add the ID to the document itself
            }
            closeTaskModal();
        } catch (error) {
            console.error("Error saving task:", error);
            alert("Failed to save task.");
        }
    };
    
    const handleDeleteTask = async () => {
        const id = editingTask?.id;
        if (id && confirm('Are you sure you want to delete this task?')) {
            try {
                await deleteDoc(doc(db, 'tasks', id));
                closeTaskModal();
            } catch (error) {
                console.error("Error deleting task:", error);
                alert("Failed to delete task.");
            }
        }
    };
    
    const handleDrop = async (e: React.DragEvent<HTMLDivElement>, newStatus: string) => {
        e.preventDefault();
        const taskId = e.dataTransfer.getData('text/plain');
        const task = allTasks.find(t => t.id === taskId);
        
        if (task && task.status !== newStatus) {
            const updatedTask: any = { status: newStatus };
            if (newStatus.toLowerCase() === 'done' && !task.completionDate) {
                updatedTask.completionDate = new Date().toISOString();
            }
            try {
                await setDoc(doc(db, 'tasks', taskId), updatedTask, { merge: true });
            } catch (error) {
                console.error("Error updating task status:", error);
            }
        }
    };


    const HeaderStats = () => {
        if (!allTasks) return null;
        const now = new Date();
        const today = startOfDay(now);
        const startOfWeekValue = startOfWeek(today);
        const endOfWeekValue = endOfWeek(today);

        const activeCount = allTasks.filter(t => t.status?.toLowerCase() !== 'done').length;
        const overdueCount = allTasks.filter(t => new Date(t.dueDate) < today && t.status?.toLowerCase() !== 'done').length;
        const dueTodayCount = allTasks.filter(t => isSameDay(new Date(t.dueDate), today)).length;
        const dueThisWeekCount = allTasks.filter(t => {
            const d = new Date(t.dueDate);
            return d >= startOfWeekValue && d <= endOfWeekValue;
        }).length;

        return (
            <>
                <button className={`btn filter-btn ${currentKanbanFilter === 'active' ? 'active' : ''}`} onClick={() => setCurrentKanbanFilter('active')}>Active ({activeCount})</button>
                <button className={`btn filter-btn destructive ${currentKanbanFilter === 'overdue' ? 'active' : ''}`} onClick={() => setCurrentKanbanFilter('overdue')}>Overdue ({overdueCount})</button>
                <button className={`btn filter-btn ${currentKanbanFilter === 'due-today' ? 'active' : ''}`} onClick={() => setCurrentKanbanFilter('due-today')}>Due Today ({dueTodayCount})</button>
                <button className={`btn filter-btn ${currentKanbanFilter === 'due-this-week' ? 'active' : ''}`} onClick={() => setCurrentKanbanFilter('due-this-week')}>Due This Week ({dueThisWeekCount})</button>
            </>
        );
    }
    
    return (
        <div id="app-container">
            <header className="app-header">
                <div className="header-left">
                    <h1 onClick={() => setCurrentView('kanban')} style={{cursor: 'pointer'}}>Task Tracker</h1>
                    <button id="theme-toggle" className="btn" onClick={toggleTheme}>🌓</button>
                </div>
                <div className="header-center" id="kanban-filters" style={{ visibility: currentView === 'kanban' ? 'visible' : 'hidden'}}>
                    <HeaderStats />
                </div>
                <div className="header-right">
                    <button id="new-task-btn" className="btn" onClick={() => openTaskModal()}>New Task</button>
                    <button id="dashboard-toggle-btn" className={`btn ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}>Dashboard</button>
                    <button id="settings-toggle-btn" className={`btn ${currentView === 'settings' ? 'active' : ''}`} onClick={() => setCurrentView('settings')}>Settings</button>
                </div>
            </header>

            <main id="main-content">
                {currentView === 'kanban' && <KanbanBoard tasks={getFilteredTasks()} settings={settings} onDrop={handleDrop} onTaskClick={openTaskModal} />}
                {currentView === 'dashboard' && <DashboardView tasks={allTasks} settings={settings} />}
                {currentView === 'settings' && (
                    <SettingsView 
                        settings={settings}
                        onSave={async (newSettings) => await setDoc(settingsDoc, newSettings)}
                        onClearTasks={async () => {
                             if (!confirm("Are you sure you want to delete ALL tasks permanently?")) return;
                              try {
                                  const tasksSnapshot = await getDocs(tasksCollection);
                                  const batch = writeBatch(db);
                                  tasksSnapshot.forEach(doc => batch.delete(doc.ref));
                                  await batch.commit();
                                  alert("All tasks have been deleted.");
                              } catch (error) {
                                  console.error("Error clearing tasks:", error);
                                  alert("Failed to clear tasks.");
                              }
                        }}
                         onResetSettings={async () => {
                             if (!confirm("Are you sure you want to reset all settings to their default state?")) return;
                             try {
                                await setDoc(settingsDoc, defaultSettings);
                                alert("Settings have been reset to default.");
                             } catch(error) {
                                console.error("Error resetting settings:", error);
                                alert("Failed to reset settings.");
                             }
                        }}
                        tasks={allTasks}
                    />
                 )}
            </main>

            {isTaskModalOpen && <TaskModal task={editingTask} settings={settings} onClose={closeTaskModal} onSave={handleSaveTask} onDelete={handleDeleteTask} />}
        </div>
    );
}


function KanbanBoard({ tasks, settings, onDrop, onTaskClick }: any) {
    if (!settings?.workflowCategories) return null;

    const handleDragStart = (e: React.DragEvent<HTMLDivElement>, taskId: string) => {
        e.dataTransfer.setData('text/plain', taskId);
    };

    return (
        <div id="kanban-board">
            {settings.workflowCategories.map((category: any) => (
                <div 
                    key={category.id} 
                    className="kanban-column"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => onDrop(e, category.name)}
                >
                    <div className="kanban-column-header">
                        <div className="kanban-column-color" style={{ backgroundColor: category.color }}></div>
                        <span>{category.name} ({tasks.filter((t:any) => t.status === category.name).length})</span>
                    </div>
                    <div className="kanban-tasks">
                        {tasks
                            .filter((task: any) => task.status === category.name)
                            .map((task: any) => (
                                <TaskCard key={task.id} task={task} settings={settings} onDragStart={handleDragStart} onClick={() => onTaskClick(task)} />
                            ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

function TaskCard({ task, settings, onDragStart, onClick }: any) {
    const isOverdue = new Date(task.dueDate) < new Date() && task.status?.toLowerCase() !== 'done';
    const importance = settings.importanceLevels?.find((l:any) => l.name === task.importance);

    const formatDate = (isoString: string) => {
        if (!isoString) return 'N/A';
        return formatDateFns(new Date(isoString), 'MMM d, yyyy');
    }

    return (
        <div
            className={`task-card ${isOverdue ? 'overdue' : ''}`}
            draggable
            onDragStart={(e) => onDragStart(e, task.id)}
            onClick={onClick}
        >
            <div className="task-card-header">
                <h3>{task.title}</h3>
                {importance && <div className="importance-dot" style={{ backgroundColor: importance.color }} title={`Importance: ${importance.name}`}></div>}
            </div>
            <p className="task-id">{task.taskid}</p>
            {task.subStatus && <div className="sub-status-badge">{task.subStatus}</div>}
            <div className="task-card-footer">
                <span>Start: {formatDate(task.date)}</span>
                <span>Due: {formatDate(task.dueDate)}</span>
            </div>
        </div>
    );
}

function DashboardView({ tasks, settings } : any) {
    const weeklyChartRef = useRef(null);
    const distributionChartRef = useRef(null);
    const originChartRef = useRef(null);
    const charts = useRef<any>({});

    const [completedTasks, setCompletedTasks] = useState([]);
    const [sortConfig, setSortConfig] = useState<{key:string, direction:string}>({ key: 'completionDate', direction: 'desc' });
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (typeof window === 'undefined' || !window.Chart) return;

        const createChart = (ctx: any, type: string, data: any, options = {}) => {
            if (!ctx) return null;
            return new window.Chart(ctx, { type, data, options });
        };
        
        // Destroy old charts
        Object.values(charts.current).forEach((chart: any) => chart?.destroy());

        // Weekly Completion Chart
        if (weeklyChartRef.current) {
             const completed = tasks.filter((t:any) => t.completionDate);
             const weeklyData = completed.reduce((acc:any, task:any) => {
                const weekStart = formatDateFns(startOfWeek(new Date(task.completionDate)), 'yyyy-MM-dd');
                acc[weekStart] = (acc[weekStart] || 0) + 1;
                return acc;
            }, {});

            const sortedWeeks = Object.keys(weeklyData).sort();
            const labels = sortedWeeks.map(w => formatDateFns(new Date(w), 'MMM d'));
            const data = sortedWeeks.map(w => weeklyData[w]);

            charts.current.weekly = createChart(weeklyChartRef.current, 'bar', {
                labels,
                datasets: [{
                    label: 'Tasks Completed',
                    data,
                    backgroundColor: 'hsl(var(--primary))',
                }, {
                    label: 'Trend',
                    data,
                    borderColor: 'hsl(var(--accent))',
                    type: 'line',
                    fill: false,
                }]
            });
        }
        
        // Task Distribution Chart
        if (distributionChartRef.current && settings.workflowCategories) {
            const activeTasks = tasks.filter((task:any) => task.status?.toLowerCase() !== 'done');
            const distribution = settings.workflowCategories
              .filter((cat:any) => cat.name.toLowerCase() !== 'done')
              .map((category:any) => ({
                name: category.name,
                value: activeTasks.filter((task:any) => task.status === category.name).length,
                color: category.color,
              }))
              .filter((item:any) => item.value > 0);

             charts.current.distribution = createChart(distributionChartRef.current, 'pie', {
                labels: distribution.map((d:any) => d.name),
                datasets: [{
                    data: distribution.map((d:any) => d.value),
                    backgroundColor: distribution.map((d:any) => d.color)
                }]
            });
        }
        
        // Bid Origin Chart
        if (originChartRef.current && settings.bidOrigins) {
             const originsData = settings.bidOrigins.map((origin:any) => ({
                name: origin.name,
                value: tasks.filter((task:any) => task.bidOrigin === origin.name).length
             })).filter((item:any) => item.value > 0);
             
             charts.current.origin = createChart(originChartRef.current, 'doughnut', {
                 labels: originsData.map((d:any) => d.name),
                datasets: [{
                    data: originsData.map((d:any) => d.value),
                     backgroundColor: ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AF19FF']
                }]
            });
        }
        
        return () => {
             Object.values(charts.current).forEach((chart: any) => chart?.destroy());
        }

    }, [tasks, settings]);
    
     useEffect(() => {
        let filteredTasks = tasks.filter((t:any) => t.status?.toLowerCase() === 'done');
        
        if (searchTerm) {
             filteredTasks = filteredTasks.filter((t: any) => 
                t.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.taskid?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        const sortedTasks = [...filteredTasks].sort((a, b) => {
            let valA = a[sortConfig.key];
            let valB = b[sortConfig.key];
            if (sortConfig.key === 'completionDate') {
                valA = valA ? new Date(valA) : new Date(0);
                valB = valB ? new Date(valB) : new Date(0);
            }
            if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        setCompletedTasks(sortedTasks);
    }, [tasks, searchTerm, sortConfig]);
    
    const requestSort = (key: string) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };


    const formatDate = (isoString: string) => {
        if (!isoString) return 'N/A';
        return formatDateFns(new Date(isoString), 'MMM d, yyyy');
    }

    return (
        <div id="dashboard-view">
            <div className="chart-container">
                <h3>Weekly Completion Trend</h3>
                <canvas ref={weeklyChartRef}></canvas>
            </div>
            <div className="chart-container">
                <h3>Active Task Distribution</h3>
                <canvas ref={distributionChartRef}></canvas>
            </div>
            <div className="chart-container">
                <h3>Performance by Bid Origin</h3>
                <canvas ref={originChartRef}></canvas>
            </div>
            <div className="table-container">
                <h3>Completed Tasks</h3>
                 <input 
                    type="text" 
                    id="completed-tasks-search" 
                    placeholder="Search completed tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                <table id="completed-tasks-table">
                    <thead>
                        <tr>
                            <th onClick={() => requestSort('taskid')}>Task ID</th>
                            <th onClick={() => requestSort('title')}>Title</th>
                            <th onClick={() => requestSort('completionDate')}>Completion Date</th>
                            <th onClick={() => requestSort('remarks')}>Remarks</th>
                        </tr>
                    </thead>
                    <tbody>
                        {completedTasks.map((task: any) => (
                             <tr key={task.id}>
                                <td>{task.taskid}</td>
                                <td>{task.title}</td>
                                <td>{formatDate(task.completionDate)}</td>
                                <td>{task.remarks || ''}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

function SettingsView({ settings, onSave, onClearTasks, onResetSettings, tasks }: any) {
    const [activeTab, setActiveTab] = useState('workflow');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalConfig, setModalConfig] = useState<any>(null);
    const importFileInputRef = useRef<HTMLInputElement>(null);

    const handleOpenModal = (type: string, item: any = null) => {
        setModalConfig({ type, item });
        setIsModalOpen(true);
    };
    
    const handleCloseModal = () => setIsModalOpen(false);

    const handleSaveItem = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const id = formData.get('settings-item-id') || `id_${Date.now()}`;
        const name = formData.get('settings-name') as string;
        const color = formData.get('settings-color') as string;
        const parentCategory = formData.get('settings-parent') as string;
        
        const { type, item } = modalConfig;
        let collectionName = '';
        const newItemData: any = { id, name };

        switch(type) {
            case 'workflow': 
                collectionName = 'workflowCategories';
                newItemData.color = color;
                break;
            case 'subcategory':
                collectionName = 'subCategories';
                newItemData.parentCategory = parentCategory;
                break;
            case 'importance':
                collectionName = 'importanceLevels';
                newItemData.color = color;
                break;
            case 'bid-origin': collectionName = 'bidOrigins'; break;
        }

        const collection = [...(settings[collectionName] || [])];
        const existingIndex = collection.findIndex(i => i.id === id);

        if(existingIndex > -1) {
            collection[existingIndex] = newItemData;
        } else {
            collection.push(newItemData);
        }
        
        onSave({ ...settings, [collectionName]: collection });
        handleCloseModal();
    };

    const handleDeleteItem = () => {
        const { type, item } = modalConfig;
        if (!item || !confirm('Are you sure you want to delete this item?')) return;
        
        let collectionName = '';
        switch(type) {
            case 'workflow': collectionName = 'workflowCategories'; break;
            case 'subcategory': collectionName = 'subCategories'; break;
            case 'importance': collectionName = 'importanceLevels'; break;
            case 'bid-origin': collectionName = 'bidOrigins'; break;
        }
        
        const updatedCollection = settings[collectionName].filter((i:any) => i.id !== item.id);
        onSave({ ...settings, [collectionName]: updatedCollection });
        handleCloseModal();
    };
    
    const handleExportData = () => {
        const data = JSON.stringify({ settings, tasks }, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'task-tracker-data.json';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleImportClick = () => {
        importFileInputRef.current?.click();
    }
    
    const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target?.result as string);
                if (!data.settings || !data.tasks) {
                    throw new Error("Invalid data format");
                }

                if (!confirm("This will overwrite all current settings and tasks. Are you sure?")) return;
                
                const batch = writeBatch(db);

                const currentTasksSnapshot = await getDocs(tasksCollection);
                currentTasksSnapshot.forEach(doc => batch.delete(doc.ref));

                data.tasks.forEach((task: any) => {
                    const docRef = task.id ? doc(db, 'tasks', task.id) : doc(collection(db, 'tasks'));
                    batch.set(docRef, task);
                });

                batch.set(settingsDoc, data.settings);
                
                await batch.commit();
                alert("Data imported successfully!");

            } catch (error: any) {
                console.error("Failed to import data:", error);
                alert(`Error: ${error.message}`);
            }
        };
        reader.readAsText(file);
    };


    const renderList = (items: any[], type: string) => (
        <ul className="settings-list">
            {(items || []).map(item => (
                <li key={item.id} className="settings-list-item">
                    <div className="item-details">
                        {item.color && <div className="item-color-preview" style={{backgroundColor: item.color}}></div>}
                        <span className="item-name">{item.name}</span>
                        {item.parentCategory && <span className="item-parent" style={{marginLeft: 'auto', fontSize: '0.8rem', color: '#888'}}>(Parent: {item.parentCategory})</span>}
                    </div>
                    <div className="item-actions">
                        <button className="btn-icon edit-btn" onClick={() => handleOpenModal(type, item)}>✏️</button>
                    </div>
                </li>
            ))}
        </ul>
    );
    
    return (
        <div id="settings-view">
             <div className="settings-tabs">
                <div className={`settings-tab ${activeTab === 'workflow' ? 'active' : ''}`} onClick={() => setActiveTab('workflow')}>Workflow</div>
                <div className={`settings-tab ${activeTab === 'sub-categories' ? 'active' : ''}`} onClick={() => setActiveTab('sub-categories')}>Sub-Categories</div>
                <div className={`settings-tab ${activeTab === 'importance' ? 'active' : ''}`} onClick={() => setActiveTab('importance')}>Importance</div>
                <div className={`settings-tab ${activeTab === 'bid-origins' ? 'active' : ''}`} onClick={() => setActiveTab('bid-origins')}>Bid Origins</div>
                <div className={`settings-tab ${activeTab === 'data-management' ? 'active' : ''}`} onClick={() => setActiveTab('data-management')}>Data Management</div>
            </div>

            <div id="workflow-content" className={`settings-content ${activeTab === 'workflow' ? 'active' : ''}`}>
                <div className="settings-card">
                    <h3>Workflow Categories</h3>
                    <p>Define the columns for your Kanban board.</p>
                    <button onClick={() => handleOpenModal('workflow')} className="btn">Add New Category</button>
                    {renderList(settings.workflowCategories, 'workflow')}
                </div>
            </div>
            <div id="sub-categories-content" className={`settings-content ${activeTab === 'sub-categories' ? 'active' : ''}`}>
                <div className="settings-card">
                    <h3>Sub-Categories</h3>
                    <p>Define sub-statuses for your workflow categories.</p>
                     <button onClick={() => handleOpenModal('subcategory')} className="btn">Add New Sub-Category</button>
                    {renderList(settings.subCategories, 'subcategory')}
                </div>
            </div>
             <div id="importance-content" className={`settings-content ${activeTab === 'importance' ? 'active' : ''}`}>
                <div className="settings-card">
                    <h3>Importance Levels</h3>
                    <p>Define priority levels for your tasks.</p>
                     <button onClick={() => handleOpenModal('importance')} className="btn">Add New Level</button>
                    {renderList(settings.importanceLevels, 'importance')}
                </div>
            </div>
             <div id="bid-origins-content" className={`settings-content ${activeTab === 'bid-origins' ? 'active' : ''}`}>
                <div className="settings-card">
                    <h3>Bid Origins</h3>
                    <p>Define the sources for your tasks.</p>
                     <button onClick={() => handleOpenModal('bid-origin')} className="btn">Add New Origin</button>
                    {renderList(settings.bidOrigins, 'bid-origin')}
                </div>
            </div>
            <div id="data-management-content" className={`settings-content ${activeTab === 'data-management' ? 'active' : ''}`}>
                <div className="settings-card">
                    <h3>Data Management</h3>
                    <button id="import-data-btn" className="btn" onClick={handleImportClick}>Import Data (JSON)</button>
                    <input type="file" id="import-file-input" ref={importFileInputRef} className="hidden" accept=".json" onChange={handleImportData} />
                    <button id="export-data-btn" className="btn" onClick={handleExportData}>Export Data (JSON)</button>
                </div>
                <div className="settings-card">
                    <h3 style={{color: 'var(--destructive)'}}>Danger Zone</h3>
                    <button id="clear-tasks-btn" className="btn btn-destructive" onClick={onClearTasks}>Clear All Tasks</button>
                    <button id="reset-settings-btn" className="btn btn-destructive" onClick={onResetSettings}>Reset Settings</button>
                </div>
            </div>
            {isModalOpen && <SettingsModal config={modalConfig} settings={settings} onClose={handleCloseModal} onSave={handleSaveItem} onDelete={handleDeleteItem} />}
        </div>
    );
}

function TaskModal({ task, settings, onClose, onSave, onDelete }: any) {
    const [currentStatus, setCurrentStatus] = useState(task?.status || settings.workflowCategories[0]?.name);

    const relevantSubStatuses = settings.subCategories?.filter((sc:any) => sc.parentCategory === currentStatus).map((sc:any) => sc.name) || [];

    return (
        <div className="modal show">
            <div className="modal-content">
                <div className="modal-header">
                    <h2 id="modal-title">{task ? 'Edit Task' : 'New Task'}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                <form id="task-form" onSubmit={onSave}>
                    <input type="hidden" id="task-id" name="task-id" defaultValue={task?.id || ''} />
                    <div className="form-grid">
                        <div className="form-group">
                            <label htmlFor="task-taskid">Task ID</label>
                            <input type="text" id="task-taskid" name="task-taskid" defaultValue={task?.taskid || `PROJ-${Math.floor(1000 + Math.random() * 9000)}`} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="task-title">Title / Description</label>
                            <input type="text" id="task-title" name="task-title" defaultValue={task?.title || ''} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="task-date">Start Date</label>
                            <input type="date" id="task-date" name="task-date" defaultValue={task?.date?.split('T')[0] || new Date().toISOString().split('T')[0]} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="task-dueDate">Due Date</label>
                            <input type="date" id="task-dueDate" name="task-dueDate" defaultValue={task?.dueDate?.split('T')[0] || ''} required />
                        </div>
                        <div className="form-group">
                            <label htmlFor="task-status">Status</label>
                            <select id="task-status" name="task-status" value={currentStatus} onChange={(e) => setCurrentStatus(e.target.value)} required>
                                {settings.workflowCategories?.map((c:any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="task-subStatus">Sub-Status</label>
                            <select id="task-subStatus" name="task-subStatus" defaultValue={task?.subStatus || ''} disabled={relevantSubStatuses.length === 0}>
                                 <option value="">No Sub-Status</option>
                                {relevantSubStatuses.map((s:any) => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="task-importance">Importance</label>
                            <select id="task-importance" name="task-importance" defaultValue={task?.importance || ''} required>
                                {settings.importanceLevels?.map((i:any) => <option key={i.id} value={i.name}>{i.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group">
                            <label htmlFor="task-bidOrigin">Bid Origin</label>
                            <select id="task-bidOrigin" name="task-bidOrigin" defaultValue={task?.bidOrigin || ''} required>
                                {settings.bidOrigins?.map((b:any) => <option key={b.id} value={b.name}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="form-group full-width">
                            <label htmlFor="task-remarks">Remarks</label>
                            <textarea id="task-remarks" name="task-remarks" defaultValue={task?.remarks || ''}></textarea>
                        </div>
                    </div>
                     <div className="modal-footer">
                        {task && <button type="button" onClick={onDelete} className="btn btn-destructive">Delete</button>}
                        <button type="submit" className="btn btn-primary">Save Task</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function SettingsModal({ config, settings, onClose, onSave, onDelete }: any) {
     const { type, item } = config;
     
     let title = '';
     let showColor = false;
     let showParent = false;

     switch(type) {
        case 'workflow':
            title = item ? 'Edit Workflow Category' : 'New Workflow Category';
            showColor = true;
            break;
        case 'subcategory':
            title = item ? 'Edit Sub-Category' : 'New Sub-Category';
            showParent = true;
            break;
        case 'importance':
            title = item ? 'Edit Importance Level' : 'New Importance Level';
            showColor = true;
            break;
        case 'bid-origin':
            title = item ? 'Edit Bid Origin' : 'New Bid Origin';
            break;
    }

    return (
        <div className="modal show">
             <div className="modal-content">
                 <div className="modal-header">
                    <h2>{title}</h2>
                    <button className="close-button" onClick={onClose}>&times;</button>
                </div>
                <form id="settings-form" onSubmit={onSave}>
                    <input type="hidden" name="settings-item-id" defaultValue={item?.id || ''} />
                    <div className="form-group full-width">
                        <label htmlFor="settings-name">Name</label>
                        <input type="text" id="settings-name" name="settings-name" defaultValue={item?.name || ''} required />
                    </div>
                    {showColor && (
                        <div className="form-group full-width">
                            <label htmlFor="settings-color">Color</label>
                            <input type="color" id="settings-color" name="settings-color" defaultValue={item?.color || '#000000'} />
                        </div>
                    )}
                    {showParent && (
                         <div className="form-group full-width">
                            <label htmlFor="settings-parent">Parent Category</label>
                            <select id="settings-parent" name="settings-parent" defaultValue={item?.parentCategory || ''}>
                                {settings.workflowCategories?.map((c:any) => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                    )}
                     <div className="modal-footer">
                        {item && <button type="button" onClick={onDelete} className="btn btn-destructive">Delete</button>}
                        <button type="submit" className="btn btn-primary">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// Add this to your component to get access to date-fns functions
declare global {
  interface Window {
    Chart: any;
  }
}
