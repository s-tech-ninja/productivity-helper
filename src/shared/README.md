# Shared Module

This module contains reusable components, directives, pipes, and validators used across multiple features.

## Structure

- **components/** - Reusable UI components
  - `icons/` - Icon component for SVG rendering
  - `wysiwyg-editor/` - Rich text editor wrapper (CKEditor5)
  - `modals/` - Reusable modal dialogs
    - `auth-modal/` - Authentication modal
    - `confirmation-modal/` - Generic confirmation dialog
    - `help-modal/` - Help/keyboard shortcuts
    - `settings-modal/` - User settings and preferences

- **pipes/** - Custom Angular pipes
  - `markdown.pipe.ts` - Transform markdown to sanitized HTML

- **directives/** - Reusable directives (placeholder)

- **validators/** - Custom form validators (placeholder)

- **ui/** - UI utilities and helpers (placeholder)

## Usage

```typescript
// Import shared components
import { IconComponent, WysiwygEditorComponent } from '@shared/components';

// Use markdown pipe
<div [innerHTML]="content | markdown"></div>
```
