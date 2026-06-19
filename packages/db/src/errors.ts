export class DbError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown when a tenant does not exist in the registry. */
export class TenantNotFoundError extends DbError {}
