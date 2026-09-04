import type { GalleryPayloadCache, GalleryPayloadIdentity } from "../../domain/contracts";
import type { GalleryPayloadDescriptor } from "../../domain/gallery";
import { utf8ToBytes } from "@noble/hashes/utils";

export type { GalleryPayloadCache } from "../../domain/contracts";

export interface PayloadCacheDependencies {
  read(key: string): Promise<string | null>;
  write(key: string, text: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function payloadCacheKey(identity: GalleryPayloadIdentity, descriptor: GalleryPayloadDescriptor): string {
  return `gallery-payload-v1/${identity.id}/${identity.version}/${descriptor.sha256}.json`;
}

export function createPlatformPayloadCache(dependencies: PayloadCacheDependencies): GalleryPayloadCache {
  return {
    get: (key) => dependencies.read(key),
    put: (key, text, maximumByteSize) => {
      if (maximumByteSize !== undefined && utf8ToBytes(text).byteLength > maximumByteSize) {
        return Promise.reject(new Error("PAYLOAD_TOO_LARGE"));
      }
      return dependencies.write(key, text);
    },
    remove: (key) => dependencies.remove(key),
  };
}

interface WeChatFileSystemManager {
  readFile(options: { filePath: string; encoding: "utf8"; success(result: { data: string | ArrayBuffer }): void; fail(): void }): void;
  mkdir(options: { dirPath: string; recursive: true; success(): void; fail(error: unknown): void }): void;
  writeFile(options: { filePath: string; data: string; encoding: "utf8"; success(): void; fail(error: unknown): void }): void;
  unlink(options: { filePath: string; success(): void; fail(): void }): void;
}

export function createWeChatPayloadCache(fileSystem: WeChatFileSystemManager, userDataPath: string): GalleryPayloadCache {
  const pathFor = (key: string) => `${userDataPath}/${key}`;
  const dependencies: PayloadCacheDependencies = {
    read: (key) => new Promise((resolve) => fileSystem.readFile({
      filePath: pathFor(key), encoding: "utf8",
      success: ({ data }) => resolve(typeof data === "string" ? data : null),
      fail: () => resolve(null),
    })),
    write: (key, text) => new Promise((resolve, reject) => {
      const filePath = pathFor(key);
      const dirPath = filePath.slice(0, filePath.lastIndexOf("/"));
      fileSystem.mkdir({
        dirPath, recursive: true,
        success: () => fileSystem.writeFile({ filePath, data: text, encoding: "utf8", success: resolve, fail: reject }),
        fail: reject,
      });
    }),
    remove: (key) => new Promise((resolve) => fileSystem.unlink({ filePath: pathFor(key), success: resolve, fail: resolve })),
  };
  return createPlatformPayloadCache(dependencies);
}

interface H5Storage {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}

export function createH5PayloadCache(storage: H5Storage): GalleryPayloadCache {
  return createPlatformPayloadCache({ read: storage.get, write: storage.set, remove: storage.remove });
}

interface UniStorageRuntime {
  getStorage(options: { key: string; success(result: { data: unknown }): void; fail(): void }): void;
  setStorage(options: { key: string; data: string; success(): void; fail(error: unknown): void }): void;
  removeStorage(options: { key: string; success(): void; fail(): void }): void;
}

interface UniFileRuntime {
  getFileSystemManager(): WeChatFileSystemManager;
}

interface WeChatEnvironment {
  env: { USER_DATA_PATH: string };
}

declare const wx: WeChatEnvironment;

export function createUniH5PayloadCache(runtime = uni as unknown as UniStorageRuntime): GalleryPayloadCache {
  return createH5PayloadCache({
    get: (key) => new Promise((resolve) => runtime.getStorage({
      key,
      success: ({ data }) => resolve(typeof data === "string" ? data : null),
      fail: () => resolve(null),
    })),
    set: (key, value) => new Promise((resolve, reject) => runtime.setStorage({ key, data: value, success: resolve, fail: reject })),
    remove: (key) => new Promise((resolve) => runtime.removeStorage({ key, success: resolve, fail: resolve })),
  });
}

export function createUniWeChatPayloadCache(
  runtime = uni as unknown as UniFileRuntime,
  environment = wx,
): GalleryPayloadCache {
  return createWeChatPayloadCache(runtime.getFileSystemManager(), environment.env.USER_DATA_PATH);
}

export function createUniPayloadCache(): GalleryPayloadCache {
  return typeof wx === "undefined" ? createUniH5PayloadCache() : createUniWeChatPayloadCache();
}
