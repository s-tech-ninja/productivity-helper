# ProductivityFlow - New Project Structure

This document outlines the refactored project structure using scalable Angular architecture patterns.

## Directory Structure Overview

```
src/
├── app/                          # Root application component
│   ├── app.component.ts         # Main app component with routing
│   ├── app.component.html       # Root template
│   └── README.md                # App module documentation
│
├── core/                         # Core module - shared application logic
│   ├── services/                # Core services (task, theme, markdown)
│   ├── models/                  # Data models and interfaces
│   ├── utils/                   # Utility functions
│   ├── guards/                  # Route guards
│   ├── interceptors/            # HTTP interceptors
│   ├── constants/               # Application constants
│   ├── index.ts                 # Public API
│   └── README.md                # Core module documentation
│
├── shared/                       # Shared module - reusable components
│   ├── components/              # Reusable UI components
│   │   ├── icons/               # Icon component
│   │   ├── wysiwyg-editor/      # Rich text editor
│   │   ├── modals/              # Reusable modals
│   │   │   ├── auth-modal/
│   │   │   ├── confirmation-modal/
│   │   │   ├── help-modal/
│   │   │   └── settings-modal/
│   │   └── index.ts             # Public API
│   ├── pipes/                   # Custom pipes
│   │   ├── markdown.pipe.ts
│   │   └── index.ts
│   ├── directives/              # Custom directives
│   ├── validators/              # Form validators
│   ├── ui/                      # UI utilities
│   ├── index.ts                 # Public API
│   └── README.md                # Shared module documentation
│
├── features/                     # Feature modules - domain-specific logic
│   ├── tasks/                   # Task management feature
│   │   ├── components/
│   │   │   ├── dashboard-view/
│   │   │   ├── task-form/
│   │   │   ├── task-detail/
│   │   │   ├── completion-modal/
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   └── index.ts
│   │   └── README.md
│   │
│   ├── projects/                # Project management
│   │   ├── components/
│   │   │   ├── project-analysis/
│   │   │   ├── project-view/
│   │   │   └── index.ts
│   │   ├── services/
│   │   └── README.md
│   │
│   ├── analytics/               # Analytics & reporting
│   │   ├── components/
│   │   │   ├── analytics-view/
│   │   │   └── index.ts
│   │   ├── services/
│   │   │   ├── analytics.service.ts
│   │   │   └── index.ts
│   │   └── README.md
│   │
│   ├── diary/                   # Diary & reflection
│   │   ├── components/
│   │   │   ├── diary-view/
│   │   │   └── index.ts
│   │   ├── services/
│   │   └── README.md
│   │
│   ├── planning-ai/             # AI-powered planning
│   │   ├── components/
│   │   │   ├── planning-ai-view/
│   │   │   └── index.ts
│   │   ├── services/
│   │   └── README.md
│   │
│   ├── reflection-ai/           # AI-powered reflection
│   │   ├── components/
│   │   ├── services/
│   │   └── README.md
│   │
│   ├── scheduler/               # Calendar & scheduling
│   │   ├── components/
│   │   │   ├── calendar-view/
│   │   │   └── index.ts
│   │   ├── services/
│   │   └── README.md
│   │
│   ├── settings/                # Settings & preferences
│   │   ├── components/
│   │   ├── services/
│   │   └── README.md
│   │
│   └── README.md                # Features module documentation
│
├── ai/                          # AI/LLM integration module
│   ├── services/                # AI services
│   │   ├── prompt.service.ts
│   │   └── index.ts
│   ├── prompts/                 # Prompt templates
│   │   └── index.ts
│   ├── schemas/                 # Response schemas
│   ├── parsers/                 # Response parsers
│   ├── models/                  # AI-specific models
│   ├── adapters/                # Provider adapters
│   ├── pipelines/               # Processing pipelines
│   ├── index.ts                 # Public API
│   └── README.md                # AI module documentation
│
├── state/                       # State management
│   ├── task.store.ts            # Task state
│   ├── ai.store.ts              # AI state (future)
│   ├── planner.store.ts         # Planner state (future)
│   ├── index.ts                 # Public API
│   └── README.md                # State management documentation
│
├── storage/                     # Data persistence layer
│   ├── dexie/                   # IndexedDB setup
│   │   ├── indexed-db.service.ts
│   │   ├── database.ts          # Dexie schema
│   │   └── index.ts
│   ├── repositories/            # Repository pattern (future)
│   │   ├── task.repository.ts
│   │   ├── diary.repository.ts
│   │   └── index.ts
│   ├── migrations/              # Schema migrations
│   │   ├── v1-v2-migration.ts
│   │   └── index.ts
│   ├── index.ts                 # Public API
│   └── README.md                # Storage module documentation
│
└── README.md                    # Project structure overview
```

## Module Responsibilities

### Core Module
- **Purpose**: Foundation layer with shared services and models
- **Contains**: TaskService, ThemeService, MarkdownService
- **Used by**: All other modules
- **Change frequency**: Low

### Shared Module
- **Purpose**: Reusable UI components and utilities
- **Contains**: Icon, WysiwygEditor, Modal components, Pipes
- **Used by**: Features, App component
- **Change frequency**: Medium

### Features Module
- **Purpose**: Domain-specific components and logic
- **Contains**: Views and services for each feature
- **Depends on**: Core, Shared
- **Change frequency**: High (feature development)

### AI Module
- **Purpose**: LLM integration and analysis
- **Contains**: Prompt generation, response parsing
- **Depends on**: Core
- **Change frequency**: Medium

### State Module
- **Purpose**: Centralized state management (future expansion)
- **Contains**: Store definitions
- **Depends on**: Core
- **Change frequency**: Medium

### Storage Module
- **Purpose**: Data persistence layer
- **Contains**: IndexedDB service, repositories, migrations
- **Depends on**: Core
- **Change frequency**: Low

## Import Conventions

Use path aliases for cleaner imports:

```typescript
// Instead of:
import { TaskService } from '../../../core/services/task.service';

// Use:
import { TaskService } from '@core/services';
import type { Task } from '@core/models';
import { DashboardViewComponent } from '@features/tasks/components';
```

### Setup tsconfig.json paths:
```json
{
  "compilerOptions": {
    "paths": {
      "@app/*": ["src/app/*"],
      "@core/*": ["src/core/*"],
      "@shared/*": ["src/shared/*"],
      "@features/*": ["src/features/*"],
      "@ai/*": ["src/ai/*"],
      "@state/*": ["src/state/*"],
      "@storage/*": ["src/storage/*"]
    }
  }
}
```

## Benefits of This Structure

1. **Scalability**: Easy to add new features without affecting existing code
2. **Maintainability**: Clear separation of concerns
3. **Testability**: Isolated modules are easier to unit test
4. **Reusability**: Shared module prevents duplication
5. **Team Collaboration**: Clear folder structure for multiple developers
6. **Lazy Loading**: Features can be lazy-loaded for better performance
7. **Code Organization**: Features grouped by domain, not by file type

## Migration Guide

### Old Structure → New Structure

| Old | New | Reason |
|-----|-----|--------|
| `src/services/task.service.ts` | `src/core/services/task.service.ts` | Foundation layer |
| `src/components/dashboard-view/` | `src/features/tasks/components/dashboard-view/` | Feature grouping |
| `src/components/icons/` | `src/shared/components/icons/` | Reusable |
| `src/app.component.ts` | `src/app/app.component.ts` | Root module |

## Future Enhancements

1. **Lazy Loading**: Load feature modules only when needed
2. **Module Routing**: Implement feature-based routing
3. **State Management**: Migrate to dedicated store files
4. **Repository Pattern**: Implement data access abstraction layer
5. **API Integration**: Add HTTP client services in core
6. **Error Handling**: Centralized error handling service
7. **Logging**: Application-wide logging service

## References

- [Angular Project Structure Guide](https://angular.io/guide/styleguide#style-05-03)
- [Feature Modules Documentation](https://angular.io/guide/feature-modules)
- [Shared Module Best Practices](https://angular.io/guide/sharing-ngmodules)
