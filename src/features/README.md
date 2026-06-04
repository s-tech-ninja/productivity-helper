# Features Module

This module contains feature-specific components, services, and logic organized by domain.

## Features

### Tasks (`tasks/`)
Core task management UI and logic
- Components: Dashboard, Task Form, Task Detail, Completion Modal
- Services: Task-specific services (if needed separately from core)

### Projects (`projects/`)
Project management and tracking
- Components: Project View, Project Analysis
- Services: Project-related analytics and calculations

### Analytics (`analytics/`)
Dashboard analytics and reporting
- Components: Analytics View with charts and metrics
- Services: DashboardAnalyticsService for velocity and performance tracking

### Diary (`diary/`)
Daily journal and reflection system
- Components: Diary View with rich text editing
- Services: Diary-specific operations

### Scheduler (`scheduler/`)
Calendar and scheduling features
- Components: Calendar View, date picker, timeline
- Services: Scheduling algorithms and utilities

### Planning AI (`planning-ai/`)
AI-powered planning and task suggestions
- Components: AI Features View with prompt display
- Services: AI integration and analysis

### Reflection AI (`reflection-ai/`)
AI-powered reflection and insights
- Components: Reflection interface
- Services: Reflection analysis

### Settings (`settings/`)
Application configuration and user preferences
- Components: Settings interface (shares modals with shared module)
- Services: Settings management

## Naming Convention

Each feature follows this structure:
```
features/[feature-name]/
├── components/        # Feature-specific components
├── services/         # Feature-specific services
├── models/          # Feature-specific types (optional)
└── index.ts         # Public API
```

## Usage

```typescript
// Import feature components
import { DashboardViewComponent } from '@features/tasks/components';

// Import feature services
import { AnalyticsService } from '@features/analytics/services';
```
