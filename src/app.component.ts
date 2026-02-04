import { Component, signal, inject, ViewChild, ElementRef, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IconComponent } from './components/icons/icon.component';
import { AuthModalComponent } from './components/auth-modal/auth-modal.component';
import { TaskFormComponent } from './components/task-form/task-form.component';
import { DashboardViewComponent } from './components/dashboard-view/dashboard-view.component';
import { CalendarViewComponent } from './components/calendar-view/calendar-view.component';
import { DatePipe } from '@angular/common';
import { AnalyticsViewComponent } from './components/analytics-view/analytics-view.component';
import { DiaryViewComponent } from './components/diary-view/diary-view.component';
import { HelpComponent } from './components/help-modal/help-modal.component';
import { CompletionModalComponent } from './components/completion-modal/completion-modal.component';
import { ConfirmationModalComponent } from './components/confirmation-modal/confirmation-modal.component';
import { ThemeService } from './services/theme.service';
import { TaskDetailComponent } from './components/task-detail/task-detail.component';
import { Task, TaskService } from './services/task.service';
import { SettingsModalComponent } from './components/settings-modal/settings-modal.component';
import { AiFeaturesViewComponent } from './components/ai-view1/ai-features-view.component';
import { ProjectAnalysisViewComponent } from './components/project-analysis/project-analysis-view.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, IconComponent, AuthModalComponent, TaskFormComponent, DashboardViewComponent, AnalyticsViewComponent, CalendarViewComponent, DiaryViewComponent, HelpComponent, CompletionModalComponent, ConfirmationModalComponent, TaskDetailComponent, DatePipe, SettingsModalComponent, AiFeaturesViewComponent, ProjectAnalysisViewComponent],
  templateUrl: './app.component.html'
})
export class AppComponent {
  themeService = inject(ThemeService);
  taskService = inject(TaskService);
  
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;
  
  currentYear = new Date().getFullYear();
  
  // View State for routing
  currentView = signal<'dashboard' | 'tasks' | 'history' | 'analytics' | 'calendar' | 'diary' | 'tasks-completed' | 'tasks-not-completed' | 'ai-features' | 'project-analysis'>('dashboard');

  isSidebarOpen = signal(false);
  showNotifications = signal(false);
  notificationCloseTimer: any = null;
  isAuthModalOpen = signal(false);
  isTaskFormOpen = signal(false);
  isHelpOpen = signal(false);
  isDeleteModalOpen = signal(false);
  isSettingsOpen = signal(false);
  
  // Detail Panel State
  selectedTaskId = signal<string | null>(null);
  selectedTaskDate = signal<string | null>(null); // Context date for the selected task

  activeTask = computed(() => {
    const selectedId = this.selectedTaskId();
    if (!selectedId) return null;
    const task = this.taskService.tasks().find(t => t.id === selectedId) || null;

    if (task) {
      const dateKey = this.selectedTaskDate() || new Date().toLocaleDateString('en-CA');
      
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

  // Edit State
  taskToEdit = signal<Task | null>(null);
  
  // Completion State
  taskToComplete = signal<Task | null>(null);
  
  // Delete State
  taskToDelete = signal<Task | null>(null);
  
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

  setView(view: 'dashboard' | 'tasks' | 'history' | 'analytics' | 'calendar' | 'diary' | 'tasks-completed' | 'tasks-not-completed' | 'ai-features' | 'project-analysis') {
    this.currentView.set(view);
    // On mobile, close sidebar after navigation
    if (window.innerWidth < 768) {
      this.isSidebarOpen.set(false);
    }
  }

  openCreateTask() {
    this.selectedTaskId.set(null);
    this.taskToEdit.set(null); // Clear edit mode
    this.isTaskFormOpen.set(true);
    
  }

  openTaskDetail(data: { id: string; date?: string } | null) {
    this.isTaskFormOpen.set(false);
    if (data) {
      this.selectedTaskId.set(data.id);
      this.selectedTaskDate.set(data.date || null);
    } else {
      this.selectedTaskId.set(null);
      this.selectedTaskDate.set(null);
    }
  }

  openEditTask(task: Task) {
    this.selectedTaskId.set(null); // Close detail view
    
    let taskToEdit = task;
    // Find main task to ensure we have the full object
    const mainTask = this.taskService.tasks().find(t => t.id === task.id) || task;
    taskToEdit = mainTask;

    this.taskToEdit.set(taskToEdit);
    this.isTaskFormOpen.set(true);
  }

  closeTaskForm() {
    this.isTaskFormOpen.set(false);
    this.taskToEdit.set(null);
  }

  // Completion Logic
  openCompletionModal(task: Task) {
    this.taskToComplete.set(task);
  }

  closeCompletionModal() {
    this.taskToComplete.set(null);
  }

  onCompleteTask(data: { focusScore: number; reflection: string }) {
    const task = this.taskToComplete();
    if (task) {
      this.taskService.completeTask(task.id, {
        focusScore: data.focusScore,
        reflection: data.reflection,
        completionTime: new Date().toISOString()
      });
      this.closeCompletionModal();
    }
  }

  // Delete Logic
  openDeleteModal(task: Task) {
    this.taskToDelete.set(task);
    this.isDeleteModalOpen.set(true);
  }

  confirmDelete() {
    const task = this.taskToDelete();
    if (task) {
      this.taskService.deleteTask(task.id);
      this.isDeleteModalOpen.set(false);
      this.taskToDelete.set(null);
      // Ensure DashboardView closes detail if open
    }
  }
  
  // Data Management
  exportData() {
    try {
      const data = JSON.stringify(this.taskService.tasks(), null, 2);
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
        const tasks = JSON.parse(result);
        
        if (Array.isArray(tasks)) {
           // Basic validation: check if items have 'id' and 'title'
           const isValid = tasks.every(t => t.id && t.title);
           if (isValid) {
             this.taskService.importTasks(tasks);
             alert(`Successfully imported ${tasks.length} tasks.`);
           } else {
             alert('Invalid file format. Tasks must contain id and title.');
           }
        } else {
          alert('Invalid file format. Expected an array of tasks.');
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