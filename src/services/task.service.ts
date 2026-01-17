import { Injectable, signal, computed, effect } from '@angular/core';

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
  notes?: string;
  completedAt?: number; // Timestamp
}

export interface TaskCompletion {
  completedAt: number; // Timestamp of when it was marked done
  occurrenceDate: string; // The date of the occurrence (YYYY-MM-DD)
  focusScore?: number;
  reflection?: string;
  interruptions?: string;
  timeElapsed?: string;
  subtasksSnapshot?: Subtask[]; // Snapshot of subtasks at completion
}


export interface Task {
  id: string;
  // Core & Planning (Phase 1)
  title: string;
  description?: string;
  category: 'Super Important' | 'Important' | 'Less Important';
  project: string;
  startDate: string;
  deadline: string;
  estimatedEffort: string;
  energyLevel: 'High' | 'Medium' | 'Low';
  recurrence: 'None' | 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly';
  tags: string[]; // Context / Tags
  
  // Update: Structured Array instead of string
  subtasks: Subtask[];
  
  // Execution & Performance (Phase 2)
  status: 'Backlog' | 'In Progress' | 'Paused' | 'Completed';
  createdAt: number;
  
  // Archive State
  archived: boolean;
  
  // Phase 2 - Analysis Fields
  completionTime?: string;
  totalTimeElapsed?: string; 
  timerSessionCount?: number;
  interruptions?: string; // Log/Notes
  focusScore?: number; // 1-5
  reflection?: string; // Post-task note
  completionHistory: TaskCompletion[]; // History of recurring completions
  recurrenceTemplate?: { // Snapshot of the series definition for resetting
    title: string;
    description?: string;
    subtasks: Subtask[];
    estimatedEffort: string;
    energyLevel: 'High' | 'Medium' | 'Low';
    project: string;
    category: 'Super Important' | 'Important' | 'Less Important';
  };
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private STORAGE_KEY = 'productivity_flow_tasks';
  private TIMER_STATE_KEY = 'productivity_flow_timer_state';
  
  // Initialize with empty, will load in constructor
  private tasksSignal = signal<Task[]>([]);

  readonly tasks = this.tasksSignal.asReadonly();

  // Timer State
  readonly activeTaskId = signal<string | null>(null);
  readonly activeTimerStart = signal<number | null>(null);
  private secondsTimer: any;
  private minutesTimer: any;
  // A signal that updates every second to trigger UI refresh for the timer
  readonly tick = signal<number>(Date.now());

  private notifiedTaskIds = new Set<string>();
  private startedTaskIds = new Set<string>();

  readonly stats = computed(() => {
    const all = this.tasksSignal();
    const activeTasks = all.filter(t => !t.archived);
    
    const total = activeTasks.length;
    const completed = activeTasks.filter(t => t.status === 'Completed').length;
    
    return {
      total,
      completed,
      completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      superImportant: activeTasks.filter(t => t.category === 'Super Important').length,
      important: activeTasks.filter(t => t.category === 'Important').length,
      lessImportant: activeTasks.filter(t => t.category === 'Less Important').length,
      highEnergy: activeTasks.filter(t => t.energyLevel === 'High').length,
      mediumEnergy: activeTasks.filter(t => t.energyLevel === 'Medium').length,
      lowEnergy: activeTasks.filter(t => t.energyLevel === 'Low').length,
    };
  });

  // Streak: Consecutive days with at least one completed task
  readonly streak = computed(() => {
    const tasks = this.tasksSignal();
    
    // 1. Standard Completed Tasks
    const standardTimestamps = tasks
      .filter(t => t.status === 'Completed' && t.completionTime)
      .map(t => new Date(t.completionTime!).getTime());

    // 2. Recurring Task Completions (History)
    const recurringTimestamps = tasks
      .flatMap(t => (t.completionHistory || []).map(h => h.completedAt));

    const allTimestamps = [...standardTimestamps, ...recurringTimestamps];

    const completedDates = allTimestamps
      .map(ts => {
        const d = new Date(ts);
        d.setHours(0, 0, 0, 0);
        return d.getTime();
      })
      .sort((a, b) => b - a); // Descending

    const uniqueDates = [...new Set(completedDates)];
    if (uniqueDates.length === 0) return 0;

    const today = new Date().setHours(0, 0, 0, 0);
    const yesterday = today - 86400000;

    // If most recent is not today or yesterday, streak is broken
    if (uniqueDates[0] !== today && uniqueDates[0] !== yesterday) return 0;

    let streakCount = 0;
    let checkDate = uniqueDates[0] === today ? today : yesterday;

    for (const date of uniqueDates) {
      if (date === checkDate) {
        streakCount++;
        checkDate -= 86400000; // Move to previous day
      } else {
        break;
      }
    }
    return streakCount;
  });

  // Notification Categories (Moved from DashboardViewComponent)
  readonly notifications = computed(() => {
    const all = this.tasksSignal().filter(t => !t.archived && t.status !== 'Completed');
    const now = Date.now();
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const endingToday: Task[] = [];
    const overdue: Task[] = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const t of all) {
      // Skip if recurring task is completed for today
      if (t.recurrence !== 'None' && this.isOccurrenceCompleted(t, today)) {
        continue;
      }

      // 1. Overdue Check
      if (t.recurrence === 'None') {
        // Standard Task: Overdue if deadline passed
        if (t.deadline && new Date(t.deadline).getTime() < now) {
          overdue.push(t);
          continue;
        }
      } else {
        // Recurring Task: Overdue if it occurs today AND the time has passed
        // (We assume the time component of the deadline applies to each occurrence)
        if (this.isTaskOnDate(t, today)) {
           if (t.deadline) {
             const deadlineTime = new Date(t.deadline);
             const todayDeadline = new Date(today);
             todayDeadline.setHours(deadlineTime.getHours(), deadlineTime.getMinutes(), 59, 999);
             if (now > todayDeadline.getTime()) {
               overdue.push(t);
               continue; // Don't show in endingToday if it's already overdue
             }
           }
        }
      }
      
      // 2. Scheduled Today Check
      if (this.isTaskOnDate(t, today)) {
        endingToday.push(t);
        continue;
      }
    }

    return { endingToday, overdue };
  });

  readonly notificationCount = computed(() => this.notifications().endingToday.length + this.notifications().overdue.length);

  constructor() {
    this.loadFromStorage();
    this.loadTimerState();

    // Auto-save whenever tasks change
    effect(() => {
      const tasks = this.tasksSignal();
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
      } catch (e) {
        console.error('Error saving tasks to localStorage:', e);
      }
    });

    // Auto-save timer state
    effect(() => {
      const taskId = this.activeTaskId();
      const start = this.activeTimerStart();
      if (taskId && start) {
        localStorage.setItem(this.TIMER_STATE_KEY, JSON.stringify({ taskId, start }));
      } else {
        localStorage.removeItem(this.TIMER_STATE_KEY);
      }
    });

    // 1. Secs Timer - for clock on task has started
    this.secondsTimer = setInterval(() => {
      if (this.activeTaskId()) {
        this.tick.set(Date.now());
      }
    }, 1000);

    // 2. Minutes Timer - for tasks separation (notifications)
    this.minutesTimer = setInterval(() => {
      this.checkUpcomingTasks();
    }, 60000);
  }

  requestNotificationPermission() {
    if ('Notification' in window && Notification.permission !== 'granted') {
      Notification.requestPermission();
    }
  }

  private checkUpcomingTasks() {

    const now = Date.now();
    const fifteenMins = 15 * 60 * 1000;
    const hasNotificationPermission = 'Notification' in window && Notification.permission === 'granted';

    this.tasksSignal().forEach(t => {
      if (!t.startDate || t.status === 'Completed' || t.archived) return;

      const start = new Date(t.startDate).getTime();
      const diff = start - now;

      // If starting within 15 mins (and hasn't started yet)
      if (diff > 0 && diff <= fifteenMins && !this.notifiedTaskIds.has(t.id)) {
        if (hasNotificationPermission) {
          new Notification('Task Starting Soon', {
            body: `"${t.title}" is starting in ${Math.ceil(diff / 60000)} minutes.`,
          });
        }
        this.notifiedTaskIds.add(t.id);
      }

      // If start time has arrived (within the last minute)
      // Expanded window to 2 mins to ensure we catch it with 1-min interval
      if (diff <= 0 && diff > -120000 && !this.startedTaskIds.has(t.id)) {
        this.playReminderSound();
        if (hasNotificationPermission) {
          new Notification('Task Started', {
            body: `"${t.title}" is scheduled to start now.`,
          });
        }
        this.startedTaskIds.add(t.id);

      // Play sound if needed (browsers might block auto-play without interaction)
        this.notifiedTaskIds.add(t.id);
      }
    });
  }

  private loadFromStorage() {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored) {
      try {
        let parsedData = JSON.parse(stored);
        
        if (!Array.isArray(parsedData)) {
          throw new Error('Stored data is not an array');
        }

        // Data Migration: Convert legacy string subtasks to Subtask[]
        parsedData = parsedData.map((t: any) => {
           if (typeof t.subtasks === 'string') {
             return {
               ...t,
               subtasks: this.migrateSubtasksString(t.subtasks)
             };
           }
           // Ensure it is an array even if undefined
           if (!t.subtasks) {
             return { ...t, subtasks: [] };
           }
           // Data Migration: Convert legacy location to tags
           if (t.location && !t.tags) {
             t.tags = [t.location];
             delete t.location;
           }
           if (!t.tags) t.tags = [];
           if (!t.completionHistory) t.completionHistory = [];
           
           // Migration: Create template for existing recurring tasks if missing
           if (t.recurrence !== 'None' && !t.recurrenceTemplate) {
             t.recurrenceTemplate = {
               title: t.title,
               description: t.description,
               subtasks: (t.subtasks || []).map((s: Subtask) => ({...s})),
               estimatedEffort: t.estimatedEffort,
               energyLevel: t.energyLevel,
               project: t.project,
               category: t.category
             };
           }
           return t;
        });

        this.tasksSignal.set(parsedData);
      } catch (e) {
        console.error('Failed to parse tasks', e);
        this.seedInitialData();
      }
    } else {
      this.seedInitialData();
    }
  }

  private loadTimerState() {
    const stored = localStorage.getItem(this.TIMER_STATE_KEY);
    if (stored) {
      try {
        const { taskId, start } = JSON.parse(stored);
        if (taskId && start) {
          // Verify task still exists
          if (this.tasksSignal().some(t => t.id === taskId)) {
            this.activeTaskId.set(taskId);
            this.activeTimerStart.set(start);
          }
        }
      } catch (e) {
        console.error('Failed to parse timer state', e);
      }
    }
  }

  private migrateSubtasksString(raw: string): Subtask[] {
    if (!raw) return [];
    return raw.split('\n')
      .filter(s => s.trim().length > 0)
      .map(line => {
         const trimmed = line.trim();
         const isChecked = trimmed.startsWith('[x] ');
         const cleanText = trimmed.replace(/^\[[ x]\]\s+/, '');
         
         return {
           id: crypto.randomUUID(),
           text: cleanText,
           completed: isChecked,
           completedAt: isChecked ? Date.now() : undefined,
           notes: ''
         };
      });
  }

  private seedInitialData() {
    const initialTasks: Task[] = [
      {
        id: '1',
        title: 'Architect System Core',
        description: '<b>Objective:</b> Define the core services for the application.<br><ul><li>Create TaskService</li><li>Setup State Management</li></ul>',
        category: 'Super Important',
        project: 'Productivity App',
        startDate: '2023-10-27T09:00',
        deadline: '2023-11-01T17:00',
        estimatedEffort: '4h',
        energyLevel: 'High',
        recurrence: 'None',
        tags: ['Deep Work', 'Core'],
        subtasks: [
          { id: '1a', text: 'Define Interfaces', completed: true, completedAt: Date.now() },
          { id: '1b', text: 'Create Service', completed: false }
        ],
        status: 'In Progress',
        createdAt: Date.now(),
        totalTimeElapsed: '0',
        timerSessionCount: 0,
        archived: false,
        completionHistory: []
      }
    ];
    this.tasksSignal.set(initialTasks);
  }

  addTask(task: Omit<Task, 'id' | 'createdAt' | 'archived'>) {
    const newTask: Task = {
      ...task,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      totalTimeElapsed: '0',
      timerSessionCount: 0,
      archived: false,
      completionHistory: [],
      recurrenceTemplate: task.recurrence !== 'None' ? {
        title: task.title,
        description: task.description,
        subtasks: task.subtasks.map(s => ({...s})),
        estimatedEffort: task.estimatedEffort,
        energyLevel: task.energyLevel,
        project: task.project,
        category: task.category
      } : undefined
    };
    this.tasksSignal.update(tasks => [newTask, ...tasks]);
  }

  updateTask(id: string, updates: Partial<Task>) {
    this.tasksSignal.update(tasks => 
      tasks.map(t => {
        if (t.id !== id) return t;
        
        // Check if this is a recurring task completed today
        const todayStr = new Date().toLocaleDateString('en-CA');
        const isRecurringCompletedToday = t.recurrence !== 'None' && 
                                          t.completionHistory?.length > 0 && 
                                          t.completionHistory.some(h => h.occurrenceDate === todayStr);

        if (isRecurringCompletedToday) {
           const historyIndex = t.completionHistory.findIndex(h => h.occurrenceDate === todayStr);
           
           // Case 1: Undo Completion (Status changed from Completed)
           if (updates.status && updates.status !== 'Completed') {
               const historyEntry = t.completionHistory[historyIndex];
               const newHistory = [...t.completionHistory];
               newHistory.splice(historyIndex, 1);
               
               // Restore state from history snapshot to the active task
               const restoredTask: Task = {
                   ...t,
                   // Restore instance data
                   subtasks: historyEntry.subtasksSnapshot || t.subtasks,
                   totalTimeElapsed: historyEntry.timeElapsed || t.totalTimeElapsed,
                   interruptions: historyEntry.interruptions || t.interruptions,
                   focusScore: historyEntry.focusScore,
                   reflection: historyEntry.reflection,
                   
                   ...updates, // Apply updates (overriding restored data if present)
                   completionHistory: newHistory
               };
               return restoredTask;
           }
           
           // Case 2: Editing the Completed Instance
           // We update the history entry, but exclude instance-specific fields from the main task
           // to avoid overwriting the "next occurrence" setup.
           const historyEntry = { ...t.completionHistory[historyIndex] };
           // Safety: Ensure snapshot exists if it was missing (e.g. legacy data)
           if (!historyEntry.subtasksSnapshot) {
               historyEntry.subtasksSnapshot = t.subtasks.map(s => ({...s}));
           }
           
           let historyUpdated = false;

           if (updates.subtasks) {
               historyEntry.subtasksSnapshot = updates.subtasks;
               historyUpdated = true;
           }
           if (updates.focusScore !== undefined) { historyEntry.focusScore = updates.focusScore; historyUpdated = true; }
           if (updates.reflection !== undefined) { historyEntry.reflection = updates.reflection; historyUpdated = true; }
           if (updates.interruptions !== undefined) { historyEntry.interruptions = updates.interruptions; historyUpdated = true; }

           // Apply updates to main task, BUT exclude instance-specific fields
           const { subtasks, focusScore, reflection, interruptions, ...seriesUpdates } = updates;
           
           const updatedMainTask = {
               ...t,
               ...seriesUpdates
           };

           if (historyUpdated) {
               const newHistory = [...t.completionHistory];
               newHistory[historyIndex] = historyEntry;
               updatedMainTask.completionHistory = newHistory;
           }
           
           return updatedMainTask;
        }

        const updatedTask = { ...t, ...updates };

        // Logic: If switching TO Recurring (from None), capture the template
        if (t.recurrence === 'None' && updatedTask.recurrence !== 'None') {
           updatedTask.recurrenceTemplate = {
              title: updatedTask.title,
              description: updatedTask.description,
              subtasks: updatedTask.subtasks.map(s => ({...s})),
              estimatedEffort: updatedTask.estimatedEffort,
              energyLevel: updatedTask.energyLevel,
              project: updatedTask.project,
              category: updatedTask.category
           };
        } else if (updatedTask.recurrence === 'None') {
           updatedTask.recurrenceTemplate = undefined;
        }

        return updatedTask;
      })
    );
  }

  completeTask(taskId: string, data: { focusScore?: number; reflection?: string; completionTime: string }) {
    this.tasksSignal.update(tasks => tasks.map(t => {
      if (t.id !== taskId) return t;

      // 1. Handle Recurring Task
      if (t.recurrence !== 'None') {
        const now = new Date();
        const todayStr = now.toLocaleDateString('en-CA'); // YYYY-MM-DD
        
        const historyEntry: TaskCompletion = {
          completedAt: new Date(data.completionTime).getTime(),
          occurrenceDate: todayStr, // Assuming completion is for "today's" instance
          focusScore: data.focusScore ?? t.focusScore,
          reflection: data.reflection || t.reflection,
          interruptions: t.interruptions,
          timeElapsed: t.totalTimeElapsed,
          subtasksSnapshot: (t.subtasks || []).map(s => ({ ...s })) // Save copy of current state
        };

        const template = t.recurrenceTemplate;

        return {
          ...t,
          // Reset State for next occurrence
          status: 'Backlog', // Reset to start
          totalTimeElapsed: '0',
          timerSessionCount: 0,
          interruptions: '',
          focusScore: undefined,
          reflection: undefined,
          // Add to history
          completionHistory: [historyEntry, ...(t.completionHistory || [])],
          // Reset subtasks if desired? Usually yes for recurring
          // Restore from template if available (Resetting edits made to the occurrence)
          ...(template ? {
             title: template.title,
             description: template.description,
             subtasks: template.subtasks.map(s => ({ ...s, id: crypto.randomUUID() })), // New IDs for new instance
             estimatedEffort: template.estimatedEffort,
             energyLevel: template.energyLevel,
             project: template.project,
             category: template.category
          } : {
             subtasks: t.subtasks.map(s => ({ ...s, completed: false, completedAt: undefined }))
          })
        };
      }

      // 2. Handle One-time Task
      return {
        ...t,
        status: 'Completed',
        focusScore: data.focusScore,
        reflection: data.reflection,
        completionTime: data.completionTime,
        completionHistory: [] // Ensure array exists
      };
    }));
  }

  deleteTask(id: string) {
    if (this.activeTaskId() === id) {
      this.stopTimer();
    }
    this.tasksSignal.update(tasks => tasks.filter(t => t.id !== id));
  }


  updateTaskCategory(id: string, newCategory: Task['category']) {
    this.updateTask(id, { category: newCategory });
  }

  reorderTasks(newOrder: Task[]) {
    this.tasksSignal.set(newOrder);
  }
  
  importTasks(tasks: any[]) {
    // Migration for imported tasks
    const migrated = tasks.map(t => {
      if (typeof t.subtasks === 'string') {
        return { ...t, subtasks: this.migrateSubtasksString(t.subtasks) };
      }
      return t;
    });
    this.tasksSignal.set(migrated);
  }

  // Shared Recurrence Logic
  isTaskOnDate(task: Task, date: Date): boolean {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);

    // 1. Non-recurring: Match Deadline Date
    if (task.recurrence === 'None') {
      if (!task.deadline) return false;
      const deadline = new Date(task.deadline);
      deadline.setHours(0, 0, 0, 0);
      return deadline.getTime() === checkDate.getTime();
    }

    // 2. Recurring: Match Pattern
    const startStr = task.startDate || (task.createdAt ? new Date(task.createdAt).toISOString() : null);
    if (!startStr) return false;

    const startDate = new Date(startStr);
    startDate.setHours(0, 0, 0, 0);

    // A. Before Start Date? -> No
    if (checkDate.getTime() < startDate.getTime()) return false;

    // B. After Series Deadline? -> No
    if (task.deadline) {
      const deadlineDate = new Date(task.deadline);
      deadlineDate.setHours(0, 0, 0, 0);
      if (checkDate.getTime() > deadlineDate.getTime()) return false;
    }

    const diffTime = checkDate.getTime() - startDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    switch (task.recurrence) {
      case 'Daily': return true;
      case 'Weekly': return diffDays % 7 === 0;
      case 'Bi-Weekly': return diffDays % 14 === 0;
      case 'Monthly': return checkDate.getDate() === startDate.getDate();
      default: return false;
    }
  }

  isOccurrenceCompleted(task: Task, date: Date): boolean {
    if (!task.completionHistory || task.completionHistory.length === 0) return false;
    
    // Compare YYYY-MM-DD
    // Adjust for local timezone to ensure "today" matches the stored string
    const dateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format in local time
    return task.completionHistory.some(h => h.occurrenceDate === dateStr);
  }

  // --- Timer Logic ---

  toggleTimer(taskId: string) {
    const activeId = this.activeTaskId();
    
    if (activeId === taskId) {
      this.stopTimer();
    } else {
      if (activeId) {
        this.stopTimer(); // Stop currently running if switching
      }
      this.startTimer(taskId);
    }
  }

  private startTimer(taskId: string) {
    this.activeTaskId.set(taskId);
    this.activeTimerStart.set(Date.now());
    this.playStartSound();
    
    // Increment session count and set status to In Progress
    this.tasksSignal.update(tasks => tasks.map(t => {
      if (t.id === taskId) {
        return {
          ...t,
          status: 'In Progress',
          timerSessionCount: (t.timerSessionCount || 0) + 1
        };
      }
      return t;
    }));
  }

  stopTimer() {
    const activeId = this.activeTaskId();
    const startTime = this.activeTimerStart();
    
    if (activeId && startTime) {
      const delta = Date.now() - startTime;
      
      this.tasksSignal.update(tasks => tasks.map(t => {
        if (t.id === activeId) {
          const currentTotal = parseInt(t.totalTimeElapsed || '0', 10);
          return {
            ...t,
            status: 'Paused',
            totalTimeElapsed: (currentTotal + delta).toString()
          };
        }
        return t;
      }));
    }

    this.activeTaskId.set(null);
    this.activeTimerStart.set(null);
  }

  private playSound(fileName: string, volume: number = 0.5) {
    // Use relative path 'assets/...' instead of '/assets/...' to avoid 404s on some server configs
    const path = `src/assets/sounds/${fileName}`;
    const audio = new Audio(path);
    audio.volume = volume;
    
    audio.play().catch(e => {
      console.warn(`Sound file ${path} failed (404 or permission). Playing fallback beep.`);
      this.playFallbackBeep();
    });
  }

  private playFallbackBeep() {
    // Generates a simple beep using browser Audio API (no assets required)
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) return;
      
      const ctx = new AudioContext();
      
      // Attempt to resume context if suspended (common in browsers)
      if (ctx.state === 'suspended') {
        ctx.resume().catch(e => console.warn('AudioContext resume failed', e));
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 tone
      gain.gain.setValueAtTime(0.5, ctx.currentTime); // Increased volume
      
      osc.start();
      osc.stop(ctx.currentTime + 0.5); // 200ms duration
    } catch (e) {
      console.error('Fallback beep failed', e);
    }
  }

  private playStartSound() {
    this.playSound('start-new-notification-022-370046.mp3', 0.5);
  }

  private playReminderSound() {
    console.log('Playing reminder sound');
    this.playSound('reminder-level-up.mp3', 1.0);
  }

  // Helper to format ms into HH:MM:SS
  formatDuration(ms: number): string {
    if (!ms || isNaN(ms)) return '00:00:00';
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  }
}