"use client";

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Settings,
  ListTodo,
  Menu,
   KanbanSquare,
} from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarInset,
  useSidebar,
} from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { useApp } from '@/contexts/app-provider';
import { ThemeToggle } from '../theme-toggle';

const navItems = [
  { href: '/', label: 'Kanban Board', icon: KanbanSquare },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function MainSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2">
          <ListTodo className="w-6 h-6 text-primary" />
          <h1 className="text-lg font-bold">KanbanFlow</h1>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} passHref>
                <SidebarMenuButton
                  asChild
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <>
                    <item.icon />
                    <span>{item.label}</span>
                  </>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter>
        <ThemeToggle />
      </SidebarFooter>
    </Sidebar>
  );
}

function PageHeader() {
  const { toggleSidebar, isMobile } = useSidebar();
  const { tasks, filters, setKanbanFilter } = useApp();
  const pathname = usePathname();

  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return {
      active: tasks.filter(task => task.status.toLowerCase() !== 'done').length,
      overdue: tasks.filter(task => new Date(task.dueDate) < today && task.status.toLowerCase() !== 'done').length,
      dueToday: tasks.filter(task => new Date(task.dueDate).toDateString() === today.toDateString()).length,
      dueThisWeek: tasks.filter(task => {
        const dueDate = new Date(task.dueDate);
        return dueDate >= startOfWeek && dueDate <= endOfWeek;
      }).length,
    }
  }, [tasks]);

  if (pathname !== '/') return null;

  return (
    <header className="flex items-center justify-between p-2 md:p-4 border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
      <div className="flex items-center gap-2">
        {isMobile && (
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <Menu />
          </Button>
        )}
        <Button variant={filters.kanban === 'active' ? 'secondary' : 'ghost'} size="sm" onClick={() => setKanbanFilter('active')}>Active ({stats.active})</Button>
        <Button variant={filters.kanban === 'overdue' ? 'destructive' : 'ghost'} size="sm" onClick={() => setKanbanFilter('overdue')}>Overdue ({stats.overdue})</Button>
        <Button variant={filters.kanban === 'due-today' ? 'secondary' : 'ghost'} size="sm" onClick={() => setKanbanFilter('due-today')}>Due Today ({stats.dueToday})</Button>
        <Button variant={filters.kanban === 'due-this-week' ? 'secondary' : 'ghost'} size="sm" onClick={() => setKanbanFilter('due-this-week')}>Due This Week ({stats.dueThisWeek})</Button>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="flex">
        <MainSidebar />
        <SidebarInset className="flex-1 flex flex-col min-h-screen">
          <PageHeader />
          <main className="flex-1">{children}</main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
