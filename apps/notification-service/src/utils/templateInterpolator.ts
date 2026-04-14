/**
 * Replaces {{placeholderName}} tokens in a template string with values
 * from the provided variables map.
 *
 * Unknown placeholders are left as-is so callers can detect missing vars.
 * Example:
 *   interpolate("Hello {{patientName}}!", { patientName: "Anura" })
 *   → "Hello Anura!"
 */
export const interpolate = (
  template: string,
  variables: Record<string, string> = {},
): string => {
  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return Object.prototype.hasOwnProperty.call(variables, key)
      ? variables[key]
      : `{{${key}}}`; // leave unresolved placeholders visible for debugging
  });
};

/**
 * Returns the list of placeholder names found in a template body.
 * Useful for validating that all required variables are supplied.
 */
export const extractPlaceholders = (template: string): string[] => {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);
  return [...matches].map((m) => m[1]);
};
