import { Injectable } from '@angular/core';
import { ZodSchema } from 'zod';

@Injectable({ providedIn: 'root' })
export class SchemaValidator {
  validate<T>(schema: ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; errors: any } {
    const result = schema.safeParse(data);
    if (result.success) return { success: true, data: result.data };
    return { success: false, errors: result.error.format ? result.error.format() : result.error }
  }
}
