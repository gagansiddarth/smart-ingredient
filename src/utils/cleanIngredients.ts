export function cleanIngredients(raw: string): string[] {
  const lower = raw.toLowerCase();
  const cleaned = lower
    .replace(/\([^)]*\)/g, ' ') // remove (10%), (net 200 g)
    .replace(/\bnet\b\s*\d+\s*[a-z]+/g, ' ')
    .replace(/[.;\n]/g, ',')
    .replace(/\s+\/\s+|\s*\+\s*/g, ',')
    .replace(/\s+/g, ' ')
    .replace(/\s*,\s*/g, ',');

  const parts = cleaned.split(',')
    .map(s => s.trim())
    .filter(Boolean)
    .map(s => s.replace(/^contains:\s*/,'').trim())
    .map(s => s.replace(/[^a-z0-9\-\s]/g, ''));

  // small alias map
  const aliases: Record<string,string> = {
    'citric acid': 'e330',
  };

  const mapped = parts.map(p => aliases[p] ?? p);

  // dedupe preserving order
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of mapped) {
    if (!seen.has(p)) { seen.add(p); out.push(p); }
  }
  return out;
}
