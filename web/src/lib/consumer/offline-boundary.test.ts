import { describe, expect, it } from "vitest";
import {
  getOfflineMutationDecision,
  getReconnectAnnouncement,
  isLocalDraftMutation,
  isOnlineOnlyMutation,
  offlineSyncPolicy,
} from "@/lib/consumer/offline-boundary";

describe("online-core offline boundary", () => {
  it("rejects every online mutation without creating a queue", () => {
    expect(offlineSyncPolicy.policy).toBe("online-core");
    expect(offlineSyncPolicy.queueEnabled).toBe(false);
    expect(offlineSyncPolicy.queueName).toBeNull();
    for (const mutation of offlineSyncPolicy.onlineOnlyMutations) {
      expect(getOfflineMutationDecision(mutation)).toMatchObject({
        accepted: false,
        queued: false,
        retryable: true,
        state: "offline",
        preservation: "none",
      });
    }
  });

  it("preserves only the proven review draft locally", () => {
    expect(getOfflineMutationDecision("review")).toMatchObject({
      accepted: false,
      queued: false,
      retryable: true,
      preservation: "local-draft",
    });
    expect(isLocalDraftMutation("review")).toBe(true);
    expect(isLocalDraftMutation("notes-highlights")).toBe(false);
  });

  it("keeps image, AI, push and timer actions online-only", () => {
    for (const mutation of ["images-ocr", "ai", "web-push", "timer"] as const) {
      expect(isOnlineOnlyMutation(mutation)).toBe(true);
      expect(getOfflineMutationDecision(mutation)).toMatchObject({
        accepted: false,
        queued: false,
        preservation: "none",
      });
    }
  });

  it("rejects duplicate and unsupported-mutation attempts without replay", () => {
    for (const mutation of ["progress", "images-ocr", "ai"] as const) {
      expect(getOfflineMutationDecision(mutation)).toMatchObject({
        accepted: false,
        queued: false,
        retryable: true,
      });
    }
  });

  it("makes reconnect observable without replaying a hidden queue", () => {
    expect(getReconnectAnnouncement()).toEqual({
      event: "bookgolas:online-reconnected",
      retryable: true,
      queueFlushed: false,
    });
  });
});
