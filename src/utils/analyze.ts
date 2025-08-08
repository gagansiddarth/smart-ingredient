export type Classification = 'Healthy' | 'Moderately Harmful' | 'Harmful';

export type BreakdownItem = {
  ingredient: string;
  classification: Classification;
  severity: number; // 0..5
  reason: string;
};

export type AnalysisResult = {
  health_score: number; // 0..100
  summary: string;
  breakdown: BreakdownItem[];
  flags: string[];
};

const harmfulENumbers = new Set(['e102','e110','e122','e124','e129']);
const moderateList = new Set(['sugar','palm oil','salt','glucose syrup','fructose']);

export function scoreToHslParts(score: number): string {
  const clamped = Math.max(0, Math.min(100, score));
  const hue = Math.round((clamped / 100) * 120); // 0:red -> 120:green
  return `${hue} 75% 45%`;
}

function ruleBasedAnalyze(ingredients: string[]): AnalysisResult {
  const breakdown = ingredients.map<BreakdownItem>((ing) => {
    if (harmfulENumbers.has(ing)) {
      return { ingredient: ing, classification: 'Harmful', severity: 4, reason: 'Artificial additive with potential adverse effects' };
    }
    if (/^e\d{3}$/i.test(ing)) {
      return { ingredient: ing, classification: 'Moderately Harmful', severity: 2, reason: 'E-number additive; caution advised' };
    }
    if (moderateList.has(ing)) {
      const reason = ing === 'palm oil' ? 'High in saturated fat' : ing === 'sugar' ? 'Added sugar' : 'Consume in moderation';
      return { ingredient: ing, classification: 'Moderately Harmful', severity: 2, reason };
    }
    return { ingredient: ing, classification: 'Healthy', severity: 0, reason: 'Common food ingredient' };
  });

  const base = 100;
  const totalPenalty = breakdown.reduce((acc, b) => acc + b.severity * 6, 0);
  const health_score = Math.max(0, Math.min(100, base - totalPenalty));
  const flags = breakdown.filter(b => b.classification !== 'Healthy').map(b => b.ingredient);
  const summary = flags.length
    ? `Contains ${flags.join(', ')}; review before frequent consumption.`
    : 'No concerning additives detected.';

  return { health_score, summary, breakdown, flags };
}

export async function analyzeIngredients(text: string, apiKey?: string): Promise<AnalysisResult> {
  const ingredients = text.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);

  // If no API key, use rule-based deterministic analysis
  if (!apiKey) return ruleBasedAnalyze(ingredients);

  try {
    const userPrompt = `Analyze the following ingredient list. Return JSON with keys: "health_score" (0-100), "summary", "breakdown" (array of {ingredient, classification [Healthy | Moderately Harmful | Harmful], severity [0-5], reason}), and "flags" (array). Ingredients: "${ingredients.join(', ')}"`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0,
        messages: [
          { role: 'system', content: 'You are a concise food-safety analyst. Return only valid JSON matching the schema described.' },
          { role: 'user', content: userPrompt }
        ],
        response_format: { type: 'json_object' }
      })
    });
    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? '';
    const parsed = JSON.parse(content) as AnalysisResult;

    // Ensure deterministic score post-process
    const base = 100;
    const totalPenalty = parsed.breakdown.reduce((acc, b) => acc + b.severity * 6, 0);
    parsed.health_score = Math.max(0, Math.min(100, base - totalPenalty));

    return parsed;
  } catch (e) {
    // Fallback to rule-based if parsing/API fails
    return ruleBasedAnalyze(ingredients);
  }
}
