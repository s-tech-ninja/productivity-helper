import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TaskService, Task } from '../../services/task.service';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-project-view',
  standalone: true,
  imports: [CommonModule, IconComponent],
  providers: [DatePipe],
  templateUrl: './project-view.component.html'
})
export class ProjectViewComponent {
  private taskService = inject(TaskService);
  
  triggerDetail = output<{ id: string }>();

  tasks = this.taskService.tasks;

  projects = computed(() => {
    const list = this.taskService.projects();
    const allTasks = this.tasks();
    const hasNoProject = allTasks.some(t => !t.archived && (!t.project || !t.project.trim()));
    return hasNoProject ? [...list, 'No Project'] : list;
  });
  
  selectedProject = signal<string | null>(null);

  filteredTasks = computed(() => {
    const proj = this.selectedProject();
    const allTasks = this.tasks();
    
    if (!proj) return [];

    let tasks: Task[] = [];
    if (proj === 'No Project') {
      tasks = allTasks.filter(t => (!t.project || !t.project.trim()) && !t.archived);
    } else {
      tasks = allTasks.filter(t => t.project === proj && !t.archived);
    }
    
    // Sort: Active first (by deadline), Completed last
    return tasks.sort((a, b) => {
      const aComp = a.status === 'Completed';
      const bComp = b.status === 'Completed';
      
      if (aComp && !bComp) return 1;
      if (!aComp && bComp) return -1;
      
      // If both are active, sort by deadline (earliest first)
      if (!aComp) {
         const aTime = a.deadline ? new Date(a.deadline).getTime() : Number.MAX_SAFE_INTEGER;
         const bTime = b.deadline ? new Date(b.deadline).getTime() : Number.MAX_SAFE_INTEGER;
         return aTime - bTime;
      }
      return 0;
    });
  });

  selectProject(project: string) {
    this.selectedProject.set(project);
  }
  
  openTaskDetail(taskId: string) {
    this.triggerDetail.emit({ id: taskId });
  }

  isOverdue(task: Task): boolean {
    if (task.status === 'Completed' || !task.deadline) return false;
    return new Date(task.deadline).getTime() < Date.now();
  }

  isToday(task: Task): boolean {
    if (task.status === 'Completed') return false;
    return this.taskService.isTaskOnDate(task, new Date());
  }
}