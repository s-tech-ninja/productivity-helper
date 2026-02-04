import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import type { Task } from './task.service';

class ProductivityDb extends Dexie {
  tasks!: Table<Task, string>;

  constructor() {
    super('productivity_flow_db');
    this.version(1).stores({
      tasks: 'id'
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
}