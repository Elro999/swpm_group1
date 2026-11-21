import "server-only";
import { getEnv } from "@/lib/env";
import { sharedMemoryRepo } from "./memory";
import { createSupabaseRepo } from "./supabase";
import type { Repo } from "./types";

let repo: Repo | undefined;

/** The app's data store, chosen by DATA_MODE. Server-only. */
export function getRepo(): Repo {
  if (repo) return repo;
  const env = getEnv();
  repo =
    env.DATA_MODE === "supabase"
      ? createSupabaseRepo(env.SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!)
      : sharedMemoryRepo();
  return repo;
}

export type { Repo } from "./types";
