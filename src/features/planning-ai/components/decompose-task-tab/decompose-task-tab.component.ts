import { Component, input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AiService } from '@/src/ai/services';
import { TaskService, Task } from '../../../../core/services/task.service';
import { z } from 'zod';
import type { AiServiceFailureResult } from '@/src/ai/services/ai-service.interface';
import { DECOMPOSE_TASK_SYSTEM_PROMPT, DECOMPOSE_TASK_USER_PROMPT } from '@/src/ai/prompts/decompose-task.prompt';

const decompositionSchema = z.object({
  canBeDecomposed: z.boolean().describe("True if task can be divided into smaller sub-tasks, false if it is already as small as possible"),
  reason: z.string().optional().describe("Explanation of why it cannot be decomposed (if applicable)"),
  decomposedSteps: z.array(z.object({
    title: z.string().describe("Main category, phase, or original subtask name"),
    description: z.string().optional().describe("A detailed description for this main category or phase."),
    subSteps: z.array(z.object({
      title: z.string().describe("Specific actionable sub-step"),
      description: z.string().optional().describe("A detailed description for this sub-step."),
      notes: z.string().optional().describe("Any additional notes, implementation details, or context for the developer for this sub-step.")
    }))
  })).optional()
});

@Component({
  selector: 'app-decompose-task-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './decompose-task-tab.component.html'
})
export class DecomposeTaskTabComponent {
  task = input<Task | null>(null);
  private aiService = inject(AiService);
  private taskService = inject(TaskService);

  status = signal<'idle' | 'running' | 'success' | 'error'>('idle');
  error = signal<string | null>(null);
  result = signal<any>(null);
  userContext = signal('');

  async runDecomposition() {
    const currentTask = this.task();
    if (!currentTask) return;

    this.status.set('running');
    this.error.set(null);
    this.result.set(null);
    const additionalContext = this.userContext().trim() 
      ? `\nAdditional User Context/Instructions:\n"${this.userContext().trim()}"\n` 
      : '';

    const currentDate = new Date().toLocaleString();
    const augmentedPrompt = DECOMPOSE_TASK_USER_PROMPT
      .replace('{{CURRENT_DATE}}', currentDate)
      .replace('{{PARENT_TASK_CONTEXT}}', JSON.stringify(currentTask, null, 2))
      .replace('{{ADDITIONAL_CONTEXT}}', additionalContext)
      .replace('{{TASK_TITLE}}', currentTask.title)
      .replace('{{TASK_DESCRIPTION}}', currentTask.description || 'None')
      .replace('{{CURRENT_SUBTASKS}}', currentTask.subtasks?.map(s => s.title).join(', ') || 'None');

    try {
      const res = await this.aiService.generateStructuredOutput({
        systemPrompt: DECOMPOSE_TASK_SYSTEM_PROMPT,
        context: augmentedPrompt,
        schema: decompositionSchema,
        options: { attempts: 2, temperature: 0.1, streaming: false }
      });

      if (res.success) {
        this.result.set(res.data);
        this.status.set('success');
      } else {
        this.error.set((res as AiServiceFailureResult).error);
        this.status.set('error');
      }
    } catch (e: any) {
      this.error.set(e.message);
      this.status.set('error');
    }
  }

  applyDecomposition() {
    const currentTask = this.task();
    const data = this.result();
    if (!currentTask || !data || !data.canBeDecomposed || !data.decomposedSteps) return;

    let partIndex = 1;
    for (const step of data.decomposedSteps || []) {
      const newSubtasks = (step.subSteps || []).map((sub: any) => ({
        id: crypto.randomUUID(),
        title: sub.title,
        description: sub.description || '',
        completed: false,
        notes: sub.notes || ''
      }));

      const newTags = [...(currentTask.tags || [])];
      if (!newTags.includes(currentTask.title)) {
        newTags.push(currentTask.title);
      }
      newTags.push(`${currentTask.title}-part${partIndex}`);
      newTags.push('#AI-Decomposed');
      
      const uniqueTags = [...new Set(newTags)];

      this.taskService.addTask({
        title: step.title,
        description: step.description || currentTask.description,
        category: currentTask.category,
        project: currentTask.project,
        startDate: currentTask.startDate,
        deadline: currentTask.deadline,
        estimatedEffort: currentTask.estimatedEffort,
        energyLevel: currentTask.energyLevel,
        recurrence: currentTask.recurrence,
        tags: uniqueTags,
        subtasks: newSubtasks,
        status: 'Backlog'
      });
      partIndex++;
    }

    this.result.set(null);
    this.status.set('idle');
  }
}