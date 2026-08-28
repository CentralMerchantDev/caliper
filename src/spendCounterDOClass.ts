// The actual Durable Object class exported to wrangler. Deliberately its
// own file, separate from src/spendCounterDO.ts's testable logic: this
// file imports "cloudflare:workers", a virtual module only the Workers
// runtime can resolve -- plain Node's module loader throws
// ERR_UNSUPPORTED_ESM_URL_SCHEME on it (confirmed by actually running the
// test suite, not assumed), so nothing that needs to run under plain Node
// (any test file) may import this file, directly or transitively.
import { DurableObject } from "cloudflare:workers";
import { SpendCounterLogic, handleSpendCounterRequest } from "./spendCounterDO";

export class SpendCounterDO extends DurableObject {
  private logic = new SpendCounterLogic(this.ctx.storage);

  async fetch(request: Request): Promise<Response> {
    return handleSpendCounterRequest(this.logic, request);
  }
}
