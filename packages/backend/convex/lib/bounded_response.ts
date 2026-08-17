export interface BoundedResponseOptions {
  maxBytes: number;
  resourceName: string;
}

/**
 * Read a response body without trusting Content-Length. The stream is cancelled
 * as soon as either the declared or observed size exceeds the configured cap.
 */
export async function readBoundedResponseBytes(
  response: Response,
  { maxBytes, resourceName }: BoundedResponseOptions,
): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel();
    throw new Error(`${resourceName} response is too large`);
  }

  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        throw new Error(`${resourceName} response is too large`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export async function readBoundedResponseText(
  response: Response,
  options: BoundedResponseOptions,
): Promise<string> {
  return new TextDecoder().decode(
    await readBoundedResponseBytes(response, options),
  );
}
