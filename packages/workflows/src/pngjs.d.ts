declare module "pngjs" {
  export class PNG {
    width: number;
    height: number;
    data: Buffer;
    constructor(options?: { width?: number; height?: number });
  }

  export namespace PNG {
    namespace sync {
      function read(buffer: Buffer): PNG;
      function write(png: PNG): Buffer;
    }
  }
}
