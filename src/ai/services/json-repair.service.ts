import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class JsonRepairService {
  // Very small heuristic-based repair for common LLM JSON issues
  repair(raw: string): string {
    let s = raw.trim();

    // Strip leading/trailing markdown fences or backticks
    s = s.replace(/^[`~]{3}\s*json\s*\n?/i, '');
    s = s.replace(/^[`~]{3}\s*\n?/i, '');
    s = s.replace(/\n?[`~]{3}\s*$/g, '');
    s = s.replace(/^`+|`+$/g, '');

    // Remove any leading non-JSON text before the first object/array start.
    const firstBracket = s.search(/[\{\[]/);
    if (firstBracket > 0) {
      s = s.slice(firstBracket);
    }

    // Extract the first balanced JSON object/array and discard trailing prose.
    s = this.extractJsonSegment(s);

    // Sometimes LLM returns a JS object without quotes on keys - attempt to quote keys.
    // Simple regex to quote unquoted keys: { key: -> { "key":
    s = s.replace(/(\{|,\s*)([a-zA-Z0-9_\-]+)\s*:/g, '$1"$2":');

    // Fix single quotes to double quotes
    s = s.replace(/\'/g, '"');

    // Remove trailing commas before closing bracket
    s = s.replace(/,\s*([}\]])/g, '$1');

    return s.trim();
  }

  private extractJsonSegment(candidate: string): string {
    if (!candidate || !/^[\[{]/.test(candidate.trim())) {
      return candidate;
    }

    let depth = 0;
    let inString = false;
    let escape = false;
    let endIndex = -1;
    const trimmed = candidate.trim();

    for (let i = 0; i < trimmed.length; i++) {
      const char = trimmed[i];
      if (inString) {
        if (escape) {
          escape = false;
        } else if (char === '\\') {
          escape = true;
        } else if (char === '"') {
          inString = false;
        }
        continue;
      }

      if (char === '"') {
        inString = true;
        continue;
      }

      if (char === '{' || char === '[') {
        depth += 1;
        continue;
      }

      if (char === '}' || char === ']') {
        depth -= 1;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }

    return endIndex >= 0 ? trimmed.slice(0, endIndex + 1) : candidate;
  }

  tryParse(raw: string): any | null {
    try {
      return JSON.parse(raw);
    } catch (e) {
      const repaired = this.repair(raw);
      try {
        return JSON.parse(repaired);
      } catch (e2) {
        return null;
      }
    }
  }
}
