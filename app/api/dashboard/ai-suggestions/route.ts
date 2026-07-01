import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { buildRuleBasedSuggestions, generateGroqSuggestions } from "@/lib/ai-suggestions";

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const input = {
      stats: body.stats,
      warehouses: body.warehouses ?? [],
      alerts: body.alerts ?? [],
    };

    const aiSuggestions = await generateGroqSuggestions(input);
    const suggestions = aiSuggestions ?? buildRuleBasedSuggestions(input);

    return NextResponse.json({ suggestions, source: aiSuggestions ? "ai" : "rules" });
  } catch (error) {
    console.error("AI suggestions error:", error);
    return NextResponse.json({ error: "Failed to generate suggestions" }, { status: 500 });
  }
}
