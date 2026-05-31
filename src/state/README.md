# State Management Module

This module manages application-wide state using Angular Signals.

## Structure

- `task.store.ts` - Task state management (currently in TaskService)
- `ai.store.ts` - AI feature state (to be implemented)
- `planner.store.ts` - Planning/scheduler state (to be implemented)

## State Architecture

Current approach uses Angular Signals in services:
- **TaskService**: Central task state with signals and computed values
- **ThemeService**: Theme preference signals
- **DashboardAnalyticsService**: Analytics computed state

Future enhancements:
- Dedicated store files with state logic separated from services
- Store composition for complex state trees
- Time-travel debugging support
- State snapshots and undo/redo

## Usage

```typescript
import { TaskService } from '@core/services';

// Subscribe to tasks signal
const tasks = inject(TaskService).tasks;

// Computed derived state
const stats = inject(TaskService).stats;
```
