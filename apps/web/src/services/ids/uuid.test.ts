import { describe, expect, it, vi } from 'vitest';
import { createUuid } from './uuid';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe('createUuid', () => {
  it('uses randomUUID when available', () => {
    const value = '123e4567-e89b-42d3-a456-426614174000';
    const source = { randomUUID: vi.fn(() => value), getRandomValues: vi.fn() } as unknown as Crypto;
    expect(createUuid(source)).toBe(value);
    expect(source.randomUUID).toHaveBeenCalledOnce();
    expect(source.getRandomValues).not.toHaveBeenCalled();
  });

  it('formats random bytes as UUID v4 when randomUUID is unavailable', () => {
    const source = {
      getRandomValues(bytes: Uint8Array) {
        bytes.forEach((_, index) => { bytes[index] = index; });
        return bytes;
      }
    } as unknown as Crypto;
    expect(createUuid(source)).toMatch(UUID_V4);
  });

  it('returns UUID v4 values without Web Crypto', () => {
    expect(createUuid(null)).toMatch(UUID_V4);
  });
});
