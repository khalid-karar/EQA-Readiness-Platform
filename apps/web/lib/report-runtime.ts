import { createReportJobHandlers, type Database } from "@eqa/db";
import { createObjectStoreFromEnv, type ObjectStore } from "@eqa/storage";
import { getAppDatabase } from "./db";

export interface ReportRuntimeDeps {
  readonly db: Database;
  readonly objectStore: ObjectStore;
}

let cachedRuntime: ReportRuntimeDeps | undefined;

export function getReportRuntime(): ReportRuntimeDeps {
  if (!cachedRuntime) {
    cachedRuntime = {
      db: getAppDatabase(),
      objectStore: createObjectStoreFromEnv(),
    };
  }
  return cachedRuntime;
}

export function getReportJobHandlers(): ReturnType<
  typeof createReportJobHandlers
> {
  const runtime = getReportRuntime();
  return createReportJobHandlers(runtime.db, runtime.objectStore);
}
