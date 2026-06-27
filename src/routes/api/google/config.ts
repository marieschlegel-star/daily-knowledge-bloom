import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/google/config")({
  server: {
    handlers: {
      GET: async () => {
        const clientId = process.env.GOOGLE_CLIENT_ID ?? null;
        return Response.json({ clientId, configured: Boolean(clientId) });
      },
    },
  },
});
