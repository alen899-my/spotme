import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { API_URL } from './api';
import { getToken } from './tokenStorage';

export interface MentionableExercise {
  id: string | number;
  name: string;
  [key: string]: any;
}

const CACHE_KEY = 'exercise_mention_index_v1';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const INDEX_LIMIT = 2500;

let memoryIndex: MentionableExercise[] | null = null;
let inflight: Promise<MentionableExercise[]> | null = null;

function normalize(s: string): string {
  return (s || '').toLowerCase().replace(/[\s_]+/g, ' ').trim();
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// "bench-press" / "bench press" should both match either spelling.
function namePattern(name: string): RegExp | null {
  const norm = normalize(name);
  if (norm.length < 4 && !norm.includes(' ')) return null;
  const flexible = escapeRegExp(norm).replace(/-/g, '\\s+').replace(/\s+/g, '\\s+');
  try {
    return new RegExp(`\\b${flexible}\\b`, 'i');
  } catch {
    return null;
  }
}

/**
 * Full exercise library for mention detection. Cached in memory +
 * AsyncStorage (7 days) so opening chat never blocks on network.
 */
export async function getExerciseIndex(): Promise<MentionableExercise[]> {
  if (memoryIndex) return memoryIndex;
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed?.at && Date.now() - parsed.at < CACHE_TTL_MS && Array.isArray(parsed.items)) {
        memoryIndex = parsed.items;
        return memoryIndex as MentionableExercise[];
      }
    }
  } catch { /* fall through to network */ }

  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const token = await getToken();
      const res = await axios.get(`${API_URL}/exercises`, {
        params: { limit: INDEX_LIMIT },
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const rows = (res.data?.data || res.data?.results || res.data || []) as any[];
      const items = rows
        .filter((r) => r && r.name)
        .map((r) => ({ ...r, id: r.id }));
      memoryIndex = items;
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items }));
      } catch { /* cache best-effort */ }
      return items;
    } catch (err) {
      console.error('Exercise index fetch error:', err);
      return memoryIndex || [];
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/**
 * Find library exercises mentioned by full name in free text.
 * Longest names first so "incline dumbbell press" wins over "press";
 * matched spans are claimed so nested names never double-render.
 */
export function findMentionedExercises(
  text: string,
  index: MentionableExercise[],
  max = 3,
): MentionableExercise[] {
  if (!text || !index?.length) return [];
  const found: MentionableExercise[] = [];
  const claimed: Array<[number, number]> = [];

  const candidates = index
    .map((ex) => ({ ex, pattern: namePattern(ex.name) }))
    .filter((c) => c.pattern)
    .sort((a, b) => normalize(b.ex.name).length - normalize(a.ex.name).length);

  for (const { ex, pattern } of candidates) {
    if (found.length >= max) break;
    if (found.some((f) => String(f.id) === String(ex.id))) continue;
    const m = (pattern as RegExp).exec(text);
    if (!m || m.index === undefined) continue;
    const start = m.index;
    const end = start + m[0].length;
    if (claimed.some(([s, e]) => start < e && end > s)) continue;
    claimed.push([start, end]);
    found.push(ex);
  }
  return found;
}
