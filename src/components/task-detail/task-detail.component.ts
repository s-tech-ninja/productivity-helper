import { Component, input, output, inject, computed } from '@angular/core';
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
  close = output<void>();
  edit = output<Task>();
  complete = output<Task>();
  delete = output<Task>();

  private taskService = inject(TaskService);

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
    
    this.taskService.updateTask(currentTask.id, { subtasks: newSubtasks });
  }

  updateSubtaskNotes(subtaskId: string, notes: string) {
    const currentTask = this.task();
    const newSubtasks = currentTask.subtasks.map(s => 
      s.id === subtaskId ? { ...s, notes } : s
    );
    
    this.taskService.updateTask(currentTask.id, { subtasks: newSubtasks });
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
    if (t.recurrence === 'None') return null;
    
    const startStr = t.startDate || (t.createdAt ? new Date(t.createdAt).toISOString() : null);
    if (!startStr) return null;
    
    const start = new Date(startStr);
    const now = new Date();
    
    if (start.getTime() > now.getTime()) return start;
    
    const next = new Date(start);
    
    switch (t.recurrence) {
        case 'Daily': {
            const diff = now.getTime() - start.getTime();
            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            next.setDate(start.getDate() + days);
            while (next <= now) next.setDate(next.getDate() + 1);
            break;
        }
        case 'Weekly': {
            const diff = now.getTime() - start.getTime();
            const weeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 7));
            next.setDate(start.getDate() + (weeks * 7));
            while (next <= now) next.setDate(next.getDate() + 7);
            break;
        }
        case 'Bi-Weekly': {
            const diff = now.getTime() - start.getTime();
            const twoWeeks = Math.floor(diff / (1000 * 60 * 60 * 24 * 14));
            next.setDate(start.getDate() + (twoWeeks * 14));
            while (next <= now) next.setDate(next.getDate() + 14);
            break;
        }
        case 'Monthly': {
            while (next <= now) {
                next.setMonth(next.getMonth() + 1);
            }
            break;
        }
    }
    
    if (t.deadline) {
        const end = new Date(t.deadline);
        if (next.getTime() > end.getTime()) return null;
    }
    
    return next;
  });
}