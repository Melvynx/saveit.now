/* global describe, expect, test */

import { readdirSync } from "node:fs";
import path from "node:path";

const ROUTE_TEST_FILE_PATTERN = /\.(test|spec)\.[jt]sx?$/;

function findRouteTestFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return findRouteTestFiles(entryPath);
    }

    return ROUTE_TEST_FILE_PATTERN.test(entry.name) ? [entryPath] : [];
  });
}

describe("Expo Router route hygiene", () => {
  test("keeps Jest files outside the app route directory", () => {
    const appDirectory = path.resolve(__dirname, "../app");
    const routeTestFiles = findRouteTestFiles(appDirectory).map((file) =>
      path.relative(appDirectory, file),
    );

    expect(routeTestFiles).toEqual([]);
  });
});
