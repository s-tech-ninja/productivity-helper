import { Component, inject, computed, signal, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService, Task } from '../../../../core/services/task.service';
import { IconComponent } from '../../../../shared/components/icons/icon.component'; 
import { DatePipe } from '@angular/common';
@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [CommonModule, IconComponent],
  providers: [DatePipe],
  templateUrl: './dashboard-view.component.html',
  styles: [`
    /* Fix for dark mode hover visibility */
    :host-context(.dark) ::ng-deep .hover\\:bg-slate-50:hover,
    :host-context(.dark) ::ng-deep .hover\\:bg-white:hover {
      background-color: rgba(51, 65, 85, 0.5) !important; /* slate-700/50 */
      color: #e2e8f0 !important; /* slate-200 */
    }
  `]
})
export class DashboardViewComponent {
  view = input<'dashboard' | 'tasks' | 'history' | 'tasks-completed' | 'tasks-not-completed'>('dashboard');
  triggerEdit = output<Task>(); // Output to parent to open edit modal
  triggerComplete = output<Task>(); // Output to parent for completion modal
  triggerDelete = output<Task>(); // Output to parent for delete confirmation
  triggerDetail = output<{ id: string; date?: string }>();
  triggerNavigate = output<string>();
  
  datePipe = inject(DatePipe);
  taskService = inject(TaskService);
  tasks = this.taskService.tasks;
  stats = computed(() => this.taskService.calculateStats(this.filteredTasks()));
  streak = this.taskService.streak;
  
  // Local state for toggling between Board/List inside Dashboard view
  dashboardTab = signal<'board' | 'list'>('board');
  
  constructor() {
    effect(() => {
      const v = this.view();
      if (v === 'history' || v === 'tasks-completed' || v === 'tasks-not-completed') {
        this.dashboardTab.set('list');
      }
    });
  }

  // Search state
  searchQuery = signal<string>('');

  // Notification Panel State
  showNotifications = signal(false);

  // Date Filter
  dateFilter = signal<'All' | 'Today' | 'This Week' | 'This Month'>('All');

  // Collapsible Sections
  collapsedSections = signal<{ [key: string]: boolean }>({
    super: false,
    important: false,
    less: false
  });

  // Notification Categories
  notifications = this.taskService.notifications;
  notificationCount = this.taskService.notificationCount;

  // Add this signal
  sortOption = signal<'smart' | 'deadline' | 'priority' | 'energy' | 'newest'>('smart');

  // Add this method
  updateSort(option: string) {
    this.sortOption.set(option as any);
  }

  // Update your filteredTasks computed (or similar) to include this sorting logic
  sortedTasks = computed(() => {
    const tasks = this.filteredTasks(); // Assuming you have a filtered list
    const sort = this.sortOption();

    return [...tasks].sort((a, b) => {
      // 1. Always put Completed tasks at the bottom
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;

      // 2. Sorting Strategies
      switch (sort) {
        case 'deadline':
          // Null deadlines go last
          if (!a.deadline) return 1;
          if (!b.deadline) return -1;
          return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();

        case 'priority':
          const pMap: Record<string, number> = { 'Super Important': 3, 'Important': 2, 'Less Important': 1 };
          return (pMap[b.category] || 0) - (pMap[a.category] || 0);

        case 'energy':
          const eMap: Record<string, number> = { 'High': 3, 'Medium': 2, 'Low': 1 };
          // Default to Medium (2) if undefined
          return (eMap[b.energyLevel || 'Medium'] || 2) - (eMap[a.energyLevel || 'Medium'] || 2);

        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();

        case 'smart':
        default:
          // A. Overdue check (Deadline < Now)
          const now = new Date().getTime();
          const aDue = a.deadline ? new Date(a.deadline).getTime() : null;
          const bDue = b.deadline ? new Date(b.deadline).getTime() : null;
          
          const aOverdue = aDue && aDue < now;
          const bOverdue = bDue && bDue < now;

          if (aOverdue && !bOverdue) return -1;
          if (!aOverdue && bOverdue) return 1;

          // B. Deadline (Soonest first)
          if (aDue && bDue) {
              if (aDue !== bDue) return aDue - bDue;
          }
          // Push tasks with no deadline to bottom of "Smart" list
          if (aDue && !bDue) return -1;
          if (!aDue && bDue) return 1;

          // C. Priority Tie-breaker
          const pMapSmart: Record<string, number> = { 'Super Important': 3, 'Important': 2, 'Less Important': 1 };
          if (a.category !== b.category) {
              return (pMapSmart[b.category] || 0) - (pMapSmart[a.category] || 0);
          }

          // D. Created Date (Newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  });

  toggleNotifications() {
    this.showNotifications.update(v => !v);
  }

  toggleSection(section: 'super' | 'important' | 'less') {
    this.collapsedSections.update(s => ({ ...s, [section]: !s[section] }));
  }

  setDateFilter(filter: 'All' | 'Today' | 'This Week' | 'This Month') {
    this.dateFilter.set(filter);
  }
  
  // Filtered Tasks based on search query AND view
  filteredTasks = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const currentView = this.view();
    const allTasks = this.tasks();
    const dateFilter = this.dateFilter();
    const today = new Date();
    const todayStr = today.toLocaleDateString('en-CA');

    // Step 1: Filter by View (Archived vs Active vs Status)
    let tasksInView = allTasks;

    if (currentView === 'history') {
      tasksInView = allTasks.filter(t => t.archived);
    } else if (currentView === 'tasks-completed') {
      tasksInView = tasksInView.filter(t => {
        if (t.archived) return false;
        if (t.status === 'Completed') return true;
        // Include recurring tasks completed today
        if (t.recurrence !== 'None' && t.history?.[todayStr]?.status === 'Completed') return true;
        return false;
      });

    } else if (currentView === 'tasks-not-completed' || currentView === 'dashboard') {
      tasksInView = tasksInView.filter(t => !t.archived && t.status !== 'Completed');
    }
    else {
      tasksInView = tasksInView.filter(t => !t.archived);
    }

    // Step 2: Date Filter
    if (dateFilter !== 'All') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      
      tasksInView = tasksInView.filter(t => {
        if (dateFilter === 'Today') {
          return this.taskService.isTaskOnDate(t, now);
        }
        
        if (dateFilter === 'This Week') {
           // Check next 7 days (or remaining days of week)
           // Simple approach: Check if it occurs on any day from Today to End of Week
           const current = new Date(now);
           const endOfWeek = new Date(now);
           endOfWeek.setDate(now.getDate() + (6 - now.getDay())); // Saturday
           
           while (current <= endOfWeek) {
             if (this.taskService.isTaskOnDate(t, current)) return true;
             current.setDate(current.getDate() + 1);
           }
           return false;
        }
        
        if (dateFilter === 'This Month') {
           // Optimization: Check if start date is before end of month AND deadline is after start of month
           // Then check specific recurrence if needed, but for listing usually "Active in this month" is enough?
           // Let's stick to strict occurrence check for accuracy
           const current = new Date(now);
           const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
           
           // Safety cap for loop
           while (current <= endOfMonth) {
             if (this.taskService.isTaskOnDate(t, current)) return true;
             current.setDate(current.getDate() + 1);
           }
           return false;
        }
        
        return true;
      });
    }

    // Step 3: Search Query
    if (query) {
      tasksInView = tasksInView.filter(t => 
        t.title.toLowerCase().includes(query) || 
        t.description?.toLowerCase().includes(query) ||
        t.project?.toLowerCase().includes(query)
      );
    }

    // Step 4: Overlay History for Recurring Tasks (Today)
    tasksInView = tasksInView.map(t => {
      if (t.recurrence !== 'None') {
        const h = t.history?.[todayStr];
        if (h) {
          return {
            ...t,
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
      }
      return t;
    });

    // Step 5: Filter out completed recurring tasks for Dashboard/Pending views
    if (currentView === 'tasks-not-completed' || currentView === 'dashboard') {
      tasksInView = tasksInView.filter(t => !(t.recurrence !== 'None' && t.status === 'Completed'));
    }

    return tasksInView;
  });

  colTasks = {
    super: computed(() => this.sortedTasks().filter(t => t.category === 'Super Important')),
    important: computed(() => this.sortedTasks().filter(t => t.category === 'Important')),
    less: computed(() => this.sortedTasks().filter(t => t.category === 'Less Important')),
  };

  isOverdue(dateStr: string): boolean {
    return new Date(dateStr).getTime() < Date.now();
  }
  
  formatTotalTime(timeStr: string | undefined): string {
    return this.taskService.formatDuration(parseInt(timeStr || '0', 10));
  }

  // Helper for progress bar calculation
  getSubtaskStats(task: Task) {
    if (!task.subtasks || !Array.isArray(task.subtasks)) return { total: 0, completed: 0, percent: 0 };
    
    const total = task.subtasks.length;
    const completed = task.subtasks.filter(s => s.completed).length;
    
    return {
      total,
      completed,
      percent: total === 0 ? 0 : Math.round((completed / total) * 100)
    };
  }

  openTaskDetail(taskId: string) {
    this.triggerDetail.emit({ id: taskId });
  }

  enableNotifications() {
    this.taskService.requestNotificationPermission();
  }

  // Drag and Drop Logic
  onDragStart(event: DragEvent, taskId: string) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', taskId);
      event.dataTransfer.effectAllowed = 'move';
      // Optional: Add a custom drag image or style here if needed
    }
  }

  onDragOver(event: DragEvent) {
    event.preventDefault(); // REQUIRED to allow dropping
    event.stopPropagation();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  onDrop(event: DragEvent, newCategory: Task['category']) {
    event.preventDefault();
    event.stopPropagation();
    const taskId = event.dataTransfer?.getData('text/plain');
    
    if (taskId) {
      // Small visual delay feedback could be added here, but direct update is faster
      this.taskService.updateTaskCategory(taskId, newCategory);
    }
  }

  getCompletionScore(task: Task) {
    return this.taskService.calculateCompletionScore(task);
  }
}
