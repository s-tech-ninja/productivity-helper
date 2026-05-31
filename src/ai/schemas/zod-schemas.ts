import { z } from 'zod';

export const goalSchema = z.object({
  description: z.string().min(10),
  desiredOutcome: z.string().min(5),
  timeframe: z.string().optional(),
  contextTaskIds: z.array(z.string()).optional()
});

export const milestoneSchema = z.object({
  id: z.string().uuid().or(z.string()), // accept uuid or simple id
  title: z.string().min(3),
  description: z.string().optional(),
  deadline: z.string().optional(),
  associatedTaskIds: z.array(z.string()).optional()
});

export const subtaskSchema = z.object({
  text: z.string().min(1),
  completed: z.boolean().optional(),
  notes: z.string().optional()
});

export const taskSchema = z.object({
  id: z.string().uuid().or(z.string()),
  title: z.string().min(3),
  description: z.string().optional(),
  category: z.enum(['Super Important', 'Important', 'Less Important']).optional(),
  project: z.string().optional(),
  deadline: z.string().optional(),
  estimatedEffort: z.string().optional(),
  energyLevel: z.enum(['High', 'Medium', 'Low']).optional(),
  tags: z.array(z.string()).optional(),
  subtasks: z.array(subtaskSchema).optional()
});

export const planSchema = z.object({
  goal: z.string(),
  overview: z.string(),
  milestones: z.array(milestoneSchema),
  tasks: z.array(taskSchema),
  suggestedNextSteps: z.array(z.string()).optional()
});

export const reflectionSchema = z.object({
  summary: z.string(),
  keyLearnings: z.array(z.string()).optional(),
  areasForImprovement: z.array(z.string()).optional(),
  actionableInsights: z.array(z.string()).optional(),
  sentiment: z.enum(['Positive', 'Neutral', 'Negative']).optional()
});

export type Goal = z.infer<typeof goalSchema>;
export type Milestone = z.infer<typeof milestoneSchema>;
export type Subtask = z.infer<typeof subtaskSchema>;
export type Task = z.infer<typeof taskSchema>;
export type Plan = z.infer<typeof planSchema>;
export type Reflection = z.infer<typeof reflectionSchema>;
