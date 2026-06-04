# Storage Module

This module manages all data persistence, including IndexedDB, repositories, and migrations.

## Structure

- **dexie/** - IndexedDB database setup and service
  - `indexed-db.service.ts` - Dexie ORM wrapper
  - Schema definitions for tasks and diary

- **repositories/** - Data access layer (placeholder)
  - Task repository
  - Diary repository
  - Query builders and filters

- **migrations/** - Database schema migrations
  - Version 1 → 2 migration logic
  - Automatic schema updates

## Data Persistence Strategy

1. **In-Memory**: Angular Signals (TaskService)
2. **Session Storage**: localStorage for preferences and timer state
3. **Persistent Storage**: IndexedDB for tasks and diary entries

## Usage

```typescript
import { IndexedDbService } from '@storage/dexie';

const allTasks = await indexedDbService.getAllTasks();
await indexedDbService.saveAllTasks(tasks);
```

## Migration Pattern

When updating the database schema:
1. Increment version in ProductivityDb class
2. Add migration logic in TaskService
3. Test data transformation with legacy data
