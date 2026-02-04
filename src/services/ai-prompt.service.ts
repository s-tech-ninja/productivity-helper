import { Injectable } from '@angular/core';
import { Task } from './task.service';

export interface AiPrompt {
  name: string;
  prompt: string;
}

@Injectable({
  providedIn: 'root'
})
export class AiPromptService {

  /**
   * Generates a list of analytical prompts based on the provided tasks.
   * These prompts are formatted to be sent to an LLM (like ChatGPT/Claude) for analysis.
   */
  generatePrompts(tasks: Task[]): AiPrompt[] {
    // 1. Pre-process data to be token-efficient and readable for the AI
    const contextData = tasks.map(t => ({
      id: t.id.substring(0, 4), // Short ID
      title: t.title,
      status: t.status,
      category: t.category, // Acts as Priority
      deadline: t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No Deadline',
      energy: t.energyLevel,
      estimate: t.estimatedEffort || 'N/A',
      timeSpent: this.formatMs(t.totalTimeElapsed),
      subtasks: `${(t.subtasks || []).filter(s => s.completed).length}/${(t.subtasks || []).length} done`
    }));

    const jsonContext = JSON.stringify(contextData, null, 2);

    // 2. Define specific analytical prompts
    return [
      // Prompt 1: Strategic Scheduling (Eisenhower Matrix style)
      {
        name: 'Strategic Scheduling',
        prompt: `You are a productivity coach. Here is my current task list in JSON format:
${jsonContext}

Based on this list, please:
1. Identify the top 3 "Must Do" tasks for today based on the 'category' (Importance) and 'deadline' (Urgency).
2. Suggest a sequence for tackling them, considering that 'High' energy tasks should be done first.
3. Flag any tasks that seem like distractions (Low Importance, High Effort).`,

      },
      // Prompt 2: Time Audit & Estimation Bias
      {
        name: 'Time Audit',
        prompt: `You are a data analyst. Analyze the time tracking data in my task list:
${jsonContext}

Please calculate the discrepancy between 'estimate' and 'timeSpent' for tasks that are 'In Progress' or 'Completed'.
- Do I tend to underestimate or overestimate?
- Which specific task is consuming the most time relative to its importance?
- Provide a short recommendation to improve my time estimation.`,

      },
      // Prompt 3: Decomposition Helper
      {
        name: 'Task Decomposition',
        prompt: `Review the tasks in my list that have a status of 'Backlog' or 'In Progress' but have 0/0 subtasks completed:
${jsonContext}

Select the most complex-sounding task from this group.
Break it down into 5-7 small, actionable subtasks that I can copy-paste into my checklist to get started immediately.`,

      },
      // Prompt 4: Burnout Risk Check
      {
        name: 'Burnout Risk Check',
        prompt: `Analyze my workload for potential burnout risks:
${jsonContext}

Look for:
- Tasks with 'High' energy requirements that also have high time spent.
- Overdue deadlines.
- A high volume of 'Super Important' tasks.

Give me a "Stress Score" from 1-10 and one specific action to reduce mental load today.`
      },
      // Prompt 5: Sub-task Validation
      {
        name: 'Sub-task Validation',
        prompt: `Analyze the sub-tasks for each task in my list:
${jsonContext}

For each task:
1. Verify if the divided sub-tasks are correct, logical, and actionable.
2. List the Pros and Cons of the current task structure.`
      },
      // Prompt 6: Task Refinement Table
      {
        name: 'Task Refinement Table',
        prompt: `Review all defined tasks to ensure they are clear and actionable:
${jsonContext}

Please provide the output in a Markdown table format with the following columns:
| Task Title | Is Well Defined? | Improvement Suggestion | Why it's better |`
      }
    ];
  }

  private formatMs(msStr?: string): string {
    if (!msStr) return '0m';
    const ms = parseInt(msStr, 10);
    if (isNaN(ms)) return '0m';
    const minutes = Math.round(ms / 60000);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }
}