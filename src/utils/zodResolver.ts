import { toNestErrors, validateFieldsNatively } from '@hookform/resolvers';
import { appendErrors, type FieldValues, type Resolver } from 'react-hook-form';
import type { ZodType } from 'zod';

/**
 * Zod 4-compatible resolver for react-hook-form.
 *
 * `@hookform/resolvers@3.10`'s built-in `zodResolver` reads `ZodError.errors`
 * (the Zod 3 API). Zod 4 renamed that to `.issues`, so the built-in resolver
 * fails its `Array.isArray(err.errors)` guard and RE-THROWS the ZodError — the
 * validation errors never reach the form and an uncaught ZodError is logged.
 *
 * This adapter mirrors the library's mapping (same `toNestErrors` /
 * `appendErrors` helpers, so the error shape RHF receives is identical) but
 * reads `result.error.issues`, the Zod 4 field.
 */
type Issue = { code: string; message: string; path: (string | number)[] };

function issuesToErrors(issues: Issue[], validateAllFieldCriteria: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const errors: Record<string, any> = {};
  for (const issue of issues) {
    const path = issue.path.join('.');
    if (!path) continue;
    if (!errors[path]) {
      errors[path] = { message: issue.message, type: issue.code };
    }
    if (validateAllFieldCriteria) {
      const types = errors[path].types;
      const prev = types && types[issue.code];
      errors[path] = appendErrors(
        path,
        validateAllFieldCriteria,
        errors,
        issue.code,
        prev ? ([] as string[]).concat(prev, issue.message) : issue.message,
      );
    }
  }
  return errors;
}

export function zodResolver<T extends FieldValues>(schema: ZodType<T>): Resolver<T> {
  return async (values, _context, options) => {
    const result = await schema.safeParseAsync(values);

    if (result.success) {
      if (options.shouldUseNativeValidation) validateFieldsNatively({}, options);
      return { errors: {}, values: result.data };
    }

    return {
      values: {},
      errors: toNestErrors(
        issuesToErrors(
          result.error.issues as Issue[],
          !options.shouldUseNativeValidation && options.criteriaMode === 'all',
        ),
        options,
      ),
    };
  };
}
