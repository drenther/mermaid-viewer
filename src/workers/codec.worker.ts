function arrayBufferToBase64url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlToArrayBuffer(base64url: string): Uint8Array<ArrayBuffer> {
  let base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4 !== 0) base64 += "=";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function compress(code: string): Promise<string> {
  const encoded = new TextEncoder().encode(code);
  const cs = new CompressionStream("deflate");
  const writer = cs.writable.getWriter();
  writer.write(encoded);
  writer.close();
  const compressed = await new Response(cs.readable).arrayBuffer();
  return arrayBufferToBase64url(new Uint8Array(compressed));
}

export async function decompress(payload: string): Promise<string> {
  const bytes = base64urlToArrayBuffer(payload);
  try {
    const ds = new DecompressionStream("deflate");
    const blob = new Blob([bytes]);
    const decompressed = await new Response(blob.stream().pipeThrough(ds)).arrayBuffer();
    return new TextDecoder().decode(decompressed);
  } catch {
    // Fallback: treat as plain base64-encoded UTF-8 (no compression)
    return new TextDecoder().decode(bytes);
  }
}
