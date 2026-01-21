import { Component, input, output, inject, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService, Task } from '../../services/task.service';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, IconComponent, FormsModule],
  templateUrl: './task-detail.component.html'
})
export class TaskDetailComponent {
  task = input.required<Task>();
  dateContext = input<string | null>(null);
  close = output<void>();
  edit = output<Task>();
  complete = output<Task>();
  delete = output<Task>();

  private taskService = inject(TaskService);

  isHistoryExpanded = signal(false);

  // Timer Logic Helpers
  isTimerRunning = computed(() => 
    this.taskService.activeTaskId() === this.task().id
  );
  
  isOtherTimerRunning = computed(() => 
    !!this.taskService.activeTaskId() && this.taskService.activeTaskId() !== this.task().id
  );

  // Live timer display
  liveTimeDisplay = computed(() => {
    // Dependency on tick to force refresh every second
    this.taskService.tick(); 
    
    if (this.isTimerRunning() && this.taskService.activeTimerStart()) {
       const start = this.taskService.activeTimerStart()!;
       const current = parseInt(this.task().totalTimeElapsed || '0', 10);
       const session = Date.now() - start;
       return this.taskService.formatDuration(current + session);
    }
    return this.taskService.formatDuration(parseInt(this.task().totalTimeElapsed || '0', 10));
  });

  sortedSubtasks = computed(() => {
    const subtasks = this.task().subtasks || [];
    // Sort: Incomplete first, then Completed
    return [...subtasks].sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });
  });

  completedCount = computed(() => 
    (this.task().subtasks || []).filter(s => s.completed).length
  );

  progressPercentage = computed(() => {
    const total = (this.task().subtasks || []).length;
    if (total === 0) return 0;
    return Math.round((this.completedCount() / total) * 100);
  });

  canComplete() {
    const t = this.task();
    return (t.subtasks || []).every(s => s.completed);
  }

  toggleTimer() {
    this.taskService.toggleTimer(this.task().id);
  }

  toggleSubtask(subtaskId: string) {
    const currentTask = this.task();
    if (!currentTask.subtasks) return;

    // Create a new array with the updated item (Immutable update)
    const newSubtasks = currentTask.subtasks.map(s => 
      s.id === subtaskId ? { 
        ...s, 
        completed: !s.completed, 
        completedAt: !s.completed ? Date.now() : undefined 
      } : s
    );
    
    this.taskService.updateTask(currentTask.id, { subtasks: newSubtasks }, this.dateContext() || undefined);
  }

  updateSubtaskNotes(subtaskId: string, notes: string) {
    const currentTask = this.task();
    const newSubtasks = currentTask.subtasks.map(s => 
      s.id === subtaskId ? { ...s, notes } : s
    );
    
    this.taskService.updateTask(currentTask.id, { subtasks: newSubtasks }, this.dateContext() || undefined);
  }

  onMarkCompleted() {
    this.complete.emit(this.task());
  }

  onDelete() {
    this.delete.emit(this.task());
  }

  formatTotalTime(msStr: string | undefined) {
    return this.taskService.formatDuration(parseInt(msStr || '0', 10));
  }

  nextOccurrence = computed(() => {
    const t = this.task();
    if (!t.recurrence || t.recurrence === 'None' || !t.startDate) return null;
    
    const start = new Date(t.startDate);
    if (isNaN(start.getTime())) return null;

    const now = new Date();
    const next = new Date(start);
    
    do {
      switch (t.recurrence) {
        case 'Daily': next.setDate(next.getDate() + 1); break;
        case 'Weekly': next.setDate(next.getDate() + 7); break;
        case 'Bi-Weekly': next.setDate(next.getDate() + 14); break;
        case 'Monthly': next.setMonth(next.getMonth() + 1); break;
      }
    } while (next.getTime() <= now.getTime());
    
    if (t.deadline) {
        const end = new Date(t.deadline);
        if (next.getTime() > end.getTime()) return null;
    }
    
    return next;
  });

  recurrenceStats = computed(() => {
    const t = this.task();
    if (t.recurrence === 'None') return null;

    // Count completed entries in history
    const completed = Object.values(t.history || {}).filter(h => h.status === 'Completed').length;
    
    if (!t.startDate || !t.deadline) {
      return { completed, total: '?' };
    }

    // Calculate remaining occurrences from current startDate to deadline
    let count = 0;
    const current = new Date(t.startDate);
    const end = new Date(t.deadline);
    
    // Safety break
    const MAX_LOOPS = 1000; 
    let loops = 0;

    while (current <= end && loops < MAX_LOOPS) {
      count++;
      loops++;
      
      switch (t.recurrence) {
        case 'Daily': current.setDate(current.getDate() + 1); break;
        case 'Weekly': current.setDate(current.getDate() + 7); break;
        case 'Bi-Weekly': current.setDate(current.getDate() + 14); break;
        case 'Monthly': current.setMonth(current.getMonth() + 1); break;
        default: loops = MAX_LOOPS; break;
      }
    }

    return {
      completed,
      total: completed + count
    };
  });

  historyList = computed(() => {
    const t = this.task();
    if (!t.history) return [];
    
    return Object.entries(t.history)
      .map(([date, data]) => ({ date, ...data }))
      .filter(entry => entry.status === 'Completed') // Only show completed history to avoid daily noise
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  isLate(entry: any): boolean {
    if (!entry.completionTime || !entry.deadline) return false;
    return new Date(entry.completionTime).getTime() > new Date(entry.deadline).getTime();
  }

  checklistDisabled = computed(() => {
    const t = this.task();
    // Enable for non-recurring tasks
    if (t.recurrence === 'None') return false;

    const today = new Date();
    // Disable if today is not a scheduled day for this task
    return !this.taskService.isTaskOnDate(t, today);
  });
}