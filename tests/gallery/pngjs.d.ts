declare module "pngjs" {
  export class PNG {
    constructor(options: { width: number; height: number; colorType?: number; inputHasAlpha?: boolean });
    width: number;
    height: number;
    data: Uint8Array;
    static sync: {
      read(buffer: Buffer): PNG;
      write(image: PNG, options?: { colorType?: number; inputHasAlpha?: boolean }): Buffer;
    };
  }
}
