import {
  isValidIdentifier,
  MissingTenantContextError,
  type TenantContext,
} from "@eqa/tenant";
import { clientFor, type Database } from "../database";
import type { Row } from "../sql-client";

/**
 * Executes queries bound to a single tenant's schema. Construction fails unless
 * a valid tenant schema is present, so a query can never run without tenant
 * context. All table references are qualified with the tenant schema, giving
 * isolation without relying on session search_path.
 */
export class ScopedExecutor {
  private readonly schema: string;

  constructor(
    private readonly db: Database,
    context: TenantContext | null | undefined,
  ) {
    if (!context || !context.schemaName) {
      throw new MissingTenantContextError(
        "Tenant-scoped query attempted without a tenant context.",
      );
    }
    if (!isValidIdentifier(context.schemaName)) {
      throw new MissingTenantContextError(
        `Tenant context carries an invalid schema name '${context.schemaName}'.`,
      );
    }
    this.schema = context.schemaName;
  }

  /** Qualifies a table name with this tenant's schema. */
  table(name: string): string {
    return `"${this.schema}".${name}`;
  }

  async query<R extends Row = Row>(
    text: string,
    params?: readonly unknown[],
  ): Promise<R[]> {
    const { rows } = await clientFor(this.db).query<R>(text, params);
    return rows;
  }
}
