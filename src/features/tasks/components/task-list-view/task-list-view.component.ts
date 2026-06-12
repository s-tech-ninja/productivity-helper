import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TaskService, Task, TaskStatus } from '@/src/core/services/task.service';
import { UiStateService } from '@/src/core/services/ui-state.service';
import { IconComponent } from '@/src/shared/components/icons/icon.component';

@Component({
  selector: 'app-task-list-view',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './task-list-view.component.html'
})
export class TaskListViewComponent {
  private taskService = inject(TaskService);
  uiStateService = inject(UiStateService);

  tasks = this.taskService.tasks;
  
  searchQuery = signal('');
  sortColumn = signal<keyof Task | 'none'>('deadline');
  sortDirection = signal<'asc' | 'desc'>('asc');
  filterStatus = signal<string>('all');
  filterCategory = signal<string>('all');
  
  // Pagination State
  pageSize = signal(15);
  currentPage = signal(1);

  selectedTaskIds = signal<Set<string>>(new Set());
  
  constructor() {
    console.log('TaskListViewComponent mounted successfully!');
    
    effect(() => {
      // When filters change, reset to the first page
      this.searchQuery();
      this.filterStatus();
      this.filterCategory();
      this.sortColumn();
      this.sortDirection();
      console.log('Effect: Filter/Sort/Search changed. Current page:', this.currentPage(), 'Total pages:', this.totalPages());

      // This check prevents resetting if the total pages haven't changed
      // or if we are already on a valid page.
      if (this.currentPage() > this.totalPages()) {
        this.currentPage.set(1);
      }
    });
  }

  filteredAndSortedTasks = computed(() => {
    // Create a mutable copy
    console.log('filteredAndSortedTasks: Starting with tasks count:', this.tasks().length);
    let result = [...this.tasks()]; // IMPORTANT: Create a mutable copy here
    // result = result.filter(t => !t.archived);
    console.log('filteredAndSortedTasks: After archiving filter, count:', result.length);
    
    // Filter by status
    if (this.filterStatus() !== 'all') {
      result = result.filter(t => t.status === this.filterStatus());
      console.log('filteredAndSortedTasks: After status filter ("' + this.filterStatus() + '"), count:', result.length);
    }
    
    // Filter by category
    if (this.filterCategory() !== 'all') {
      result = result.filter(t => t.category === this.filterCategory());
      console.log('filteredAndSortedTasks: After category filter ("' + this.filterCategory() + '"), count:', result.length);
    }
    
    // Search
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(t => 
        t.title.toLowerCase().includes(query) || 
        (t.project && t.project.toLowerCase().includes(query)) ||
        (t.tags && t.tags.some(tag => tag.toLowerCase().includes(query)))
      );
      console.log('filteredAndSortedTasks: After search filter ("' + query + '"), count:', result.length);
    }
    
    // Sort
    const col = this.sortColumn();
    if (col !== 'none') {
      console.log('filteredAndSortedTasks: Sorting by "' + col + '" "' + this.sortDirection() + '"');
      result.sort((a: any, b: any) => {
        let valA = a[col];
        let valB = b[col];
        
        if (col === 'deadline' || col === 'startDate') {
          valA = new Date(valA || 0).getTime();
          valB = new Date(valB || 0).getTime();
        }
        
        if (valA < valB) return this.sortDirection() === 'asc' ? -1 : 1;
        if (valA > valB) return this.sortDirection() === 'asc' ? 1 : -1;
        return 0;
      });
    }
    console.log('filteredAndSortedTasks: Final count before pagination:', result.length);
    return result;
  });
  
  totalPages = computed(() => {
    const total = this.filteredAndSortedTasks().length;
    const size = this.pageSize();
    const pages = Math.ceil(total / size);
    console.log('totalPages: Total tasks:', total, 'Page size:', size, 'Calculated pages:', pages);
    return pages;
  });

  paginatedTasks = computed(() => {
    const allTasks = this.filteredAndSortedTasks();
    console.log('paginatedTasks: All filtered/sorted tasks count:', allTasks.length);
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    const slicedTasks = allTasks.slice(start, start + size);
    console.log('paginatedTasks: Current page:', page, 'Page size:', size, 'Start index:', start, 'Paginated tasks count:', slicedTasks.length);
    return slicedTasks;
  });

  toggleSort(column: keyof Task) {
    if (this.sortColumn() === column) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
    } else {
      this.sortColumn.set(column);
      this.sortDirection.set('asc');
    }
  }
  
  toggleSelection(id: string) {
    this.selectedTaskIds.update(set => {
      const newSet = new Set(set);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  }
  
  toggleAll() {
    const currentFiltered = this.filteredAndSortedTasks();
    const currentSelected = this.selectedTaskIds();
    const allSelected = currentFiltered.length > 0 && currentFiltered.every(t => currentSelected.has(t.id));
    
    this.selectedTaskIds.update(set => {
      const newSet = new Set(set);
      if (allSelected) {
        currentFiltered.forEach(t => newSet.delete(t.id));
      } else {
        currentFiltered.forEach(t => newSet.add(t.id));
      }
      return newSet;
    });
  }
  
  bulkDelete() {
    const ids = Array.from(this.selectedTaskIds());
    if (ids.length === 0) return;
    if (confirm(`Are you sure you want to delete ${ids.length} tasks?`)) {
      ids.forEach(id => this.taskService.deleteTask(id));
      this.selectedTaskIds.set(new Set());
    }
  }
  
  bulkUpdateStatus(status: TaskStatus) {
    const ids = Array.from(this.selectedTaskIds());
    if (ids.length === 0) return;
    ids.forEach(id => {
      if (status === 'Completed') {
        this.taskService.completeTask(id, { completionTime: new Date().toISOString() });
      } else {
        this.taskService.updateTask(id, { status });
      }
    });
    this.selectedTaskIds.set(new Set());
  }

  bulkArchive(archive: boolean = true) {
    const ids = Array.from(this.selectedTaskIds());
    if (ids.length === 0) return;
    const action = archive ? 'archive' : 'unarchive';
    if (confirm(`Are you sure you want to ${action} ${ids.length} tasks?`)) {
      ids.forEach(id => this.taskService.updateTask(id, { archived: archive }));
      this.selectedTaskIds.set(new Set());
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages()) {
      this.currentPage.set(page);
    }
  }
  nextPage() {
    this.goToPage(this.currentPage() + 1);
  }
  prevPage() {
    this.goToPage(this.currentPage() - 1);
  }
}