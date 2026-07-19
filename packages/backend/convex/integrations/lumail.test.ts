import { describe, expect, it, vi } from "vitest";
import {
  cancelWorkflowRunsAndDeleteSubscriber,
  LUMAIL_WORKFLOW_V2_IDS,
} from "./lumailDeletion";
import {
  getBookmarkLifecycleTags,
  LUMAIL_TAGS,
  normalizeMarketingUser,
  shouldQueueBookmarkLifecycle,
  shouldSyncMarketingUser,
} from "./lumailPolicy";

describe("Lumail lifecycle mapping", () => {
  it("only synchronizes marketable users with an email", () => {
    expect(shouldSyncMarketingUser(null)).toBe(false);
    expect(
      shouldSyncMarketingUser(normalizeMarketingUser({ _id: "missing" })),
    ).toBe(false);
    expect(
      shouldSyncMarketingUser(
        normalizeMarketingUser({
          _id: "optout",
          email: "optout@example.com",
          unsubscribed: true,
        }),
      ),
    ).toBe(false);
    expect(
      shouldSyncMarketingUser(
        normalizeMarketingUser({
          _id: "member",
          email: "member@example.com",
          unsubscribed: false,
        }),
      ),
    ).toBe(true);
  });

  it("maps bookmark milestones to stable Lumail tags", () => {
    expect(getBookmarkLifecycleTags(0, false)).toEqual([]);
    expect(getBookmarkLifecycleTags(1, false)).toEqual([
      LUMAIL_TAGS.hasBookmarks,
    ]);
    expect(getBookmarkLifecycleTags(10, false)).toEqual([
      LUMAIL_TAGS.hasBookmarks,
      LUMAIL_TAGS.engaged,
    ]);
    expect(getBookmarkLifecycleTags(19, true)).toEqual([
      LUMAIL_TAGS.hasBookmarks,
      LUMAIL_TAGS.engaged,
      LUMAIL_TAGS.limitReached,
    ]);
  });

  it("queues only product milestones and claimed limit offers", () => {
    expect(shouldQueueBookmarkLifecycle(0, false)).toBe(false);
    expect(shouldQueueBookmarkLifecycle(1, false)).toBe(true);
    expect(shouldQueueBookmarkLifecycle(10, false)).toBe(true);
    expect(shouldQueueBookmarkLifecycle(19, false)).toBe(false);
    expect(shouldQueueBookmarkLifecycle(19, true)).toBe(true);
  });
});

describe("Lumail subscriber deletion", () => {
  it("cancels every Workflow V2 run before deleting the subscriber", async () => {
    const calls: string[] = [];
    const run = vi.fn(
      async (_toolName: string, params: { workflowId: string }) => {
        calls.push(`cancel:${params.workflowId}`);
        return { success: true };
      },
    );
    const deleteSubscriber = vi.fn(async (email: string) => {
      calls.push(`delete:${email}`);
      return { success: true };
    });

    await cancelWorkflowRunsAndDeleteSubscriber(
      { tools: { run }, subscribers: { delete: deleteSubscriber } },
      "member@example.com",
    );

    expect(calls).toEqual([
      ...LUMAIL_WORKFLOW_V2_IDS.map((workflowId) => `cancel:${workflowId}`),
      "delete:member@example.com",
    ]);
  });

  it("does not delete when workflow cancellation fails", async () => {
    const deleteSubscriber = vi.fn();
    const failure = new Error("Lumail unavailable");

    await expect(
      cancelWorkflowRunsAndDeleteSubscriber(
        {
          tools: { run: vi.fn().mockRejectedValue(failure) },
          subscribers: { delete: deleteSubscriber },
        },
        "member@example.com",
      ),
    ).rejects.toThrow("Lumail unavailable");
    expect(deleteSubscriber).not.toHaveBeenCalled();
  });
});
