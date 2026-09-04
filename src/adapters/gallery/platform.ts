import type { GalleryListQuery } from "../../domain/gallery";

export interface GalleryCloudDependencies {
  listCategories(): Promise<unknown>;
  listPatterns(query: GalleryListQuery): Promise<unknown>;
  getPattern(id: string): Promise<unknown>;
  downloadText(url: string): Promise<string>;
}

export function createGalleryCloudDependencies(): GalleryCloudDependencies {
  const gallery = uniCloud.importObject("pindou-gallery") as unknown as {
    listCategories(): Promise<unknown>;
    listPatterns(query: GalleryListQuery): Promise<unknown>;
    getPattern(id: string): Promise<unknown>;
  };

  return {
    listCategories: () => gallery.listCategories(),
    listPatterns: (query) => gallery.listPatterns(query),
    getPattern: (id) => gallery.getPattern(id),
    downloadText: (url) => new Promise((resolve, reject) => {
      uni.request({
        url,
        responseType: "text",
        success: ({ data }) => typeof data === "string" ? resolve(data) : reject(new Error("INVALID_PAYLOAD")),
        fail: reject,
      });
    }),
  };
}
