// AI Suggestions — Groq-generated inventory insights, with a rule-based
// fallback so the dashboard never shows nothing if the API key is missing
// or the request fails.

export interface AISuggestion {
  title: string;
  detail: string;
}

export interface SuggestionInput {
  stats: {
    totalProducts: number;
    totalValue: number;
    deadStock: { count: number; value: number };
    atRisk: { count: number; value: number };
  };
  warehouses: { _id: string; name: string; capacityUsed: number }[];
  alerts: { type: string; severity: string; title: string }[];
}

export function buildRuleBasedSuggestions(data: SuggestionInput): AISuggestion[] {
  const { stats, warehouses, alerts } = data;
  const suggestions: AISuggestion[] = [];

  if (stats.atRisk.count > 0) {
    suggestions.push({
      title: "Move aging stock before it turns dead",
      detail: `${stats.atRisk.count} batch${stats.atRisk.count > 1 ? "es" : ""} worth ₹${Math.round(
        stats.atRisk.value
      ).toLocaleString("en-IN")} ${stats.atRisk.count > 1 ? "are" : "is"} aging 60–89 days. Bundle with fast movers or run a limited-time discount now.`,
    });
  }

  if (stats.deadStock.count > 0) {
    suggestions.push({
      title: "Liquidate dead stock to free up capital",
      detail: `₹${Math.round(stats.deadStock.value).toLocaleString("en-IN")} is tied up in ${
        stats.deadStock.count
      } dead batch${stats.deadStock.count > 1 ? "es" : ""}. A discounted sale recovers more value than continuing to store it.`,
    });
  }

  const lowStockCount = alerts.filter((a) => a.type === "low_stock").length;
  if (lowStockCount > 0) {
    suggestions.push({
      title: "Reorder before you run out",
      detail: `${lowStockCount} product${lowStockCount > 1 ? "s have" : " has"} dropped below its reorder level. Raise a purchase order to avoid a stockout.`,
    });
  }

  const byCapacity = [...warehouses].sort((a, b) => b.capacityUsed - a.capacityUsed);
  const fullest = byCapacity[0];
  const emptiest = byCapacity[byCapacity.length - 1];
  if (fullest && emptiest && fullest._id !== emptiest._id && fullest.capacityUsed >= 80 && emptiest.capacityUsed < 60) {
    suggestions.push({
      title: `Rebalance stock out of ${fullest.name}`,
      detail: `${fullest.name} is at ${fullest.capacityUsed}% capacity while ${emptiest.name} is at ${emptiest.capacityUsed}%. Transfer slow-moving batches to spread the load.`,
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      title: "Inventory looks healthy",
      detail: "No urgent risks detected right now. Keep an eye on reorder levels and aging batches as the week progresses.",
    });
  }

  return suggestions.slice(0, 4);
}

// The key is named GROK_API_KEY in .env but its "gsk_" prefix identifies it
// as a Groq (groq.com) key — Groq's OpenAI-compatible endpoint is used here.
export async function generateGroqSuggestions(data: SuggestionInput): Promise<AISuggestion[] | null> {
  const apiKey = process.env.GROK_API_KEY;
  if (!apiKey) return null;

  const lowStockCount = data.alerts.filter((a) => a.type === "low_stock").length;
  const warehouseSummary = data.warehouses.length
    ? data.warehouses.map((w) => `${w.name} at ${w.capacityUsed}% capacity`).join("; ")
    : "none";
  const alertSummary = data.alerts.length
    ? data.alerts.slice(0, 10).map((a) => `[${a.severity}] ${a.title}`).join("; ")
    : "none";

  const prompt = `You are an inventory analyst for a warehouse management system. Based on this snapshot, write 2-4 short, specific, actionable suggestions for the manager. Respond with ONLY a JSON object of the shape {"suggestions": [{"title": "...", "detail": "..."}]}. Keep each detail under 220 characters, concrete, no generic filler, no markdown.

Snapshot:
- Total SKUs: ${data.stats.totalProducts}, total inventory value: ₹${Math.round(data.stats.totalValue)}
- At-risk stock (60-89 days old): ${data.stats.atRisk.count} batches worth ₹${Math.round(data.stats.atRisk.value)}
- Dead stock (90+ days old): ${data.stats.deadStock.count} batches worth ₹${Math.round(data.stats.deadStock.value)}
- Low stock alerts: ${lowStockCount}
- Warehouses: ${warehouseSummary}
- Open alerts: ${alertSummary}`;

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.4,
        max_tokens: 500,
      }),
    });

    if (!res.ok) return null;

    const json = await res.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;

    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed.suggestions)) return null;

    const suggestions = parsed.suggestions.filter(
      (s: any) => s && typeof s.title === "string" && typeof s.detail === "string"
    );

    return suggestions.length ? suggestions.slice(0, 4) : null;
  } catch {
    return null;
  }
}
