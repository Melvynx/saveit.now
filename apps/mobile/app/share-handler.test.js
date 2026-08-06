/* global beforeEach, describe, expect, jest, require, test */
/* eslint-disable @typescript-eslint/no-require-imports */

let mockAuth;
let mockCreateBookmark;
let mockDialogProps;
let mockRouter;
let mockShareContext;

jest.mock(
  "@convex/_generated/api",
  () => ({ api: { bookmarks: { mutations: { create: "create" } } } }),
  { virtual: true },
);
jest.mock("convex/react", () => ({
  useMutation: () => mockCreateBookmark,
}));
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ presented: "1" }),
  useRouter: () => mockRouter,
}));
jest.mock("expo-share-intent", () => ({
  useShareIntentContext: () => mockShareContext,
}));
jest.mock("../src/contexts/AuthContext", () => ({
  useAuth: () => mockAuth,
}));
jest.mock("../src/lib/haptics", () => ({
  hapticSuccess: jest.fn(),
  hapticWarning: jest.fn(),
}));
jest.mock("../src/components/share/share-save-dialog", () => ({
  ShareSaveDialog: (props) => {
    mockDialogProps = props;
    return null;
  },
}));

const React = require("react");
const TestRenderer = require("react-test-renderer");
const ShareHandler = require("./share-handler").default;
const { act } = TestRenderer;

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

async function renderShareHandler() {
  let renderer;
  await act(async () => {
    renderer = TestRenderer.create(React.createElement(ShareHandler));
    await Promise.resolve();
    await Promise.resolve();
  });
  return renderer;
}

async function unmount(renderer) {
  await act(async () => {
    renderer.unmount();
  });
}

describe("ShareHandler save lifecycle", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockDialogProps = null;
    mockCreateBookmark = jest.fn();
    mockRouter = {
      back: jest.fn(),
      canGoBack: jest.fn(() => true),
      replace: jest.fn(),
    };
    mockShareContext = {
      isReady: true,
      hasShareIntent: true,
      shareIntent: {
        webUrl: "https://x.com/saveit/status/123",
        text: "",
        type: "weburl",
        meta: { title: "A shared post" },
      },
      resetShareIntent: jest.fn(),
      error: null,
    };
    mockAuth = {
      user: { id: "user_1", email: "verify@playwright.dev", onboarding: true },
      isLoading: false,
      isAuthenticated: true,
    };
  });

  test("handles a successful mutation after the started-state rerender", async () => {
    const save = deferred();
    mockCreateBookmark.mockReturnValue(save.promise);
    const renderer = await renderShareHandler();

    expect(mockCreateBookmark).toHaveBeenCalledTimes(1);
    await act(async () => {
      save.resolve();
      await save.promise;
    });

    expect(mockShareContext.resetShareIntent).toHaveBeenCalledTimes(1);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    await unmount(renderer);
  });

  test("surfaces an authenticated mutation rejection without closing", async () => {
    mockCreateBookmark.mockRejectedValue(new Error("UNAUTHORIZED"));
    const renderer = await renderShareHandler();

    await act(async () => {
      await Promise.resolve();
    });

    expect(mockDialogProps.title).toBe("Sign in again");
    expect(mockRouter.back).not.toHaveBeenCalled();
    await unmount(renderer);
  });

  test("invalidates a timed-out attempt and accepts the retried result", async () => {
    const firstSave = deferred();
    const retrySave = deferred();
    mockCreateBookmark
      .mockReturnValueOnce(firstSave.promise)
      .mockReturnValueOnce(retrySave.promise);
    const renderer = await renderShareHandler();

    await act(async () => {
      jest.advanceTimersByTime(30000);
    });
    expect(mockDialogProps.title).toBe("Something went wrong");

    await act(async () => {
      mockDialogProps.onRetry();
      await Promise.resolve();
    });
    expect(mockCreateBookmark).toHaveBeenCalledTimes(2);

    await act(async () => {
      retrySave.resolve();
      await retrySave.promise;
    });
    expect(mockRouter.back).toHaveBeenCalledTimes(1);

    await act(async () => {
      firstSave.resolve();
      await firstSave.promise;
    });
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    await unmount(renderer);
  });
});
