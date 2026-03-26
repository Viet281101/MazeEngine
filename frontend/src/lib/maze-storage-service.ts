import type { MazeData, MazeMarkers } from '../types/maze';
import { getCurrentUser } from './auth-service';
import { getSupabaseClient } from './supabase-client';

const MAZE_SCHEMA_VERSION = 1;
const DEFAULT_FETCH_LIMIT = 50;

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
  maze_data: unknown;
  created_at: string;
  updated_at: string;
}): MazeRecord {
  return {
    id: row.id,
    name: row.name,
    userId: row.user_id,
    payload: parseMazePayload(row.maze_data),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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
    .select('id, name, user_id, maze_data, created_at, updated_at')
    .single();

  if (error) {
    throw error;
  }

  return mapMazeRow(data);
}

export async function listMazeRecords(limit: number = DEFAULT_FETCH_LIMIT): Promise<MazeRecord[]> {
  await ensureAuthenticatedUserId();
  const supabase = getSupabaseClient();

  const safeLimit = Math.max(1, Math.min(200, limit));
  const { data, error } = await supabase
    .from('mazes')
    .select('id, name, user_id, maze_data, created_at, updated_at')
    .order('updated_at', { ascending: false })
    .limit(safeLimit);

  if (error) {
    throw error;
  }

  return (data ?? []).map(mapMazeRow);
}

export async function getMazeRecordById(id: string): Promise<MazeRecord | null> {
  await ensureAuthenticatedUserId();
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('mazes')
    .select('id, name, user_id, maze_data, created_at, updated_at')
    .eq('id', id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return mapMazeRow(data);
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
