import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, api, setAccessToken, setUnauthorizedHandler } from "../api/client";

afterEach(() => {
  vi.unstubAllGlobals();
  setAccessToken(null);
  setUnauthorizedHandler(null);
});

describe("API client", () => {
  it("sends the bearer token and normalizes validation failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "internal validation data" }), {
      status: 422, headers: { "Content-Type": "application/json" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    setAccessToken("sample-token");

    await expect(api.me()).rejects.toMatchObject({
      name: "ApiError",
      status: 422,
      message: "Please check the information and try again.",
    } satisfies Partial<ApiError>);
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual(expect.any(Headers));
    expect((fetchMock.mock.calls[0][1]?.headers as Headers).get("Authorization")).toBe("Bearer sample-token");
  });

  it("clears invalid authenticated sessions without exposing backend detail", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ detail: "secret internal error" }), { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);
    const onUnauthorized = vi.fn();
    setUnauthorizedHandler(onUnauthorized);
    setAccessToken("expired-token");

    await expect(api.me()).rejects.toThrow("Your session has expired. Please sign in again.");
    expect(onUnauthorized).toHaveBeenCalledOnce();
  });

  it("surfaces a safe network error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network internals")));
    await expect(api.me()).rejects.toThrow("Could not connect. Check your connection and try again.");
  });
});
