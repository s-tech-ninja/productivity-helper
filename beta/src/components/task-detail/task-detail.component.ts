import { Component, input, output, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Task, TaskService, Subtask } from '../../services/task.service';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-task-detail',
  standalone: true,
  imports: [CommonModule, IconComponent, FormsModule],
  templateUrl: './task-detail.component.html',
  styles: [`
    .rich-text-content ul {
      list-style-type: disc;
      padding-left: 1.25rem;
      margin-bottom: 0.5rem;
    }
    .rich-text-content ol {
      list-style-type: decimal;
      padding-left: 1.25rem;
      margin-bottom: 0.5rem;
    }
    .rich-text-content b, .rich-text-content strong {
      font-weight: bold;
    }
    .rich-text-content i, .rich-text-content em {
      font-style: italic;
    }
    .rich-text-content u {
      text-decoration: underline;
    }
    .rich-text-content p {
      margin-bottom: 0.5rem;
    }
  `]
})
export class TaskDetailComponent {
  task = input.required<Task>();
  close = output<void>();
  edit = output<Task>(); 
  complete = output<Task>(); 
  delete = output<Task>(); 
  
  private taskService = inject(TaskService);
  
  // Timer State
  isTimerRunning = computed(() => this.taskService.activeTaskId() === this.task().id);
  
  isOtherTimerRunning = computed(() => {
    const activeId = this.taskService.activeTaskId();
    return activeId !== null && activeId !== this.task().id;
  });
  
  // Real-time Timer Display
  liveTimeDisplay = computed(() => {
    const now = this.taskService.tick(); 
    const isRunning = this.isTimerRunning();
    const startTime = this.taskService.activeTimerStart();
    const previouslyLogged = parseInt(this.task().totalTimeElapsed || '0', 10);
    
    let currentSessionMs = 0;
    if (isRunning && startTime) {
      currentSessionMs = now - startTime;
    }
    
    return this.taskService.formatDuration(previouslyLogged + currentSessionMs);
  });

  // Sort subtasks: Unchecked first, then Checked
  sortedSubtasks = computed(() => {
    const subtasks = this.task().subtasks || [];
    // Clone before sort to avoid mutating the signal reference
    return [...subtasks].sort((a, b) => {
      if (a.completed === b.completed) return 0;
      return a.completed ? 1 : -1;
    });
  });
  
  completedCount = computed(() => (this.task().subtasks || []).filter(t => t.completed).length);
  
  progressPercentage = computed(() => {
     const total = (this.task().subtasks || []).length;
     if (total === 0) return 0;
     return Math.round((this.completedCount() / total) * 100);
  });

  canComplete = computed(() => {
    const total = (this.task().subtasks || []).length;
    // If no subtasks, logic allows completion
    if (total === 0) return true;
    return this.completedCount() === total;
  });

  toggleSubtask(subtaskId: string) {
    const currentSubtasks = this.task().subtasks || [];
    const updatedSubtasks = currentSubtasks.map(s => {
      if (s.id === subtaskId) {
        return {
          ...s,
          completed: !s.completed,
          completedAt: !s.completed ? Date.now() : undefined
        };
      }
      return s;
    });
    
    this.taskService.updateTask(this.task().id, { subtasks: updatedSubtasks });
  }

  updateSubtaskNotes(subtaskId: string, notes: string) {
    const currentSubtasks = this.task().subtasks || [];
    const updatedSubtasks = currentSubtasks.map(s => {
      if (s.id === subtaskId) {
        return { ...s, notes };
      }
      return s;
    });
    this.taskService.updateTask(this.task().id, { subtasks: updatedSubtasks });
  }

  toggleTimer() {
    this.taskService.toggleTimer(this.task().id);
  }
  
  formatTotalTime(timeStr: string | undefined): string {
    return this.taskService.formatDuration(parseInt(timeStr || '0', 10));
  }

  onDelete() {
    this.delete.emit(this.task());
  }

  onMarkCompleted() {
    if (this.isTimerRunning()) {
      this.taskService.stopTimer();
    }
    this.complete.emit(this.task());
    this.close.emit();
  }
}