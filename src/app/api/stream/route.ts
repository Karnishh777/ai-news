import { getAllArticles } from "@/lib/news/provider";
import { rankTrending } from "@/lib/personalization";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Server-Sent Events stream for real-time breaking news. The client opens an
// EventSource to /api/stream; the feed and toast react to "breaking" events.
// In production this would subscribe to a Redis pub/sub channel fed by the
// ingestion pipeline; here it emits from the live article pool on an interval.
export async function GET(req: Request) {
  const encoder = new TextEncoder();
  const articles = rankTrending(await getAllArticles()).slice(0, 25);
  let i = 0;

  const stream = new ReadableStream({
    start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      send("connected", { ok: true, at: Date.now() });

      const tick = setInterval(() => {
        const a = articles[i % articles.length];
        i += 1;
        send("breaking", {
          id: a.id,
          slug: a.slug,
          title: a.title,
          category: a.category,
          source: a.source.name,
          imageUrl: a.imageUrl,
          at: Date.now(),
        });
      }, 22000);

      // keep-alive comment so proxies don't close the connection
      const ping = setInterval(() => controller.enqueue(encoder.encode(": ping\n\n")), 15000);

      const close = () => {
        clearInterval(tick);
        clearInterval(ping);
        try {
          controller.close();
        } catch {
          /* already closed */
        }
      };
      req.signal.addEventListener("abort", close);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
