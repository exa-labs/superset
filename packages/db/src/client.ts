import { Pool as NeonPool, neon } from "@neondatabase/serverless";
import { config } from "dotenv";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleWs } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { Pool as PgPool } from "pg";

import { env } from "./env";
import { configureLocalProxy, isLocalProxy } from "./local-proxy";
import * as schema from "./schema";

config({ path: ".env", quiet: true });

const useLocalProxy = isLocalProxy(env.DATABASE_URL);

if (useLocalProxy) {
	configureLocalProxy();
}

const sql = neon(env.DATABASE_URL);
const localPool = useLocalProxy
	? new PgPool({ connectionString: env.DATABASE_URL_UNPOOLED })
	: null;

const neonDb = drizzle({
	client: sql,
	schema,
	casing: "snake_case",
});

const neonWsDb = drizzleWs({
	client: new NeonPool({ connectionString: env.DATABASE_URL }),
	schema,
	casing: "snake_case",
});

const localDb = localPool
	? drizzlePg({
			client: localPool,
			schema,
			casing: "snake_case",
		})
	: null;

export const db = (localDb ?? neonDb) as typeof neonDb;
export const dbWs = (localDb ?? neonWsDb) as typeof neonWsDb;
