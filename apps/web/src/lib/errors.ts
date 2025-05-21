export class ApplicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplicationError";
  }
}

export class SafeActionError extends ApplicationError {
  constructor(message: string) {
    super(message);
    this.name = "SafeActionError";
  }
}

export class SafeRouteError extends ApplicationError {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "SafeRouteError";
    this.status = status;
  }
}
