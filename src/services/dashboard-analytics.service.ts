import { Injectable, computed, inject, signal } from '@angular/core';
import { TaskService, Task } from './task.service';

export interface DailyVelocity {
  date: string;
  label: string;
  created: number;
  completed: number;
}

export interface ProjectTime {
  project: string;
  minutes: number;
}

export type AnalyticsRange = 'daily' | 'weekly' | 'monthly';

@Injectable({
  providedIn: 'root'
})
export class DashboardAnalyticsService {
  private taskService = inject(TaskService);
  private tasks = this.taskService.tasks;
  
  // Range Configuration
  range = signal<AnalyticsRange>('daily');

  // 1. Velocity Metrics (Dynamic Range)
  velocityMetrics = computed(() => {
    const allTasks = this.tasks();
    const rangeType = this.range();
    const velocityMap = new Map<string, DailyVelocity>();
    
    // Configure Date Range
    const today = new Date();
    let loops = 7;
    let incrementType = 'day';

    if (rangeType === 'weekly') {
      loops = 8;
      incrementType = 'week';
    } else if (rangeType === 'monthly') {
      loops = 6;
      incrementType = 'month';
    }

    // Initialize Buckets
    for (let i = loops - 1; i >= 0; i--) {
      const d = new Date();
      let key = '';
      let label = '';

      if (rangeType === 'daily') {
        d.setDate(today.getDate() - i);
        key = d.toISOString().split('T')[0]; // YYYY-MM-DD
        label = d.toLocaleDateString('en-US', { weekday: 'short' });
      } else if (rangeType === 'weekly') {
        // Go back i weeks, set to start of week (Sunday)
        d.setDate(today.getDate() - (i * 7));
        const day = d.getDay();
        const diff = d.getDate() - day; // adjust when day is sunday
        d.setDate(diff);
        key = d.toISOString().split('T')[0];
        label = `W${this.getWeekNumber(d)}`;
      } else if (rangeType === 'monthly') {
        d.setMonth(today.getMonth() - i);
        key = `${d.getFullYear()}-${d.getMonth() + 1}`; // YYYY-M
        label = d.toLocaleDateString('en-US', { month: 'short' });
      }

      velocityMap.set(key, { date: key, label, created: 0, completed: 0 });
    }

    // Populate Data
    allTasks.forEach(t => {
      this.addToBucket(velocityMap, t.createdAt, 'created', rangeType);
      
      if (t.status === 'Completed' && t.completionTime) {
        this.addToBucket(velocityMap, t.completionTime, 'completed', rangeType);
      }

      // History Completions
      if (t.history) {
        Object.values(t.history).forEach(h => {
          if (h.status === 'Completed' && h.completionTime) {
            this.addToBucket(velocityMap, h.completionTime, 'completed', rangeType);
          }
        });
      }
    });

    return Array.from(velocityMap.values());
  });

  private addToBucket(map: Map<string, DailyVelocity>, dateStr: string | number, field: 'created' | 'completed', rangeType: AnalyticsRange) {
    if (!dateStr) return;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return;

    let key = '';

    if (rangeType === 'daily') {
      key = d.toISOString().split('T')[0];
    } else if (rangeType === 'weekly') {
      const day = d.getDay();
      const diff = d.getDate() - day;
      const weekStart = new Date(d);
      weekStart.setDate(diff);
      key = weekStart.toISOString().split('T')[0];
    } else if (rangeType === 'monthly') {
      key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    }

    // Since we only initialized the last X buckets, ignore data older than that
    if (map.has(key)) {
      map.get(key)![field]++;
    }
  }
  
  private getWeekNumber(d: Date): number {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = date.getUTCDay() || 7;
    date.setUTCDate(date.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  // 2. Focus & Time Metrics
  focusMetrics = computed(() => {
    const tasks = this.tasks().filter(t => !t.archived);
    
    let totalMinutes = 0;
    let totalFocusScore = 0;
    let focusCount = 0;

    tasks.forEach(t => {
      // Main Task Data
      totalMinutes += this.parseDuration(t.totalTimeElapsed);
      if (t.status === 'Completed' && t.focusScore) {
        totalFocusScore += t.focusScore;
        focusCount++;
      }

      // History Data
      if (t.history) {
        Object.values(t.history).forEach(h => {
          totalMinutes += this.parseDuration(h.totalTimeElapsed);
          if (h.status === 'Completed' && h.focusScore) {
            totalFocusScore += h.focusScore;
            focusCount++;
          }
        });
      }
    });

    return {
      totalMinutes, // Return raw minutes for UI formatting
      avgFocusScore: focusCount > 0 ? (totalFocusScore / focusCount).toFixed(1) : '0.0'
    };
  });

  // 3. Accuracy Analysis (Last 10 Completed)
  accuracyMetrics = computed(() => {
    const completedItems: any[] = [];
    
    this.tasks().forEach(t => {
      if (t.archived) return;
      
      if (t.status === 'Completed' && t.estimatedEffort) {
        completedItems.push(t);
      }
      
      if (t.history && t.estimatedEffort) {
        Object.values(t.history).forEach(h => {
          if (h.status === 'Completed') {
            completedItems.push({ ...h, title: t.title, estimatedEffort: t.estimatedEffort });
          }
        });
      }
    });

    return completedItems
      .sort((a, b) => {
        const timeA = a.completionTime ? new Date(a.completionTime).getTime() : 0;
        const timeB = b.completionTime ? new Date(b.completionTime).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 10)
      .map(t => ({
        title: t.title,
        estimated: this.parseEffort(t.estimatedEffort || ''),
        actual: this.parseDuration(t.totalTimeElapsed),
      }));
  });

  // 4. Energy Distribution
  energyDistribution = computed(() => {
    const completedItems: any[] = [];
    
    this.tasks().forEach(t => {
      if (t.archived) return;
      if (t.status === 'Completed') completedItems.push(t);
      
      if (t.history) {
        Object.values(t.history).forEach(h => {
          if (h.status === 'Completed') {
            completedItems.push({ ...h, energyLevel: t.energyLevel });
          }
        });
      }
    });

    return {
      high: completedItems.filter(t => t.energyLevel === 'High').length,
      medium: completedItems.filter(t => t.energyLevel === 'Medium').length,
      low: completedItems.filter(t => t.energyLevel === 'Low').length
    };
  });

  // 5. Project Allocation
  projectAllocation = computed(() => {
    const map = new Map<string, number>();
    this.tasks().filter(t => !t.archived).forEach(t => {
      const proj = (t.project || '').trim() || 'Unassigned';
      const mins = this.parseDuration(t.totalTimeElapsed);
      if (mins > 0) {
        map.set(proj, (map.get(proj) || 0) + mins);
      }
      
      if (t.history) {
        Object.values(t.history).forEach(h => {
          const hMins = this.parseDuration(h.totalTimeElapsed);
          if (hMins > 0) map.set(proj, (map.get(proj) || 0) + hMins);
        });
      }
    });

    return Array.from(map.entries())
      .map(([project, minutes]) => ({ project, minutes }))
      .sort((a, b) => b.minutes - a.minutes); // Descending
  });

  // 6. Recent Activity
  recentActivity = computed(() => {
    const completedItems: any[] = [];

    this.tasks().forEach(t => {
      if (t.archived) return;
      
      if (t.status === 'Completed') {
        completedItems.push(t);
      }
      
      if (t.history) {
        Object.values(t.history).forEach(h => {
          if (h.status === 'Completed') {
            completedItems.push({ ...h, title: t.title, estimatedEffort: t.estimatedEffort });
          }
        });
      }
    });

    return completedItems
      .sort((a, b) => {
        const timeA = a.completionTime ? new Date(a.completionTime).getTime() : 0;
        const timeB = b.completionTime ? new Date(b.completionTime).getTime() : 0;
        return timeB - timeA;
      })
      .slice(0, 15)
      .map(t => {
        const est = this.parseEffort(t.estimatedEffort || '');
        const act = this.parseDuration(t.totalTimeElapsed);
        return {
          ...t,
          delta: act - est // Positive means took longer
        };
      });
  });

  // 7. Productivity Leaks
  leaksMetrics = computed(() => {
    const tasks = this.tasks().filter(t => !t.archived);
    const totalTasks = tasks.length;
    
    if (totalTasks === 0) return { avgSessions: 0, interruptedTasks: 0 };

    let totalSessions = 0;
    let interruptedTasks = 0;

    tasks.forEach(t => {
      totalSessions += t.timerSessionCount || 0;
      // Heuristic: If interruption string exists or sessions > 4 for a task, flag it
      if (t.interruptions || (t.timerSessionCount || 0) > 4) {
        interruptedTasks++;
      }
      
      if (t.history) {
        Object.values(t.history).forEach(h => {
          totalSessions += h.timerSessionCount || 0;
          if (h.interruptions || (h.timerSessionCount || 0) > 4) interruptedTasks++;
        });
      }
    });

    return {
      avgSessions: (totalSessions / totalTasks).toFixed(1),
      contextSwitchingScore: interruptedTasks
    };
  });

  setRange(range: AnalyticsRange) {
    this.range.set(range);
  }


  // --- Helpers ---

  private parseDuration(msStr: string | undefined): number {
    if (!msStr) return 0;
    const ms = parseInt(msStr, 10);
    return isNaN(ms) ? 0 : Math.round(ms / 1000 / 60); // Minutes
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