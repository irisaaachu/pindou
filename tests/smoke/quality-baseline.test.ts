import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";

describe("quality baseline", () => {
  it("exposes every required verification command", () => {
    expect(packageJson.scripts).toMatchObject({
      test: "vitest run --config vitest.config.mts",
      lint: "eslint . --ext .ts,.vue",
      "type-check": "vue-tsc --noEmit",
      "build:mp-weixin": "uni build -p mp-weixin",
    });
  });
});
