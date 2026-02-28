export function isInsideRect(
  x: number,
  y: number,
  rect: { x: number; y: number; width: number; height: number }
): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height;
}

export function getPointerPosition(e: MouseEvent | TouchEvent): { x: number; y: number } | null {
  if ('clientX' in e) {
    return { x: e.clientX, y: e.clientY };
  }

  const touch = e.touches[0];
  if (!touch) {
    return null;
  }

  return { x: touch.clientX, y: touch.clientY };
}
