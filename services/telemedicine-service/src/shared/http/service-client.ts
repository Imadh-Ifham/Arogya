import { env } from "../../config/env.js";
import type { ServiceClientResult } from "../contracts/index.js";

export class ServiceClient {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number = env.requestTimeoutMs,
  ) {}

  async get<T>(path: string): Promise<ServiceClientResult<T>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
      });

      const payload = response.ok ? ((await response.json()) as T) : null;

      return {
        ok: response.ok,
        status: response.status,
        data: payload,
      };
    } finally {
      clearTimeout(timer);
    }
  }
}
