import { sha256 } from "@noble/hashes/sha256";
import { bytesToHex, utf8ToBytes } from "@noble/hashes/utils";

import type { GalleryPayloadDescriptor, GalleryResult } from "./types";

export function sha256Utf8(text: string): string {
  return bytesToHex(sha256(utf8ToBytes(text)));
}

export function verifyPayloadIntegrity(text: string, descriptor: GalleryPayloadDescriptor): GalleryResult<void> {
  const bytes = utf8ToBytes(text);
  const digest = bytesToHex(sha256(bytes));

  if (bytes.length !== descriptor.byteSize || digest !== descriptor.sha256) {
    return { ok: false, error: { code: "PAYLOAD_INTEGRITY_FAILED" } };
  }

  return { ok: true, data: undefined };
}
