import { applyOrientation, type PhotoInput } from "../../domain/photo-generation";
import type { DecodedMedia, PhotoMediaPlatform } from "./platform";

export type PhotoSource = PhotoInput["source"];
export type PhotoMediaErrorCode = "CANCELLED" | "PERMISSION_DENIED" | "UNSUPPORTED_IMAGE" | "OUT_OF_MEMORY";

export interface MediaSelection {
  source: PhotoSource;
  filePath: string;
}

export interface PhotoMediaAdapter {
  choose(source: PhotoSource): Promise<MediaSelection>;
  decode(selection: MediaSelection): Promise<PhotoInput>;
  release(): void;
}

export class PhotoMediaError extends Error {
  constructor(readonly code: PhotoMediaErrorCode) {
    super(code);
    this.name = "PhotoMediaError";
  }
}

function errorText(error: unknown): string {
  if (error instanceof Error) return error.message.toLowerCase();
  return String(error).toLowerCase();
}

function isMemoryError(error: unknown): boolean {
  const text = errorText(error);
  return text.includes("out of memory") || text.includes("memory limit") || text.includes("oom");
}

function pickerError(error: unknown): PhotoMediaError {
  const text = errorText(error);
  if (text.includes("cancel")) return new PhotoMediaError("CANCELLED");
  if (text.includes("auth") || text.includes("permission") || text.includes("deny")) {
    return new PhotoMediaError("PERMISSION_DENIED");
  }
  return new PhotoMediaError("UNSUPPORTED_IMAGE");
}

export function createWeChatMediaAdapter(platform: PhotoMediaPlatform): PhotoMediaAdapter {
  let decodedResource: DecodedMedia | undefined;
  let decodeIdentity = 0;

  return {
    async choose(source) {
      try {
        const result = await platform.chooseMedia({
          count: 1,
          mediaType: ["image"],
          sourceType: [source],
          sizeType: ["original"],
        });
        const filePath = result.tempFiles[0]?.tempFilePath;
        if (!filePath) throw new Error("missing selected image");
        return { source, filePath };
      } catch (error) {
        if (error instanceof PhotoMediaError) throw error;
        throw pickerError(error);
      }
    },

    async decode(selection) {
      const identity = ++decodeIdentity;
      let decoded: DecodedMedia;
      try {
        decoded = await platform.decodeImage(selection.filePath, 2048);
      } catch (firstError) {
        if (!isMemoryError(firstError)) throw new PhotoMediaError("UNSUPPORTED_IMAGE");
        try {
          decoded = await platform.decodeImage(selection.filePath, 1024);
        } catch (secondError) {
          if (isMemoryError(secondError)) throw new PhotoMediaError("OUT_OF_MEMORY");
          throw new PhotoMediaError("UNSUPPORTED_IMAGE");
        }
      }

      if (identity !== decodeIdentity) {
        platform.releaseImage(decoded);
        throw new PhotoMediaError("CANCELLED");
      }
      if (decodedResource) platform.releaseImage(decodedResource);
      decodedResource = decoded;
      return applyOrientation({
        width: decoded.width,
        height: decoded.height,
        data: decoded.data,
        source: selection.source,
      }, decoded.orientation);
    },

    release() {
      decodeIdentity += 1;
      if (!decodedResource) return;
      platform.releaseImage(decodedResource);
      decodedResource = undefined;
    },
  };
}
