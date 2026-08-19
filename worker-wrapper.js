const wrapper = {
  async fetch(request, env, ctx) {
    try {
      // Ensure process and process.env exist globally in the worker scope
      if (typeof process === "undefined") {
        globalThis.process = { env: {} };
      } else if (!process.env) {
        process.env = {};
      }

      // Copy all environment bindings into process.env so modules that read
      // from process.env at import/execution time work correctly.
      if (env) {
        for (const key of Object.keys(env)) {
          try {
            process.env[key] = env[key];
          } catch (e) {
            // Some bindings might be read-only on process.env
          }
        }
      }

      // Lazy-import the vinext handler after setting process.env so
      // module-level initializers see the correct DATABASE_URL.
      const mod = await import("vinext/server/fetch-handler");
      const handler = mod && (mod.default || mod);

      if (typeof handler === "function") {
        return await handler(request, env, ctx);
      }
      if (handler && typeof handler.fetch === "function") {
        return await handler.fetch(request, env, ctx);
      }

      throw new Error("vinext handler not found or invalid");
    } catch (err) {
      // Log the error so it appears in Wrangler/Cloudflare logs
      console.error("Unhandled Worker exception:", err && err.stack ? err.stack : err);
      return new Response("Internal Worker error. Check logs (Ray ID shown in Cloudflare).", {
        status: 500,
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }
  },
};

export default wrapper;
