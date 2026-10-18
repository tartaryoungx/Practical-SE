import type { Api } from "./api-contract";
import { createMockApi } from "./mock/service";
let instance: Api;
// Replace this adapter with a credentialed HTTP client at the implementation phase.
export function getApi(): Api {
  if (!instance) {
    let storage: Storage | undefined;
    try {
      storage = window.sessionStorage;
    } catch {
      /* memory-only fallback */
    }
    instance = createMockApi({ storage });
  }
  return instance;
}
