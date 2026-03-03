import { Pipe, PipeTransform, SecurityContext, inject } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MarkdownService } from '../../services/markdown.service';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);
  private markdownService = inject(MarkdownService);

  transform(value: string | undefined | null): SafeHtml {
    if (!value) return this.sanitizer.bypassSecurityTrustHtml('');
    const html = this.markdownService.parse(value);
    // Use custom stripper to allow styles/colors but remove scripts
    const cleanHtml = this.markdownService.stripScripts(html);
    return this.sanitizer.bypassSecurityTrustHtml(cleanHtml);
  }

}