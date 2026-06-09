import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TaskService, Task } from '@/src/core/services/task.service';
import { UiStateService } from '@/src/core/services/ui-state.service';
import { IconComponent } from '@/src/shared/components/icons/icon.component';

export interface ProjectData {
  name: string;
  tasks: Task[];
  activeCount: number;
  completedCount: number;
  isArchived: boolean;
}

@Component({
  selector: 'app-project-list',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent],
  templateUrl: './project-list.component.html'
})
export class ProjectListComponent {
  private taskService = inject(TaskService);
  uiStateService = inject(UiStateService);
  private router = inject(Router);

  searchQuery = signal('');
  
  // Pagination State
  pageSize = signal(15);
  currentPage = signal(1);

  selectedProjects = signal<Set<string>>(new Set());
  
  constructor() {
    console.log('ProjectListComponent mounted successfully!');
    
    effect(() => {
      // When filters change, reset to the first page
      this.searchQuery();
      console.log('Effect: Search changed. Current page:', this.currentPage(), 'Total pages:', this.totalPages());

      // This check prevents resetting if the total pages haven't changed
      // or if we are already on a valid page.
      if (this.currentPage() > this.totalPages()) {
        this.currentPage.set(1);
      }
    });
  }

  projectList = computed(() => {
    const tasks = this.taskService.tasks();
    const projectMap = new Map<string, Task[]>();
    
    // Group tasks by project
    tasks.forEach(t => {
      const p = t.project && t.project.trim() ? t.project.trim() : 'Unassigned';
      if (!projectMap.has(p)) projectMap.set(p, []);
      projectMap.get(p)!.push(t);
    });

    let result: ProjectData[] = Array.from(projectMap.entries()).map(([name, projectTasks]) => {
      const activeTasks = projectTasks.filter(t => !t.archived);
      return {
        name,
        tasks: projectTasks,
        activeCount: activeTasks.filter(t => t.status !== 'Completed').length,
        completedCount: activeTasks.filter(t => t.status === 'Completed').length,
        isArchived: projectTasks.length > 0 && projectTasks.every(t => t.archived)
      };
    });

    // Search
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(p => p.name.toLowerCase().includes(query));
    }
    
    // Sort alphabetically
    result.sort((a, b) => a.name.localeCompare(b.name));

    return result;
  });
  
  totalPages = computed(() => {
    const total = this.projectList().length;
    const size = this.pageSize();
    return Math.max(1, Math.ceil(total / size));
  });

  paginatedProjects = computed(() => {
    const all = this.projectList();
    const page = this.currentPage();
    const size = this.pageSize();
    const start = (page - 1) * size;
    return all.slice(start, start + size);
  });

  toggleSelection(name: string) {
    this.selectedProjects.update(set => {
      const newSet = new Set(set);
      if (newSet.has(name)) newSet.delete(name);
      else newSet.add(name);
      return newSet;
    });
  }
  
  toggleAll() {
    const currentList = this.projectList();
    const currentSelected = this.selectedProjects();
    const allSelected = currentList.length > 0 && currentList.every(p => currentSelected.has(p.name));
    
    this.selectedProjects.update(set => {
      const newSet = new Set(set);
      if (allSelected) {
        currentList.forEach(p => newSet.delete(p.name));
      } else {
        currentList.forEach(p => newSet.add(p.name));
      }
      return newSet;
    });
  }
  
  bulkDelete() {
    const names = Array.from(this.selectedProjects());
    if (names.length === 0) return;
    
    if (confirm(`Are you sure you want to delete all tasks in ${names.length} selected projects? This action cannot be undone.`)) {
      names.forEach(name => {
        const project = this.projectList().find(p => p.name === name);
        if (project) {
          project.tasks.forEach(t => this.taskService.deleteTask(t.id));
        }
      });
      this.selectedProjects.set(new Set());
    }
  }
  
  bulkToggleArchive(archive: boolean) {
    const names = Array.from(this.selectedProjects());
    if (names.length === 0) return;
    
    const action = archive ? 'disable (archive)' : 'enable (unarchive)';
    if (confirm(`Are you sure you want to ${action} all tasks in ${names.length} selected projects?`)) {
      names.forEach(name => {
        const project = this.projectList().find(p => p.name === name);
        if (project) {
          project.tasks.forEach(t => {
            if (t.archived !== archive) {
              this.taskService.updateTask(t.id, { archived: archive });
            }
          });
        }
      });
      this.selectedProjects.set(new Set());
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

  viewProjectTasks(projectName: string) {
    this.router.navigate(['/tasks'], { queryParams: { project: projectName } });
  }
}