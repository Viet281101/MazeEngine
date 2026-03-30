import type { MazeData, MazeMarkers } from '../types/maze';
import { getCurrentUser } from './auth-service';
import { getSupabaseClient } from './supabase-client';

const MAZE_SCHEMA_VERSION = 1;
const DEFAULT_FETCH_LIMIT = 50;
const SHARE_SLUG_PATTERN = /^[a-z0-9]{8,64}$/;
const SELECT_FIELDS_WITH_SHARING =
  'id, name, user_id, visibility, share_slug, published_at, maze_data, created_at, updated_at';
const SELECT_FIELDS_LEGACY = 'id, name, user_id, maze_data, created_at, updated_at';

export type MazeVisibility = 'private' | 'unlisted' | 'public';

export interface MazePayload {
  version: number;
  mazeData: MazeData;
  markers: MazeMarkers | null;
  multiLayer: boolean;
}

export interface MazeRecord {
  id: string;
  name: string;
  userId: string;
  visibility: MazeVisibility;
  shareSlug: string | null;
  publishedAt: string | null;
  payload: MazePayload;
  createdAt: string;
  updatedAt: string;
}

function parseMazePayload(raw: unknown): MazePayload {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Invalid maze payload format');
  }

  const candidate = raw as Partial<MazePayload>;
  const mazeData = candidate.mazeData;
  if (!Array.isArray(mazeData)) {
    throw new Error('Invalid maze payload: mazeData must be an array');
  }

  return {
    version: Number.isFinite(candidate.version) ? Number(candidate.version) : MAZE_SCHEMA_VERSION,
    mazeData: mazeData as MazeData,
    markers: (candidate.markers ?? null) as MazeMarkers | null,
    multiLayer: Boolean(candidate.multiLayer),
  };
}

function mapMazeRow(row: {
  id: string;
  name: string;
  user_id: string;
  visibility?: MazeVisibility;
  share_slug?: string | null;
  published_at?: string | null;
  maze_data: unknown;
  created_at: string;
  updated_at: string;
}): MazeRecord {
  return {
    id: row.id,
    name: row.name,
    userId: row.user_id,
    visibility: row.visibility ?? 'private',
    shareSlug: row.share_slug ?? null,
    publishedAt: row.published_at ?? null,
    payload: parseMazePayload(row.maze_data),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isMissingSharingColumnsError(error: unknown): boolean {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const candidate = error as { message?: unknown; details?: unknown; hint?: unknown };
  const text = [candidate.message, candidate.details, candidate.hint]
    .filter(value => typeof value === 'string')
    .join(' ')
    .toLowerCase();

  if (!text) {
    return false;
  }

  return (
    text.includes('visibility') || text.includes('share_slug') || text.includes('published_at')
  );
}

async function ensureAuthenticatedUserId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('You must sign in before saving/loading mazes.');
  }
  return user.id;
}

export async function saveMazeRecord(name: string, payload: MazePayload): Promise<MazeRecord> {
  const userId = await ensureAuthenticatedUserId();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('mazes')
    .insert({
      name,
      user_id: userId,
      maze_data: payload,
    })
    .select(SELECT_FIELDS_WITH_SHARING)
    .single();

  if (error && isMissingSharingColumnsError(error)) {
    const fallback = await supabase
      .from('mazes')
      .insert({
        name,
        user_id: userId,
        maze_data: payload,
      })
      .select(SELECT_FIELDS_LEGACY)
      .single();
    if (fallback.error) {
      throw fallback.error;
    }
    return mapMazeRow(fallback.data);
  }

  if (error) {
    throw error;
  }

  return mapMazeRow(data);
}

export async function listMazeRecords(limit: number = DEFAULT_FETCH_LIMIT): Promise<MazeRecord[]> {
  const userId = await ensureAuthenticatedUserId();
  const supabase = getSupabaseClient();

  const safeLimit = Math.max(1, Math.min(200, limit));
  const query = supabase
    .from('mazes')
    .select(SELECT_FIELDS_WITH_SHARING)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(safeLimit);
  const { data, error } = await query;

  if (error && isMissingSharingColumnsError(error)) {
    const fallback = await supabase
      .from('mazes')
      .select(SELECT_FIELDS_LEGACY)
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(safeLimit);
    if (fallback.error) {
      throw fallback.error;
    }
    return (fallback.data ?? []).map(mapMazeRow);
  }

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapMazeRow);
}

export async function getMazeRecordById(id: string): Promise<MazeRecord | null> {
  const userId = await ensureAuthenticatedUserId();
  const supabase = getSupabaseClient();

  const query = supabase
    .from('mazes')
    .select(SELECT_FIELDS_WITH_SHARING)
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  const { data, error } = await query;

  if (error && isMissingSharingColumnsError(error)) {
    const fallback = await supabase
      .from('mazes')
      .select(SELECT_FIELDS_LEGACY)
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();
    if (fallback.error) {
      throw fallback.error;
    }
    return fallback.data ? mapMazeRow(fallback.data) : null;
  }

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapMazeRow(data);
}

export async function deleteMazeRecord(id: string): Promise<void> {
  const userId = await ensureAuthenticatedUserId();
  const supabase = getSupabaseClient();

  const { error } = await supabase.from('mazes').delete().eq('id', id).eq('user_id', userId);

  if (error) {
    throw error;
  }
}

export async function updateMazeVisibility(
  id: string,
  visibility: MazeVisibility
): Promise<MazeRecord> {
  const userId = await ensureAuthenticatedUserId();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('mazes')
    .update({ visibility })
    .eq('id', id)
    .eq('user_id', userId)
    .select(SELECT_FIELDS_WITH_SHARING)
    .single();

  if (error && isMissingSharingColumnsError(error)) {
    throw new Error(
      'Database is missing sharing columns. Run Supabase migrations (for example: npm run supabase:reset).'
    );
  }

  if (error) {
    throw error;
  }

  return mapMazeRow(data);
}

export async function getSharedMazeRecordBySlug(slug: string): Promise<MazeRecord | null> {
  if (!SHARE_SLUG_PATTERN.test(slug)) {
    return null;
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('mazes')
    .select(SELECT_FIELDS_WITH_SHARING)
    .eq('share_slug', slug)
    .in('visibility', ['unlisted', 'public'])
    .maybeSingle();

  if (error && isMissingSharingColumnsError(error)) {
    return null;
  }

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapMazeRow(data);
}

export function createMazeShareUrl(shareSlug: string): string {
  return `${window.location.origin}${window.location.pathname}?maze=${encodeURIComponent(shareSlug)}`;
}

export function createMazePayload(params: {
  mazeData: MazeData;
  markers: MazeMarkers | null;
}): MazePayload {
  return {
    version: MAZE_SCHEMA_VERSION,
    mazeData: params.mazeData,
    markers: params.markers,
    multiLayer: params.mazeData.length > 1,
  };
}
