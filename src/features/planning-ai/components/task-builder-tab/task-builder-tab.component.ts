import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { z } from 'zod';
import { AiService } from '@/src/ai/services';
import { taskSchema, subtaskSchema, monetizationSchema } from '@/src/ai/schemas/zod-schemas';
import { MONETIZATION_SYSTEM_PROMPT, MONETIZATION_USER_PROMPT } from '@/src/ai/prompts/monetization.prompt';
import { TASK_BUILDER_SYSTEM_PROMPT, TASK_BUILDER_USER_PROMPT } from '@/src/ai/prompts/task-builder.prompt';
import { SUBTASK_BUILDER_SYSTEM_PROMPT, SUBTASK_BUILDER_USER_PROMPT } from '@/src/ai/prompts/subtask-builder.prompt';
import type { AiServiceFailureResult } from '@/src/ai/services/ai-service.interface';
import { TaskService } from '../../../../core/services/task.service';
import { FinalReviewModalComponent } from '../final-review-modal/final-review-modal.component';
import { IconComponent } from '@/src/shared/components/icons/icon.component';
import { MarkdownPipe } from '@/src/shared/pipes/pipes/markdown.pipe';

@Component({
  selector: 'app-task-builder-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, FinalReviewModalComponent, IconComponent, MarkdownPipe],
  templateUrl: './task-builder-tab.component.html',
})
export class TaskBuilderTabComponent {
  private aiService = inject(AiService);
  public taskService = inject(TaskService); // Changed to public so the HTML template can access aiPreferences

  builderPrompt = signal('');
  generatedTask = signal<any>(null);
  builderStatus = signal<'idle' | 'running' | 'success' | 'error'>('idle');
  builderError = signal<string | null>(null);
  builderValidationRows = signal<Array<{ path: string; message: string; code?: string }>>([]);
  generatedSubtasks = signal<any[]>([]);
  addingSubtask = signal(false);
  generatingSubtask = signal(false);
  subtaskPrompt = signal('');

  editingTask = signal<boolean>(false);
  editingTaskDraft = signal<any>(null);
  editingSubtaskIndex = signal<number | null>(null);
  editingSubtaskDraft = signal<any>(null);

  showReviewModal = signal(false);
  finalTaskPayload = signal<any>(null);

  includeMonetization = signal(false);
  generatingMonetization = signal(false);
  monetizationResult = signal<{description: string, tags: string[]} | null>(null);

  async generateTask() {
    const prompt = this.builderPrompt().trim();
    if (!prompt) {
      this.builderError.set('Please enter a task description or prompt.');
      return;
    }

    this.builderStatus.set('running');
    this.builderError.set(null);
    this.generatedTask.set(null);
    this.builderValidationRows.set([]);
    this.generatedSubtasks.set([]);
    this.monetizationResult.set(null);
    this.includeMonetization.set(false);

    const currentDate = new Date().toLocaleString();
    const augmentedPrompt = TASK_BUILDER_USER_PROMPT
      .replace('{{CURRENT_DATE}}', currentDate)
      .replace('{{USER_REQUEST}}', prompt);

    try {
      const result = await this.aiService.generateStructuredOutput({
        systemPrompt: TASK_BUILDER_SYSTEM_PROMPT,
        context: augmentedPrompt,
        schema: taskSchema,
        options: {
          streaming: false,
          attempts: 1,
          temperature: 0,
          topK: 40,
          topP: 0.9
        }
      });

      if (result.success) {
        this.generatedTask.set(result.data);
        this.builderStatus.set('success');
        this.builderError.set(null);
        this.builderValidationRows.set([]);
      } else {
        const failure = result as AiServiceFailureResult;
        if (failure.details && Array.isArray((failure.details as any).flatErrors)) {
          const rows = ((failure.details as any).flatErrors || []) as Array<{ path: string; message: string; code?: string }>;
          this.builderValidationRows.set(rows);
        }
        this.builderError.set(failure.error);
        this.builderStatus.set('error');
      }
    } catch (error) {
      this.builderError.set(error instanceof Error ? error.message : 'Unexpected error');
      this.builderStatus.set('error');
    }
  }

  updateTaskDraft(field: string, value: any) {
    this.editingTaskDraft.update(draft => ({ ...draft, [field]: value }));
  }

  startEditTask() {
    this.editingTask.set(true);
    this.editingTaskDraft.set({ ...this.generatedTask() });
  }

  saveTaskEdit() {
    this.generatedTask.set({ ...this.editingTaskDraft() });
    this.editingTask.set(false);
    this.editingTaskDraft.set(null);
  }

  cancelTaskEdit() {
    this.editingTask.set(false);
    this.editingTaskDraft.set(null);
  }

  rejectTask() {
    if (confirm('Are you sure you want to reject this task and clear the builder?')) {
      this.generatedTask.set(null);
      this.generatedSubtasks.set([]);
      this.builderPrompt.set('');
      this.builderError.set(null);
      this.editingTask.set(false);
      this.editingTaskDraft.set(null);
      this.editingSubtaskIndex.set(null);
      this.editingSubtaskDraft.set(null);
      this.monetizationResult.set(null);
      this.includeMonetization.set(false);
    }
  }

  async generateSubtask() {
    const prompt = this.subtaskPrompt().trim();
    if (!prompt) return;

    this.addingSubtask.set(true);

    this.generatingSubtask.set(true);

    const taskContext = this.editingTask() ? this.editingTaskDraft() : this.generatedTask();
    const taskContextString = taskContext ? JSON.stringify(taskContext, null, 2) : 'None';
    const currentDate = new Date().toLocaleString();

    const augmentedPrompt = SUBTASK_BUILDER_USER_PROMPT
      .replace('{{CURRENT_DATE}}', currentDate)
      .replace('{{PARENT_TASK_CONTEXT}}', taskContextString)
      .replace('{{USER_REQUEST}}', prompt);

    try {
      const result = await this.aiService.generateStructuredOutput({
        systemPrompt: SUBTASK_BUILDER_SYSTEM_PROMPT,
        context: augmentedPrompt,
        schema: z.array(subtaskSchema),
        options: {
          attempts: 2,
          temperature: 0.3,
          topK: 40,
          topP: 0.9
        }
      });

      if (result.success) {
        const subtasks = Array.isArray(result.data) ? result.data : [result.data];
        this.generatedSubtasks.update(existing => [...existing, ...subtasks]);
        this.subtaskPrompt.set('');
        this.addingSubtask.set(false);
      } else {
        alert('Failed to generate subtask: ' + (result as any).error);
      }
    } catch (error) {
      alert('Error generating subtask: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      this.generatingSubtask.set(false);
    }
  }

  removeSubtask(index: number) {
    this.generatedSubtasks.update(items => items.filter((_, i) => i !== index));
  }

  updateSubtaskDraft(field: string, value: any) {
    this.editingSubtaskDraft.update(draft => ({ ...draft, [field]: value }));
  }

  startEditSubtask(index: number, subtask: any) {
    this.editingSubtaskIndex.set(index);
    this.editingSubtaskDraft.set({ ...subtask });
  }

  saveSubtaskEdit(index: number) {
    const draft = this.editingSubtaskDraft();
    this.generatedSubtasks.update(list => {
      const newList = [...list];
      newList[index] = { ...newList[index], ...draft };
      return newList;
    });
    this.editingSubtaskIndex.set(null);
    this.editingSubtaskDraft.set(null);
  }

  cancelSubtaskEdit() {
    this.editingSubtaskIndex.set(null);
    this.editingSubtaskDraft.set(null);
  }

  async generateMonetization() {
    const task = this.editingTask() ? this.editingTaskDraft() : this.generatedTask();
    if (!task) return;

    this.generatingMonetization.set(true);

    const taskContextString = JSON.stringify(task, null, 2);
    const userPrompt = MONETIZATION_USER_PROMPT.replace('{{TASK_DESCRIPTION}}', taskContextString);

    try {
      const result = await this.aiService.generateStructuredOutput({
        systemPrompt: MONETIZATION_SYSTEM_PROMPT,
        context: userPrompt,
        schema: monetizationSchema,
        options: {
          attempts: 2,
          temperature: 0.3
        }
      });

      if (result.success) {
        this.monetizationResult.set({
          description: result.data.description,
          tags: result.data.tags || []
        });
      } else {
        alert('Failed to generate monetization strategy: ' + (result as any).error);
      }
    } catch (error) {
      alert('Error generating strategy: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      this.generatingMonetization.set(false);
    }
  }

  clearMonetization() {
    this.monetizationResult.set(null);
    this.includeMonetization.set(false);
  }

  createTask() {
    const task = this.generatedTask();
    const subtasks = this.generatedSubtasks();
    const prefs = this.taskService.formPreferences();

    if (!task) {
      this.builderError.set('Please generate a task first.');
      return;
    }

    const mappedSubtasks = subtasks.map(st => ({
      id: st.id || crypto.randomUUID(),
      title: st.title || '',
      description: st.description || '',
      notes: st.notes || '',
      completed: false
    }));

    const mon = this.monetizationResult();
    const finalDescription = mon ? (task.description ? `${task.description}\n\n### Monetization Strategy\n${mon.description}` : mon.description) : task.description || '';
    
    const tagsArray = [...(task.tags || [])];
    if (mon) {
      tagsArray.push(...mon.tags, '#AI-Monetization');
    }
    tagsArray.push('#AI-Generated');
    const finalTags = [...new Set(tagsArray)];
    
    const fullTask = {
      title: task.title || 'Untitled AI Task',
      description: finalDescription,
      category: task.category || 'Important',
      project: prefs.showProject ? (task.project || 'AI General') : 'General',
      startDate: new Date().toISOString().slice(0, 16),
      deadline: task.deadline || new Date().toISOString().slice(0, 16),
      estimatedEffort: task.estimatedEffort ? `${task.estimatedEffort}h` : '1h',
      energyLevel: task.energyLevel || 'Medium',
      recurrence: 'None' as const,
      tags: finalTags,
      subtasks: mappedSubtasks,
      status: 'Backlog' as const
    };
    
    this.finalTaskPayload.set(fullTask);
    this.showReviewModal.set(true);
  }

  confirmAndSaveTask() {
    const payload = this.finalTaskPayload();
    if (payload) {
      this.taskService.addTask(payload);
      
      this.builderPrompt.set('');
      this.generatedTask.set(null);
      this.generatedSubtasks.set([]);
      this.showReviewModal.set(false);
      this.finalTaskPayload.set(null);
      this.monetizationResult.set(null);
      this.includeMonetization.set(false);
    }
  }

  cancelReview() {
    this.showReviewModal.set(false);
    this.finalTaskPayload.set(null);
  }
}