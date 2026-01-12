import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService, Task } from '../../services/task.service';
import { IconComponent } from '../icons/icon.component';

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: Task[];
}

@Component({
  selector: 'app-calendar-view',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './calendar-view.component.html',
})
export class CalendarViewComponent {
  private taskService = inject(TaskService);
  
  triggerDetail = output<string>();

  currentDate = signal(new Date());

  // Group tasks by deadline date for quick lookup
  private tasksByDate = computed(() => {
    const map = new Map<string, Task[]>();
    this.taskService.tasks().forEach(task => {
      if (task.deadline) {
        const dateKey = new Date(task.deadline).toDateString();
        if (!map.has(dateKey)) {
          map.set(dateKey, []);
        }
        map.get(dateKey)!.push(task);
      }
    });
    return map;
  });

  daysInMonth = computed(() => {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const days: CalendarDay[] = [];
    const tasksMap = this.tasksByDate();

    // Days from previous month
    const startDayOfWeek = firstDayOfMonth.getDay();
    for (let i = startDayOfWeek; i > 0; i--) {
      const prevMonthDate = new Date(year, month, 1 - i);
      days.push({
        date: prevMonthDate,
        isCurrentMonth: false,
        isToday: false,
        tasks: tasksMap.get(prevMonthDate.toDateString()) || []
      });
    }

    // Days of current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const currentDay = new Date(year, month, i);
      days.push({
        date: currentDay,
        isCurrentMonth: true,
        isToday: currentDay.getTime() === today.getTime(),
        tasks: tasksMap.get(currentDay.toDateString()) || []
      });
    }
    
    return days;
  });

  daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  previousMonth = () => this.currentDate.update(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  nextMonth = () => this.currentDate.update(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  goToToday = () => this.currentDate.set(new Date());
  
  openTaskDetail = (task: Task) => this.triggerDetail.emit(task.id);
}