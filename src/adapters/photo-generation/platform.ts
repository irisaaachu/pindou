import type { ImageOrientation } from "../../domain/photo-generation";

export interface ChooseMediaOptions {
  count: 1;
  mediaType: ["image"];
  sourceType: ["camera" | "album"];
  sizeType: ["original"];
}

export interface ChooseMediaResult {
  tempFiles: Array<{ tempFilePath: string; fileType?: string }>;
}

export interface DecodedMedia {
  width: number;
  height: number;
  data: Uint8ClampedArray;
  orientation: ImageOrientation;
}

export interface PhotoMediaPlatform {
  chooseMedia(options: ChooseMediaOptions): Promise<ChooseMediaResult>;
  decodeImage(filePath: string, maxSide: number): Promise<DecodedMedia>;
  releaseImage(image: DecodedMedia): void;
}

export interface UniMediaApi {
  chooseMedia(options: ChooseMediaOptions & {
    success(result: ChooseMediaResult): void;
    fail(error: unknown): void;
  }): void;
}

export function createUniMediaPlatform(
  mediaApi: UniMediaApi,
  decodeImage: PhotoMediaPlatform["decodeImage"],
  releaseImage: PhotoMediaPlatform["releaseImage"] = () => undefined,
): PhotoMediaPlatform {
  return {
    chooseMedia(options) {
      return new Promise((resolve, reject) => {
        mediaApi.chooseMedia({ ...options, success: resolve, fail: reject });
      });
    },
    decodeImage,
    releaseImage,
  };
}
