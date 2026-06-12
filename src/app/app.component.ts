import { Component, signal, inject, ViewChild, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { IconComponent } from '../shared/components/icons/icon.component';
import { AuthModalComponent } from '../shared/components/modals/auth-modal/auth-modal.component';
import { TaskFormComponent } from '../features/tasks/components/task-form/task-form.component';
import { DatePipe } from '@angular/common';
import { HelpComponent } from '../shared/components/modals/help-modal/help-modal.component';
import { CompletionModalComponent } from '../features/tasks/components/completion-modal/completion-modal.component';
import { ConfirmationModalComponent } from '../shared/components/modals/confirmation-modal/confirmation-modal.component';
import { ThemeService } from '../core/services/theme.service';
import { TaskDetailComponent } from '../features/tasks/components/task-detail/task-detail.component';
import { Task, TaskService } from '../core/services/task.service';
import { SettingsModalComponent } from '../shared/components/modals/settings-modal/settings-modal.component';
import { IndexedDbService } from '../storage/dexie/indexed-db.service';
import { UiStateService } from '../core/services/ui-state.service';
import packageJson from '../../package.json';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, IconComponent, AuthModalComponent, TaskFormComponent, HelpComponent, CompletionModalComponent, ConfirmationModalComponent, TaskDetailComponent, DatePipe, SettingsModalComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  themeService = inject(ThemeService);
  taskService = inject(TaskService);
  indexedDbService = inject(IndexedDbService);
  uiStateService = inject(UiStateService);
  private router = inject(Router);
  
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  currentYear = new Date().getFullYear();
  
  constructor() {
    console.log(`ProductivityFlow Version: ${packageJson.version}`);
  }
  
  isSidebarOpen = signal(false);
  showNotifications = signal(false);
  notificationCloseTimer: any = null;
  private outletSubs: Subscription[] = [];
  includeDiaryInExport = signal(false);
  
  activeTask = computed(() => {
    const selectedId = this.uiStateService.selectedTaskId();
    if (!selectedId) return null;
    const task = this.taskService.tasks().find(t => t.id === selectedId) || null;

    if (task) {
      const dateKey = this.uiStateService.selectedTaskDate() || new Date().toLocaleDateString('en-CA');
      
      // 1. Try to load existing history for this date
      if (task.history && task.history[dateKey]) {
        const h = task.history[dateKey];
        return {
          ...task,
          status: h.status,
          subtasks: h.subtasks,
          completionTime: h.completionTime,
          totalTimeElapsed: h.totalTimeElapsed,
          timerSessionCount: h.timerSessionCount,
          interruptions: h.interruptions,
          focusScore: h.focusScore,
          reflection: h.reflection
        };
      } 
      // 2. If recurring and NO history for today, return a "Fresh Start" view
      else if (task.recurrence !== 'None') {
        return {
          ...task,
          status: 'Backlog',
          subtasks: (task.subtasks || []).map(s => ({ ...s, completed: false, completedAt: undefined })),
          totalTimeElapsed: '0',
          timerSessionCount: 0,
          completionTime: undefined
        };
      }
    }
    return task;
  });

  isAnalysisExpanded = signal(true);
  isTasksExpanded = signal(true);

  toggleSidebar() {
    this.isSidebarOpen.update(v => !v);
  }

  toggleAnalysisSubmenu() {
    this.isAnalysisExpanded.update(v => !v);
  }

  toggleTasksSubmenu() {
    this.isTasksExpanded.update(v => !v);
  }

  toggleTheme() {
    this.themeService.toggle();
  }

  openNotificationDropdown() {
    clearTimeout(this.notificationCloseTimer);
    this.showNotifications.set(true);
  }

  closeNotificationDropdown() {
    this.notificationCloseTimer = setTimeout(() => {
      this.showNotifications.set(false);
    }, 200);
  }

  // Completion Logic
  onCompleteTask(data: { focusScore: number; reflection: string }) {
    const task = this.uiStateService.taskToComplete();
    if (task) {
      this.taskService.completeTask(task.id, {
        focusScore: data.focusScore,
        reflection: data.reflection,
        completionTime: new Date().toISOString()
      });
      this.uiStateService.closeCompletionModal();
    }
  }

  // Delete Logic
  confirmDelete() {
    const task = this.uiStateService.taskToDelete();
    if (task) {
      this.taskService.deleteTask(task.id);
      this.uiStateService.closeDeleteModal();
      this.uiStateService.selectedTaskId.set(null);
    }
  }
  
  // Listen to router-outlet events to catch @Output from legacy components (Dashboard, Calendar, etc.)
  onOutletComponentActivate(componentRef: any) {
    this.outletSubs.forEach(sub => sub.unsubscribe());
    this.outletSubs = [];

    if (componentRef.triggerDetail) {
      this.outletSubs.push(
        componentRef.triggerDetail.subscribe((event: any) => {
          const id = typeof event === 'string' ? event : event?.id;
          const date = typeof event === 'string' ? undefined : event?.date;
          this.uiStateService.openTaskDetail(id, date);
        })
      );
    }
    if (componentRef.triggerEdit) {
      this.outletSubs.push(
        componentRef.triggerEdit.subscribe((event: any) => {
          this.uiStateService.openTaskForm(event);
        })
      );
    }
    if (componentRef.triggerComplete) {
      this.outletSubs.push(
        componentRef.triggerComplete.subscribe((event: any) => {
          this.uiStateService.openCompletionModal(event);
        })
      );
    }
    if (componentRef.triggerDelete) {
      this.outletSubs.push(
        componentRef.triggerDelete.subscribe((event: any) => {
          this.uiStateService.openDeleteModal(event);
        })
      );
    }
    if (componentRef.triggerNavigate) {
      this.outletSubs.push(
        componentRef.triggerNavigate.subscribe((event: string) => {
          this.router.navigate([`/${event}`]);
        })
      );
    }
  }

  onOutletComponentDeactivate() {
    this.outletSubs.forEach(sub => sub.unsubscribe());
    this.outletSubs = [];
  }

  // Data Management
  async exportData() {
    try {
      const tasks = this.taskService.tasks();
      let data = '';

      if (this.includeDiaryInExport()) {
        const diary = await this.indexedDbService.getAllDiaryEntries();
        data = JSON.stringify({
          tasks,
          diary,
          exportedAt: new Date().toISOString()
        }, null, 2);
      } else {
        data = JSON.stringify(tasks, null, 2);
      }

      const blob = new Blob([data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `productivity-flow-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed', e);
      alert('Failed to export data.');
    }
  }

  triggerImport() {
    this.fileInput.nativeElement.click();
  }

  onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        const parsed = JSON.parse(result);
        
        // Scenario 1: Legacy Export (Array of Tasks)
        if (Array.isArray(parsed)) {
           // Basic validation: check if items have 'id' and 'title'
           const isValid = parsed.every(t => t.id && t.title);
           if (isValid) {
             this.taskService.importTasks(parsed);
             alert(`Successfully imported ${parsed.length} tasks.`);
           } else {
             alert('Invalid file format. Tasks must contain id and title.');
           }
        } 
        // Scenario 2: New Export (Object with tasks and optional diary)
        else if (parsed.tasks && Array.isArray(parsed.tasks)) {
           this.taskService.importTasks(parsed.tasks);
           
           let message = `Successfully imported ${parsed.tasks.length} tasks`;

           if (parsed.diary && Array.isArray(parsed.diary)) {
             // Import Diary Entries
             parsed.diary.forEach((entry: any) => {
               this.indexedDbService.saveDiaryEntry(entry);
             });
             message += ` and ${parsed.diary.length} diary entries`;
             
             // If current view is diary, we might want to reload or notify user to refresh
             if (this.router.url.includes('diary')) {
                message += '.\n\nPlease refresh the page to see imported diary entries.';
             }
           }
           alert(message + '.');
        } else {
          alert('Invalid file format. Expected an array of tasks or a backup object.');
        }
      } catch(err) {
        console.error(err);
        alert('Failed to parse JSON file.');
      }
      // Reset input
      this.fileInput.nativeElement.value = '';
    };
    reader.readAsText(file);
  }
}