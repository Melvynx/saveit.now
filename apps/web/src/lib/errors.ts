export class SafeActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SafeActionError";
  }
}

export class SafeRouteError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "SafeRouteError";
    this.status = status;
  }
}
