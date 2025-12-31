
# Productivity Helper

**Productivity Helper** is a streamlined, client-side task management application designed to help users organize, prioritize, and track time spent on their daily objectives. It provides a centralized dashboard to manage complexity through granular task details and integrated time tracking.

**🔗 Live Demo:** [https://s-tech-ninja.github.io/productivity-helper/](https://s-tech-ninja.github.io/productivity-helper/)

## 🚀 Features

* **Smart Prioritization:** Organize tasks into three distinct tiers: **Super Important**, **Important**, and **Less Important**.
* **Drag-and-Drop Workflow:** Reorder tasks or move them between priority lists instantly using an intuitive drag-and-handle interface.
* **Integrated Time Tracking:** Start and pause timers for individual tasks to accurately measure "Time Spent" versus "Time Estimated."
* **Dynamic Checklists:** Add sub-tasks to any entry with real-time progress bar updates and automatic sorting (active tasks vs. completed tasks).
* **Detailed Task Metadata:** Track tasks by Project, Tags, Energy Level (Low/High), and Due Date/Time.
* **Data Persistence:** Your data stays with you. All tasks and timers are saved to `localStorage`, ensuring no progress is lost when closing the tab.
* **Security Minded:** Built-in XSS protection ensures task descriptions and names are rendered safely.

## 🛠️ Tech Stack

* **Core:** [jQuery](https://jquery.com/) (DOM manipulation and event handling)
* **UI Components:** [Bootstrap 5](https://getbootstrap.com/) (Modals, Progress bars, and Layout)
* **Interactions:** [jQuery UI](https://jqueryui.com/) (Sortable functionality for drag-and-drop)
* **Icons:** [FontAwesome](https://fontawesome.com/)
* **Storage:** Browser `localStorage` API

## ⚙️ Technical Overview

### State Management & Persistence

The application maintains a central `tasks` array as the "Source of Truth." Every modification (adding, editing, deleting, or reordering) triggers a synchronization between the UI, the application state, and the browser's `localStorage`.

### Data Migration Layer

To ensure backward compatibility, the `loadTasks()` function includes a migration map. If the application logic is updated with new properties (e.g., `energyLevel` or `timeSpent`), it automatically detects older data formats and patches them with default values.

### Time Tracking Logic

The timer uses a "Session Start" logic to maintain accuracy even if the page isn't refreshed for hours:

1. **Start:** Records the `currentSessionStartTime`.
2. **Active Tracking:** While running, a global `setInterval` updates the UI every second by calculating:


3. **Pause:** The calculated delta is added to the permanent `timeSpent` total and the session is cleared.

## 📝 Usage

1. **Create a Task:** Click the "Create Task" button. Enter a name and assign a priority level.
2. **Focus & Details:** Click any task card to open the Detail View. Here you can manage your checklist and start the timer.
3. **Live Progress:** As you check items off your sub-task list, the progress bar on the card and in the detail view updates automatically.
4. **Prioritize:** Use the vertical grip icon on the left of any task card to drag it into a different priority list.
