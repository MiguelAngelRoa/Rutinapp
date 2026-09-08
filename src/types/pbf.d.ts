declare module 'pbf' {
  export default class Pbf {
    constructor(buf?: Uint8Array | ArrayBuffer);
    buf: Uint8Array;
    pos: number;
    length: number;
    readFields<T>(
      readField: (tag: number, result: T, pbf: this) => void,
      result: T,
      end?: number,
    ): T;
    readMessage<T>(readField: (tag: number, result: T, pbf: this) => void, result: T): T;
    readVarint(isSigned?: boolean): number;
    readSVarint(): number;
    readBoolean(): boolean;
    readString(): string;
    readBytes(): Uint8Array;
    nextField(end?: number): number;
    skip(val: number): void;
  }

  export class PbfReader extends Pbf {}
}