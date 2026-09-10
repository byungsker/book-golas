export type JsonObject = Record<string, unknown>;

export class ContractError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: JsonObject;

  constructor(status: number, code: string, message: string, details?: JsonObject) {
    super(message);
    this.name = "ContractError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
