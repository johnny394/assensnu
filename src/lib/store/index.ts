import "server-only";
import { memoryStore } from "./memory";
import { supabaseStore } from "./supabase";
import type { Store } from "./types";

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Med Supabase-nøgler bruges databasen, ellers afprøvningsudgaven i hukommelsen
export const store: Store = url && key ? supabaseStore(url, key) : memoryStore;
export const isDemo = !(url && key);
