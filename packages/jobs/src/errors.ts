export class JobError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}

/** Thrown when enqueuing/executing a job whose name has no registered handler. */
export class NoHandlerError extends JobError {
  constructor(name: string) {
    super(`No handler registered for job '${name}'.`);
  }
}

/** Thrown when querying a job that does not exist. */
export class JobNotFoundError extends JobError {}
