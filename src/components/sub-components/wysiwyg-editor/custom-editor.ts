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


export class CustomEditor extends ClassicEditor {
 public Editor = ClassicEditor;

 public static data = '';

 public static config = {
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

   toolbar: [
     'heading',
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
     'sourceEditing'
   ],

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
   }
 };

}
