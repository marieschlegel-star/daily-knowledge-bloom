import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

export async function POST(req: Request) {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 503 });
    }

    const client = new Anthropic({ apiKey });
    const { action, context, messages } = await req.json();

    if (!action || !context) {
      return NextResponse.json({ error: "action and context required" }, { status: 400 });
    }

    const isKlausur = action === "klausur";
    const maxTokens = isKlausur ? 2000 : 1000;

    const systemPrompt = `Du bist ein intelligenter Lernassistent für das deutsche Referendariat.
Du kennst die relevanten Prüfungsschemata, Fallgruppen und examenstypischen Probleme.
Du antwortest immer auf Deutsch, präzise und examensrelevant.
Halte dich kurz und fokussiert. Keine langen Einleitungen.`;

    const contextStr = `
Fach: ${context.fach}
Thema: ${context.thema}
${context.klausurdatum ? `Klausurdatum: ${context.klausurdatum} (in ${context.tagesBisKlausur} Tagen)` : ""}
Lernstand: ${context.lernstand?.join(", ") || "keine Angabe"}
Wiederholungen: ${context.wiederholungen || 0}
Examensrelevanz: ${context.examensrelevanz?.join(", ") || "–"}
${context.pomodoroMinuten ? `Gelernte Minuten (Pomodoro): ${context.pomodoroMinuten}` : ""}
`.trim();

    const actionPrompts: Record<string, string> = {
      erklaeren: `Erkläre mir "${context.thema}" aus dem Fach ${context.fach} für das Referendariat. Fokus auf examensrelevante Aspekte${context.tagesBisKlausur ? ` (Klausur in ${context.tagesBisKlausur} Tagen)` : ""}.`,
      testen: `Teste mein Verständnis von "${context.thema}" (${context.fach}) mit 3-4 Verständnisfragen oder Multiple-Choice-Fragen. Praxisnah und examensrelevant.`,
      lernfragen: `Generiere 5 examensrelevante Lernfragen zu "${context.thema}" (${context.fach}). Format: Frage auf einer Zeile, dann kurze Musterlösung.`,
      karteikarten: `Erstelle 5 Karteikarten zu "${context.thema}" (${context.fach}). Antworte als JSON-Array: [{"frage": "...", "antwort": "..."}]`,
      klausur: `Erstelle eine realistische Referendariatsklausur zu "${context.thema}" (${context.fach}). Sachverhalt (ca. 200 Wörter) + Aufgabenstellung + kurze Lösungsskizze mit Prüfungsschema.`,
      optimieren: `Analysiere meinen Lernstand und optimiere den Lernplan:
${contextStr}
Empfehle konkret, wie ich die verbleibende Zeit bis zur Klausur optimal nutze. Priorisiere nach Examensrelevanz.`,
    };

    const userMessage = actionPrompts[action] || `Hilf mir mit "${context.thema}" (${context.fach}).`;

    const apiMessages = [
      ...(messages || []).map((m: any) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: userMessage },
    ];

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: apiMessages,
    });

    const content = response.content[0];
    if (content.type !== "text") {
      return NextResponse.json({ error: "Unexpected response type" }, { status: 500 });
    }

    return NextResponse.json({
      message: content.text,
      userMessage,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
