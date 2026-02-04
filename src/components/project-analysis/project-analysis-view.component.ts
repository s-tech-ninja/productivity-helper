import { Component, inject, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService, Task } from '../../services/task.service';
import { IconComponent } from '../icons/icon.component';

@Component({
  selector: 'app-project-analysis-view',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './project-analysis-view.component.html'
})
export class ProjectAnalysisViewComponent {
  private taskService = inject(TaskService);
  
  projects = this.taskService.projects;
  tasks = this.taskService.tasks;

  projectStats = computed(() => {
    const allTasks = this.tasks();
    const allProjects = this.projects();
    
    const stats = allProjects.map(project => {
      const projectTasks = allTasks.filter(t => t.project === project && !t.archived);
      return this.calculateStats(project, projectTasks);
    });

    // Handle "No Project" tasks
    const noProjectTasks = allTasks.filter(t => (!t.project || !t.project.trim()) && !t.archived);
    if (noProjectTasks.length > 0) {
      stats.push(this.calculateStats('No Project', noProjectTasks));
    }
    
    return stats.sort((a, b) => b.total - a.total);
  });

  private calculateStats(name: string, tasks: Task[]) {
      let totalInstances = 0;

      let totalEstimatedMinutes = 0;
      let totalActualMinutes = 0;
      let totalFocusScore = 0;
      let focusScoreCount = 0;
      let totalSessions = 0;
      let completedCount = 0;
      let earlyCount = 0;
      let lateCount = 0;
      let recurringCount = 0;
      const now = Date.now();

      tasks.forEach(t => {
        const taskEstimate = this.parseEffort(t.estimatedEffort);
        
        // Count current instance
        totalInstances++;
        totalEstimatedMinutes += taskEstimate;

        // Count recurring series
        if (t.recurrence !== 'None') recurringCount++;

        // Handle non-recurring tasks
        if (t.recurrence === 'None') {
            totalActualMinutes += this.parseDuration(t.totalTimeElapsed);
            totalSessions += t.timerSessionCount || 0;
            if (t.status === 'Completed') {
                completedCount++;
                if (t.focusScore) {
                    totalFocusScore += t.focusScore;
                    focusScoreCount++;
                }
                // Check punctuality
                if (t.deadline && t.completionTime) {
                    if (new Date(t.completionTime).getTime() <= new Date(t.deadline).getTime()) {
                        earlyCount++;
                    } else {
                        lateCount++;
                    }
                }
            } else {
                // Check if overdue (active)
                if (t.deadline && new Date(t.deadline).getTime() < now) {
                    lateCount++;
                }
            }
        } else { // Handle recurring tasks by iterating history
            if (t.history) {
                Object.values(t.history).forEach(h => {
                    // Count history instance
                    totalInstances++;
                    totalEstimatedMinutes += taskEstimate;

                    totalActualMinutes += this.parseDuration(h.totalTimeElapsed);
                    totalSessions += h.timerSessionCount || 0;
                    if (h.status === 'Completed') {
                        completedCount++;
                        if (h.focusScore) {
                            totalFocusScore += h.focusScore;
                            focusScoreCount++;
                        }
                        // Check punctuality for history items
                        if (h.deadline && h.completionTime) {
                            if (new Date(h.completionTime).getTime() <= new Date(h.deadline).getTime()) {
                                earlyCount++;
                            } else {
                                lateCount++;
                            }
                        }
                    }
                });
            }
            // Check current instance overdue status
            if (t.deadline && new Date(t.deadline).getTime() < now) {
                lateCount++;
            }
        }
      });
      
      return {
        name,
        total: totalInstances,
        completed: completedCount,
        progress: totalInstances > 0 ? Math.round((completedCount / totalInstances) * 100) : 0,
        totalEstimatedMinutes,
        totalActualMinutes,
        formattedEstimated: this.formatMinutes(totalEstimatedMinutes),
        formattedActual: this.formatMinutes(totalActualMinutes),
        avgFocusScore: focusScoreCount > 0 ? (totalFocusScore / focusScoreCount).toFixed(1) : '0.0',
        avgSessions: totalInstances > 0 ? (totalSessions / totalInstances).toFixed(1) : '0.0',
        early: earlyCount,
        late: lateCount,
        recurring: recurringCount
      };
  }

  private parseDuration(msStr: string | undefined): number {
    if (!msStr) return 0;
    const ms = parseInt(msStr, 10);
    return isNaN(ms) ? 0 : Math.round(ms / 1000 / 60); // Minutes
  }

  private formatMinutes(mins: number): string {
    if (!mins) return '0m';
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) {
      return m > 0 ? `${h}h ${m}m` : `${h}h`;
    }
    return `${m}m`;
  }

  private parseEffort(effort: string): number {
    if (!effort || typeof effort !== 'string') return 0;
    let minutes = 0;
    
    const hMatch = effort.match(/(\d+)\s*(h|hour|hours)/i);
    const mMatch = effort.match(/(\d+)\s*(m|min|mins|minute|minutes)/i);
    
    if (hMatch) minutes += parseInt(hMatch[1], 10) * 60;
    if (mMatch) minutes += parseInt(mMatch[1], 10);
    
    return minutes;
  }
}