import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { Toaster } from "sonner";

import appCss from "../styles.css?url";
import { useDayStore } from "@/lib/day-store";
import { useExamenStore } from "@/lib/examen-store";
import { useLernblockStore } from "@/lib/lernblock-store";
import { useThemenStore } from "@/lib/themen-store";
import { useGCalStore } from "@/lib/gcal-store";
import { useAppStore } from "@/lib/store";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Juris – AI Study Planner" },
      { name: "description", content: "Persönlicher Lern- und Planungskalender für das Referendariat" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <h1 className="text-5xl font-bold">404</h1>
        <p className="mt-2 text-muted-foreground">Seite nicht gefunden</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">Zurück zur Startseite</Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => {
    console.error(error);
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="text-center">
          <h1 className="text-xl font-semibold">Diese Seite konnte nicht geladen werden</h1>
          <a href="/" className="mt-4 inline-block text-primary underline">Zur Startseite</a>
        </div>
      </div>
    );
  },
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="de">
      <head><HeadContent /></head>
      <body className="antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  useEffect(() => {
    void Promise.all([
      useDayStore.persist.rehydrate(),
      useExamenStore.persist.rehydrate(),
      useLernblockStore.persist.rehydrate(),
      useThemenStore.persist.rehydrate(),
      useGCalStore.persist.rehydrate(),
      useAppStore.persist.rehydrate(),
    ]);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <Outlet />
      <Toaster position="top-right" />
    </QueryClientProvider>
  );
}
