import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { z } from 'zod';
import { AiService } from '@/src/ai/services';
import { taskSchema, subtaskSchema } from '@/src/ai/schemas/zod-schemas';
import type { AiServiceFailureResult } from '@/src/ai/services/ai-service.interface';
import { TaskService } from '../../../../core/services/task.service';
import { FinalReviewModalComponent } from './final-review-modal.component';
import { IconComponent } from '../../../../shared/components/icons/icon.component';

@Component({
  selector: 'app-task-builder-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, FinalReviewModalComponent, IconComponent],
  template: `
    <div class="grid gap-6">
      <!-- Step 1: Generate Task -->
      <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
        <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Step 1: Create Task</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-2">Task Prompt</label>
            <textarea
              [ngModel]="builderPrompt()"
              (ngModelChange)="builderPrompt.set($event)"
              placeholder="Describe the task you want to create. E.g., 'Create a high-priority task to review the project proposal by Friday with medium energy required'"
              rows="4"
              class="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 px-4 py-3 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            ></textarea>
          </div>

          <div class="flex gap-3">
            <button 
              (click)="generateTask()"
              [disabled]="builderStatus() === 'running'"
              class="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              @if (builderStatus() === 'running') {
                <span class="animate-spin">⟳</span> Generating...
              } @else {
                ✨ Generate Task
              }
            </button>
          </div>

          @if (builderError()) {
            <div class="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p class="text-sm text-red-700 dark:text-red-300">{{ builderError() }}</p>
            </div>
          }

          @if (builderValidationRows().length > 0) {
            <div class="rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
              <p class="text-sm font-medium text-amber-900 dark:text-amber-200 mb-3">Validation Issues:</p>
              <ul class="space-y-1 text-sm text-amber-800 dark:text-amber-300">
                @for (row of builderValidationRows(); track row.path) {
                  <li>• <strong>{{ row.path }}</strong>: {{ row.message }}</li>
                }
              </ul>
            </div>
          }
        </div>
      </div>

      <!-- Step 2: Display Generated Task -->
      @if (generatedTask()) {
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-slate-900 dark:text-white">Step 2: Review Task</h3>
            @if (!editingTask()) {
              <div class="flex gap-3">
                <button (click)="startEditTask()" class="text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">✏️ Edit</button>
                <button (click)="rejectTask()" class="text-sm font-medium text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300">❌ Reject</button>
              </div>
            }
          </div>
          
          @if (editingTask()) {
            <div class="space-y-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase">Title</label>
                <input [ngModel]="editingTaskDraft()?.title" (ngModelChange)="updateTaskDraft('title', $event)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 mt-1 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20">
              </div>
              <div>
                <label class="block text-xs font-semibold text-slate-500 uppercase">Description</label>
                <textarea [ngModel]="editingTaskDraft()?.description" (ngModelChange)="updateTaskDraft('description', $event)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 mt-1 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20" rows="3"></textarea>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase">Category</label>
                  <select [ngModel]="editingTaskDraft()?.category" (ngModelChange)="updateTaskDraft('category', $event)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 mt-1 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20">
                    <option value="Super Important">Super Important</option>
                    <option value="Important">Important</option>
                    <option value="Less Important">Less Important</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase">Energy Level</label>
                  <select [ngModel]="editingTaskDraft()?.energyLevel" (ngModelChange)="updateTaskDraft('energyLevel', $event)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 mt-1 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20">
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase">Est. Effort (h)</label>
                  <input type="number" [ngModel]="editingTaskDraft()?.estimatedEffort" (ngModelChange)="updateTaskDraft('estimatedEffort', $event)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 mt-1 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20">
                </div>
                <div>
                  <label class="block text-xs font-semibold text-slate-500 uppercase">Deadline</label>
                  <input type="date" [ngModel]="editingTaskDraft()?.deadline" (ngModelChange)="updateTaskDraft('deadline', $event)" class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 mt-1 text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-indigo-500/20">
                </div>
              </div>
              <div class="flex gap-2 pt-2">
                <button (click)="saveTaskEdit()" class="flex-1 inline-flex justify-center bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-sm font-medium transition">Save Changes</button>
                <button (click)="cancelTaskEdit()" class="flex-1 inline-flex justify-center border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 py-2 rounded-lg text-sm font-medium transition">Cancel</button>
              </div>
            </div>
          } @else {
            <div class="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
              <div>
                <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Title</p>
                <p class="text-lg font-bold text-slate-900 dark:text-white mt-1">{{ generatedTask().title }}</p>
              </div>
              <div>
                <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Description</p>
                <p class="text-slate-700 dark:text-slate-300 mt-1">{{ generatedTask().description }}</p>
              </div>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Category</p>
                  <p class="text-sm text-slate-700 dark:text-slate-300 mt-1 font-medium">{{ generatedTask().category }}</p>
                </div>
                <div>
                  <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Energy Level</p>
                  <p class="text-sm text-slate-700 dark:text-slate-300 mt-1 font-medium">{{ generatedTask().energyLevel }}</p>
                </div>
                <div>
                  <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Estimated Effort</p>
                  <p class="text-sm text-slate-700 dark:text-slate-300 mt-1 font-medium">{{ generatedTask().estimatedEffort }} hours</p>
                </div>
                <div>
                  <p class="text-xs uppercase tracking-wider font-semibold text-slate-500 dark:text-slate-400">Deadline</p>
                  <p class="text-sm text-slate-700 dark:text-slate-300 mt-1 font-medium">{{ generatedTask().deadline }}</p>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Step 3: Add Subtasks -->
        <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 class="text-lg font-semibold text-slate-900 dark:text-white mb-4">Step 3: Add Subtasks</h3>
          
          <div class="space-y-4">
            @if (!addingSubtask()) {
              <button 
                (click)="addingSubtask.set(true)"
                class="w-full inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-600 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                ➕ Add Subtask
              </button>
            } @else {
              <div class="space-y-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <label class="block text-sm font-medium text-slate-700 dark:text-slate-200">Subtask Prompt</label>
                <textarea
                  [ngModel]="subtaskPrompt()"
                  (ngModelChange)="subtaskPrompt.set($event)"
                  placeholder="E.g., 'First subtask is to review the proposal document'"
                  rows="2"
                  class="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                ></textarea>
                <div class="flex gap-2">
                  <button 
                    (click)="generateSubtask()"
                    [disabled]="!subtaskPrompt().trim()"
                    class="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:opacity-50"
                  >
                    ➕ Add
                  </button>
                  <button 
                    (click)="addingSubtask.set(false)"
                    class="flex-1 inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 dark:border-slate-600 px-3 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 transition hover:bg-slate-50 dark:hover:bg-slate-700"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            }

            @if (generatedSubtasks().length > 0) {
              <div class="space-y-2">
                @for (subtask of generatedSubtasks(); track $index) {
                  @if (editingSubtaskIndex() === $index) {
                    <div class="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 space-y-3">
                      <div>
                        <label class="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase">Title</label>
                        <input [ngModel]="editingSubtaskDraft()?.title" (ngModelChange)="updateSubtaskDraft('title', $event)" class="w-full rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 px-3 py-2 mt-1 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20">
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase">Description</label>
                        <textarea [ngModel]="editingSubtaskDraft()?.description" (ngModelChange)="updateSubtaskDraft('description', $event)" class="w-full rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 px-3 py-2 mt-1 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20" rows="2"></textarea>
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-emerald-800 dark:text-emerald-300 uppercase">Notes</label>
                        <textarea [ngModel]="editingSubtaskDraft()?.notes" (ngModelChange)="updateSubtaskDraft('notes', $event)" class="w-full rounded-lg border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 px-3 py-2 mt-1 text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-emerald-500/20" rows="2"></textarea>
                      </div>
                      <div class="flex gap-2 pt-2">
                        <button (click)="saveSubtaskEdit($index)" class="flex-1 inline-flex justify-center bg-emerald-600 hover:bg-emerald-700 text-white py-2 rounded-lg text-sm font-medium transition">Save Subtask</button>
                        <button (click)="cancelSubtaskEdit()" class="flex-1 inline-flex justify-center border border-emerald-300 dark:border-emerald-600 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-800/50 py-2 rounded-lg text-sm font-medium transition">Cancel</button>
                      </div>
                    </div>
                  } @else {
                    <div class="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                      <div class="text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0">✓</div>
                      <div class="flex-1 min-w-0">
                        <p class="font-medium text-emerald-900 dark:text-emerald-200">{{ subtask.title }}</p>
                        @if (subtask.description) {
                          <p class="text-sm text-emerald-800 dark:text-emerald-300 mt-1">{{ subtask.description }}</p>
                        }
                        @if (subtask.notes) {
                          <p class="text-xs text-emerald-700/80 dark:text-emerald-400/80 mt-1 italic">Notes: {{ subtask.notes }}</p>
                        }
                        @if (subtask.id) {
                          <p class="text-[10px] text-emerald-600/50 dark:text-emerald-500/50 mt-2 font-mono">ID: {{ subtask.id }}</p>
                        }
                      </div>
                      <div class="flex flex-col gap-3 shrink-0 mt-1">
                        <button 
                          (click)="startEditSubtask($index, subtask)"
                          class="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300"
                        >
                          ✏️ Edit
                        </button>
                        <button 
                          (click)="removeSubtask($index)"
                          class="text-xs font-semibold text-rose-500 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
                        >
                          ❌ Reject
                        </button>
                      </div>
                    </div>
                  }
                }
              </div>
            }
          </div>
        </div>

        <!-- Create Button -->
        <div class="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800">
          <button 
            (click)="createTask()"
            class="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-base font-bold text-white transition hover:bg-indigo-700 active:scale-95"
          >
            ✓ Create Task
          </button>
        </div>
      }
    </div>

    @if (showReviewModal() && finalTaskPayload()) {
      <app-final-review-modal
        [taskPayload]="finalTaskPayload()"
        (confirm)="confirmAndSaveTask()"
        (cancel)="cancelReview()">
      </app-final-review-modal>
    }
  `
})
export class TaskBuilderTabComponent {
  private aiService = inject(AiService);
  private taskService = inject(TaskService);

  builderPrompt = signal('');
  generatedTask = signal<any>(null);
  builderStatus = signal<'idle' | 'running' | 'success' | 'error'>('idle');
  builderError = signal<string | null>(null);
  builderValidationRows = signal<Array<{ path: string; message: string; code?: string }>>([]);
  generatedSubtasks = signal<any[]>([]);
  addingSubtask = signal(false);
  subtaskPrompt = signal('');

  editingTask = signal<boolean>(false);
  editingTaskDraft = signal<any>(null);
  editingSubtaskIndex = signal<number | null>(null);
  editingSubtaskDraft = signal<any>(null);

  showReviewModal = signal(false);
  finalTaskPayload = signal<any>(null);

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

    try {
      const result = await this.aiService.generateStructuredOutput({
        context: prompt,
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
    }
  }

  async generateSubtask() {
    const prompt = this.subtaskPrompt().trim();
    if (!prompt) return;

    this.addingSubtask.set(true);

    const taskContext = this.editingTask() ? this.editingTaskDraft() : this.generatedTask();
    const taskContextString = taskContext ? JSON.stringify(taskContext, null, 2) : 'None';
    const currentDate = new Date().toLocaleString();

    const augmentedPrompt = `Current Date: ${currentDate}\n\nParent Task Context:\n${taskContextString}\n\nBreak down the following request into a logical sequence of step-by-step subtasks:\n"${prompt}"\n\nFor each subtask, generate and show ALL details based on the schema:\n- id: A unique string identifier.\n- title: A clear, concise name for the step.\n- description: Detailed instructions on how to complete the step.\n- notes: Any additional context, tips, or warnings.`;

    try {
      const result = await this.aiService.generateStructuredOutput({
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
        this.addingSubtask.set(false);
      }
    } catch (error) {
      alert('Error generating subtask: ' + (error instanceof Error ? error.message : 'Unknown error'));
      this.addingSubtask.set(false);
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

  createTask() {
    const task = this.generatedTask();
    const subtasks = this.generatedSubtasks();

    if (!task) {
      this.builderError.set('Please generate a task first.');
      return;
    }

    const mappedSubtasks = subtasks.map(st => ({
      id: st.id || crypto.randomUUID(),
      text: st.title || st.text || '', 
      notes: [st.description, st.notes].filter(Boolean).join('\n\n'), 
      completed: false
    }));
    
    const fullTask = {
      title: task.title || 'Untitled AI Task',
      description: task.description || '',
      category: task.category || 'Important',
      project: task.project || 'AI General',
      startDate: new Date().toISOString().slice(0, 16),
      deadline: task.deadline || new Date().toISOString().slice(0, 16),
      estimatedEffort: task.estimatedEffort ? `${task.estimatedEffort}h` : '1h',
      energyLevel: task.energyLevel || 'Medium',
      recurrence: 'None' as const,
      tags: task.tags || [],
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
    }
  }

  cancelReview() {
    this.showReviewModal.set(false);
    this.finalTaskPayload.set(null);
  }
}