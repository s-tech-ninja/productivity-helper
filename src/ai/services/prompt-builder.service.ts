import { Injectable } from '@angular/core';
import { ZodSchema } from 'zod';

interface BuildOptions {
  skipExample?: boolean;
}

@Injectable({ providedIn: 'root' })
export class PromptBuilder {
  buildSystemPrompt(): string {
    return `You are an assistant that must respond with valid JSON following the provided Zod schema. Respond only with JSON. Do not use markdown fences, backticks, or explanatory text.`;
  }

  buildUserPrompt(context: string, instructions?: string) {
    return `${context}\n\n${instructions ?? ''}`;
  }

  // New method to generate only the content for a repair message
  buildRepairPromptContent(validation: any) {
    const issues = Array.isArray(validation.flatErrors)
      ? validation.flatErrors.map((issue: any) => `- ${issue.path}: ${issue.message}`).join('\n')
      : typeof validation.errors === 'string'
      ? validation.errors
      : JSON.stringify(validation.errors, null, 2);

    return `The previous JSON output did not validate against the schema. Please fix the JSON so it matches the expected schema exactly and return only valid JSON.
Validation issues:\n${issues}`;
  }

  private generateExampleFromSchema(schema: ZodSchema<any>): any {
    const gen = (s: any, depth = 0): any => {
      if (depth > 10 || !s) return null;
      
      const typeName = this.getTypeName(s);

      if (typeName === 'ZodObject') {
        const fields = s.shape || (s._def && s._def.shape);
        const resolvedFields = typeof fields === 'function' ? fields() : fields;
        const out: Record<string, any> = {};
        for (const k of Object.keys(resolvedFields || {})) {
          out[k] = gen(resolvedFields[k], depth + 1);
        }
        return out;
      }

      if (typeName === 'ZodString') return 'string';
      if (typeName === 'ZodNumber') return 1;
      if (typeName === 'ZodBoolean') return true;

      if (typeName === 'ZodEnum' || typeName === 'ZodNativeEnum') {
        const vals = s._def?.values || s.options;
        if (Array.isArray(vals) && vals.length) return vals[0];
        if (vals && typeof vals === 'object') {
          const keys = Object.keys(vals);
          if (keys.length) return vals[keys[0]];
        }
        return 'value';
      }

      if (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault' || typeName === 'ZodEffects') {
        const inner = s.unwrap ? s.unwrap() : (s.innerType ? s.innerType() : this.getInnerSchema(s._def));
        return gen(inner, depth + 1);
      }

      if (typeName === 'ZodArray') {
        const of = s.element || (s._def && s._def.type);
        return [gen(of, depth + 1)];
      }

      if (typeName === 'ZodUnion' || typeName === 'ZodDiscriminatedUnion') {
        const opts = s.options || (s._def && s._def.options);
        if (Array.isArray(opts) && opts.length) return gen(opts[0], depth + 1);
      }

      if (typeName === 'ZodLiteral') {
        return s._def ? s._def.value : null;
      }

      return null;
    };

    try {
      return gen(schema as any);
    } catch {
      return null;
    }
  }

  private getTypeName(schema: any): string {
    if (!schema) return 'unknown';
    if (schema._def && schema._def.typeName) return schema._def.typeName;
    if (schema.constructor?.name) return schema.constructor.name;
    return 'unknown';
  }

  private getInnerSchema(def: any, ...keys: string[]): any {
    // Try the provided keys first
    for (const key of keys) {
      if (def[key]) return def[key];
    }
    // Try common schema-like keys
    for (const key of ['type', 'element', 'innerType', 'schema', 'argument', 'left', 'right', 'inner']) {
      if (def[key]) return def[key];
    }
    // If nothing found, return undefined
    return undefined;
  }

  private buildSchemaShape(schema: ZodSchema<any>): any {
    const shape = (s: any, depth = 0, visited = new Set<any>()): any => {
      if (depth > 10 || !s) return 'unknown';
      const typeName = this.getTypeName(s);
      
      // Primitives can't cause circular dependencies and don't need tracking
      if (['ZodString', 'ZodNumber', 'ZodBigInt', 'ZodBoolean', 'ZodDate', 'ZodAny', 'ZodUnknown', 'ZodNever', 'ZodVoid'].includes(typeName)) {
        return typeName.replace(/^Zod/, '').toLowerCase();
      }

      if (visited.has(s)) return 'unknown';
      visited.add(s);

      if (typeName === 'ZodObject') {
        const fields = s.shape || (s._def && s._def.shape);
        const resolvedFields = typeof fields === 'function' ? fields() : fields;
        const result: Record<string, any> = {};
        for (const key of Object.keys(resolvedFields || {})) {
          result[key] = shape(resolvedFields[key], depth + 1, visited);
        }
        return result;
      }

      if (typeName === 'ZodLiteral') return s._def ? JSON.stringify(s._def.value) : 'literal';

      if (typeName === 'ZodEnum' || typeName === 'ZodNativeEnum') {
        const vals = s._def?.values || s.options;
        if (Array.isArray(vals)) return vals.join(' | ');
        if (vals && typeof vals === 'object') return Object.keys(vals).join(' | ');
        return 'enum';
      }

      if (typeName === 'ZodOptional' || typeName === 'ZodNullable' || typeName === 'ZodDefault' || typeName === 'ZodEffects' || typeName === 'ZodBranded' || typeName === 'ZodPipeline') {
        const inner = s.unwrap ? s.unwrap() : (s.innerType ? s.innerType() : this.getInnerSchema(s._def));
        const innerShape = inner ? shape(inner, depth + 1, visited) : 'unknown';
        if (typeName === 'ZodNullable') return `${innerShape} | null`;
        if (typeName === 'ZodOptional') return `${innerShape}?`;
        return innerShape;
      }

      if (typeName === 'ZodArray') {
        const of = s.element || (s._def && s._def.type);
        const elementShape = of ? shape(of, depth + 1, visited) : 'unknown';
        return [elementShape];
      }

      if (typeName === 'ZodTuple') {
        const items = Array.isArray(s.items) ? s.items : (s._def && s._def.items);
        return Array.isArray(items) ? items.map((item: any) => shape(item, depth + 1, visited)) : [];
      }

      if (typeName === 'ZodUnion' || typeName === 'ZodDiscriminatedUnion') {
        const opts = s.options || (s._def && s._def.options);
        if (Array.isArray(opts)) {
          const shapes = opts.map((opt: any) => shape(opt, depth + 1, visited));
          // flatten shape output for easier reading
          if (shapes.every((sh: any) => typeof sh === 'string')) return shapes.join(' | ');
          return shapes; 
        }
      }

      if (typeName === 'ZodRecord') {
        const valueType = s.valueSchema || (s._def && s._def.valueType);
        return { '<string>': valueType ? shape(valueType, depth + 1, visited) : 'unknown' };
      }

      if (typeName === 'ZodMap') {
        return { '<map>': 'map' };
      }

      if (typeName === 'ZodSet') {
        const of = s.valueSchema || (s._def && s._def.valueType);
        return { '<set>': of ? shape(of, depth + 1, visited) : 'unknown' };
      }

      if (typeName === 'ZodLazy') {
        const getter = s.schema || (s._def && s._def.getter);
        const resolved = typeof getter === 'function' ? getter() : null;
        return resolved ? shape(resolved, depth + 1, visited) : 'unknown';
      }

      if (typeName === 'ZodIntersection') {
        return { 
          allOf: [
            shape(s._def?.left || s.left, depth + 1, visited), 
            shape(s._def?.right || s.right, depth + 1, visited)
          ] 
        };
      }

      // Fallback: if shape property exists, treat as object
      if (s.shape || (s._def && s._def.shape)) {
        const fields = s.shape || s._def.shape;
        const resolvedFields = typeof fields === 'function' ? fields() : fields;
        const result: Record<string, any> = {};
        for (const key of Object.keys(resolvedFields || {})) {
          result[key] = shape(resolvedFields[key], depth + 1, visited);
        }
        return result;
      }

      return typeName.replace(/^Zod/, '') || 'unknown';
    };

    try {
      return shape(schema as any, 0, new Set());
    } catch (e) {
      console.warn('buildSchemaShape error:', e);
      return 'unknown';
    }
  }

  buildUserPromptWithExample(context: string, schema?: ZodSchema<any>, options?: BuildOptions) {
    const base = this.buildUserPrompt(
      context,
      'Respond with JSON that matches the schema and nothing else. Do not wrap the response in markdown, backticks, code fences, or explanatory text. Provide raw JSON only.'
    );
    const schemaShape = schema ? this.buildSchemaShape(schema) : null;
    const schemaText = schemaShape ? JSON.stringify(schemaShape, null, 2) : null;
    if (!schema || options?.skipExample) {
      const prompt = schemaText
        ? `${base}\nExpected schema structure (field types):\n${schemaText}`
        : base;
      console.log('PromptBuilder.buildUserPromptWithExample() built prompt without example:', prompt);
      return prompt;
    }
    const example = this.generateExampleFromSchema(schema);
    if (!example) {
      const prompt = schemaText
        ? `${base}\nExpected schema structure:\n${schemaText}`
        : base;
      console.log('PromptBuilder.buildUserPromptWithExample() example generation failed, using base prompt:', prompt);
      return prompt;
    }
    const exampleJson = JSON.stringify(example, null, 2);
    const prompt = schemaText
      ? `${base}\nExpected schema structure (field types):\n${schemaText}\nExample output:\n${exampleJson}\n\nOnly return the JSON object above exactly, without markdown or comments.`
      : `${base}\nExample output:\n${exampleJson}\n\nOnly return the JSON object above exactly, without markdown or comments.`;
    console.log('PromptBuilder.buildUserPromptWithExample() built prompt:', prompt);
    return prompt;
  }
}
