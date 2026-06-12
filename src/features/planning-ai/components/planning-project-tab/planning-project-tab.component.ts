import { Component, computed, inject, input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskService } from '../../../../core/services/task.service';
import { AiService } from '@/src/ai/services';
import { taskModificationSchema } from '@/src/ai/schemas/zod-schemas';
import { z } from 'zod';
import { IconComponent } from '../../../../shared/components/icons/icon.component';

@Component({
  selector: 'app-planning-project-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './planning-project-tab.component.html',
})
export class PlanningProjectTabComponent {
  readonly MAX_TASK_PLAN_SELECTION = 5;

  selectedTaskIds = input<Set<string>>(new Set());
  private taskService = inject(TaskService);
  private aiService = inject(AiService);

  scopeMode = signal<'selected' | 'project'>('selected');
  selectedProject = signal<string>('');
  constraints = signal<string>('');

  status = signal<'idle' | 'running' | 'success' | 'error'>('idle');
  error = signal<string | null>(null);
  result = signal<any>(null);
  validationRows = signal<Array<{ path: string; message: string; code?: string }>>([]);

  projects = this.taskService.projects;

  targetTasks = computed(() => {
    const mode = this.scopeMode();
    const all = this.taskService.tasks().filter(t => !t.archived && t.status !== 'Completed');
    
    if (mode === 'selected') {
      const ids = this.selectedTaskIds();
      return all.filter(t => ids.has(t.id));
    } else if (mode === 'project' && this.selectedProject()) { // Only filter by project if one is selected
      const proj = this.selectedProject();
      return all.filter(t => t.project === proj);
    }
    return [];
  });

  completedTasks = computed(() => {
    const mode = this.scopeMode();
    let completed = this.taskService.tasks().filter(t => t.status === 'Completed');
    
    if (mode === 'project') {
      const proj = this.selectedProject();
      completed = completed.filter(t => t.project === proj);
    }
    
    return completed.slice(0, 10); // Keep token count reasonable for the prompt
  });

  async generatePlan() {
    const tasks = this.targetTasks();
    if (!tasks.length && this.scopeMode() !== 'project') {
       this.error.set('No tasks found for the selected scope.');
       return;
    }

    this.status.set('running');
    this.error.set(null);
    this.result.set(null);
    this.validationRows.set([]);

    const contextData = tasks.map(t => ({
      id: t.id,
      title: t.title,
      description: t.description,
      category: t.category,
      project: t.project,
      startDate: t.startDate,
      deadline: t.deadline,
      estimatedEffortMinutes: this.taskService.parseEffort(t.estimatedEffort || '0m'), // Convert to minutes for AI numerical processing
      originalEstimatedEffortString: t.estimatedEffort, // Keep original string for context
      energyLevel: t.energyLevel,
      estimatedEffort: t.estimatedEffort,
      priority: t.category, // For AI understanding, category acts as priority
      subtasks: (t.subtasks || []).map(s => s.title),
      status: t.status, // Current status
      subtasksCompletion: `${(t.subtasks || []).filter(s => s.completed).length}/${(t.subtasks || []).length} completed`, // Context for subtask progress
    }));

    const past = this.completedTasks().map(t => ({
      title: t.title,
      estimatedEffort: t.estimatedEffort,
      actualTimeElapsed: t.totalTimeElapsed || 'unknown',
    }));

    const now = new Date();
    const isoDate = now.toISOString();
    const readableDate = now.toLocaleString();

    const pastCompletedContext = past.length === 0 ? '' : `
    --- Recently Completed Tasks (for velocity reference) ---
These tasks provide context on past performance and estimation accuracy.
${JSON.stringify(past, null, 2)}
`

    const prompt = `CRITICAL TEMPORAL CONTEXT: 
The current exact date and time is ${isoDate} (Local: ${readableDate}). You MUST treat this exact moment as "now" and "today". Do NOT use any other date, including your training cutoff date, for calculations. All relative terms like "tomorrow" or "next week" must be calculated strictly from this exact date and time.

You are an expert AI Project Planner, acting as a highly meticulous and logical project manager. Your primary goal is to analyze and optimize the provided 'Target Tasks' based on the 'Constraints/Goal' and historical 'Recently Completed Tasks' (for velocity reference). You MUST provide a structured plan following the exact JSON schema provided.

Constraints/Goal: "${this.constraints() || 'Optimize the schedule for efficiency and realistic execution.'}"

--- Target Tasks to Plan ---
Each task below represents its current state. You will propose modifications if necessary.
${JSON.stringify(contextData, null, 2)}

${pastCompletedContext == '' ? "" : pastCompletedContext}

--- PLANNING RULES & INSTRUCTIONS ---
1. BASELINE PRESERVATION: Do NOT randomly change values. Use the original values as the baseline. ONLY propose changes (newCategory, newEnergyLevel, newStartDate, newDeadline, newEstimatedEffort) if they directly serve the Constraints/Goal or fix obvious scheduling conflicts.
2. ACTION ASSIGNMENT:
   - 'Keep': The task fits the schedule and constraints perfectly as is. No changes needed.
   - 'Update': The task needs re-estimation, reprioritization, or rescheduling to fit the constraints.
   - 'Move to Backlog': The task cannot fit the current schedule/constraints but is still needed eventually. Use this for low priority/high effort tasks when time is tight.
   - 'Drop/Archive': The task is no longer relevant based on constraints.
3. REALISTIC ESTIMATION: Be highly realistic with 'newEstimatedEffort' (in minutes). Analyze subtasks carefully.
4. DATE FORMATTING: All dates MUST be in valid ISO 8601 format (YYYY-MM-DDTHH:mm:ss). Include a realistic time component (e.g., T09:00, T17:00) based on typical working hours.
5. RATIONALE: Every modification MUST have a logical 'rationale' explaining exactly WHY the change was made in relation to the constraints.
6. NEW TASKS: Only add 'newTasks' if there are glaring logical gaps to achieve the constraints.

Return ONLY the requested JSON schema.`;

    try {
      const res = await this.aiService.generateStructuredOutput({
        context: prompt,
        schema: taskModificationSchema,
        options: { temperature: 0.2, attempts: 2, streaming: false }
      });

      if (res.success) {
        // Augment the modifications with original task data for easy diffing in the UI
        const augmentedResult = {
          ...res.data,
          modifications: (res.data.modifications || []).map((mod: any) => ({
            ...mod,
            selected: true,
            original: this.targetTasks().find(t => t.id === mod.taskId),
            _type: 'modification' // Internal type for combined selection logic
          })),
          newTasks: (res.data.newTasks || []).map((nt: any) => ({
            ...nt,
            selected: true,
            _type: 'newTask' // Internal type for combined selection logic
          }))
        };

        // Enforce max selection limit for initial display
        let allSelectableItems = [...augmentedResult.modifications, ...augmentedResult.newTasks];
        if (allSelectableItems.length > this.MAX_TASK_PLAN_SELECTION) {
          for (let i = this.MAX_TASK_PLAN_SELECTION; i < allSelectableItems.length; i++) {
            allSelectableItems[i].selected = false;
          }
        }

        // Re-distribute the selected status back to the original arrays
        augmentedResult.modifications = allSelectableItems
          .filter(item => item._type === 'modification')
          .map(item => { delete item._type; return item; });
        augmentedResult.newTasks = allSelectableItems
          .filter(item => item._type === 'newTask')
          .map(item => { delete item._type; return item; });

        this.result.set(augmentedResult);
        this.status.set('success');
      } else {
        const failure = res as any;
        if (failure.details && Array.isArray(failure.details.flatErrors)) {
          this.validationRows.set(failure.details.flatErrors);
        }
        this.error.set(failure.error || 'Failed to parse AI response');
        this.status.set('error');
      }
    } catch (e: any) {
      this.error.set(e.message || 'Unexpected error occurred.');
      this.status.set('error');
    }
  }

  toggleModSelection(index: number) {
    this.result.update(res => {
      if (!res) return res;
      const mods = [...res.modifications];
      const newTasks = [...(res.newTasks || [])]; // Ensure newTasks is an array
      mods[index] = { ...mods[index], selected: !mods[index].selected };

      // If trying to select and limit is reached, revert and show alert
      if (mods[index].selected) {
        const currentlySelectedCount = mods.filter(m => m.selected).length + newTasks.filter(nt => nt.selected).length;
        if (currentlySelectedCount > this.MAX_TASK_PLAN_SELECTION) {
          alert(`You can select a maximum of ${this.MAX_TASK_PLAN_SELECTION} tasks for planning. Please deselect another task first.`);
          mods[index] = { ...mods[index], selected: false }; // Revert selection
        }
      }

      return { ...res, modifications: mods };
    });
  }

  toggleNewTaskSelection(index: number) {
    this.result.update(res => {
      if (!res) return res;
      const mods = [...(res.modifications || [])]; // Ensure mods is an array
      const newTasks = [...res.newTasks];
      newTasks[index] = { ...newTasks[index], selected: !newTasks[index].selected };

      // If trying to select and limit is reached, revert and show alert
      if (newTasks[index].selected) {
        const currentlySelectedCount = mods.filter(m => m.selected).length + newTasks.filter(nt => nt.selected).length;
        if (currentlySelectedCount > this.MAX_TASK_PLAN_SELECTION) {
          alert(`You can select a maximum of ${this.MAX_TASK_PLAN_SELECTION} tasks for planning. Please deselect another task first.`);
          newTasks[index] = { ...newTasks[index], selected: false }; // Revert selection
        }
      }

      return { ...res, newTasks };
    });
  }

  applyPlan() {
    const data = this.result();
    if (!data) return;

    // 1. Process modifications to existing tasks
    if (Array.isArray(data.modifications)) {
      for (const mod of data.modifications) {
        if (!mod.selected) continue; // Skip user-rejected modifications

        const updates: Partial<Task> = {};
        if (mod.newCategory) updates.category = mod.newCategory;
        if (mod.newEnergyLevel) updates.energyLevel = mod.newEnergyLevel;
        if (mod.newDeadline) updates.deadline = mod.newDeadline;
        if (mod.newEstimatedEffort !== undefined && mod.newEstimatedEffort !== null) {
          const hours = Math.floor(Number(mod.newEstimatedEffort) / 60);
          const mins = Math.floor(Number(mod.newEstimatedEffort) % 60);
          updates.estimatedEffort = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        }
        
        // Apply action-specific fields alongside standard field updates
        if (mod.action === 'Move to Backlog') {
          updates.status = 'Backlog';
        } else if (mod.action === 'Drop/Archive') {
          updates.archived = true;
        }

        if (Object.keys(updates).length > 0) {
          this.taskService.updateTask(mod.taskId, updates);
        }
      }
    }

    // 2. Create new suggested tasks
    if (Array.isArray(data.newTasks)) {
      const currentProject = this.scopeMode() === 'project' && this.selectedProject() ? this.selectedProject() : 'General';
      
      for (const nt of data.newTasks) {
        if (!nt.selected) continue; // Skip user-rejected new tasks

        const hours = Math.floor((Number(nt.estimatedEffort) || 30) / 60);
        const mins = Math.floor((Number(nt.estimatedEffort) || 30) % 60);
        const effortStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        
        this.taskService.addTask({
          title: nt.title || 'AI Task',
          description: nt.description || '',
          category: nt.category || 'Important',
          project: nt.project || currentProject,
          startDate: nt.startDate || new Date().toISOString(), // Use full ISO string from AI or current moment
          deadline: nt.deadline || new Date().toISOString(),   // Use full ISO string from AI or current moment
          estimatedEffort: effortStr,
          energyLevel: nt.energyLevel || 'Medium',
          recurrence: 'None',
          tags: ['AI-Planned'],
          subtasks: [],
          status: 'Backlog',
          history: {}
        });
      }
    }

    this.result.set(null);
    this.status.set('idle');
    this.constraints.set('');
    alert('Selected AI Plan changes successfully applied to your dashboard!');
  }
}
