'use server';
/**
 * @fileOverview A flow for generating a list of tasks from a high-level goal.
 * 
 * - generateTasks - A function that takes a goal and returns a list of tasks.
 * - GenerateTasksInput - The Zod schema for the input.
 * - GenerateTasksOutput - The Zod schema for the output.
 * - AITask - The TypeScript type for a single generated task.
 */

import { ai } from '@/lib/genkit';
import { z } from 'zod';

const AITaskSchema = z.object({
  taskid: z.string().describe('A short, descriptive title for the task (e.g., "Schedule Kickoff Meeting").'),
  desc: z.string().describe('A brief description of what needs to be done for this task.'),
  status: z.string().describe('The initial status for the task.'),
  importance: z.string().describe('The suggested importance level (e.g., High, Medium, Low).'),
  daysFromNow: z.number().describe('An estimate of when this task should be due, in days from today. For example, 7 for a week from now.')
});

export const GenerateTasksInput = z.object({
  goal: z.string().describe('The high-level goal to be broken down into tasks.'),
  availableStatuses: z.array(z.string()).describe('The list of available statuses the AI can assign to the tasks.'),
  availableImportances: z.array(z.string()).describe('The list of available importance levels the AI can assign.'),
});

export const GenerateTasksOutput = z.object({
  tasks: z.array(AITaskSchema).describe('The array of generated tasks.'),
});

export type AITask = z.infer<typeof AITaskSchema>;

const generateTasksPrompt = ai.definePrompt({
    name: 'generateTasksPrompt',
    input: { schema: GenerateTasksInput },
    output: { schema: GenerateTasksOutput },
    prompt: `You are an expert project manager. A user wants to achieve a high-level goal and needs it broken down into smaller, actionable tasks for a Kanban board.

    User's Goal: {{{goal}}}
    
    Based on this goal, generate a list of tasks.
    
    - For the 'status' of each task, you MUST use one of the following available statuses: {{jsonStringify availableStatuses}}
    - For the 'importance' of each task, you SHOULD use one of the following available importance levels where appropriate: {{jsonStringify availableImportances}}
    - Provide a reasonable estimate for 'daysFromNow' for the due date.
    
    Return the list of tasks in the specified output format.`,
});


export const generateTasksFlow = ai.defineFlow(
    {
      name: 'generateTasksFlow',
      inputSchema: GenerateTasksInput,
      outputSchema: GenerateTasksOutput,
    },
    async (input) => {
        const { output } = await generateTasksPrompt(input);
        return output!;
    }
);

export async function generateTasks(input: z.infer<typeof GenerateTasksInput>): Promise<z.infer<typeof GenerateTasksOutput>> {
    return generateTasksFlow(input);
}
