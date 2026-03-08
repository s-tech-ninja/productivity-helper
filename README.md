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


## Update Angular Commands

| Update Target | Command to Run |
| :--- | :--- |
| Code Changes | Just Save File (Auto-sync) |
| New NPM Package | `docker compose exec node npm install <name>` |
| Angular Framework | `docker compose exec node npx ng update` |
| Docker/Node Config | `docker compose up --build` |
| Force Fresh Reinstall | `docker compose down -v` then `docker compose up` |

| Step | Command |
| :--- | :--- |
| Commit Work | `git commit -m "save"` |
| Check Versions | `docker compose exec node npx ng version` |
| Update CLI/Core | `docker compose exec node npx ng update @angular/core @angular/cli` |
| Reset Container | `docker compose down -v && docker compose up --build` |

## Deployment (GitHub Pages)

| Step | Command |
| :--- | :--- |
| 1. Install Deployer | `docker compose exec --user root node npx ng add angular-cli-ghpages` |
| 2. Install Git | `docker compose exec node apk add git` |
| 3. Configure Git | `docker compose exec node git config --global user.email "you@example.com"`<br>`docker compose exec node git config --global user.name "Your Name"` |
| 4. Deploy (Use PAT) | `docker compose exec node npx ng deploy --base-href=/productivity-helper/ --repo=https://<TOKEN>@github.com/<USERNAME>/<REPO>.git` |
| Manual Alternative | `npx angular-cli-ghpages --dir=dist/productivity-helper --repo=https://<TOKEN>@github.com/<USERNAME>/<REPO>.git` |


## Create GitHub Token (PAT)

1. Go to **Settings** > **Developer settings** > **Personal access tokens** > **Tokens (classic)**.
2. Click **Generate new token (classic)**.
3. Select the `repo` scope (required for pushing to the repository).
4. Click **Generate token** and copy the string (starts with `ghp_`).



Credits:
Sound Effect by <a href="https://pixabay.com/users/make_more_sound-35032787/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=145477">Jesse Grum</a> from <a href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=145477">Pixabay</a>

Sound Effect by <a href="https://pixabay.com/users/soundreality-31074404/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=423717">Jurij</a> from <a href="https://pixabay.com/sound-effects//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=423717">Pixabay</a>

Sound Effect by <a href="https://pixabay.com/users/freesound_community-46691455/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=43875">freesound_community</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=43875">Pixabay</a>

Sound Effect by <a href="https://pixabay.com/users/universfield-28281460/?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=487897">Universfield</a> from <a href="https://pixabay.com//?utm_source=link-attribution&utm_medium=referral&utm_campaign=music&utm_content=487897">Pixabay</a>