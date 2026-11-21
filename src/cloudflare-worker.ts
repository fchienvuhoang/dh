import handler from "vinext/server/fetch-handler";
import { closeDatabaseContext, databaseContext, type DatabaseContext } from "./lib/database-context";

export * from "vinext/server/fetch-handler";

const worker = {
  async fetch(request: Request, env: Record<string, unknown>, ctx: { waitUntil: (promise: Promise<unknown>) => void }) {
    const database: DatabaseContext = {};
    const background: Promise<unknown>[] = [];
    const requestContext = new Proxy(ctx, {
      get(target, key) {
        if (key === "waitUntil") return (promise: Promise<unknown>) => {
          background.push(Promise.resolve(promise));
          target.waitUntil(promise);
        };
        const value = Reflect.get(target, key, target);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
    async function finish() {
      // next/after cache warm-ups can still need the same request-owned pool.
      for (let completed = 0; completed < background.length;) {
        const pending = background.slice(completed);
        completed = background.length;
        await Promise.allSettled(pending);
      }
      await closeDatabaseContext(database);
    }
    return databaseContext.run(database, async () => {
      try {
        const response = await handler.fetch(request, env, requestContext);
        const headers = new Headers(response.headers);
        headers.set("X-Dhamma-Hosting", "cloudflare-workers");
        if (!response.body) {
          ctx.waitUntil(finish());
          return new Response(null, { status: response.status, statusText: response.statusText, headers });
        }
        // Keep request-owned PostgreSQL sockets alive until streamed rendering ends.
        const stream = new TransformStream();
        ctx.waitUntil(response.body.pipeTo(stream.writable).finally(finish));
        return new Response(stream.readable, { status: response.status, statusText: response.statusText, headers });
      } catch (error) {
        ctx.waitUntil(finish());
        throw error;
      }
    });
  },
};

export default worker;
