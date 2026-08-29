import { InvalidStickFigureError } from './validation.js';

export class BinaryReader {
  private readonly view: DataView;
  private offset = 0;

  constructor(source: ArrayBuffer | Uint8Array) {
    this.view =
      source instanceof Uint8Array
        ? new DataView(source.buffer, source.byteOffset, source.byteLength)
        : new DataView(source);
  }

  readUint8(): number {
    this.ensureAvailable(1);
    return this.view.getUint8(this.offset++);
  }

  readInt8(): number {
    this.ensureAvailable(1);
    return this.view.getInt8(this.offset++);
  }

  readInt16(): number {
    this.ensureAvailable(2);
    const value = this.view.getInt16(this.offset);
    this.offset += 2;
    return value;
  }

  readInt32(): number {
    this.ensureAvailable(4);
    const value = this.view.getInt32(this.offset);
    this.offset += 4;
    return value;
  }

  readFloat32(): number {
    this.ensureAvailable(4);
    const value = this.view.getFloat32(this.offset);
    this.offset += 4;
    return value;
  }

  skip(byteCount: number): void {
    this.ensureAvailable(byteCount);
    this.offset += byteCount;
  }

  private ensureAvailable(byteCount: number): void {
    if (this.offset + byteCount > this.view.byteLength) {
      throw new InvalidStickFigureError(
        'The Stick Nodes file is incomplete or corrupted.',
      );
    }
  }
}
