import { v4 as uuidv4 } from 'uuid';
import { Task, AppSettings } from '@/lib/types';

export const defaultSettings: AppSettings = {
  workflowCategories: [
    { id: uuidv4(), name: 'Not Started', color: '#EF4444' },
    { id: uuidv4(), name: 'In Progress', color: '#F97316' },
    { id: uuidv4(), name: 'Under Review', color: '#EAB308' },
    { id: uuidv4(), name: 'Done', color: '#22C55E' },
  ],
  subCategories: [
    { id: uuidv4(), name: 'Design', parentCategory: 'In Progress' },
    { id: uuidv4(), name: 'Development', parentCategory: 'In Progress' },
    { id: uuidv4(), name: 'QA', parentCategory: 'Under Review' },
  ],
  importanceLevels: [
    { id: uuidv4(), name: 'High', color: '#DC2626' },
    { id: uuidv4(), name: 'Medium', color: '#F59E0B' },
    { id: uuidv4(), name: 'Low', color: '#10B981' },
  ],
  bidOrigins: [
    { id: uuidv4(), name: 'Client Request' },
    { id: uuidv4(), name: 'Internal' },
    { id: uuidv4(), name: 'Referral' },
  ],
};

const today = new Date();
const tomorrow = new Date(today);
tomorrow.setDate(tomorrow.getDate() + 1);
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const nextWeek = new Date(today);
nextWeek.setDate(nextWeek.getDate() + 7);


export const defaultTasks: Task[] = [
  {
    id: uuidv4(),
    taskid: 'PROJ-001',
    title: 'Design landing page',
    date: yesterday.toISOString(),
    dueDate: tomorrow.toISOString(),
    status: 'In Progress',
    subStatus: 'Design',
    importance: 'High',
    bidOrigin: 'Client Request',
    desc: 'Create a modern and responsive landing page design.',
    remarks: 'Awaiting feedback on color palette.',
  },
  {
    id: uuidv4(),
    taskid: 'PROJ-002',
    title: 'Develop API endpoints',
    date: new Date().toISOString(),
    dueDate: nextWeek.toISOString(),
    status: 'Not Started',
    subStatus: '',
    importance: 'High',
    bidOrigin: 'Internal',
    desc: 'Build REST API for user authentication and data management.',
    remarks: '',
  },
  {
    id: uuidv4(),
    taskid: 'PROJ-003',
    title: 'QA testing for new feature',
    date: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    status: 'Under Review',
    subStatus: 'QA',
    importance: 'Medium',
    bidOrigin: 'Internal',
    desc: 'Perform end-to-end testing on the new reporting feature.',
    remarks: 'Found a minor bug, report filed.',
  },
    {
    id: uuidv4(),
    taskid: 'PROJ-004',
    title: 'Deploy to production',
    date: yesterday.toISOString(),
    dueDate: yesterday.toISOString(),
    status: 'Done',
    completionDate: new Date().toISOString(),
    subStatus: '',
    importance: 'Low',
    bidOrigin: 'Internal',
    desc: 'Deploy the latest build to the production server.',
    remarks: 'Deployment successful.',
  },
    {
    id: uuidv4(),
    taskid: 'PROJ-005',
    title: 'Fix login bug',
    date: yesterday.toISOString(),
    dueDate: yesterday.toISOString(),
    status: 'In Progress',
    importance: 'High',
    bidOrigin: 'Client Request',
    desc: 'Users are unable to log in with their email address.',
    remarks: 'Overdue task, needs immediate attention.',
  }
];
