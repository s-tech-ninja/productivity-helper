# App Module

This module contains the root application component and main application setup.

## Files

- `app.component.ts` - Root component with view routing and modal management
- `app.component.html` - Root template with sidebar, main content, and modals

## Responsibilities

- View routing (dashboard, tasks, calendar, analytics, diary, etc.)
- Global modal state management (auth, task form, settings, help, etc.)
- Task detail panel management
- Theme toggling
- Keyboard shortcuts and global event handling

## Architecture

```
AppComponent (Root)
├── Sidebar Navigation
├── Main Content Area (view routing)
│   ├── Dashboard/Tasks View
│   ├── Calendar View
│   ├── Analytics View
│   ├── Diary View
│   └── AI Features View
├── Task Detail Panel (right sidebar)
└── Modal Overlays
    ├── Task Form
    ├── Completion Modal
    ├── Settings
    ├── Help
    └── Confirmation Dialogs
```

## Future Refactoring

- Extract modal management to dedicated service
- Create layout component hierarchy
- Implement lazy-loaded feature routing
- Add navigation breadcrumbs
