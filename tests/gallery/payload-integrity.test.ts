import { describe, expect, test } from "vitest";

import { sha256Utf8, verifyPayloadIntegrity } from "../../src/domain/gallery";

describe("gallery payload integrity", () => {
  test.each([
    ["", "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"],
    ["abc", "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"],
  ])("calculates the published SHA-256 digest for %j", (text, digest) => {
    expect(sha256Utf8(text)).toBe(digest);
  });

  test("rejects a payload whose UTF-8 byte length differs from its descriptor", () => {
    expect(verifyPayloadIntegrity("猫", {
      fileRef: "gallery/cat.json", formatVersion: 1, byteSize: 1,
      sha256: "a810bf845a307382118e6e6aef21a79f6a26b1b3ad2225fe97b7ee4c125e3380",
    })).toEqual({ ok: false, error: { code: "PAYLOAD_INTEGRITY_FAILED" } });
  });

  test("rejects a payload whose SHA-256 digest differs from its descriptor", () => {
    expect(verifyPayloadIntegrity("abc", {
      fileRef: "gallery/abc.json", formatVersion: 1, byteSize: 3,
      sha256: "0".repeat(64),
    })).toEqual({ ok: false, error: { code: "PAYLOAD_INTEGRITY_FAILED" } });
  });

  test("accepts an exact UTF-8 byte length and lowercase digest", () => {
    expect(verifyPayloadIntegrity("abc", {
      fileRef: "gallery/abc.json", formatVersion: 1, byteSize: 3,
      sha256: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    })).toEqual({ ok: true, data: undefined });
  });
});
