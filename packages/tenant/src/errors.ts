export class TenantError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/**
 * Thrown when data access is attempted without a resolved tenant context. This
 * is the runtime backstop behind the rule that every query is tenant-scoped.
 */
export class MissingTenantContextError extends TenantError {
  constructor(message = "Operation requires a resolved tenant context.") {
    super(message);
  }
}

/** Thrown when a request targets a tenant-scoped route but no tenant resolves. */
export class TenantNotResolvedError extends TenantError {}
