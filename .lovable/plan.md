
# Migration auf TanStack Start

Ziel: Live-Domain (`daily-knowledge-bloom.lovable.app`) lädt die App korrekt, inklusive aller `/api/notion/*`-Routen und Notion-Integration. Aktuell scheitert das, weil Lovable nur statisches `dist/` serviert – Next.js braucht aber einen laufenden Node-Server.

## Strategie

Komplettes Projekt-Reset auf das Lovable-TanStack-Start-Template, dann Code aus `app/` + `components/` + `lib/` portieren. Kein Inkrement, sonst bleiben zwei Builder-Konfigurationen (Next + Vite) im Konflikt.

## Schritte

### 1. Cleanup
- Lösche `app/`, `next.config.mjs`, `next-env.d.ts`, `scripts/lovable-postbuild.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `global.d.ts`, `package.json` (Next-Variante), `tsconfig.json` (Next-Variante).
- Behalte `components/`, `lib/` als Quelle für die Portierung (werden anschließend nach `src/` verschoben).

### 2. TanStack Start Gerüst
- Neues `package.json` mit `@tanstack/react-router`, `@tanstack/react-start`, `@lovable.dev/vite-tanstack-config`, plus bestehende Deps (`@fullcalendar/*`, `zustand`, `date-fns`, `lucide-react`, `@tanstack/react-query`, `sonner`).
- `vite.config.ts`, `src/router.tsx`, `src/start.ts`, `src/styles.css`, `src/routes/__root.tsx`.
- Tailwind v4 via `@import "tailwindcss"` in `src/styles.css`.

### 3. Komponenten & Libs portieren
- `components/*` → `src/components/`
- `lib/*` → `src/lib/`
- `"use client"`-Direktiven entfernen.
- `next/link` → `@tanstack/react-router` `Link`.
- `next/navigation` (`useRouter`, `usePathname`) → TanStack Router-Hooks.
- Tailwind-Tokens beibehalten.

### 4. Routen
- `app/page.tsx` → `src/routes/index.tsx`
- `app/todos/page.tsx` → `src/routes/todos.tsx`
- `app/fokus/page.tsx` → `src/routes/fokus.tsx`

### 5. API-Routen → TSS Server Routes
Pro Endpoint ein File unter `src/routes/api/notion/*.ts` mit `createFileRoute(...).server.handlers`:
- `health.ts` (GET)
- `klausuren.ts` (GET)
- `todos.ts` (GET, PATCH)
- `sessions.ts` (GET, PATCH, DELETE, POST)
- `ai/chat.ts` (POST, streaming via Lovable AI Gateway)

`process.env.LOVABLE_API_KEY` und `NOTION_*` werden in den Handler-Bodies gelesen (nicht modul-scope), damit Cloudflare Workers korrekt funktioniert.

### 6. Notion-Gateway
`lib/notion-fetch.ts` bleibt fast unverändert (reines `fetch`), wird zu `src/lib/notion-fetch.server.ts` umbenannt und nur in den API-Handlern importiert.

### 7. AI Chat
`anthropic` raus, stattdessen Lovable AI Gateway (`google/gemini-3-flash-preview`). Streaming Response über Server Route `src/routes/api/ai/chat.ts`.

### 8. FullCalendar / Sonner
- FullCalendar funktioniert in TSS, läuft aber browserseitig. Wrappen mit `<ClientOnly>` aus `@tanstack/react-router` in der Kalender-Komponente.
- `<Toaster />` aus `sonner` in `__root.tsx`.

### 9. Build-Verifikation
- `bun install` → build läuft via `vite build` (kein Postbuild-Hack mehr nötig).
- Smoke-Test mit Playwright auf `localhost:8080`: `/`, `/todos`, `/fokus`, `GET /api/notion/health`.

## Risiken
- FullCalendar SSR-Fehler → mit `ClientOnly` lösbar.
- AI-Chat-Streaming muss auf AI-SDK statt Anthropic SDK umgestellt werden (kleine Anpassung im `SessionPanel`-Client).
- Tailwind v3 (Next) → v4 (TSS) Token-Mapping: Farben im `@theme`-Block in `src/styles.css` neu definieren.

## Bestätigung
Soll ich so vorgehen? Falls ja, fange ich mit Schritt 1–3 an und melde mich, sobald das Gerüst steht und die ersten Seiten rendern.
