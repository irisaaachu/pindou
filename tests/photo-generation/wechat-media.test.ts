import { describe, expect, test, vi } from "vitest";

import {
  PhotoMediaError,
  createWeChatMediaAdapter,
  type DecodedMedia,
  type PhotoMediaPlatform,
} from "../../src/adapters/photo-generation";

function decoded(overrides: Partial<DecodedMedia> = {}): DecodedMedia {
  return {
    width: 2,
    height: 1,
    data: new Uint8ClampedArray([
      255, 0, 0, 255,
      0, 255, 0, 255,
    ]),
    orientation: 1,
    ...overrides,
  };
}

function platform(overrides: Partial<PhotoMediaPlatform> = {}): PhotoMediaPlatform {
  return {
    chooseMedia: vi.fn().mockResolvedValue({
      tempFiles: [{ tempFilePath: "wxfile://selected-private-photo.jpg", fileType: "image" }],
    }),
    decodeImage: vi.fn().mockResolvedValue(decoded()),
    releaseImage: vi.fn(),
    ...overrides,
  };
}

async function expectPublicError(promise: Promise<unknown>, code: PhotoMediaError["code"]): Promise<void> {
  const error = await promise.catch((reason: unknown) => reason);

  expect(error).toBeInstanceOf(PhotoMediaError);
  expect(error).toMatchObject({ code, message: code });
  expect(String(error)).not.toContain("wxfile://");
}

describe("createWeChatMediaAdapter", () => {
  test("selects exactly one camera image", async () => {
    const dependencies = platform();
    const adapter = createWeChatMediaAdapter(dependencies);

    await expect(adapter.choose("camera")).resolves.toEqual({
      source: "camera",
      filePath: "wxfile://selected-private-photo.jpg",
    });
    expect(dependencies.chooseMedia).toHaveBeenCalledWith({
      count: 1,
      mediaType: ["image"],
      sourceType: ["camera"],
      sizeType: ["original"],
    });
  });

  test("selects exactly one album image", async () => {
    const dependencies = platform();
    const adapter = createWeChatMediaAdapter(dependencies);

    await adapter.choose("album");

    expect(dependencies.chooseMedia).toHaveBeenCalledWith(expect.objectContaining({
      count: 1,
      mediaType: ["image"],
      sourceType: ["album"],
    }));
  });

  test("maps media picker cancellation to CANCELLED", async () => {
    const adapter = createWeChatMediaAdapter(platform({
      chooseMedia: vi.fn().mockRejectedValue(new Error("chooseMedia:fail cancel wxfile://private.jpg")),
    }));

    await expectPublicError(adapter.choose("album"), "CANCELLED");
  });

  test("maps camera authorization denial to PERMISSION_DENIED", async () => {
    const adapter = createWeChatMediaAdapter(platform({
      chooseMedia: vi.fn().mockRejectedValue(new Error("chooseMedia:fail auth deny scope.camera wxfile://private.jpg")),
    }));

    await expectPublicError(adapter.choose("camera"), "PERMISSION_DENIED");
  });

  test("maps a decode failure to UNSUPPORTED_IMAGE without exposing the local path", async () => {
    const adapter = createWeChatMediaAdapter(platform({
      decodeImage: vi.fn().mockRejectedValue(new Error("cannot decode wxfile://selected-private-photo.jpg")),
    }));
    const selection = { source: "album" as const, filePath: "wxfile://selected-private-photo.jpg" };

    await expectPublicError(adapter.decode(selection), "UNSUPPORTED_IMAGE");
  });

  test("retries one memory failure with a 1024-pixel processing copy", async () => {
    const decodeImage = vi.fn()
      .mockRejectedValueOnce(new Error("out of memory"))
      .mockResolvedValueOnce(decoded());
    const adapter = createWeChatMediaAdapter(platform({ decodeImage }));
    const selection = { source: "album" as const, filePath: "wxfile://selected-private-photo.jpg" };

    await expect(adapter.decode(selection)).resolves.toMatchObject({
      width: 2,
      height: 1,
      source: "album",
    });
    expect(decodeImage).toHaveBeenNthCalledWith(1, selection.filePath, 2048);
    expect(decodeImage).toHaveBeenNthCalledWith(2, selection.filePath, 1024);
  });

  test("returns OUT_OF_MEMORY after the smaller retry also fails", async () => {
    const decodeImage = vi.fn().mockRejectedValue(new Error("canvas out of memory wxfile://selected-private-photo.jpg"));
    const adapter = createWeChatMediaAdapter(platform({ decodeImage }));
    const selection = { source: "camera" as const, filePath: "wxfile://selected-private-photo.jpg" };

    await expectPublicError(adapter.decode(selection), "OUT_OF_MEMORY");
    expect(decodeImage).toHaveBeenCalledTimes(2);
  });

  test("applies decoded orientation before returning public pixels", async () => {
    const adapter = createWeChatMediaAdapter(platform({
      decodeImage: vi.fn().mockResolvedValue(decoded({ orientation: 6 })),
    }));
    const selection = { source: "camera" as const, filePath: "wxfile://selected-private-photo.jpg" };

    await expect(adapter.decode(selection)).resolves.toEqual({
      width: 1,
      height: 2,
      data: new Uint8ClampedArray([
        255, 0, 0, 255,
        0, 255, 0, 255,
      ]),
      source: "camera",
    });
  });

  test("releases the most recently decoded platform image", async () => {
    const dependencies = platform();
    const adapter = createWeChatMediaAdapter(dependencies);
    const selection = { source: "album" as const, filePath: "wxfile://selected-private-photo.jpg" };

    await adapter.decode(selection);
    adapter.release();

    expect(dependencies.releaseImage).toHaveBeenCalledWith(expect.objectContaining({ width: 2, height: 1 }));
  });

  test("releases the previous decoded image before replacing it", async () => {
    const first = decoded({ width: 1, height: 1, data: new Uint8ClampedArray([255, 0, 0, 255]) });
    const second = decoded({ width: 1, height: 1, data: new Uint8ClampedArray([0, 255, 0, 255]) });
    const dependencies = platform({
      decodeImage: vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second),
    });
    const adapter = createWeChatMediaAdapter(dependencies);
    const selection = { source: "album" as const, filePath: "wxfile://selected-private-photo.jpg" };

    await adapter.decode(selection);
    await adapter.decode(selection);

    expect(dependencies.releaseImage).toHaveBeenCalledTimes(1);
    expect(dependencies.releaseImage).toHaveBeenCalledWith(first);
  });

  test("releases a decode that completes after disposal", async () => {
    let resolve!: (value: DecodedMedia) => void;
    const late = decoded();
    const dependencies = platform({ decodeImage: vi.fn().mockImplementation(() => new Promise((done) => { resolve = done; })) });
    const adapter = createWeChatMediaAdapter(dependencies);
    const pending = adapter.decode({ source: "album", filePath: "wxfile://selected-private-photo.jpg" });
    adapter.release();
    resolve(late);
    await expectPublicError(pending, "CANCELLED");
    expect(dependencies.releaseImage).toHaveBeenCalledWith(late);
  });
});
