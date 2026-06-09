import { applyD1Migrations, env } from "cloudflare:test";

// Apply the generated D1 migrations to the isolated test database before tests.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
