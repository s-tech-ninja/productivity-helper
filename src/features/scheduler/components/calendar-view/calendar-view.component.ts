import { Component, inject, signal, computed, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TaskService, Task } from '../../../../core/services/task.service';
import { IconComponent } from '../../../../shared/components/icons/icon.component';

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
  
  triggerDetail = output<{ id: string; date?: string }>();

  currentDate = signal(new Date());


  daysInMonth = computed(() => {
    const date = this.currentDate();
    const year = date.getFullYear();
    const month = date.getMonth();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const days: CalendarDay[] = [];
    const tasks = this.taskService.tasks();

    // Days from previous month
    const startDayOfWeek = firstDayOfMonth.getDay();
    for (let i = startDayOfWeek; i > 0; i--) {
      const prevMonthDate = new Date(year, month, 1 - i);
      days.push({
        date: prevMonthDate,
        isCurrentMonth: false,
        isToday: false,
        tasks: tasks.filter(t => this.taskService.isTaskOnDate(t, prevMonthDate))
      });
    }

    // Days of current month
    for (let i = 1; i <= lastDayOfMonth.getDate(); i++) {
      const currentDay = new Date(year, month, i);
      days.push({
        date: currentDay,
        isCurrentMonth: true,
        isToday: currentDay.getTime() === today.getTime(),
        tasks: tasks.filter(t => this.taskService.isTaskOnDate(t, currentDay))
      });
    }

    // Days from next month (Fill the grid)
    const endDayOfWeek = lastDayOfMonth.getDay();
    const remainingDays = 6 - endDayOfWeek;
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthDate = new Date(year, month + 1, i);
      days.push({
        date: nextMonthDate,
        isCurrentMonth: false,
        isToday: false,
        tasks: tasks.filter(t => this.taskService.isTaskOnDate(t, nextMonthDate))
      });
    }
    
    return days;
  });

  daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  previousMonth = () => this.currentDate.update(d => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  nextMonth = () => this.currentDate.update(d => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  goToToday = () => this.currentDate.set(new Date());
  
  openTaskDetail = (task: Task, date?: Date) => this.triggerDetail.emit({ id: task.id, date: date ? date.toLocaleDateString('en-CA') : undefined });
}
