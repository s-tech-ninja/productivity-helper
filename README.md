# Productivity Flow (Beta)

**Productivity Flow** is an advanced, privacy-first task management dashboard built with **Angular**. It goes beyond simple to-do lists by integrating energy management, focus timers, and habit-building streaks directly into your workflow.

## 🚀 Key Features

### 🧠 Smart Task Management
*   **Three-Tier Prioritization:** Organize tasks into **Super Important**, **Important**, and **Less Important**.
*   **Energy-Based Planning:** Tag tasks by Energy Level (**High**, **Medium**, **Low**) to match your mental capacity.
*   **Rich Metadata:** Track Projects, Tags, Start Dates, Deadlines, and Recurrence (Daily/Weekly/Monthly).
*   **Structured Subtasks:** Break down tasks into checklists with individual completion states and notes.

### ⏱️ Focus & Time Tracking
*   **Integrated Timer:** Start/Stop timers for any task. Tracks `totalTimeElapsed` and `timerSessionCount`.
*   **Session Persistence:** Timer state is saved to `localStorage`, so you don't lose your active session if the tab closes.
*   **Streak Counter:** Gamified tracking of consecutive days with completed tasks.

### 🔔 Intelligent Notifications
*   **Proactive Alerts:** Browser notifications trigger **15 minutes before** a scheduled task and **at the start time**.
*   **Audio Cues:** Sound effects for timer start and task reminders.
*   **Dashboard Alerts:** Visual indicators for "Ending Today" and "Overdue" tasks.

### 📊 Dashboard & Views
*   **Multiple Views:** Switch between **Board** (Kanban-style), **List**, **History**, and **Completed** views.
*   **Dynamic Filtering:** Filter by Date (**Today**, **This Week**, **This Month**) and Search text.
*   **Drag-and-Drop:** Reorder tasks or change priorities instantly.

## 🛠️ Technical Architecture

### Core Stack
*   **Framework:** Angular (utilizing **Signals** for reactive state management).
*   **Language:** TypeScript.
*   **Storage:** `localStorage` (Client-side only).

### State Management
The application uses **Angular Signals** (`signal`, `computed`, `effect`) for a highly reactive and performant user experience.
*   **Source of Truth:** `TaskService` maintains the `tasksSignal`.
*   **Persistence:** `effect()` hooks automatically sync state changes to `localStorage`.

### Data Migration
Includes a robust migration layer to handle data schema evolution:
*   Automatically converts legacy string-based subtasks to structured `Subtask` objects.
*   Maps legacy `location` fields to the new `tags` array.

## 🔒 Privacy
Your data never leaves your browser. All tasks, timers, and settings are stored locally in your browser's `localStorage`.
