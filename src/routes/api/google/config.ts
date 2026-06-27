import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/google/config")({
  server: {
    handlers: {
      GET: async () => {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        if (!clientId) {
          return Response.json(
            { error: "GOOGLE_CLIENT_ID ist nicht konfiguriert." },
            { status: 503 }
          );
        }
        return Response.json({ clientId });
      },
    },
  },
});
