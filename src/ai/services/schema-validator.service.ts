import { Injectable } from '@angular/core';
import { ZodSchema, ZodError } from 'zod';

@Injectable({ providedIn: 'root' })
export class SchemaValidator {
  validate<T>(schema: ZodSchema<T>, data: unknown):
    | { success: true; data: T }
    | { success: false; errors: any; flatErrors: Array<{ path: string; message: string; code?: string }> } {
    const result = schema.safeParse(data);
    if (result.success) return { success: true, data: result.data };

    const zerr = result.error as ZodError<any>;
    const formatted = zerr.format ? zerr.format() : zerr;
    const flat = this.flattenZodIssues(zerr);
    return { success: false, errors: formatted, flatErrors: flat };
  }

  private flattenZodIssues(err: ZodError<any>) {
    return (err.issues || []).map(i => ({ path: (i.path || []).join('.') || '<root>', message: i.message, code: i.code }));
  }
}
