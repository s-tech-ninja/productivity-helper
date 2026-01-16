import { Component, inject, computed, signal, input, output, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService, Task } from '../../services/task.service';
import { IconComponent } from '../icons/icon.component'; 

@Component({
  selector: 'app-dashboard-view',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './dashboard-view.component.html'
})
export class DashboardViewComponent {
  view = input<'dashboard' | 'tasks' | 'history' | 'tasks-completed' | 'tasks-not-completed'>('dashboard');
  triggerEdit = output<Task>(); // Output to parent to open edit modal
  triggerComplete = output<Task>(); // Output to parent for completion modal
  triggerDelete = output<Task>(); // Output to parent for delete confirmation
  triggerDetail = output<string>();
  triggerNavigate = output<string>();
  
  taskService = inject(TaskService);
  tasks = this.taskService.tasks;
  stats = this.taskService.stats;
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

    // Step 1: Filter by View (Archived vs Active vs Status)
    let tasksInView = allTasks;
    if (currentView === 'history') {
      tasksInView = allTasks.filter(t => t.archived);
    } else if (currentView === 'tasks-completed') {
      tasksInView = allTasks.filter(t => t.status === 'Completed' && !t.archived);
    } else if (currentView === 'tasks-not-completed') {
      tasksInView = allTasks.filter(t => t.status !== 'Completed' && !t.archived);
    }
    else {
      tasksInView = allTasks.filter(t => !t.archived);
    }

    // Step 2: Date Filter
    if (dateFilter !== 'All') {
      const now = new Date();
      now.setHours(23, 59, 59, 999); // Compare against end of today
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
      
      tasksInView = tasksInView.filter(t => {
        if (!t.deadline) return false;
        
        const d = new Date(t.deadline);
        d.setHours(23, 59, 59, 999); // Normalize task deadline to end of its day
        const taskDeadline = d.getTime();
        
        if (dateFilter === 'Today') {
          return taskDeadline <= endOfToday;
        }
        
        if (dateFilter === 'This Week') {
           const endOfWeek = new Date(now);
           const diff = now.getDate() - now.getDay() + 6; // Adjust to Saturday (End of week)
           endOfWeek.setDate(diff);
           endOfWeek.setHours(23, 59, 59, 999);
           return taskDeadline <= endOfWeek.getTime();
        }
        
        if (dateFilter === 'This Month') {
           const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999).getTime();
           return taskDeadline <= endOfMonth;
        }
        
        return true;
      });
    }

    // Step 3: Search Query
    if (!query) return tasksInView;
    
    return tasksInView.filter(t => 
      t.title.toLowerCase().includes(query) || 
      t.description?.toLowerCase().includes(query) ||
      t.project?.toLowerCase().includes(query)
    );
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
    this.triggerDetail.emit(taskId);
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
}