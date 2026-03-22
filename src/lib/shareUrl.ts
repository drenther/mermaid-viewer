const HASH_PREFIX = "#code/";

type CodecWorker = typeof import("../workers/codec.worker");

let worker: InstanceType<typeof ComlinkWorker<CodecWorker>> | null = null;

function getWorker(): InstanceType<typeof ComlinkWorker<CodecWorker>> {
  if (!worker) {
    worker = new ComlinkWorker<CodecWorker>(new URL("../workers/codec.worker", import.meta.url));
  }
  return worker;
}

export async function loadDiagramFromUrl(): Promise<string | null> {
  const hash = window.location.hash;
  if (!hash.startsWith(HASH_PREFIX)) return null;

  const payload = hash.slice(HASH_PREFIX.length);
  if (!payload) return null;

  try {
    return (await getWorker().decompress(payload)) || null;
  } catch {
    return null;
  }
}

export async function buildShareUrl(code: string): Promise<string> {
  const encoded = await getWorker().compress(code);
  const newHash = HASH_PREFIX + encoded;
  window.history.replaceState(null, "", newHash);
  return window.location.href;
}
