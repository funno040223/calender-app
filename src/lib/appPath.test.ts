import { expect, it } from "vitest";
import { appPath } from "./appPath";

it("アプリの中の場所だけを通す", () => {
  expect(appPath("/?done=task-1:123")).toBe("/?done=task-1:123");
  expect(appPath("/calendar")).toBe("/calendar");
  for (const bad of ["//evil.example", "/\\evil.example", "/\t/evil.example", "https://evil.example", "", null, undefined]) {
    expect(appPath(bad)).toBe("/");
  }
});
