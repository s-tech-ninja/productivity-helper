import { Component, Input, forwardRef, signal, computed, SecurityContext, inject, ViewChild, ElementRef, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { IconComponent } from '../../icons/icon.component';

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
export class WysiwygEditorComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() readonly: boolean = false;
  @Input() minHeight: string = '140px';
  
  @ViewChild('textarea') textareaRef!: ElementRef<HTMLTextAreaElement>;
  @ViewChild('editorDiv') editorDivRef!: ElementRef<HTMLDivElement>;
  
  private sanitizer = inject(DomSanitizer);

  mode = signal<'edit' | 'preview'>('preview');
  valueSignal = signal('');
  previewHtml = signal(''); // Separate signal for innerHTML to control updates
  private isPreviewFocused = false;

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  parsedContent = computed(() => {
    const html = this.parseMarkdown(this.valueSignal());
    // Sanitize to prevent XSS attacks from malformed markdown/html
    return this.sanitizer.sanitize(SecurityContext.HTML, html);
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

  writeValue(value: string): void {
    let val = value || '';
    if (this.mode() === 'edit') {
      val = this.htmlToMarkdown(val);
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
    // Handle both Textarea (value) and Div (innerHTML)
    const value = target.tagName === 'TEXTAREA' 
      ? (target as HTMLTextAreaElement).value 
      : target.innerHTML;
      
    this.valueSignal.set(value);
    this.onChange(value);
  }
  
  onPreviewFocus() {
    this.isPreviewFocused = true;
  }

  onPreviewBlur() {
    this.isPreviewFocused = false;
    this.onTouched();
    // Ensure signal is in sync on blur
    if (this.editorDivRef) {
      this.valueSignal.set(this.editorDivRef.nativeElement.innerHTML);
    }
  }

  switchMode(newMode: 'edit' | 'preview') {
    if (this.mode() === newMode) return;

    if (newMode === 'edit') {
      // Converting from Preview (HTML) to Edit (Markdown)
      const html = this.valueSignal();
      const markdown = this.htmlToMarkdown(html);
      this.valueSignal.set(markdown);
      this.onChange(markdown);
    }
    
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

  private parseMarkdown(markdown: string): string {
    if (!markdown) return '';

    // Add newlines to help with regex matching at start/end of blocks
    let html = '\n' + markdown + '\n';

    // Block Elements
    html = html.replace(/\n```([\s\S]*?)```/g, (match, code) => `\n<pre><code>${code.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>\n`);
    html = html.replace(/\n---/g, '\n<hr>\n');
    html = html.replace(/\n(#+)\s+(.*)/g, (match, hashes, content) => {
        const level = hashes.length;
        return `\n<h${level}>${content}</h${level}>\n`;
    });
    html = html.replace(/\n> (.*)/g, '\n<blockquote>$1</blockquote>\n');

    // Lists (UL)
    html = html.replace(/(\n[\*\-]\s.*)+/g, (match) => {
        const items = match.trim().split('\n').map(item => `<li>${item.substring(2)}</li>`).join('');
        return `\n<ul>${items}</ul>\n`;
    });
    // Lists (OL)
    html = html.replace(/(\n\d+\.\s.*)+/g, (match) => {
        const items = match.trim().split('\n').map(item => `<li>${item.replace(/^\d+\.\s/, '')}</li>`).join('');
        return `\n<ol>${items}</ol>\n`;
    });

    // Tables (very basic)
    html = html.replace(/\n((?:\|.*\|(?:\r?\n|\r)?)+)/g, (match, tableBlock) => {
        const rows = tableBlock.trim().split('\n');
        if (rows.length < 2 || !rows[1].includes('---')) return match; // Not a table
        let table = '<table>';
        // Header
        const header = rows.shift();
        table += '<thead><tr>' + header.split('|').slice(1, -1).map(h => `<th>${h.trim()}</th>`).join('') + '</tr></thead>';
        // Separator
        rows.shift();
        // Body
        table += '<tbody>';
        rows.forEach(row => {
            table += '<tr>' + row.split('|').slice(1, -1).map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
        });
        table += '</tbody></table>';
        return `\n${table}\n`;
    });

    // Inline Elements
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    html = html.replace(/\*\*([^\*]+)\*\*/g, '<b>$1</b>');
    html = html.replace(/\*([^\*]+)\*/g, '<i>$1</i>');
    html = html.replace(/~~([^~]+)~~/g, '<s>$1</s>');
    // Note: HTML tags like <u>, <sup>, <span style="..."> pass through automatically

    // Paragraphs
    html = html.trim().split(/\n{2,}/).map(p => {
        if (p.startsWith('<') && p.endsWith('>')) {
          // Don't wrap elements that are already blocks
          if (p.startsWith('<pre') || p.startsWith('<ul') || p.startsWith('<ol') || p.startsWith('<h') || p.startsWith('<table') || p.startsWith('<hr') || p.startsWith('<p') || p.startsWith('<div') || p.startsWith('<blockquote')) {
            return p;
          }
        };
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }

  private htmlToMarkdown(html: string): string {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const process = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      // Handle block elements that need specific child processing
      if (tagName === 'ul') {
        return '\n' + Array.from(el.children).map(li => `- ${process(li)}`).join('\n') + '\n';
      }
      if (tagName === 'ol') {
        return '\n' + Array.from(el.children).map((li, i) => `${i + 1}. ${process(li)}`).join('\n') + '\n';
      }
      if (tagName === 'li') {
         return Array.from(el.childNodes).map(process).join('');
      }
      if (tagName === 'pre') {
         return `\n\`\`\`\n${el.textContent}\n\`\`\`\n`;
      }
      if (tagName === 'blockquote') {
         return `\n> ${el.textContent}\n`;
      }

      // Default child processing
      let content = Array.from(el.childNodes).map(process).join('');

      switch (tagName) {
        case 'b':
        case 'strong': return `**${content}**`;
        case 'i':
        case 'em': return `*${content}*`;
        case 'a': return `[${content}](${el.getAttribute('href')})`;
        case 's':
        case 'strike': return `~~${content}~~`;
        case 'u': return `<u>${content}</u>`;
        case 'sup': return `<sup>${content}</sup>`;
        case 'sub': return `<sub>${content}</sub>`;
        case 'p': return `\n${content}\n`;
        case 'div': return `\n${content}\n`;
        case 'br': return '\n';
        case 'hr': return '\n---\n';
        case 'span': return el.outerHTML; // Preserve color spans
        case 'h1': return `\n# ${content}\n`;
        case 'h2': return `\n## ${content}\n`;
        case 'h3': return `\n### ${content}\n`;
        case 'h4': return `\n#### ${content}\n`;
        case 'h5': return `\n##### ${content}\n`;
        case 'h6': return `\n###### ${content}\n`;
        case 'table': return `\n${el.textContent}\n`; // Fallback for tables
        default: return content;
      }
    };

    return process(temp).trim().replace(/\n{3,}/g, '\n\n');
  }
}