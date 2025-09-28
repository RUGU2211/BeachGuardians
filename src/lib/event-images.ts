export const EVENT_IMAGE_OPTIONS = [
  '/image_1.jpg',
  '/image_2.jpg',
  '/image_3.jpg',
  '/image_4.jpg',
];

// Deterministic picker when an identifier is available; random otherwise
export function pickEventImage(id?: string | number): string {
  const imgs = EVENT_IMAGE_OPTIONS;
  if (id === undefined || id === null) {
    return imgs[Math.floor(Math.random() * imgs.length)];
  }
  const s = String(id);
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = (hash * 31 + s.charCodeAt(i)) >>> 0;
  }
  return imgs[hash % imgs.length];
}

export function getRandomEventImage(): string {
  const imgs = EVENT_IMAGE_OPTIONS;
  return imgs[Math.floor(Math.random() * imgs.length)];
}