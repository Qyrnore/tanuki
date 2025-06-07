import { Application, Router } from "./deps.ts";
import { PgClient }   from "./deps.ts";

const db = new PgClient({
  hostname: Deno.env.get("PG_HOST"),
  user:     Deno.env.get("PG_USER"),
  password: Deno.env.get("PG_PASSWORD"),
  database: Deno.env.get("PG_USER_DB"),
});
await db.connect();

const router = new Router();
router.get("/", (ctx) => ctx.response.body = { service: "user", ok: true });

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

const port = Number(Deno.env.get("PORT") ?? 8010);
console.log(`User Service on :${port}`);
await app.listen({ port });
