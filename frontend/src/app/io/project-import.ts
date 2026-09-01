import { MAX_PROJECT_FILE_BYTES, parseProjectFile, type ProjectSnapshot } from './project-file';

export interface ProjectReadOptions {
  readonly maximumBytes?: number;
  readonly signal?: AbortSignal;
}

export async function readProjectFile(
  file: File,
  options: ProjectReadOptions = {},
): Promise<ProjectSnapshot> {
  const { maximumBytes = MAX_PROJECT_FILE_BYTES, signal } = options;
  if (!Number.isInteger(maximumBytes) || maximumBytes < 1) {
    throw new Error('The project file size limit must be at least one byte.');
  }
  throwIfAborted(signal);
  if (file.size > maximumBytes) {
    throw new Error('The project exceeds the maximum supported size.');
  }

  const header = new Uint8Array(await file.slice(0, 2).arrayBuffer());
  throwIfAborted(signal);
  const compressed = header[0] === 0x1f && header[1] === 0x8b;
  let stream = await fileByteStream(file, signal);

  if (compressed) {
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('This browser cannot open compressed project files.');
    }
    stream = (stream as ReadableStream<BufferSource>).pipeThrough(new DecompressionStream('gzip'));
  }

  return parseProjectFile(await readUtf8(stream, maximumBytes, signal));
}

async function fileByteStream(
  file: File,
  signal?: AbortSignal,
): Promise<ReadableStream<Uint8Array<ArrayBuffer>>> {
  const stream = (file as File & { stream?: File['stream'] }).stream;
  if (typeof stream === 'function') {
    return stream.call(file) as ReadableStream<Uint8Array<ArrayBuffer>>;
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  throwIfAborted(signal);
  return new ReadableStream<Uint8Array<ArrayBuffer>>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
}

async function readUtf8(
  stream: ReadableStream<Uint8Array<ArrayBuffer>>,
  maximumBytes: number,
  signal?: AbortSignal,
): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true });
  const parts: string[] = [];
  let totalBytes = 0;
  const cancel = () => void reader.cancel().catch(() => undefined);
  signal?.addEventListener('abort', cancel, { once: true });

  try {
    throwIfAborted(signal);
    while (true) {
      const { done, value } = await reader.read();
      throwIfAborted(signal);
      if (done) {
        break;
      }
      totalBytes += value.byteLength;
      if (totalBytes > maximumBytes) {
        await reader.cancel();
        throw new Error('The project exceeds the maximum supported size.');
      }
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join('');
  } catch (error: unknown) {
    await reader.cancel().catch(() => undefined);
    throw error;
  } finally {
    signal?.removeEventListener('abort', cancel);
    reader.releaseLock();
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new DOMException('The project import was cancelled.', 'AbortError');
  }
}
