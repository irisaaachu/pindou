import type {
  GalleryPayloadCache,
  GalleryPayloadIdentity,
  GalleryPayloadSource,
} from "../../domain/contracts";
import {
  validateGalleryPayload,
  verifyPayloadIntegrity,
  type GalleryPayloadDescriptor,
  type GalleryResult,
} from "../../domain/gallery";

export * from "./platform";
export * from "./platform-payload-cache";
export * from "./uni-cloud-gallery-repository";

function failure<T>(code: "INVALID_REQUEST" | "PAYLOAD_INTEGRITY_FAILED" | "UNSUPPORTED_VERSION"): GalleryResult<T> {
  return { ok: false, error: { code } };
}

function payloadIsUsable(
  text: string,
  descriptor: GalleryPayloadDescriptor,
  identity: GalleryPayloadIdentity,
): boolean {
  if (!verifyPayloadIntegrity(text, descriptor).ok) return false;
  try {
    const payload = validateGalleryPayload(JSON.parse(text));
    return payload.ok && payload.value.contentId === identity.id && payload.value.contentVersion === identity.version;
  } catch {
    return false;
  }
}

async function removeIgnoringFailure(cache: GalleryPayloadCache, key: string): Promise<void> {
  try {
    await cache.remove(key);
  } catch {
    // A cache is an optimization; failed cleanup cannot block a verified download.
  }
}

export function createCachedPayloadSource(
  source: GalleryPayloadSource,
  cache: GalleryPayloadCache,
): GalleryPayloadSource {
  return {
    async download(descriptor, identity) {
      if (!identity) return failure("INVALID_REQUEST");
      const key = `gallery-payload-v1/${identity.id}/${identity.version}/${descriptor.sha256}.json`;

      try {
        const cached = await cache.get(key);
        if (cached !== null) {
          if (payloadIsUsable(cached, descriptor, identity)) return { ok: true, data: cached };
          await removeIgnoringFailure(cache, key);
        }
      } catch {
        // A cache read failure must not prevent a network download.
      }

      for (let attempt = 0; attempt < 2; attempt += 1) {
        const downloaded = await source.download(descriptor, identity);
        if (!downloaded.ok) return downloaded;
        if (!payloadIsUsable(downloaded.data, descriptor, identity)) continue;
        try {
          await cache.put(key, downloaded.data, descriptor.byteSize);
        } catch {
          // A cache write failure must not prevent use of a verified payload.
        }
        return downloaded;
      }

      return failure("PAYLOAD_INTEGRITY_FAILED");
    },
  };
}
