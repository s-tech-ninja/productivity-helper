# Core Module

This module contains all core application logic shared across features.

## Structure

- **services/** - Core application services
  - `task.service.ts` - Main task management service with Signals-based state
  - `theme.service.ts` - Dark/light mode management
  - `markdown.service.ts` - Markdown to HTML conversion

- **models/** - Core data models and interfaces
  - Task, Subtask, TaskHistory types
  - Preference interfaces

- **utils/** - Utility functions and helpers
- **guards/** - Route guards for access control
- **interceptors/** - HTTP interceptors (for future backend integration)
- **constants/** - Application-wide constants

## Usage

```typescript
// Import core services
import { TaskService, ThemeService } from '@core/services';

// Import core models
import type { Task, TaskStatus } from '@core/models';
```
