import type { MainApp } from '../app/main-app';
import { getSharedMazeRecordBySlug } from './maze-storage-service';

const SHARE_QUERY_PARAM = 'maze';
const SHARE_SLUG_PATTERN = /^[a-z0-9]{8,64}$/;

export async function loadSharedMazeFromUrl(app: MainApp): Promise<void> {
  const query = new URLSearchParams(window.location.search);
  const mazeSlug = query.get(SHARE_QUERY_PARAM)?.trim().toLowerCase();
  if (!mazeSlug || !SHARE_SLUG_PATTERN.test(mazeSlug)) {
    return;
  }

  try {
    const sharedMaze = await getSharedMazeRecordBySlug(mazeSlug);
    if (!sharedMaze) {
      console.warn(`[share] Shared maze not found for slug: ${mazeSlug}`);
      return;
    }

    const markers = sharedMaze.payload.markers;
    app.updateMaze(
      sharedMaze.payload.mazeData,
      sharedMaze.payload.multiLayer,
      {
        start: markers?.start ?? null,
        end: markers?.end ?? null,
      },
      { preserveCamera: true }
    );
  } catch (error) {
    console.error('[share] Failed to load shared maze from URL:', error);
  }
}
