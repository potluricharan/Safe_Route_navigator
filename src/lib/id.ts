/** Dependency-free random id. */
export function newId(prefix = "id"): string {
  const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  return `${prefix}-${rand}`;
}

/**
 * One-way privacy-preserving key for a voter on a specific hazard, so vote
 * independence can be counted without storing a public identity against it.
 */
export function voterKey(userId: string, hazardId: string): string {
  let h1 = 0xdeadbeef ^ userId.length;
  let h2 = 0x41c6ce57 ^ hazardId.length;
  const str = `${userId}:${hazardId}`;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0).toString(36).padStart(8, "0");
}