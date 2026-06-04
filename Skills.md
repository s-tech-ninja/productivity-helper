# ProductivityFlow - Skill Graph & Architecture Master Plan

**Version:** 0.0.3  
**Framework:** Angular 21  
**Language:** TypeScript  
**Build Tool:** Angular CLI  
**Storage:** IndexedDB + localStorage  
**Deployment:** GitHub Pages  

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Tech Stack](#tech-stack)
3. [New Architecture & Structure](#new-architecture--structure)
4. [Architecture Overview](#architecture-overview)
5. [Core Services](#core-services)
5. [Component Hierarchy](#component-hierarchy)
6. [Data Models](#data-models)
7. [Key Features](#key-features)
8. [Storage & Persistence](#storage--persistence)
9. [State Management](#state-management)
10. [Development Guidelines](#development-guidelines)
11. [Refactoring Roadmap](#refactoring-roadmap)

---

## 🎯 Project Overview

**ProductivityFlow** is an advanced, privacy-first task management dashboard with integrated:
- **Smart task management** (3-tier prioritization, energy-based planning)
- **Focus & time tracking** (pomodoro-style timers, session tracking)
- **Intelligent notifications** (15-min before deadline, audio cues)
- **Analytics dashboard** (velocity metrics, project time tracking)
- **Diary/reflection system** (daily notes, task reflections)
- **AI-powered insights** (prompt generation for ChatGPT/Claude analysis)
- **Multiple view modes** (Board/Kanban, List, Calendar, Analytics, History)

**Core Philosophy:**
- ✅ Privacy-first: All data stored locally in browser
- ✅ Reactive architecture using Angular Signals
- ✅ Standalone components (Angular 21+)
- ✅ Dark mode support
- ✅ Rich text editing with CKEditor5

---

## 🏛 New Architecture & Structure

As of May 2026, the project has been refactored from a flat structure to a **scalable, modular architecture**.

### File Structure

```
src/
├── app/                    # Root component
├── core/                   # Foundation services & models
├── shared/                 # Reusable components & utilities
├── features/               # Feature modules
│   ├── tasks/
│   ├── projects/
│   ├── analytics/
│   ├── diary/
│   ├── scheduler/
│   ├── planning-ai/
│   ├── reflection-ai/
│   └── settings/
├── ai/                     # AI/LLM integration
├── state/                  # State management
├── storage/                # Data persistence
└── assets/                 # Static files
```

### Module Organization

| Module | Purpose | Visibility | Key Files |
|--------|---------|------------|-----------|
| **app** | Root app setup | Public | app.component.ts |
| **core** | Foundation layer | Private | task.service, theme.service, markdown.service |
| **shared** | Reusable components | Public | icon, wysiwyg-editor, modals |
| **features** | Feature logic | Private | views, components, services |
| **ai** | AI integration | Semi-Public | prompt.service, schemas |
| **storage** | Data persistence | Private | indexed-db, repositories, migrations |
| **state** | State management | Public | store definitions |

### Benefits of New Structure

- **Scalability**: Add features without affecting existing code
- **Maintainability**: Clear separation of concerns
- **Testability**: Isolated modules are easier to test
- **Discoverability**: Easy to find related code
- **Collaboration**: Multiple developers can work without conflicts
- **Performance**: Enables lazy-loading and tree-shaking

### Migration Notes

All imports have been updated to reflect the new paths:
- `from '../../services/task.service'` → `from '../../../../core/services/task.service'`
- Barrel exports (index.ts) provide clean import paths
- Use path aliases in tsconfig.json for even cleaner imports

---

### Frontend Framework
- **Angular 21.2.0** - Standalone components, Signals API
- **TypeScript** - Type-safe development
- **RxJS 7.8.2** - Reactive programming (limited use, mostly Signals)
- **Tailwind CSS** - Utility-first styling
- **Angular Forms** - Reactive forms (FormBuilder)

### Rich Text Editing
- **CKEditor5 11.0.1** - WYSIWYG editor with multiple plugins
- **CKEditor5 plugins:**
  - Alignment, Basic Styles, Block Quote
  - Code Block, Classic Editor, Essentials
  - Font, Heading, Highlight, Image, Link
  - List, Media Embed, Paragraph, Remove Format
  - Table, Theme Lark, Upload

### Data Storage & Persistence
- **Dexie.js 4.3.0** - IndexedDB wrapper (tasks, diary entries)
- **localStorage** - Session state, preferences, timer state
- **IndexedDB** - Persistent data storage

### Build & Deployment
- **@angular/build** - Application builder
- **@angular/cli** - Command-line tools
- **Vite** - Development server optimization
- **Docker** - Development containerization

### Development Tools
- **@types/node** - Node.js type definitions
- **TypeScript compiler** - Code compilation
- **Tailwind CSS CLI** - Style generation

---

## 🏗 Architecture Overview

The project now follows a **scalable, modular architecture** with clear separation of concerns:

```
src/
├── app/          # Root component & main app setup
├── core/         # Shared services, models, guards, interceptors
├── shared/       # Reusable components, pipes, directives, validators
├── features/     # Feature modules (tasks, projects, analytics, etc.)
├── ai/           # AI/LLM integration
├── state/        # State management (Signals-based)
├── storage/      # Data persistence (IndexedDB, repositories, migrations)
└── assets/       # Static files, images, sounds
```

### Design Patterns Used

**1. Modular Architecture**
- Core layer: Application foundation
- Shared layer: Reusable components
- Features layer: Domain-specific functionality
- Clear dependency direction: Features → Shared → Core

**2. Signals-based State Management**
- Source of truth: `TaskService.tasksSignal`
- Computed signals for derived state
- Effect hooks for side effects (persistence, timers)

**3. Standalone Components**
- Self-contained components with imports declared
- Minimal dependency injection
- Tree-shakable architecture

**4. Barrel Exports** (index.ts files)
- Cleaner imports: `import { TaskService } from '@core/services'`
- Encapsulation of internal structure
- Easy refactoring without breaking consumers

**5. Layered Storage**
- Signals (in-memory, reactive)
- localStorage (session state)
- IndexedDB (persistent storage)
- Repository pattern (future)

---

## 🔧 Core Services

### 1. **TaskService** (`task.service.ts`)
**Responsibility:** Task CRUD, timer management, state persistence

**Key Signals:**
- `tasksSignal` - Array of all tasks
- `activeTaskId` - Currently running timer task
- `activeTimerStart` - Timer start timestamp
- `tick` - Updates every second for UI refresh
- `soundEnabled` - Global sound toggle
- `soundPreferences` - Fine-grained audio settings
- `formPreferences` - Task form visibility preferences

**Key Computed:**
- `stats` - Dashboard statistics (total, completed, by category, etc.)
- `streak` - Consecutive days with completed tasks

**Key Methods:**
```typescript
// Task Management
addTask(task: Task): void
updateTask(id: string, updates: Partial<Task>): void
deleteTask(id: string): void
archiveTask(id: string): void
restoreTask(id: string): void

// Timer Control
startTimer(taskId: string): void
stopTimer(): void
pauseTimer(): void
resetTimer(): void

// History Tracking
recordTaskCompletion(taskId: string, dateKey: string, history: TaskHistory): void
getTaskHistory(taskId: string, dateKey: string): TaskHistory | undefined

// Preferences
setSoundEnabled(enabled: boolean): void
updateSoundPreferences(prefs: SoundPreferences): void
updateFormPreferences(prefs: TaskFormPreferences): void

// Data Migration
private migrateData(): void
```

**Dependencies:**
- IndexedDbService
- MarkdownService
- localStorage

**Storage Keys:**
- `productivity_flow_tasks` - Serialized tasks
- `productivity_flow_timer_state` - Active timer data
- `productivity_flow_config` - User preferences

---

### 2. **IndexedDbService** (`indexed-db.service.ts`)
**Responsibility:** Async data persistence with Dexie ORM

**Database Schema:**
```
Database: 'productivity_flow_db'
├── Version 2 (Current)
├── Table: tasks (keyPath: 'id')
│   └── Stores: Task[] objects
└── Table: diary (keyPath: 'id')
    └── Stores: DiaryEntry[] objects
```

**Key Methods:**
```typescript
async getAllTasks(): Promise<Task[]>
async saveAllTasks(tasks: Task[]): Promise<void>
async getAllDiaryEntries(): Promise<DiaryEntry[]>
async saveDiaryEntry(entry: DiaryEntry): Promise<void>
async deleteDiaryEntry(id: string): Promise<void>
```

**Data Interfaces:**
```typescript
interface DiaryEntry {
  id: string;           // UUID
  date: string;         // ISO string
  title: string;        // Entry title
  content: string;      // Markdown/HTML
  archived: boolean;    // Soft delete
  updatedAt: number;    // Unix timestamp
}
```

**Usage Pattern:**
- TaskService loads data on initialization
- Effect hook syncs changes to IndexedDB
- Automatic transaction management

---

### 3. **ThemeService** (`theme.service.ts`)
**Responsibility:** Dark/light mode management

**Key Signal:**
- `isDarkMode` - Current theme preference

**Storage:**
- localStorage key: `theme` (values: 'dark' | 'light')
- Fallback to system preference via `prefers-color-scheme` media query

**Implementation:**
```typescript
constructor() {
  const stored = localStorage.getItem('theme');
  if (stored) {
    this.isDarkMode.set(stored === 'dark');
  } else {
    this.isDarkMode.set(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  
  effect(() => {
    const isDark = this.isDarkMode();
    const html = document.documentElement;
    if (isDark) {
      html.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      html.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  });
}
```

**Tailwind Integration:**
- `.dark` class on `<html>` enables dark mode
- All components use `dark:` prefix for dark mode styles

---

### 4. **DashboardAnalyticsService** (`dashboard-analytics.service.ts`)
**Responsibility:** Metrics calculation, velocity tracking, time analytics

**Key Signal:**
- `range` - Analytics time range ('daily' | 'weekly' | 'monthly' | 'all')

**Key Computed:**
- `velocityMetrics` - Task creation/completion velocity over time
- `projectTimeMetrics` - Time spent per project
- `energyDistribution` - Tasks by energy level
- `categoryBreakdown` - Tasks by priority category

**Data Interfaces:**
```typescript
interface DailyVelocity {
  date: string;        // ISO date or month
  label: string;       // Display label (e.g., "Mon", "W23")
  created: number;     // Tasks created
  completed: number;   // Tasks completed
}

interface ProjectTime {
  project: string;     // Project name
  minutes: number;     // Total time spent
}
```

**Key Methods:**
```typescript
private addToBucket(map: Map, dateStr, field, rangeType): void
private formatDate(d: Date): string
private getWeekNumber(d: Date): number
```

**Calculation Strategies:**
- Buckets tasks by time range (daily/weekly/monthly)
- Includes history data for recurring task completions
- Handles edge cases (no deadline, future tasks)

---

### 5. **MarkdownService** (`markdown.service.ts`)
**Responsibility:** Markdown to HTML conversion with safe rendering

**Features:**
- Code block protection
- Math block support (placeholder-based)
- Headers, blockquotes, lists (unordered/ordered)
- Task lists (checkboxes)
- Tables with alignment (GFM)
- Admonitions (note, warning, info blocks)
- Inline formatting (bold, italic, code, links)
- Image rendering with alt text

**Key Methods:**
```typescript
parse(markdown: string): string
private protectBlocks(html: string): string
private parseInline(text: string): string
private unprotectBlocks(html: string): string
```

**Unsafe HTML Handling:**
- Sanitized via Angular's innerHTML binding with DomSanitizer
- Code blocks escaped to prevent XSS

---

### 6. **AiPromptService** (`ai-prompt.service.ts`)
**Responsibility:** Generate analytical prompts for AI analysis

**Key Methods:**
```typescript
generatePrompts(tasks: Task[]): AiPrompt[]
private formatMs(ms: string | number): string
```

**Generated Prompts:**
1. **Strategic Scheduling** - Eisenhower Matrix-style prioritization
2. **Time Audit** - Estimation bias analysis
3. **Task Decomposition** - Break complex tasks into subtasks
4. **Burnout Risk Check** - Workload analysis
5. **Focus Pattern Analysis** - Energy/time correlation
6. **Deadline Risk** - Upcoming deadline warnings

**Usage:**
- User copies prompts to ChatGPT/Claude
- Pre-formatted JSON context with minimal token overhead
- Short IDs and simplified data for efficiency

---

## 🎨 Component Hierarchy

### New Modular Structure

**Core Module** (`src/core/`)
- **Services**: TaskService, ThemeService, MarkdownService
- **Models**: Task, Subtask, Preferences interfaces
- **Utils/Guards/Interceptors**: Foundation utilities

**Shared Module** (`src/shared/`)
- **Components**: IconComponent, WysiwygEditorComponent, Modal components
- **Pipes**: MarkdownPipe
- **Directives & Validators**: (Expandable)

**Features Module** (`src/features/`)
- **tasks/**: Dashboard, TaskForm, TaskDetail, CompletionModal
- **projects/**: ProjectAnalysis, ProjectView
- **analytics/**: AnalyticsView
- **diary/**: DiaryView
- **scheduler/**: CalendarView
- **planning-ai/**: PlanningAiView (formerly ai-view1)
- **reflection-ai/**: ReflectionAiView (future)
- **settings/**: Settings components

**AI Module** (`src/ai/`)
- **Services**: PromptService (formerly AiPromptService)
- **Prompts/Schemas/Parsers**: AI utilities

**Storage Module** (`src/storage/`)
- **Dexie**: IndexedDbService
- **Repositories**: Future data access layer
- **Migrations**: Schema versioning

**State Module** (`src/state/`)
- **Stores**: task.store.ts, ai.store.ts (future), planner.store.ts (future)

**App Module** (`src/app/`)
- **Root Component**: app.component.ts/html with view routing and modal management
**Scope:** View routing, modal state, global shortcuts

**Key Signals:**
- `currentView` - Active view ('dashboard', 'tasks', 'calendar', 'analytics', 'diary', 'ai-features', 'project-view', 'project-analysis')
- `isSidebarOpen` - Mobile sidebar toggle
- `selectedTaskId` - Active task detail panel
- `selectedTaskDate` - Context date for task history
- `isAuthModalOpen`, `isTaskFormOpen`, `isHelpOpen`, `isSettingsOpen`, `isDeleteModalOpen`
- `taskToEdit` - Task being edited

**Computed:**
- `activeTask` - Resolved task with history context

**Child Components (Direct imports):**
- Views: DashboardViewComponent, CalendarViewComponent, AnalyticsViewComponent, DiaryViewComponent, AiFeaturesViewComponent, ProjectAnalysisViewComponent, ProjectViewComponent
- Modals: AuthModalComponent, TaskFormComponent, CompletionModalComponent, ConfirmationModalComponent, TaskDetailComponent, SettingsModalComponent, HelpComponent
- Utilities: IconComponent, DatePipe

---

### 🖼 View Components

#### **1. DashboardViewComponent** (`dashboard-view/dashboard-view.component.ts`)
**Inputs:** view (type of dashboard: 'dashboard', 'tasks', 'history', 'tasks-completed', 'tasks-not-completed')  
**Outputs:** triggerEdit, triggerComplete, triggerDelete, triggerDetail, triggerNavigate

**Features:**
- Board view (Kanban-style with drag-and-drop)
- List view (table/row layout)
- Search functionality (text filtering)
- Filter by date range (Today, This Week, This Month)
- Dynamic stats calculation
- Streak display

**Key Signals:**
- `dashboardTab` - 'board' | 'list'
- `searchQuery` - Text filter
- `selectedDateRange` - Filter by time period

**Key Computed:**
- `filteredTasks` - Filtered by view, date range, search
- `stats` - Specific to filtered tasks

---

#### **2. CalendarViewComponent** (`calendar-view/calendar-view.component.ts`)
**Features:**
- Month/week view calendar
- Task status indicators
- Click to navigate dates
- Task preview on date hover

---

#### **3. AnalyticsViewComponent** (`analytics-view/analytics-view.component.ts`)
**Features:**
- Velocity charts (created vs completed)
- Project time breakdown
- Energy level distribution
- Category breakdown
- Range selector (daily/weekly/monthly/all)

**Dependency:** DashboardAnalyticsService

---

#### **4. DiaryViewComponent** (`diary-view/diary-view.component.ts`)
**Features:**
- Daily diary entries
- Rich text editing (CKEditor5)
- Archive entries
- Date-based filtering
- Task reflection integration

**Storage:** IndexedDB (diary table)

---

#### **5. ProjectAnalysisViewComponent** (`project-analysis/project-analysis-view.component.ts`)
**Features:**
- Project-level analytics
- Task completion rates by project
- Time tracking by project
- Resource allocation visualization

---

#### **6. ProjectViewComponent** (`project-view/project-view.component.ts`)
**Features:**
- Project detail view
- Tasks grouped by project
- Project status dashboard
- Team/individual contribution tracking

---

#### **7. AiFeaturesViewComponent** (`ai-view1/ai-features-view.component.ts`)
**Features:**
- AI prompt generation
- ChatGPT/Claude integration guidance
- Task analysis suggestions
- Burnout risk assessment

**Dependency:** AiPromptService

---

### 🔲 Modal Components

#### **1. AuthModalComponent** (`auth-modal/auth-modal.component.ts`)
**Purpose:** User authentication/authorization (future feature)

---

#### **2. TaskFormComponent** (`task-form/task-form.component.ts`)
**Inputs:** taskToEdit (Task | null for create vs edit)  
**Outputs:** cancel

**Features:**
- Complete task creation/editing form
- Dynamic form field visibility (via formPreferences)
- Subtask management (add/remove/edit)
- Rich text description editor (CKEditor5)
- Effort estimation (hours + minutes)
- Date pickers for start date and deadline
- Category, energy level, recurrence selection
- Project and tags input

**Form Groups:**
```typescript
taskForm = this.fb.group({
  title: [required],
  description: [],
  category: [required],
  project: [],
  startDate: [],
  deadline: [required],
  estimatedEffort: [],
  energyLevel: [default: 'Medium'],
  recurrence: [default: 'None'],
  subtasks: [array],
  status: [default: 'Backlog'],
  archived: [default: false],
  // Phase 2 fields:
  completionTime: [],
  totalTimeElapsed: [],
  timerSessionCount: [],
  interruptions: [],
  focusScore: [1-5],
  reflection: []
})
```

---

#### **3. CompletionModalComponent** (`completion-modal/completion-modal.component.ts`)
**Purpose:** Mark task as completed, record metrics

**Features:**
- Completion time recording
- Subtask verification
- Interruption notes
- Focus score (1-5)
- Post-task reflection
- Timer session summary

---

#### **4. ConfirmationModalComponent** (`confirmation-modal/confirmation-modal.component.ts`)
**Purpose:** Generic confirmation dialog

---

#### **5. TaskDetailComponent** (`task-detail/task-detail.component.ts`)
**Purpose:** View/edit active task in side panel

**Features:**
- Detailed task information
- Real-time timer display
- Subtask checklist
- History view by date
- Quick edit mode
- Timer control buttons

---

#### **6. SettingsModalComponent** (`settings-modal/settings-modal.component.ts`)
**Purpose:** User preferences and configuration

**Features:**
- Sound preferences (startup, session, reminder, eye protection)
- Form field visibility toggle
- Theme selection
- Export/Import data
- Data reset option
- Backup management

---

#### **7. HelpComponent** (`help-modal/help-modal.component.ts`)
**Purpose:** Help and keyboard shortcuts

---

### 🔧 Utility Components

#### **IconComponent** (`icons/icon.component.ts`)
**Purpose:** Reusable SVG icon rendering

**Input:** icon (string name)  
**Features:** Dynamic SVG loading, size customization

---

#### **WysiwygEditorComponent** (`sub-components/wysiwyg-editor/wysiwyg-editor.component.ts`)
**Purpose:** CKEditor5 wrapper for rich text editing

**Features:**
- Full formatting support
- Image/media embedding
- Table insertion
- Code block highlighting
- Custom styling

---

#### **MarkdownPipe** (`pipes/markdown.pipe.ts`)
**Purpose:** Transform markdown to sanitized HTML in templates

**Usage:** `{{ markdownContent | markdown }}`

---

## 📊 Data Models

### **Task Model**
```typescript
interface Task {
  // Identity & Metadata
  id: string;                                    // UUID
  createdAt: number;                            // Unix timestamp
  archived: boolean;                            // Soft delete flag
  
  // Planning Phase (Core)
  title: string;                                // Task name (required)
  description?: string;                         // Markdown/HTML
  category: 'Super Important' | 'Important' | 'Less Important'  // Priority
  project: string;                              // Project name
  startDate: string;                            // ISO date
  deadline: string;                             // ISO date (required)
  estimatedEffort: string;                      // "1h 30m" format
  energyLevel: 'High' | 'Medium' | 'Low'       // Required mental energy
  recurrence: 'None' | 'Daily' | 'Weekly' | 'Bi-Weekly' | 'Monthly'
  tags: string[];                               // Context/location tags
  
  // Execution Phase
  subtasks: Subtask[];                         // Structured checklist
  status: TaskStatus;                          // Current state
  
  // Tracking Phase (Populated after completion)
  completionTime?: string;                     // ISO timestamp
  totalTimeElapsed?: string;                   // "2h 15m" format
  timerSessionCount?: number;                  // Number of pomodoro sessions
  interruptions?: string;                      // Notes on interruptions
  focusScore?: number;                         // 1-5 scale
  reflection?: string;                         // Post-task notes
  
  // Historical Data (for recurring tasks)
  history?: Record<string, TaskHistory>;      // {[dateKey]: TaskHistory}
}

type TaskStatus = 'Backlog' | 'In Progress' | 'Paused' | 'Completed' | 'Missed';

interface Subtask {
  id: string;                                  // UUID
  text: string;                                // Subtask description
  completed: boolean;                          // Completion state
  notes?: string;                              // Subtask notes
  completedAt?: number;                        // Timestamp
}

interface TaskHistory {
  startDate: string;                           // ISO date
  deadline: string;                            // ISO date
  status: TaskStatus;                          // Status on that date
  subtasks: Subtask[];                         // Subtasks state on that date
  completionTime?: string;                     // When completed
  totalTimeElapsed?: string;                   // Time spent
  timerSessionCount?: number;
  interruptions?: string;
  focusScore?: number;
  reflection?: string;
}
```

### **Preferences Models**
```typescript
interface TaskFormPreferences {
  showDescription: boolean;
  showProject: boolean;
  showTags: boolean;
  showEffort: boolean;
  showEnergy: boolean;
  showRecurrence: boolean;
}

interface SoundPreferences {
  startup: boolean;           // App startup sound
  session: boolean;           // Timer start/end
  reminder: boolean;          // Task reminder 15min before
  eyeProtection: boolean;     // Periodic break reminder
}
```

### **Diary Entry Model**
```typescript
interface DiaryEntry {
  id: string;                 // UUID
  date: string;              // ISO date
  title: string;             // Entry title
  content: string;           // Markdown/HTML
  archived: boolean;         // Soft delete
  updatedAt: number;         // Unix timestamp
}
```

---

## ✨ Key Features Deep Dive

### 1. **Smart Task Management**

**Three-Tier Prioritization:**
- Super Important (High priority, urgent)
- Important (Medium priority)
- Less Important (Lower priority)

**Energy-Based Planning:**
- Match tasks to current mental capacity
- Filter by energy level to see available tasks
- Energy distribution analytics

**Rich Metadata:**
- Projects for organization
- Tags for context/location
- Start date and deadline tracking
- Effort estimation (hours:minutes)
- Recurrence patterns (daily, weekly, etc.)

**Subtask Management:**
- Structured checklist with individual completion states
- Per-subtask notes
- Completion timestamps for analytics

---

### 2. **Focus & Time Tracking**

**Timer System:**
- Start/Stop/Pause controls
- Active task highlighting
- Real-time display (updates every second)
- Session persistence in localStorage

**Session Tracking:**
- Count of pomodoro sessions
- Total time elapsed per task
- Historical tracking via task history

**Streak Counter:**
- Consecutive days with completed tasks
- Reset tracking for recurring tasks
- Visual indicator in dashboard

---

### 3. **Intelligent Notifications**

**Scheduling:**
- Browser notification 15 minutes before deadline
- Notification at scheduled start time
- Background operation (even with tab closed)

**Audio Cues:**
- Startup sound
- Timer alert
- Task reminder
- Eye protection break alert (configurable)

**Sound Preferences:**
- Global enable/disable
- Per-event toggle (startup, session, reminder, eye protection)
- localStorage persistence

---

### 4. **Multiple View Modes**

**Dashboard/Board View:**
- Kanban-style columns (Backlog, In Progress, Paused, Completed)
- Drag-and-drop reordering
- Quick stats

**List View:**
- Table with sortable columns
- Inline edit capability
- Bulk actions

**History View:**
- Past task completions
- Completed vs not completed filters
- Completion timeline

**Calendar View:**
- Month/week grid
- Task indicators by date
- Click-to-filter by date

**Analytics View:**
- Velocity charts (created/completed over time)
- Project breakdown
- Energy distribution
- Category breakdown
- Time range selector

---

### 5. **Data Migration & Versioning**

**Automatic Schema Evolution:**
- Converts legacy string-based subtasks to structured Subtask objects
- Maps legacy `location` fields to new `tags` array
- Handles version mismatches transparently

**localStorage Keys:**
- `productivity_flow_tasks` - Serialized task array
- `productivity_flow_timer_state` - Active timer data
- `productivity_flow_config` - User preferences
- `theme` - Dark/light mode preference

---

### 6. **AI-Powered Insights**

**Prompt Generation:**
- Strategic scheduling recommendations
- Time audit and estimation bias analysis
- Task decomposition suggestions
- Burnout risk assessment
- Focus pattern analysis
- Deadline risk warnings

**Integration:**
- User copies prompt to ChatGPT/Claude
- Pre-formatted JSON context for efficiency
- Minimal token overhead

---

## 💾 Storage & Persistence

### **Multi-Layer Storage Strategy**

```
┌──────────────────────────────────────────┐
│         Angular Signals (Memory)          │
│    (Primary state, reactive updates)      │
└────────┬─────────────────────────────────┘
         │
    ┌────┴─────────────────┬────────────┐
    │                      │            │
┌───▼──────┐         ┌─────▼───┐   ┌───▼──────┐
│localStorage│        │ IndexedDB │   │  Dexie  │
│  (Sync)   │         │ (Async)  │   │ (ORM)   │
└───────────┘         └──────────┘   └─────────┘
    - Prefs              - Tasks         - Diary
    - Timer              - History       - Indexing
    - Theme              - Backup
```

### **localStorage Keys**
| Key | Value | Type | Synced By |
|-----|-------|------|-----------|
| `productivity_flow_tasks` | Serialized Task[] | JSON string | TaskService effect |
| `productivity_flow_timer_state` | Active timer data | JSON object | Timer effect |
| `productivity_flow_config` | User preferences | JSON object | Form submission |
| `theme` | 'dark' \| 'light' | String | ThemeService effect |

### **IndexedDB Schema**
```sql
-- Database: 'productivity_flow_db' (Version 2)

CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  -- Full Task object serialized as JSON
);

CREATE TABLE diary (
  id TEXT PRIMARY KEY,
  date TEXT,
  title TEXT,
  content TEXT,
  archived BOOLEAN,
  updatedAt NUMBER
);

-- Indexes: None (key-based lookups only)
```

### **Data Flow**
1. **Load:** App initializes → TaskService loads from IndexedDB → localStorage fallback
2. **Update:** Component updates signal → Effect hook detects change → Persists to localStorage + IndexedDB
3. **Export:** User triggers export → TaskService serializes tasks → Downloads JSON file
4. **Import:** User uploads JSON → TaskService validates and merges → Persists to storage

---

## ⚡ State Management

### **Signal-Based Architecture**

**Root Signals (TaskService):**
```typescript
// Data
private tasksSignal = signal<Task[]>([]);
readonly tasks = this.tasksSignal.asReadonly();

// Timer
readonly activeTaskId = signal<string | null>(null);
readonly activeTimerStart = signal<number | null>(null);
readonly tick = signal<number>(Date.now()); // Updates every second

// Preferences
readonly soundEnabled = signal<boolean>(true);
readonly soundPreferences = signal<SoundPreferences>(...);
readonly formPreferences = signal<TaskFormPreferences>(...);
```

**Computed Signals:**
```typescript
readonly stats = computed(() => this.calculateStats(this.tasksSignal()));
readonly activeTask = computed(() => {
  const selectedId = this.selectedTaskId();
  const task = this.tasks().find(t => t.id === selectedId);
  // Resolve with history context
  return task || null;
});
```

**Effects (Side Effects):**
```typescript
// Auto-save tasks to storage
effect(() => {
  const tasks = this.tasksSignal();
  this.indexedDbService.saveAllTasks(tasks);
  localStorage.setItem(this.STORAGE_KEY, JSON.stringify(tasks));
});

// Timer tick (every second)
effect(() => {
  if (this.activeTaskId() && this.activeTimerStart()) {
    this.secondsTimer = setInterval(() => {
      this.tick.set(Date.now());
    }, 1000);
  } else {
    clearInterval(this.secondsTimer);
  }
});

// Theme persistence
effect(() => {
  const isDark = this.isDarkMode();
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('theme', isDark ? 'dark' : 'light');
});
```

### **Unidirectional Data Flow**

```
User Input
    ↓
Component Handler
    ↓
Service Method (e.g., TaskService.updateTask())
    ↓
Signal Update (e.g., tasksSignal.update())
    ↓
Computed Re-evaluation (e.g., stats, activeTask)
    ↓
Effect Execution (e.g., save to storage)
    ↓
Template Re-render (OnPush detection)
```

---

## 📖 Development Guidelines

### **Adding a New Task**

1. **Form Submission** → TaskFormComponent
2. **Service Call** → `TaskService.addTask(task)`
3. **Signal Update** → `tasksSignal.update()`
4. **Persistence** → Effect hook saves to IndexedDB + localStorage
5. **UI Update** → Templates subscribe to `taskService.tasks` signal

### **Creating a New View**

1. **Create Component** → `ng generate component components/new-view/new-view`
2. **Inject Services** → `inject(TaskService)`, `inject(DashboardAnalyticsService)`
3. **Define Computed** → Filter/transform tasks as needed
4. **Add to AppComponent** → Import and add to currentView routing
5. **Emit Events** → Use `output()` to communicate with parent

### **Adding a New Modal**

1. **Create Component** → `ng generate component components/new-modal/new-modal`
2. **Define Signals** → `input()` for data, `output()` for actions
3. **Add to AppComponent** → Import and add `isNewModalOpen` signal
4. **Wire Events** → Connect OK/Cancel buttons to parent handlers

### **Modifying Data Models**

1. **Update Interface** → task.service.ts
2. **Update Form** → task-form.component.ts (add field to FormGroup)
3. **Add Migration Logic** → TaskService.migrateData()
4. **Update Computed** → Recalculate stats if needed
5. **Test Backward Compatibility** → Ensure old data loads

### **Adding Analytics Metrics**

1. **Create Computed** → DashboardAnalyticsService
2. **Implement Calculation** → Filter and aggregate tasks
3. **Add to View** → AnalyticsViewComponent
4. **Add Chart** → Integrate charting library (Chart.js, D3, etc.)

### **Performance Optimization Tips**

- Use `computed()` for derived state (avoids duplicate calculations)
- Use `OnPush` change detection for dumb components
- Lazy-load modals and views (don't import all at once)
- Use virtual scrolling for large task lists
- Debounce search input (300ms)
- Lazy-load CKEditor5 only when needed

---

## 🔄 Refactoring Roadmap

### **Phase 1: Code Organization** (Current)
- ✅ Modularize services by domain
- ✅ Establish component hierarchy
- ✅ Define data models
- 📋 Document architecture (Skills.md)

### **Phase 2: Performance** (Next)
- [ ] Implement virtual scrolling for task lists
- [ ] Lazy-load views (route-based code splitting)
- [ ] Lazy-load CKEditor5 on demand
- [ ] Optimize signal subscriptions (avoid over-computing)
- [ ] Debounce search, filter, and timer updates

### **Phase 3: Testing**
- [ ] Add unit tests for services (TaskService, DashboardAnalyticsService)
- [ ] Add component tests for modals and views
- [ ] Add integration tests for workflows (create → edit → complete)
- [ ] Add E2E tests for critical paths

### **Phase 4: Feature Expansion**
- [ ] Collaborative features (multi-user, sharing)
- [ ] Backend API integration (sync to cloud)
- [ ] Mobile-optimized UI (responsive improvements)
- [ ] Advanced scheduling (calendar integration, recurring task engine)
- [ ] Budget/resource tracking
- [ ] Team analytics

### **Phase 5: UX Polish**
- [ ] Improved drag-and-drop animations
- [ ] Keyboard shortcuts (vim mode, custom bindings)
- [ ] Customizable themes (color schemes)
- [ ] Accessibility improvements (ARIA labels, keyboard navigation)
- [ ] Gesture support (mobile swipes)

### **Phase 6: DevOps**
- [ ] GitHub Actions CI/CD pipeline
- [ ] Automated testing on PR
- [ ] Pre-deployment checks (bundle size, lighthouse)
- [ ] Staged deployment (dev → staging → prod)

---

## 🔗 Cross-Service Communication Map

```
AppComponent
├── Manages: View routing, modal state, task selection
├── Depends on: All views, all modals, all services
└── Emits to: Views/Modals only

DashboardViewComponent
├── Reads: TaskService.tasks, TaskService.stats
├── Emits to: AppComponent (triggerEdit, triggerComplete, etc.)
└── Uses: search, date filtering

TaskFormComponent
├── Reads: TaskService.formPreferences, ThemeService.isDarkMode
├── Writes: TaskService.addTask() or TaskService.updateTask()
├── Uses: WysiwygEditorComponent
└── Emits: cancel

TaskDetailComponent
├── Reads: AppComponent.activeTask, TaskService.tick (for timer)
├── Writes: TaskService.startTimer(), TaskService.stopTimer()
├── Uses: Real-time timer display
└── Emits: Save, Delete actions

AnalyticsViewComponent
├── Reads: DashboardAnalyticsService.velocityMetrics, range
├── Uses: Chart rendering
└── Interacts: Date range selector

CompletionModalComponent
├── Reads: AppComponent.selectedTaskId
├── Writes: TaskService.recordTaskCompletion()
├── Uses: Subtask verification, focus score input
└── Emits: Completion confirmation

SettingsModalComponent
├── Reads: TaskService.soundPreferences, ThemeService.isDarkMode
├── Writes: Sound & Theme preferences to storage
├── Uses: Export/Import handlers
└── Emits: Settings saved event
```

---

## 📦 Build & Deployment

### **Development**

```bash
# Install dependencies
npm install

# Start dev server (port 3000)
npm run dev

# Rebuild on file change
ng serve

# Build bundle
npm run build

# Production build
npm run build:prod
```

### **Docker Development**

```bash
# Start container
docker compose up

# Install packages inside container
docker compose exec node npm install <package>

# Update Angular CLI
docker compose exec node npx ng update @angular/core @angular/cli

# Full reset
docker compose down -v && docker compose up --build
```

### **GitHub Pages Deployment**

```bash
# 1. Install angular-cli-ghpages
docker compose exec --user root node npx ng add angular-cli-ghpages

# 2. Configure Git
docker compose exec node git config --global user.email "you@example.com"
docker compose exec node git config --global user.name "Your Name"

# 3. Deploy with PAT
docker compose exec node npx ng deploy --base-href=/productivity-helper/ --repo=https://<TOKEN>@github.com/<USERNAME>/<REPO>.git
```

---

## 📝 Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.0.3 | Current | Current stable release |
| 0.0.2 | Previous | Theme support, diary feature |
| 0.0.1 | Initial | Core task management, dashboard, timer |

---

## 🎓 Learning Resources

### **Angular Signals**
- [Angular Documentation - Signals](https://angular.io/guide/signals)
- Best practices: Use `computed()` for memoization, `effect()` for side effects

### **Standalone Components**
- [Angular Documentation - Standalone Components](https://angular.io/guide/standalone-components)
- Benefits: Tree-shakable, cleaner dependency management

### **Dexie.js**
- [Dexie.js Documentation](https://dexie.org/)
- Schema versioning, transactions, querying

### **CKEditor5**
- [CKEditor5 Angular Integration](https://ckeditor.com/docs/ckeditor5/latest/installation/getting-started/frameworks/angular.html)
- Rich text editing capabilities

### **Tailwind CSS**
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- Dark mode: `:root.dark` + `dark:` prefix utilities

---

## 📞 Support & Troubleshooting

### **Common Issues**

**localStorage not persisting:**
- Check browser localStorage quota
- Clear browser cache and cookies
- Verify localStorage not disabled in settings

**Timer stops after tab close:**
- Enable PWA features or service worker
- Use background fetch API for persistent timers

**IndexedDB quota exceeded:**
- Implement data cleanup (archive old tasks)
- Consider time-based archival policy

**CKEditor5 not rendering:**
- Verify CKEditor5 CSS is imported
- Check for CSS conflicts in global styles

**Dark mode not working:**
- Ensure Tailwind CSS build includes `darkMode: 'class'`
- Check that `<html>` element has `.dark` class

---

## 🚀 Future Enhancements

- **Multi-user Collaboration** - Real-time sync with backend
- **Mobile App** - Native iOS/Android via Capacitor
- **Voice Commands** - "Hey Productivity, add a task..."
- **Integrations** - Slack, Google Calendar, Zapier
- **Machine Learning** - Smart scheduling based on patterns
- **Offline Mode** - Service worker with background sync
- **Advanced Gamification** - Achievements, badges, leaderboards

---

**Last Updated:** May 2026  
**Maintained By:** Development Team  
**License:** Proprietary - See LICENSE file
