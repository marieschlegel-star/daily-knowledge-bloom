import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/ai/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const apiKey = process.env.LOVABLE_API_KEY;
          if (!apiKey) return Response.json({ error: "LOVABLE_API_KEY missing" }, { status: 503 });

          const { action, context, messages } = await request.json();
          if (!action || !context) return Response.json({ error: "action and context required" }, { status: 400 });

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
            optimieren: `Analysiere meinen Lernstand und optimiere den Lernplan:\n${contextStr}\nEmpfehle konkret, wie ich die verbleibende Zeit bis zur Klausur optimal nutze. Priorisiere nach Examensrelevanz.`,
          };

          const userMessage = actionPrompts[action] || `Hilf mir mit "${context.thema}" (${context.fach}).`;

          const apiMessages = [
            { role: "system", content: systemPrompt },
            ...((messages || []) as any[]).map((m) => ({ role: m.role, content: m.content })),
            { role: "user", content: userMessage },
          ];

          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": apiKey,
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: apiMessages,
            }),
          });

          if (!res.ok) {
            const text = await res.text();
            return Response.json({ error: `AI Gateway ${res.status}: ${text}` }, { status: res.status });
          }
          const data = await res.json();
          const message = data?.choices?.[0]?.message?.content ?? "";
          return Response.json({ message, userMessage });
        } catch (e: any) {
          return Response.json({ error: e.message }, { status: 500 });
        }
      },
    },
  },
});
