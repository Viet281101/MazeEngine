export function shouldMergeWallsForConfig(
  rows: number,
  cols: number,
  enabled: boolean,
  threshold: number
): boolean {
  if (!enabled) {
    return false;
  }
  return rows >= threshold || cols >= threshold;
}

export function shouldRebuildForMeshConfig(
  maze: number[][][],
  currentEnabled: boolean,
  currentThreshold: number,
  nextEnabled: boolean,
  nextThreshold: number
): boolean {
  return maze.some(layer => {
    const rows = layer.length;
    const cols = layer[0]?.length ?? 0;
    const currentMerge = shouldMergeWallsForConfig(rows, cols, currentEnabled, currentThreshold);
    const nextMerge = shouldMergeWallsForConfig(rows, cols, nextEnabled, nextThreshold);
    return currentMerge !== nextMerge;
  });
}
