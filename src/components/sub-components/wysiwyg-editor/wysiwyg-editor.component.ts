import { Component, Input, forwardRef, signal, computed, inject, ViewChild, ElementRef, effect, output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { IconComponent } from '../../icons/icon.component';
import { MarkdownService } from '../../../services/markdown.service';

@Component({
  selector: 'app-wysiwyg-editor',
  standalone: true,
  imports: [CommonModule, IconComponent],
  templateUrl: './wysiwyg-editor.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => WysiwygEditorComponent),
      multi: true
    }
  ],
  styles: [
    // The `prose` class from Tailwind handles most styling. We only need to add what it doesn't cover.
    // Note: Ensure your tailwind.config.js has the typography plugin enabled.
  ]
})
export class WysiwygEditorComponent implements ControlValueAccessor, OnInit {
  @Input() label: string = '';
  @Input() readonly: boolean = false;
  @Input() defaultView: 'edit' | 'preview' = 'preview';
  @Input() minHeight: string = '140px';
  
  input = output<string>();
  @ViewChild('textarea') textareaRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('editorDiv') editorDivRef!: ElementRef<HTMLDivElement>;
  
  private sanitizer = inject(DomSanitizer);
  private markdownService = inject(MarkdownService);

  mode = signal<'edit' | 'preview'>('preview');
  valueSignal = signal('');
  previewHtml = signal<SafeHtml | string>(''); // Separate signal for innerHTML to control updates
  private isPreviewFocused = false;

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  parsedContent = computed(() => {
    const html = this.markdownService.parse(this.valueSignal());
    // Custom sanitize to allow styles (colors) but prevent scripts
    return this.sanitizer.bypassSecurityTrustHtml(this.markdownService.stripScripts(html));
  });

  constructor() {
    // Sync parsed content to preview HTML, but skip if user is typing in preview
    effect(() => {
      const content = this.parsedContent();
      if (!this.isPreviewFocused) {
        this.previewHtml.set(content || '');
      }
    });
  }

  ngOnInit() {
    this.mode.set(this.defaultView);
  }

  writeValue(value: string): void {
    let val = value || '';
    // Auto-convert legacy HTML to Markdown on load
    if (val && (val.includes('<p>') || val.includes('<div>') || val.includes('<ul>') || val.includes('<b>') || val.includes('<br>'))) {
       val = this.markdownService.htmlToMarkdown(val);
    }
    this.valueSignal.set(val);
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.readonly = isDisabled;
    if (isDisabled) {
      this.mode.set('preview');
    }
  }

  onInput(event: Event) {
    const target = event.target as HTMLElement;
    let value = '';

    if (target.tagName === 'TEXTAREA') {
      value = (target as HTMLTextAreaElement).value;
    } else {
      // In Preview/WYSIWYG mode, convert HTML to Markdown immediately for storage
      value = this.markdownService.htmlToMarkdown(target.innerHTML);
    }
      
    this.valueSignal.set(value);
    this.onChange(value);
    this.input.emit(value);
  }
  
  onPreviewFocus() {
    this.isPreviewFocused = true;
  }

  onPreviewBlur() {
    this.isPreviewFocused = false;
    this.onTouched();
    // Ensure signal is in sync on blur
    if (this.editorDivRef) {
      const markdown = this.markdownService.htmlToMarkdown(this.editorDivRef.nativeElement.innerHTML);
      // Only update if it has changed to avoid unnecessary emissions and effect loops
      if (markdown !== this.valueSignal()) {
        this.valueSignal.set(markdown);
        this.onChange(markdown);
        this.input.emit(markdown);
      }
    }
  }

  switchMode(newMode: 'edit' | 'preview') {
    if (this.mode() === newMode) return;

    // valueSignal is now always Markdown, so no conversion needed when switching
    this.mode.set(newMode);
  }

  handleCommand(command: string, arg?: string) {
    if (this.mode() === 'edit') {
      // Markdown Mode
      switch (command) {
        case 'bold': this.insertMarkdown('**', '**'); break;
        case 'italic': this.insertMarkdown('*', '*'); break;
        case 'list': this.insertMarkdown('\n- ', ''); break;
        case 'orderedList': this.insertMarkdown('\n1. ', ''); break;
        case 'link': this.insertMarkdown('[', '](url)'); break;
        case 'strikeThrough': this.insertMarkdown('~~', '~~'); break;
        case 'underline': this.insertMarkdown('<u>', '</u>'); break;
        case 'formatBlock': 
          if (arg) this.insertMarkdown(arg === 'BLOCKQUOTE' ? '> ' : '# ', ''); break;
      }
    } else {
      // WYSIWYG Mode
      if (command === 'link') {
        const url = prompt('Enter link URL:', 'https://');
        if (url) this.execCmd('createLink', url);
      } else if (command === 'list') {
        this.execCmd('insertUnorderedList');
      } else if (command === 'orderedList') {
        this.execCmd('insertOrderedList');
      } else {
        this.execCmd(command, arg);
      }
    }
  }

  private execCmd(command: string, value?: string) {
    document.execCommand(command, false, value);
    
    if (command === 'createLink') {
      const selection = window.getSelection();
      if (selection && selection.anchorNode) {
        let node: Node | null = selection.anchorNode;
        while (node && node !== this.editorDivRef.nativeElement) {
          if (node.nodeName === 'A') {
            (node as HTMLAnchorElement).target = '_blank';
            break;
          }
          node = node.parentNode;
        }
      }
    }

    // Trigger input update manually since execCommand doesn't always fire input
    if (this.editorDivRef) {
      this.onInput({ target: this.editorDivRef.nativeElement } as any);
    }
  }

  insertMarkdown(prefix: string, suffix: string) {
    if (this.readonly || !this.textareaRef) return;
    
    const textarea = this.textareaRef.nativeElement;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    
    const before = text.substring(0, start);
    const selection = text.substring(start, end);
    const after = text.substring(end);
    
    const newText = before + prefix + selection + suffix + after;
    
    this.valueSignal.set(newText);
    this.onChange(newText);
    
    // Restore focus and selection
    setTimeout(() => {
      textarea.focus();
      // Place cursor after prefix, or select the wrapped text
      textarea.setSelectionRange(start + prefix.length, end + prefix.length);
    });
  }

  onKeyDown(event: KeyboardEvent) {
    if (this.readonly) return;

    // Shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key.toLowerCase()) {
        case 'b':
          event.preventDefault();
          this.insertMarkdown('**', '**');
          break;
        case 'i':
          event.preventDefault();
          this.insertMarkdown('*', '*');
          break;
        case 'k':
          event.preventDefault();
          this.insertMarkdown('[', '](url)');
          if (this.mode() === 'preview') this.handleCommand('link');
          break;
        case 'u':
          event.preventDefault();
          if (this.mode() === 'preview') this.handleCommand('underline');
          else this.insertMarkdown('<u>', '</u>');
          break;
      }
    }

    // WYSIWYG Specific Logic (Auto-format & Indentation)
    if (this.mode() === 'preview') {
      // Indentation (Tab)
      if (event.key === 'Tab') {
        event.preventDefault();
        document.execCommand(event.shiftKey ? 'outdent' : 'indent');
      }

      // Auto-formatting (Space)
      if (event.key === ' ') {
        const selection = window.getSelection();
        if (selection && selection.isCollapsed) {
          const anchor = selection.anchorNode;
          if (anchor && anchor.nodeType === Node.TEXT_NODE) {
            const text = anchor.textContent || '';
            const offset = selection.anchorOffset;
            const textBefore = text.substring(0, offset);

            // Check patterns
            if (textBefore === '*' || textBefore === '-') {
              event.preventDefault();
              this.deleteTextBefore(anchor, 1);
              document.execCommand('insertUnorderedList');
            } else if (textBefore === '1.') {
              event.preventDefault();
              this.deleteTextBefore(anchor, 2);
              document.execCommand('insertOrderedList');
            } else if (textBefore === '>') {
              event.preventDefault();
              this.deleteTextBefore(anchor, 1);
              document.execCommand('formatBlock', false, 'BLOCKQUOTE');
            }
          }
        }
      }
    }
  }

  private deleteTextBefore(node: Node, length: number) {
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, length);
    range.deleteContents();
  }
}