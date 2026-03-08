import { Component, Input, forwardRef, output, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ControlValueAccessor, NG_VALUE_ACCESSOR, FormsModule } from '@angular/forms';
import { CKEditorModule } from '@ckeditor/ckeditor5-angular';
import { CustomEditor } from './custom-editor';

import {
 ClassicEditor,
 Essentials,
 Paragraph,
 Bold,
 Italic,
 Underline,
 Strikethrough,
 Code,
 Subscript,
 Superscript,
 RemoveFormat,
 Heading,
 BlockQuote,
 HorizontalLine,
 PageBreak,
 List,
 ListProperties,
 TodoList,
 FontFamily,
 FontSize,
 FontColor,
 FontBackgroundColor,
 Highlight,
 Alignment,
 Indent,
 IndentBlock,
 Link,
 AutoLink,
 Image,
 ImageToolbar,
 ImageCaption,
 ImageStyle,
 ImageResize,
 ImageUpload,
 ImageInsert,
 Table,
 TableToolbar,
 TableCaption,
 TableProperties,
 TableCellProperties,
 TableColumnResize,
 MediaEmbed,
 Autoformat,
 PasteFromOffice,
 TextTransformation,
 CodeBlock,
 SourceEditing,
 Base64UploadAdapter,
 Autosave,
 WordCount
} from 'ckeditor5';

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
export class WysiwygEditorComponent implements ControlValueAccessor {
  @Input() label: string = '';
  @Input() readonly: boolean = false;
  @Input() defaultView: 'edit' | 'preview' = 'preview';
  @Input() minHeight: string = '140px';
  
  input = output<string>();
  
  public Editor = CustomEditor;
  public editorConfig = CustomEditor.config;
  editorReady  = true;


 public data = '';

 public config = {
  licenseKey: 'GPL',
   plugins: [
     Essentials,
     Paragraph,
     Bold,
     Italic,
     Underline,
     Strikethrough,
     Code,
     Subscript,
     Superscript,
     RemoveFormat,
     Heading,
     BlockQuote,
     HorizontalLine,
     PageBreak,
     List,
     ListProperties,
     TodoList,
     FontFamily,
     FontSize,
     FontColor,
     FontBackgroundColor,
     Highlight,
     Alignment,
     Indent,
     IndentBlock,
     Link,
     AutoLink,
     Image,
     ImageToolbar,
     ImageCaption,
     ImageStyle,
     ImageResize,
     ImageUpload,
     ImageInsert,
     Table,
     TableToolbar,
     TableCaption,
     TableProperties,
     TableCellProperties,
     TableColumnResize,
     MediaEmbed,
     Autoformat,
     PasteFromOffice,
     TextTransformation,
     CodeBlock,
     SourceEditing,
     Base64UploadAdapter,
     Autosave,
     WordCount
   ],

   toolbar: {
      items: ['heading',
     '|',
     'bold','italic','underline','strikethrough',
     'fontSize','fontFamily','fontColor','fontBackgroundColor',
     '|',
     'alignment',
     'bulletedList','numberedList','todoList',
     '|',
     'link','insertImage','mediaEmbed',
     'insertTable','blockQuote','codeBlock',
     '|',
     'undo','redo',
     '|',
     'sourceEditing'],
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
      decorators: {
        openInNewTab: {
          mode: 'automatic',
          callback: (url: string) => true,
          attributes: {
            target: '_blank',
            rel: 'noopener noreferrer'
          }
        }
      }
    }
 };

  // public config = {
  //   toolbar: [
  //     'heading', '|',
  //     'bold', 'italic', 'link', 'bulletedList', 'numberedList', 'blockQuote', '|',
  //     'insertTable', 'mediaEmbed', 'codeBlock', 'removeFormat', '|',
  //     'undo', 'redo'
  //   ],
  //   language: 'en',
  //   link: {
  //     decorators: {
  //       openInNewTab: {
  //         mode: 'automatic',
  //         callback: (url: string) => true,
  //         attributes: {
  //           target: '_blank',
  //           rel: 'noopener noreferrer'
  //         }
  //       }
  //     }
  //   }
  // };

  editorData = '';
  

  onChange: (value: string) => void = () => {};
  onTouched: () => void = () => {};

  writeValue(value: string): void {
    this.editorData = value || '';
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.readonly = isDisabled;
  }

  onEditorChange(html: string) {
    this.onChange(html);
    this.input.emit(html);
  }
}