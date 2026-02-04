import { Pipe, PipeTransform, SecurityContext, inject } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

@Pipe({
  name: 'markdown',
  standalone: true
})
export class MarkdownPipe implements PipeTransform {
  private sanitizer = inject(DomSanitizer);

  transform(value: string | undefined | null): string {
    if (!value) return '';
    const html = this.parseMarkdown(value);
    return this.sanitizer.sanitize(SecurityContext.HTML, html) || '';
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

    // Paragraphs
    html = html.trim().split(/\n{2,}/).map(p => {
        if (p.startsWith('<') && p.endsWith('>')) {
          // Don't wrap elements that are already blocks
          if (p.startsWith('<pre') || p.startsWith('<ul') || p.startsWith('<ol') || p.startsWith('<h') || p.startsWith('<table') || p.startsWith('<hr')) {
            return p;
          }
        };
        return `<p>${p.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
  }
}