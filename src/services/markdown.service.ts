import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class MarkdownService {
  
  private codeBlocks: string[] = [];
  private mathBlocks: string[] = [];

  parse(markdown: string): string {
    if (!markdown) return '';
    
    // Reset storage
    this.codeBlocks = [];
    this.mathBlocks = [];

    let html = '\n' + markdown + '\n';

    // 1. Protect Code Blocks & Math (Placeholders)
    html = this.protectBlocks(html);

    // 2. Block Elements
    
    // Admonitions (!!! type "Title")
    html = html.replace(/\n!!! (\w+)(?: "(.*?)")?\n([\s\S]*?)(?=\n\n|\n!!!|$)/g, (match, type, title, content) => {
        const titleHtml = title ? `<div class="admonition-title">${title}</div>` : '';
        return `\n\n<div class="admonition ${type}">${titleHtml}<div class="admonition-content">${this.parseInline(content.trim())}</div></div>\n\n`;
    });

    // HR
    html = html.replace(/\n(---|\*\*\*|___)/g, '\n\n<hr>\n\n');

    // Headers
    html = html.replace(/\n(#+)\s+(.*)/g, (match, hashes, content) => {
        const level = hashes.length;
        const cleanContent = content.replace(/\s+#+\s*$/, '').trim();
        return `\n\n<h${level}>${this.parseInline(cleanContent)}</h${level}>\n\n`;
    });

    // Blockquotes
    html = html.replace(/\n> (.*)/g, '\n\n<blockquote>$1</blockquote>\n\n');

    // Lists (UL/OL) & Task Lists
    // Unordered
    html = html.replace(/(\n\s*[\*\-\+]\s.*)+/g, (match) => {
        const items = match.trim().split('\n').map(line => {
            const content = line.replace(/^\s*[\*\-\+]\s/, '');
            if (content.startsWith('[ ] ')) {
                return `<li class="task-list-item"><input type="checkbox" disabled> ${this.parseInline(content.substring(4))}</li>`;
            }
            if (content.startsWith('[x] ')) {
                return `<li class="task-list-item"><input type="checkbox" checked disabled> ${this.parseInline(content.substring(4))}</li>`;
            }
            return `<li>${this.parseInline(content)}</li>`;
        }).join('');
        return `\n\n<ul>${items}</ul>\n\n`;
    });

    // Ordered
    html = html.replace(/(\n\s*\d+\.\s.*)+/g, (match) => {
        const items = match.trim().split('\n').map(line => {
            const content = line.replace(/^\s*\d+\.\s/, '');
            return `<li>${this.parseInline(content)}</li>`;
        }).join('');
        return `\n\n<ol>${items}</ol>\n\n`;
    });

    // Tables (GFM with Alignment)
    html = html.replace(/\n((?:.*\|.*(?:\r?\n|\r)?)+)/g, (match, tableBlock) => {
        const rows = tableBlock.trim().split('\n').map(r => r.trim()).filter(r => r.length > 0);
        if (rows.length < 2) return match;
        
        const separator = rows[1];
        // Validate separator: must contain - and | and only allowed chars (space, -, :, |)
        if (!/^\|?[\s\-\:|]+\|?$/.test(separator) || !separator.includes('-')) return match;

        const parseRow = (row: string) => {
            // Handle escaped pipes
            const temp = row.replace(/\\\|/g, '__PIPE__');
            let content = temp.trim();
            if (content.startsWith('|')) content = content.substring(1);
            if (content.endsWith('|')) content = content.substring(0, content.length - 1);
            return content.split('|').map(c => c.replace(/__PIPE__/g, '|'));
        };

        const alignments = parseRow(separator).map(s => {
            s = s.trim();
            if (s.startsWith(':') && s.endsWith(':')) return 'center';
            if (s.endsWith(':')) return 'right';
            return 'left';
        });

        let table = '<table>';
        const headerCols = parseRow(rows[0]);
        table += '<thead><tr>';
        headerCols.forEach((col, i) => {
            const align = alignments[i] ? ` align="${alignments[i]}"` : '';
            table += `<th${align}>${this.parseInline(col.trim())}</th>`;
        });
        table += '</tr></thead><tbody>';
        
        for (let i = 2; i < rows.length; i++) {
            const cols = parseRow(rows[i]);
            table += '<tr>';
            cols.forEach((col, j) => {
                if (j >= alignments.length) return;
                const align = alignments[j] ? ` align="${alignments[j]}"` : '';
                table += `<td${align}>${this.parseInline(col.trim())}</td>`;
            });
            table += '</tr>';
        }
        table += '</tbody></table>';
        return `\n\n${table}\n\n`;
    });

    // Paragraphs
    html = html.trim().split(/\n{2,}/).map(block => {
        block = block.trim();
        if (!block) return '';
        if (/^<(div|table|ul|ol|h\d|blockquote|pre|hr|p|!--)/i.test(block)) return block;
        return `<p>${this.parseInline(block.replace(/\n/g, '<br>'))}</p>`;
    }).join('\n\n');

    // 3. Restore Blocks
    html = this.restoreBlocks(html);

    return html;
  }

  private protectBlocks(html: string): string {
    // Mermaid
    html = html.replace(/\n```mermaid([\s\S]*?)```/g, (match, code) => {
        this.codeBlocks.push(`<div class="mermaid">${code}</div>`);
        return `\n\n__CODE_BLOCK_${this.codeBlocks.length - 1}__\n\n`;
    });

    // Fenced Code
    html = html.replace(/\n```(\w*)([\s\S]*?)```/g, (match, lang, code) => {
        const languageClass = lang ? ` class="language-${lang}"` : '';
        this.codeBlocks.push(`<pre${languageClass}><code>${this.escapeHtml(code)}</code></pre>`);
        return `\n\n__CODE_BLOCK_${this.codeBlocks.length - 1}__\n\n`;
    });

    // Math Block
    html = html.replace(/\n\$\$([\s\S]*?)\$\$/g, (match, code) => {
        this.mathBlocks.push(`<div class="math-block">${this.escapeHtml(code)}</div>`);
        return `\n\n__MATH_BLOCK_${this.mathBlocks.length - 1}__\n\n`;
    });

    return html;
  }

  private restoreBlocks(html: string): string {
    html = html.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => this.codeBlocks[parseInt(index)]);
    html = html.replace(/__MATH_BLOCK_(\d+)__/g, (match, index) => this.mathBlocks[parseInt(index)]);
    return html;
  }

  private parseInline(text: string): string {
    // Images
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="img-fluid">');
    
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');
    
    // Bold & Italic
    text = text.replace(/\*\*\*([^\*]+)\*\*\*/g, '<b><i>$1</i></b>');
    text = text.replace(/\*\*([^\*]+)\*\*/g, '<b>$1</b>');
    text = text.replace(/__([^_]+)__/g, '<b>$1</b>');
    text = text.replace(/\*([^\*]+)\*/g, '<i>$1</i>');
    text = text.replace(/_([^_]+)_/g, '<i>$1</i>');
    
    // Strikethrough
    text = text.replace(/~~([^~]+)~~/g, '<s>$1</s>');
    
    // Highlight
    text = text.replace(/==([^=]+)==/g, '<mark>$1</mark>');
    
    // Inline Code
    text = text.replace(/`([^`]+)`/g, '<code>$1</code>');
    
    // Sub/Sup
    text = text.replace(/~([^~]+)~/g, '<sub>$1</sub>');
    text = text.replace(/\^([^\^]+)\^/g, '<sup>$1</sup>');
    
    // Math Inline
    text = text.replace(/\$([^$]+)\$/g, '<span class="math-inline">$1</span>');
    
    // Keyboard
    text = text.replace(/<kbd>(.*?)<\/kbd>/g, '<kbd>$1</kbd>');

    // Custom Color
    text = text.replace(/\[color=(.*?)\](.*?)\[\/color\]/g, '<span style="color:$1">$2</span>');

    return text;
  }

  escapeHtml(text: string): string {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
  
  stripScripts(html: string): string {
    return html
      .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
      .replace(/<iframe\b[^>]*>([\s\S]*?)<\/iframe>/gim, "")
      .replace(/on[a-z]+="[^"]*"/gim, "")
      .replace(/javascript:/gim, "");
  }

  // HTML to Markdown Conversion
  htmlToMarkdown(html: string): string {
    const temp = document.createElement('div');
    temp.innerHTML = html;

    const process = (node: Node): string => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent || '';
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return '';

      const el = node as HTMLElement;
      const tagName = el.tagName.toLowerCase();

      // Handle block elements
      if (tagName === 'ul') return '\n' + Array.from(el.children).map(li => `- ${process(li)}`).join('\n') + '\n';
      if (tagName === 'ol') return '\n' + Array.from(el.children).map((li, i) => `${i + 1}. ${process(li)}`).join('\n') + '\n';
      if (tagName === 'li') return Array.from(el.childNodes).map(process).join('');
      if (tagName === 'pre') return `\n\`\`\`\n${el.textContent}\n\`\`\`\n`;
      if (tagName === 'blockquote') return `\n> ${el.textContent}\n`;

      let content = Array.from(el.childNodes).map(process).join('');

      switch (tagName) {
        case 'b': case 'strong': return `**${content}**`;
        case 'i': case 'em': return `*${content}*`;
        case 'a': return `${content} || ''})`;
        case 'img': return `!${el.getAttribute('alt') || ''} || ''})`;
        case 'input':
          if (el.getAttribute('type') === 'checkbox') {
             return el.hasAttribute('checked') ? '[x] ' : '[ ] ';
          }
          return '';
        case 's': case 'strike': return `~~${content}~~`;
        case 'u': return `<u>${content}</u>`;
        case 'sup': return `^${content}^`;
        case 'sub': return `~${content}~`;
        case 'mark': return `==${content}==`;
        case 'code': return `\`${content}\``;
        case 'p': 
        case 'div':
          // Admonition check
          if (el.classList.contains('admonition')) {
            const type = Array.from(el.classList).find(c => c !== 'admonition') || 'note';
            const titleNode = el.querySelector('.admonition-title');
            const contentNode = el.querySelector('.admonition-content');
            const title = titleNode ? ` "${titleNode.textContent}"` : '';
            const admonitionContent = contentNode ? process(contentNode) : content;
            return `\n!!! ${type}${title}\n${admonitionContent.trim()}\n`;
          }

          if (el.hasAttributes()) {
             const attrs = Array.from(el.attributes).map(a => `${a.name}="${a.value}"`).join(' ');
             return `\n<${tagName} ${attrs}>${content}</${tagName}>\n`;
          }
          return `\n${content}\n`;
        case 'br': return '\n';
        case 'hr': return '\n---\n';
        case 'span': 
          if (el.style.color && el.style.length === 1) return `[color=${el.style.color}]${content}[/color]`;
          if (el.hasAttributes()) {
             const attrs = Array.from(el.attributes).map(a => `${a.name}="${a.value}"`).join(' ');
             return `<span ${attrs}>${content}</span>`;
          }
          return content;
        case 'font':
          if (el.hasAttribute('color')) return `[color=${el.getAttribute('color')}]${content}[/color]`;
          return content;
        case 'h1': return `\n# ${content}\n`;
        case 'h2': return `\n## ${content}\n`;
        case 'h3': return `\n### ${content}\n`;
        case 'h4': return `\n#### ${content}\n`;
        case 'h5': return `\n##### ${content}\n`;
        case 'h6': return `\n###### ${content}\n`;
        case 'table':
          let mdTable = '';
          const head = el.querySelector('thead');
          if (head) {
            const ths = Array.from(head.querySelectorAll('th'));
            mdTable += `| ${ths.map(th => process(th).trim()).join(' | ')} |\n`;
            mdTable += `| ${ths.map(th => {
              const align = th.getAttribute('align') || 'left';
              if (align === 'center') return ':---:';
              if (align === 'right') return '---:';
              return '---';
            }).join(' | ')} |\n`;
          }
          const body = el.querySelector('tbody');
          if (body) mdTable += Array.from(body.querySelectorAll('tr')).map(tr => `| ${Array.from(tr.querySelectorAll('td')).map(td => process(td).trim()).join(' | ')} |`).join('\n');
          return `\n${mdTable}\n`;
        default: return content;
      }
    };

    return process(temp).trim().replace(/\n{3,}/g, '\n\n');
  }
}