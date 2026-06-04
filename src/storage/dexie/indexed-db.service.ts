import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
// import type { Task } from './task.service';

// Using path alias (Recommended by your Skills.md)
// import type { Task } from '@core/services'; 

// OR using relative paths:
import type { Task } from '../../core/services/task.service';


export interface DiaryEntry {
  id: string;
  date: string; // ISO string
  title: string;
  content: string;
  archived: boolean;
  updatedAt: number;
}

class ProductivityDb extends Dexie {
  tasks!: Table<Task, string>;
  diary!: Table<DiaryEntry, string>;

  constructor() {
    super('productivity_flow_db');
    this.version(2).stores({
      tasks: 'id',
      diary: 'id'
    });
  }
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDbService {
  private db = new ProductivityDb();

  constructor() {}

  async getAllTasks(): Promise<Task[]> {
    return await this.db.tasks.toArray();
  }

  async saveAllTasks(tasks: Task[]): Promise<void> {
    await this.db.transaction('rw', this.db.tasks, async () => {
      await this.db.tasks.clear();
      if (tasks.length > 0) {
        await this.db.tasks.bulkAdd(tasks);
      }
    });
  }

  async getAllDiaryEntries(): Promise<DiaryEntry[]> {
    return await this.db.diary.toArray();
  }

  async saveDiaryEntry(entry: DiaryEntry): Promise<void> {
    await this.db.diary.put(entry);
  }

  async deleteDiaryEntry(id: string): Promise<void> {
    await this.db.diary.delete(id);
  }
}