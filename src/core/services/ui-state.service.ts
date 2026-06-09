import { Injectable, signal } from '@angular/core';
import type { Task } from './task.service';

@Injectable({
  providedIn: 'root'
})
export class UiStateService {
  // Modal States
  readonly isTaskFormOpen = signal(false);
  readonly isAuthModalOpen = signal(false);
  readonly isHelpOpen = signal(false);
  readonly isDeleteModalOpen = signal(false);
  readonly isSettingsOpen = signal(false);
  readonly isCompletionModalOpen = signal(false);
  
  // Detail Panel State
  readonly selectedTaskId = signal<string | null>(null);
  readonly selectedTaskDate = signal<string | null>(null);

  // Task Target States
  readonly taskToEdit = signal<Task | null>(null);
  readonly taskToComplete = signal<Task | null>(null);
  readonly taskToDelete = signal<Task | null>(null);

  // Global Actions
  openTaskDetail(id: string | null, date?: string) {
    console.log('UiStateService: openTaskDetail called with id:', id);
    this.selectedTaskId.set(id);
    this.selectedTaskDate.set(date || null);
    if (id) this.isTaskFormOpen.set(false); // Close form if opening detail
  }

  openTaskForm(task?: Task) {
    this.selectedTaskId.set(null);
    if (task) {
      this.taskToEdit.set(task);
    } else {
      this.taskToEdit.set(null);
    }
    this.isTaskFormOpen.set(true);
  }

  closeTaskForm() {
    this.isTaskFormOpen.set(false);
    this.taskToEdit.set(null);
  }

  openCompletionModal(task: Task) {
    this.taskToComplete.set(task);
    this.isCompletionModalOpen.set(true);
  }

  closeCompletionModal() {
    this.taskToComplete.set(null);
    this.isCompletionModalOpen.set(false);
  }

  openDeleteModal(task: Task) {
    this.taskToDelete.set(task);
    this.isDeleteModalOpen.set(true);
  }

  closeDeleteModal() {
    this.taskToDelete.set(null);
    this.isDeleteModalOpen.set(false);
  }
}