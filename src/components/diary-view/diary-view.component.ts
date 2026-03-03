import { Component, signal, computed, inject, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IconComponent } from '../icons/icon.component';
import { WysiwygEditorComponent } from '../sub-components/wysiwyg-editor/wysiwyg-editor.component';
import { IndexedDbService, DiaryEntry } from '../../services/indexed-db.service';

@Component({
  selector: 'app-diary-view',
  standalone: true,
  imports: [CommonModule, FormsModule, IconComponent, WysiwygEditorComponent],
  templateUrl: './diary-view.component.html'
})
export class DiaryViewComponent {
  entries = signal<DiaryEntry[]>([]);
  selectedId = signal<string | null>(null);
  showArchived = signal(false);
  private indexedDbService = inject(IndexedDbService);

  private _editor?: WysiwygEditorComponent;
  @ViewChild(WysiwygEditorComponent) set editor(editor: WysiwygEditorComponent | undefined) {
    this._editor = editor;
    // When the editor is set (or removed), immediately try to apply the correct state.
    this.updateEditorDisabledState();
  }
  get editor(): WysiwygEditorComponent | undefined { return this._editor; }

  // Computed list for the sidebar
  filteredEntries = computed(() => {
    return this.entries()
      .filter(e => this.showArchived() ? true : !e.archived)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  });

  activeEntry = computed(() => 
    this.entries().find(e => e.id === this.selectedId()) || null
  );

  isEditable = computed(() => {
    const entry = this.activeEntry();
    return entry ? this.isToday(entry.date) : false;
  });

  constructor() {
    this.loadEntries();
    effect(() => {
      // This effect now simply tracks the active entry and triggers a state update.
      this.activeEntry(); // Dependency
      this.updateEditorDisabledState();
    });
  }

  async loadEntries() {
    let entries = await this.indexedDbService.getAllDiaryEntries();
    
    // Migration from LocalStorage
    if (entries.length === 0) {
      const stored = localStorage.getItem('diary_entries');
      if (stored) {
        try {
          entries = JSON.parse(stored);
          // Persist to DB
          for (const e of entries) {
            await this.indexedDbService.saveDiaryEntry(e);
          }
        } catch (e) {
          console.error('LocalStorage parse error', e);
        }
      }
    }
    
    this.entries.set(entries);
    
    // Auto-select logic moved here after data load
    this.autoSelectEntry();
  }

  createToday() {
    const todayStr = new Date().toDateString();
    const existing = this.entries().find(e => new Date(e.date).toDateString() === todayStr);
    
    if (existing) {
      this.selectedId.set(existing.id);
      if (existing.archived) {
        // Unarchive if they want to work on it today
        this.toggleArchive(existing.id, false);
      }
    } else {
      const newEntry: DiaryEntry = {
        id: crypto.randomUUID(),
        date: new Date().toISOString(),
        title: 'Daily Note',
        content: '',
        archived: false,
        updatedAt: Date.now()
      };
      this.entries.update(list => [newEntry, ...list]);
      this.selectedId.set(newEntry.id);
      this.indexedDbService.saveDiaryEntry(newEntry);
    }
  }

  selectEntry(id: string) {
    this.selectedId.set(id);
  }

  clearSelection() {
    this.selectedId.set(null);
  }

  updateContent(event: any) {
    if (!this.isEditable()) {
      // Fallback: If UI allows editing on read-only entry, revert immediately
      if (this.editor && this.activeEntry()) {
        this.editor.writeValue(this.activeEntry()!.content);
      }
      return;
    }

    // The editor component's (input) event emits the content as a markdown string.
    // We only handle this type of event to ensure data integrity.
    if (typeof event === 'string') {
      const content = event;
      const id = this.selectedId();
      if (id) {
        this.entries.update(list => list.map(e => 
          e.id === id ? { ...e, content, updatedAt: Date.now() } : e
        ));
        const updated = this.entries().find(e => e.id === id);
        if (updated) this.indexedDbService.saveDiaryEntry(updated);
      }
    }
  }

  toggleArchive(id: string, state?: boolean) {
    this.entries.update(list => list.map(e => {
      if (e.id === id) {
        return { ...e, archived: state !== undefined ? state : !e.archived };
      }
      return e;
    }));
    const updated = this.entries().find(e => e.id === id);
    if (updated) this.indexedDbService.saveDiaryEntry(updated);
    
    // If we just archived the selected one and we are hiding archives, deselect
    if (!this.showArchived() && this.selectedId() === id) {
       this.selectedId.set(null);
    }
  }

  deleteEntry(id: string) {
    if (confirm('Are you sure you want to delete this note permanently?')) {
      this.entries.update(list => list.filter(e => e.id !== id));
      this.indexedDbService.deleteDiaryEntry(id);
      if (this.selectedId() === id) this.selectedId.set(null);
    }
  }

  stripHtml(html: string): string {
    return html ? html.replace(/<[^>]*>/g, '') : '';
  }

  isToday(dateInput: string | Date): boolean {
    const date = new Date(dateInput);
    const today = new Date();
    return date.toDateString() === today.toDateString();
  }

  private updateEditorDisabledState() {
    if (this.editor) {
      const editable = this.isEditable();
      this.editor.setDisabledState(!editable);
    }
  }

  private autoSelectEntry() {
    if (!this.selectedId() && this.entries().length > 0) {
       const today = new Date().toDateString();
       const todayEntry = this.entries().find(e => new Date(e.date).toDateString() === today);
       if (todayEntry) {
         this.selectedId.set(todayEntry.id);
       } else {
         this.selectedId.set(this.entries()[0].id);
       }
    }
  }
}