type CryptoSource = Pick<Crypto, 'randomUUID' | 'getRandomValues'>;

function formatUuid(bytes: Uint8Array): string {
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function fallbackBytes(): Uint8Array {
  const bytes = new Uint8Array(16);
  let time = Date.now();
  let highResolution = typeof performance === 'undefined' ? 0 : Math.floor(performance.now() * 1000);
  for (let index = 0; index < bytes.length; index += 1) {
    const random = Math.floor(Math.random() * 256);
    bytes[index] = random ^ (time & 0xff) ^ (highResolution & 0xff);
    time = Math.floor(time / 256);
    highResolution = Math.floor(highResolution / 256);
  }
  return bytes;
}

export function createUuid(source: CryptoSource | null | undefined = globalThis.crypto): string {
  if (typeof source?.randomUUID === 'function') return source.randomUUID();
  if (typeof source?.getRandomValues === 'function') {
    return formatUuid(source.getRandomValues(new Uint8Array(16)));
  }
  return formatUuid(fallbackBytes());
}
