export interface EnrichmentTypeDefinition {
  type: string;
  label: string;
  description: string;
  /** Key to extract as the display value from result jsonb */
  displayKey: string;
  /** How to format the display value */
  formatValue?: (value: unknown) => string;
}

const registry = new Map<string, EnrichmentTypeDefinition>();

export function registerEnrichmentType(def: EnrichmentTypeDefinition) {
  registry.set(def.type, def);
}

export function getEnrichmentType(type: string): EnrichmentTypeDefinition | undefined {
  return registry.get(type);
}

export function getAllEnrichmentTypes(): EnrichmentTypeDefinition[] {
  return Array.from(registry.values());
}

export function getDisplayValue(
  type: string,
  result: Record<string, unknown> | null,
): string {
  if (!result) return "—";
  const def = registry.get(type);
  if (!def) return JSON.stringify(result);
  const raw = result[def.displayKey];
  if (raw === null || raw === undefined) return "—";
  if (def.formatValue) return def.formatValue(raw);
  return String(raw);
}
