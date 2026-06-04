import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class JsonRepairService {
  // Very small heuristic-based repair for common LLM JSON issues
  repair(raw: string): string {
    let s = raw.trim();

    // Strip leading/trailing markdown fences or backticks
    s = s.replace(/^```json\n?/i, '').replace(/\n?```$/, '');
    s = s.replace(/^`+|`+$/g, '');

    // Sometimes LLM returns a JS object without quotes on keys - attempt to quote keys
    // Simple regex to quote unquoted keys: { key: -> { "key":
    s = s.replace(/(\{|,\s*)([a-zA-Z0-9_\-]+)\s*:/g, '$1"$2":');

    // Fix single quotes to double quotes
    s = s.replace(/\'/g, '"');

    // Remove trailing commas before closing bracket
    s = s.replace(/,\s*([}\]])/g, '$1');

    return s;
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
