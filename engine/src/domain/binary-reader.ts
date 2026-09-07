import { InvalidStickFigureError } from './validation.js';

/**
 * A fixed-size slice of the file, read by absolute offset rather than in sequence.
 *
 * Stick Nodes packs each node into a record whose fields sit at fixed positions that moved
 * between file format revisions. Addressing them by offset lets one reader serve every
 * revision from a table, instead of a bespoke run of sequential reads per revision.
 */
export class RecordReader {
  constructor(
    private readonly view: DataView,
    private readonly base: number,
    private readonly size: number,
  ) {}

  int8(offset: number): number {
    return this.view.getInt8(this.check(offset, 1));
  }

  uint8(offset: number): number {
    return this.view.getUint8(this.check(offset, 1));
  }

  int16(offset: number): number {
    return this.view.getInt16(this.check(offset, 2));
  }

  int32(offset: number): number {
    return this.view.getInt32(this.check(offset, 4));
  }

  float32(offset: number): number {
    return this.view.getFloat32(this.check(offset, 4));
  }

  /** Colours are stored alpha first, then blue, green and red. */
  color(offset: number): string {
    const blue = this.uint8(offset + 1);
    const green = this.uint8(offset + 2);
    const red = this.uint8(offset + 3);
    return `#${toHex(red)}${toHex(green)}${toHex(blue)}`;
  }

  /** Reads a boolean field, or returns `fallback` for revisions that predate it. */
  flag(offset: number | undefined, fallback = false): boolean {
    return offset === undefined ? fallback : this.uint8(offset) !== 0;
  }

  private check(offset: number, byteCount: number): number {
    if (offset < 0 || offset + byteCount > this.size) {
      throw new InvalidStickFigureError(
        'The Stick Nodes file is incomplete or corrupted.',
      );
    }
    return this.base + offset;
  }
}

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

  /** Consumes `byteCount` bytes and hands them back for offset-addressed reads. */
  readRecord(byteCount: number): RecordReader {
    this.ensureAvailable(byteCount);
    const record = new RecordReader(this.view, this.offset, byteCount);
    this.offset += byteCount;
    return record;
  }

  skip(byteCount: number): void {
    this.ensureAvailable(byteCount);
    this.offset += byteCount;
  }

  get atEnd(): boolean {
    return this.offset === this.view.byteLength;
  }

  private ensureAvailable(byteCount: number): void {
    if (this.offset + byteCount > this.view.byteLength) {
      throw new InvalidStickFigureError(
        'The Stick Nodes file is incomplete or corrupted.',
      );
    }
  }
}

function toHex(value: number): string {
  return value.toString(16).padStart(2, '0');
}
