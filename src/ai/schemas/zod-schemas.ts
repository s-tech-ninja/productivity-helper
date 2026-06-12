import { z } from 'zod';

export const goalSchema = z.object({
  description: z.string().min(10),
  desiredOutcome: z.string().min(5),
  timeframe: z.string().optional(),
  contextTaskIds: z.array(z.string()).optional()
});

export const milestoneSchema = z.object({
  id: z.string(), // accept uuid or simple id
  title: z.string().min(3),
  description: z.string().optional(),
  deadline: z.string().optional(),
  associatedTaskIds: z.array(z.string()).optional()
});

export const subtaskSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  completed: z.boolean().optional(),
  notes: z.string().optional()
});

export const taskSchema = z.object({
  id: z.string(),
  title: z.string().min(3),
  description: z.string(),
  category: z.enum(['Super Important', 'Important', 'Less Important']),
  project: z.string(),
  deadline: z.string(),
  estimatedEffort: z.number().min(1).max(240),
  energyLevel: z.enum(['High', 'Medium', 'Low']),
  tags: z.array(z.string()),
  // subtasks: z.array(subtaskSchema)
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

export const taskModificationSchema = z.object({
  planOverview: z.string().describe("A summary of the new strategy and why things were moved. Explicitly state how tasks were prioritized based on their Category (Importance) and Energy Levels."),
  modifications: z.array(z.object({
    taskId: z.string(),
    title: z.string().describe("The original task title for reference"),
    action: z.enum(['Update', 'Keep', 'Move to Backlog', 'Drop/Archive']),
    rationale: z.string().describe("Why this change is recommended"),
    newCategory: z.enum(['Super Important', 'Important', 'Less Important']).nullable().optional(),
    newEnergyLevel: z.enum(['High', 'Medium', 'Low']).nullable().optional(),
    newEstimatedEffort: z.number().nullable().optional().describe("New estimate in minutes, if scope changed"),
    newDeadline: z.string().nullable().optional().describe("New ISO date string if rescheduled. Must be relative to the CURRENT DATE provided in the prompt."),
    newStartDate: z.string().nullable().optional().describe("New ISO date string if rescheduled. Must be relative to the CURRENT DATE provided in the prompt."),
  })),
  newTasks: z.array(z.object({
    title: z.string(),
    description: z.string().nullable().optional(),
    category: z.enum(['Super Important', 'Important', 'Less Important']).describe("Priority category"),
    project: z.string().nullable().optional().describe("Match the project scope"),
    estimatedEffort: z.number().describe("Estimate in minutes"),
    energyLevel: z.enum(['High', 'Medium', 'Low']).describe("Required energy level"),
    deadline: z.string().describe("ISO date string. Must be relative to the CURRENT DATE provided in the prompt."),
    rationale: z.string().describe("Why this new task is needed")
  })).nullable().optional()
});

export const monetizationSchema = z.object({
  description: z.string().describe("Monetization strategy and details to append to the task description"),
  tags: z.array(z.string()).describe("Monetization-specific tags like #Revenue, #Sponsorship, etc.")
});
