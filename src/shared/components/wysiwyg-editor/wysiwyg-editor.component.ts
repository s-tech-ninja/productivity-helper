import { Component, Input, Output, EventEmitter, forwardRef, ElementRef, HostBinding, ViewEncapsulation, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import ClassicEditor from '@ckeditor/ckeditor5-build-classic';

@Component({
  selector: 'app-wysiwyg-editor',
  standalone: true,
  imports: [CommonModule, CKEditorModule, FormsModule],
  templateUrl: './wysiwyg-editor.component.html',
  styleUrls: ['./wysiwyg-editor.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => WysiwygEditorComponent),
      multi: true
    }
  ],
  encapsulation: ViewEncapsulation.None
})
export class WysiwygEditorComponent implements ControlValueAccessor, AfterViewInit {
  @Input() label: string = '';
  @Input() readonly: boolean = false;
  @Input() defaultView: 'edit' | 'preview' = 'preview';
  @Input() minHeight: string = '140px';
  @Input() height?: string;
  
  @Output() input = new EventEmitter<string>();

  public Editor = ClassicEditor;
  public editorInstance: any;

public data = '';

public config = {
  licenseKey: 'GPL',
  placeholder: 'Start writing...',

  toolbar: {
    items: [
      'heading',
      '|',
      'bold',
      'italic',
      // 'underline',
      // 'strikethrough',
      // '|',
      // 'fontSize',
      // 'fontFamily',
      // 'fontColor',
      // 'fontBackgroundColor',
      // '|',
      // 'alignment',
      '|',
      'bulletedList',
      'numberedList',
      // 'todoList',
      '|',
      'link',
      'insertImage',
      'mediaEmbed',
      '|',
      'insertTable',
      'blockQuote',
      // 'codeBlock',
      '|',
      'undo',
      'redo',
      '|',
      // 'sourceEditing'
    ],
    shouldNotGroupWhenFull: false
  },

  image: {
    toolbar: [
      'imageStyle:inline',
      'imageStyle:block',
      'imageStyle:side',
      '|',
      'toggleImageCaption',
      'imageTextAlternative'
    ]
  },

  table: {
    contentToolbar: [
      'tableColumn',
      'tableRow',
      'mergeTableCells',
      'tableProperties',
      'tableCellProperties'
    ]
  },

  link: {
    // Automatically add target="_blank" and rel="noopener noreferrer" to all external links.
    addTargetToExternalLinks: true
  }
};

  editorData = '';
  
  @HostBinding('style.--editor-height') get editorHeightVar() {
    return this.height;
  }
  @HostBinding('style.--editor-min-height') get editorMinHeightVar() {
    return this.minHeight;
  }

  constructor(private elementRef: ElementRef) {}

  ngAfterViewInit(): void {
    this.setDisabledState(this.readonly);
  }

  onReady(editor: any) {
    this.editorInstance = editor;
    this.setDisabledState(this.readonly);
  }

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.editorData = value || '';
    if (this.editorInstance) {
      this.editorInstance.setData(this.editorData);
    }
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.readonly = isDisabled;
    if (this.editorInstance) {
      if (isDisabled) {
        this.editorInstance.enableReadOnlyMode('read-only');
      } else {
        this.editorInstance.disableReadOnlyMode('read-only');
      }
    }
    this.elementRef.nativeElement.classList.toggle('ck-disabled', isDisabled);
  }

  onEditorChange(html: string) {
    this.onChange(html);
    this.input.emit(html);
  }
}
