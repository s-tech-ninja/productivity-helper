import { Injectable, signal, computed, effect, inject } from '@angular/core';
import { IndexedDbService } from './indexed-db.service';

export interface Subtask {
  id: string;
  text: string;
  completed: boolean;
  notes?: string;
  completedAt?: number; // Timestamp
}

export type TaskStatus = 'Backlog' | 'In Progress' | 'Paused' | 'Completed' | 'Missed';

export interface TaskHistory {
  startDate: string;
  deadline: string;
  status: TaskStatus;
  subtasks: Subtask[];
  completionTime?: string;
  totalTimeElapsed?: string;
  timerSessionCount?: number;
  interruptions?: string;
  focusScore?: number;
  reflection?: string;
}

export interface TaskFormPreferences {
  showDescription: boolean;
  showProject: boolean;
  showTags: boolean;
  showEffort: boolean;
  showEnergy: boolean;
  showRecurrence: boolean;
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
  status: TaskStatus;
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
  history?: Record<string, TaskHistory>;
}

@Injectable({
  providedIn: 'root'
})
export class TaskService {
  private indexedDbService = inject(IndexedDbService);
  private isInitialized = false;
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
  private lastSessionHour = 0;
  // A signal that updates every second to trigger UI refresh for the timer
  readonly tick = signal<number>(Date.now());

  // Preferences
  readonly soundEnabled = signal<boolean>(true);
  readonly formPreferences = signal<TaskFormPreferences>({
    showDescription: true,
    showProject: true,
    showTags: true,
    showEffort: true,
    showEnergy: true,
    showRecurrence: true
  });

  private notifiedTaskIds = new Set<string>();
  private startedTaskIds = new Set<string>();

  readonly stats = computed(() => this.calculateStats(this.tasksSignal()));

  calculateStats(tasks: Task[]) {
    const activeTasks = tasks.filter(t => !t.archived);
    
    const total = activeTasks.length;
    const todayStr = new Date().toLocaleDateString('en-CA');
    
    const completed = activeTasks.filter(t => {
      if (t.status === 'Completed') return true;
      // Include recurring tasks that were completed today (even if status reset to Backlog)
      return t.recurrence !== 'None' && t.history?.[todayStr]?.status === 'Completed';
    }).length;
    
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
  }

  readonly projects = computed(() => {
    const tasks = this.tasksSignal();
    const uniqueProjects = new Set<string>();
    tasks.forEach(t => {
      if (t.project && t.project.trim()) {
        uniqueProjects.add(t.project.trim());
      }
    });
    return Array.from(uniqueProjects).sort();
  });

  // Streak: Consecutive days with at least one completed task
  readonly streak = computed(() => {
    const tasks = this.tasksSignal();
    
    const allTimestamps: number[] = [];

    tasks.forEach(t => {
      // 1. Standard Completed Tasks
      if (t.status === 'Completed' && t.completionTime) {
        allTimestamps.push(new Date(t.completionTime).getTime());
      }

      // 2. Recurring Task History
      if (t.history) {
        Object.values(t.history).forEach(h => {
          if (h.status === 'Completed' && h.completionTime) {
            allTimestamps.push(new Date(h.completionTime).getTime());
          }
        });
      }
    });

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
      // Recurring Task Logic
      if (t.recurrence !== 'None') {
        if (this.isTaskOnDate(t, today)) {
           // Check if completed today
           const dateStr = today.toLocaleDateString('en-CA');
           if (t.history?.[dateStr]?.status === 'Completed') {
             continue;
           }

           // Check Time relative to Today
           if (t.deadline) {
             const deadlineDate = new Date(t.deadline);
             const dueTimeToday = new Date(today);
             dueTimeToday.setHours(deadlineDate.getHours(), deadlineDate.getMinutes(), deadlineDate.getSeconds(), deadlineDate.getMilliseconds());
             
             if (dueTimeToday.getTime() < now) {
               overdue.push(t);
             } else {
               endingToday.push(t);
             }
           } else {
             endingToday.push(t);
           }
        }
        continue;
      }
      
      // Non-Recurring Logic
      if (t.deadline && new Date(t.deadline).getTime() < now) {
        overdue.push(t);
        continue;
      }
      
      if (this.isTaskOnDate(t, today)) {
        endingToday.push(t);
      }
    }

    return { endingToday, overdue };
  });

  readonly notificationCount = computed(() => this.notifications().endingToday.length + this.notifications().overdue.length);

  constructor() {
    this.loadFromStorage();
    this.loadTimerState();
    this.loadPreferences();

    // Auto-save whenever tasks change
    effect(() => {
      const tasks = this.tasksSignal();
      if (this.isInitialized) {
        this.indexedDbService.saveAllTasks(tasks).catch(err => console.error('Save failed', err));
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

    // Auto-save preferences
    effect(() => {
      localStorage.setItem('productivity_flow_sound', JSON.stringify(this.soundEnabled()));
      localStorage.setItem('productivity_flow_form_prefs', JSON.stringify(this.formPreferences()));
    });

    // 1. Secs Timer - for clock on task has started
    this.secondsTimer = setInterval(() => {
      if (this.activeTaskId()) {
        const start = this.activeTimerStart();
        if (start) {
          const duration = Date.now() - start;
          const currentHour = Math.floor(duration / 3600000); // 3600000 ms = 1 hour
          if (currentHour > this.lastSessionHour) {
            this.playBellSound();
            this.lastSessionHour = currentHour;
          }
        }
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

  private loadPreferences() {
    const sound = localStorage.getItem('productivity_flow_sound');
    if (sound !== null) this.soundEnabled.set(JSON.parse(sound));

    const formPrefs = localStorage.getItem('productivity_flow_form_prefs');
    if (formPrefs) {
      this.formPreferences.set({ ...this.formPreferences(), ...JSON.parse(formPrefs) });
    }
  }

  toggleSound() {
    this.soundEnabled.update(v => !v);
  }

  updateFormPreference(key: keyof TaskFormPreferences, value: boolean) {
    this.formPreferences.update(p => ({ ...p, [key]: value }));
  }

  private checkUpcomingTasks() {

    const now = Date.now();
    const fifteenMins = 15 * 60 * 1000;
    const hasNotificationPermission = 'Notification' in window && Notification.permission === 'granted';
    const updates = new Map<string, Partial<Task>>();

    this.tasksSignal().forEach(t => {
      // --- 1. RECURRING TASK MAINTENANCE ---
      if (t.recurrence !== 'None' && !t.archived) {
         // Fix "Stuck Completed" state
         // Recurring tasks should never remain in 'Completed' status in the main list.
         // They should be reset to 'Backlog' for the next occurrence.
         if (t.status === 'Completed') {
            updates.set(t.id, {
               status: 'Backlog',
               subtasks: (t.subtasks || []).map(s => ({ ...s, completed: false, completedAt: undefined })),
               totalTimeElapsed: '0',
               timerSessionCount: 0,
               interruptions: '',
               focusScore: undefined,
               reflection: undefined,
               completionTime: undefined
            });
         }
      }

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

    // Apply Batch Updates
    if (updates.size > 0) {
       this.tasksSignal.update(tasks => tasks.map(t => {
          if (updates.has(t.id)) {
             return { ...t, ...updates.get(t.id) };
          }
          return t;
       }));
    }
  }

  private async loadFromStorage() {
    try {
      let rawTasks = await this.indexedDbService.getAllTasks();

      // Migration: If DB is empty, try to load from LocalStorage
      if (rawTasks.length === 0) {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (Array.isArray(parsed)) rawTasks = parsed;
          } catch (e) {
            console.error('LocalStorage parse error', e);
          }
        }
      }

      if (rawTasks.length > 0) {
        // Data Migration: Convert legacy string subtasks to Subtask[]
        const processedTasks = rawTasks.map((t: any) => {
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
           if ((t as any).location) {
             if (!t.tags || t.tags.length === 0) {
                t.tags = [(t as any).location];
             }
             delete (t as any).location;
           }
           if (!t.tags) t.tags = [];
           if (!t.recurrence) t.recurrence = 'None';
           if (!t.history || Array.isArray(t.history)) t.history = {};
           
           return t;
        });

        this.tasksSignal.set(processedTasks);
      } else {
        this.seedInitialData();
      }
    } catch (e) {
      console.error('Failed to load tasks from DB', e);
      this.seedInitialData();
    } finally {
      this.isInitialized = true;
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
        history: {}
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
      history: {}
    };

    this.tasksSignal.update(tasks => [newTask, ...tasks]);
  }

  updateTask(id: string, updates: Partial<Task>, dateContext?: string) {
    this.tasksSignal.update(tasks => 
      tasks.map(t => {
        if (t.id !== id) return t;

        // Handle Recurring Task Updates (Copy-on-Write to History)
        if (t.recurrence !== 'None') {
           const dateKey = dateContext || new Date().toLocaleDateString('en-CA');
           
           // Separate Global (Template) vs Instance (History) updates
           const globalKeys = ['title', 'description', 'category', 'project', 'energyLevel', 'tags', 'estimatedEffort', 'recurrence', 'archived'];
           
           // Heuristic: If updating global keys, it's a form save -> Preserve history state.
           // If NOT updating global keys (just subtasks), it's a detail view toggle -> Overwrite history state.
           const isStructuralUpdate = Object.keys(updates).some(k => globalKeys.includes(k));

           const globalUpdates: any = {};
           const instanceUpdates: any = {};

           Object.keys(updates).forEach(key => {
             if (globalKeys.includes(key)) {
               globalUpdates[key] = (updates as any)[key];
             } else if (key === 'subtasks') {
               // Subtasks: Update Instance (as-is) AND Global (sanitized structure)
               
               // Merge Logic: Preserve completion/notes from history if ID matches
               // This allows editing the template (text/order) without resetting daily progress
               const incomingSubtasks = (updates as any)[key] as Subtask[];
               const existingHistory = t.history?.[dateKey];
               
               // Only merge (preserve existing completion) if it's a structural update (Edit Form)
               // Otherwise (Detail View), trust the incoming subtasks which have the new toggled state.
               if (isStructuralUpdate && existingHistory && existingHistory.subtasks) {
                 instanceUpdates[key] = incomingSubtasks.map(newSub => {
                   const existingSub = existingHistory.subtasks.find(s => s.id === newSub.id);
                   if (existingSub) {
                     return { ...newSub, completed: existingSub.completed, completedAt: existingSub.completedAt, notes: existingSub.notes || newSub.notes };
                   }
                   return newSub;
                 });
               } else {
                 instanceUpdates[key] = incomingSubtasks;
               }
               
               // Update main task template with new structure, but reset completion
               if (Array.isArray((updates as any)[key])) {
                 globalUpdates[key] = (updates as any)[key].map((s: Subtask) => ({
                   ...s,
                   completed: false,
                   completedAt: undefined
                 }));
               }
             } else {
               instanceUpdates[key] = (updates as any)[key];
             }
           });

           // Get existing history or create FRESH entry from template
           const existingHistory = t.history?.[dateKey];
           let historyEntry: TaskHistory;

           if (existingHistory) {
             historyEntry = { ...existingHistory, ...instanceUpdates };
           } else {
             // Create Fresh Entry (Reset status/subtasks for the new day)
             historyEntry = {
               status: 'Backlog',
               subtasks: (t.subtasks || []).map(s => ({ ...s, completed: false, completedAt: undefined })),
               totalTimeElapsed: '0',
               timerSessionCount: 0,
               ...instanceUpdates // Apply the specific change (e.g. checking a box)
             };
           }

           return { ...t, ...globalUpdates, history: { ...(t.history || {}), [dateKey]: historyEntry } };
        }

        return { ...t, ...updates };
      })
    );
  }

  completeTask(taskId: string, data: { focusScore?: number; reflection?: string; completionTime: string }) {
    if (this.activeTaskId() === taskId) {
      this.stopTimer();
    }

    this.tasksSignal.update(tasks => tasks.map(t => {
      if (t.id !== taskId) return t;

      // Handle Recurring Task
      if (t.recurrence !== 'None') {
        const today = new Date();
        const isOccurrenceToday = this.isTaskOnDate(t, today);

        if (isOccurrenceToday) {
          const dateKey = today.toLocaleDateString('en-CA');
          const existingHistory = t.history?.[dateKey];
          
          // Ensure subtasks are marked as completed in the history snapshot
          // We prioritize existing history (actual progress) over the template
          const rawSubtasks = existingHistory?.subtasks || t.subtasks || [];
          const completedSubtasks = rawSubtasks.map(s => ({
            ...s,
            completed: true,
            completedAt: s.completedAt || Date.now()
          }));
          
          // 1. Save to History
          const historyEntry: TaskHistory = {
            // Defaults from template
            startDate: t.startDate,
            deadline: t.deadline,
            totalTimeElapsed: '0',
            timerSessionCount: 0,
            interruptions: '',
            
            ...(existingHistory || {}), // Overlay existing progress (time, interruptions, etc.)
            
            status: 'Completed',
            subtasks: completedSubtasks,
            completionTime: data.completionTime,
            focusScore: data.focusScore,
            reflection: data.reflection
          };

          return {
            ...t,
            status: 'Backlog', // Reset status immediately for next occurrence
            subtasks: (t.subtasks || []).map(s => ({ ...s, completed: false, completedAt: undefined })), // Reset subtasks
            totalTimeElapsed: '0', // Reset timer
            timerSessionCount: 0,
            interruptions: '',
            completionTime: undefined, // Clear main task completion details
            focusScore: undefined,
            reflection: undefined,
            history: { ...(t.history || {}), [dateKey]: historyEntry }
          };
        } else {
          return {
            ...t,
            status: 'Completed',
            focusScore: data.focusScore,
            reflection: data.reflection,
            completionTime: data.completionTime
          };
        }
      }

      return {
        ...t,
        status: 'Completed',
        focusScore: data.focusScore,
        reflection: data.reflection,
        completionTime: data.completionTime
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

    if (this.tasksSignal().length > 0) {
      const replace = confirm('Existing tasks found. Do you want to replace them?\n\nOK = Replace All\nCancel = Append Imported Tasks');
      if (replace) {
        this.tasksSignal.set(migrated);
      } else {
        // Append: Regenerate IDs to avoid conflicts
        const toAppend = migrated.map(t => ({
          ...t,
          id: crypto.randomUUID()
        }));
        this.tasksSignal.update(current => [...current, ...toAppend]);
      }
    } else {
      this.tasksSignal.set(migrated);
    }
  }

  // Shared Recurrence Logic
  isTaskOnDate(task: Task, date: Date): boolean {
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    const checkTime = checkDate.getTime();

    // Check history for recurring tasks to ensure they show up on past/current dates if completed
    if (task.recurrence !== 'None' && task.history) {
      const dateStr = checkDate.toLocaleDateString('en-CA');
      if (task.history[dateStr]) {
        return true;
      }
    }

    let startTime: number | null = null;
    let startDateObj: Date | null = null;
    if (task.startDate) {
      startDateObj = new Date(task.startDate);
      if (!isNaN(startDateObj.getTime())) {
        startDateObj.setHours(0, 0, 0, 0);
        startTime = startDateObj.getTime();
      }
    }

    let endTime: number | null = null;
    if (task.deadline) {
      const end = new Date(task.deadline);
      if (!isNaN(end.getTime())) {
        end.setHours(0, 0, 0, 0);
        endTime = end.getTime();
      }
    }

    // 1. Non-recurring or Invalid Start (Treat as Span)
    if (task.recurrence === 'None' || !startTime || !startDateObj) {
      if (startTime !== null && endTime !== null) {
        return checkTime >= startTime && checkTime <= endTime;
      }
      if (endTime !== null) return checkTime === endTime;
      if (startTime !== null) return checkTime === startTime;
      return false;
    }

    // 2. Recurring Logic
    // Must be within range [Start, End]
    if (checkTime < startTime) return false;
    if (endTime !== null && checkTime > endTime) return false;

    const diffTime = checkTime - startTime;
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    switch (task.recurrence) {
      case 'Daily': return true;
      case 'Weekly': return diffDays % 7 === 0;
      case 'Bi-Weekly': return diffDays % 14 === 0;
      case 'Monthly': return checkDate.getDate() === startDateObj.getDate();
      default: return false;
    }
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
    this.lastSessionHour = 0;
    this.playStartSound();
    
    // Increment session count and set status to In Progress
    this.tasksSignal.update(tasks => tasks.map(t => {
      if (t.id === taskId) {
        // Handle Recurring Task: Update History for Today
        if (t.recurrence !== 'None') {
           const dateKey = new Date().toLocaleDateString('en-CA');
           const existingHistory = t.history?.[dateKey];
           let historyEntry: TaskHistory;

           if (existingHistory) {
             historyEntry = { 
               ...existingHistory, 
               status: 'In Progress',
               timerSessionCount: (existingHistory.timerSessionCount || 0) + 1
             };
           } else {
             // Create Fresh Entry if starting timer for the first time today
             historyEntry = {
               startDate: t.startDate,
               deadline: t.deadline,
               status: 'In Progress',
               subtasks: (t.subtasks || []).map(s => ({ ...s, completed: false, completedAt: undefined })),
               totalTimeElapsed: '0',
               timerSessionCount: 1,
               completionTime: undefined
             };
           }
           return { ...t, history: { ...(t.history || {}), [dateKey]: historyEntry } };
        }

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
          // Handle Recurring Task: Update History for Today
          if (t.recurrence !== 'None') {
             const dateKey = new Date().toLocaleDateString('en-CA');
             const existingHistory = t.history?.[dateKey];
             let historyEntry: TaskHistory;

             if (existingHistory) {
               const currentTotal = parseInt(existingHistory.totalTimeElapsed || '0', 10);
               historyEntry = { 
                 ...existingHistory, 
                 status: 'Paused',
                 totalTimeElapsed: (currentTotal + delta).toString()
               };
             } else {
               // Fallback if history missing (rare for stopTimer)
               historyEntry = {
                 startDate: t.startDate,
                 deadline: t.deadline,
                 status: 'Paused',
                 subtasks: (t.subtasks || []).map(s => ({ ...s, completed: false, completedAt: undefined })),
                 totalTimeElapsed: delta.toString(),
                 timerSessionCount: 0,
                 completionTime: undefined
               };
             }
             return { ...t, history: { ...(t.history || {}), [dateKey]: historyEntry } };
          }

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
    if (!this.soundEnabled()) return;

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

  private playBellSound() {
    this.playSound('bell-ring.mp3', 0.8); // Assuming a bell sound exists or fallback
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

  private addInterval(dateStr: string, recurrence: string): string {
    if (!dateStr) return dateStr;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;

    switch (recurrence) {
      case 'Daily': d.setDate(d.getDate() + 1); break;
      case 'Weekly': d.setDate(d.getDate() + 7); break;
      case 'Bi-Weekly': d.setDate(d.getDate() + 14); break;
      case 'Monthly': d.setMonth(d.getMonth() + 1); break;
    }
    
    // Format back to YYYY-MM-DDTHH:mm (Local time)
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
}