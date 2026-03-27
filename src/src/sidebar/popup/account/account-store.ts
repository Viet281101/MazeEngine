import type { User } from '@supabase/supabase-js';
import { getCurrentUser, subscribeToAuthStateChange } from '../../../lib/auth-service';
import { listMazeRecords, type MazeRecord } from '../../../lib/maze-storage-service';
import { isSupabaseConfigured } from '../../../lib/supabase-client';

type AccountStoreListener = (user: User | null) => void;

class AccountStore {
  private static readonly MAZE_LIST_CACHE_TTL_MS = 30_000;

  private currentUser: User | null = null;
  private currentUserLoaded = false;
  private userPromise: Promise<User | null> | null = null;
  private mazeListCache: MazeRecord[] | null = null;
  private mazeListCacheUserId: string | null = null;
  private mazeListCacheExpiresAt = 0;
  private mazeListPromise: Promise<MazeRecord[]> | null = null;
  private readonly listeners = new Set<AccountStoreListener>();
  private unsubscribeAuthStateChange: (() => void) | null = null;

  public async getCurrentUser(): Promise<User | null> {
    if (!isSupabaseConfigured()) {
      this.reset();
      return null;
    }

    this.ensureAuthSubscription();

    if (this.currentUserLoaded) {
      return this.currentUser;
    }

    if (!this.userPromise) {
      this.userPromise = getCurrentUser()
        .catch(() => null)
        .then(user => {
          this.currentUser = user;
          this.currentUserLoaded = true;
          this.userPromise = null;
          return user;
        });
    }

    return this.userPromise;
  }

  public subscribe(listener: AccountStoreListener): () => void {
    this.listeners.add(listener);
    this.ensureAuthSubscription();

    return () => {
      this.listeners.delete(listener);
    };
  }

  public async getMazeList(forceReload: boolean = false): Promise<MazeRecord[]> {
    const user = await this.getCurrentUser();
    if (!user) {
      this.invalidateMazeList();
      return [];
    }

    if (
      !forceReload &&
      this.mazeListCache &&
      this.mazeListCacheUserId === user.id &&
      Date.now() < this.mazeListCacheExpiresAt
    ) {
      return this.mazeListCache;
    }

    if (!forceReload && this.mazeListPromise) {
      return this.mazeListPromise;
    }

    this.mazeListPromise = listMazeRecords(50)
      .then(records => {
        this.mazeListCache = records;
        this.mazeListCacheUserId = user.id;
        this.mazeListCacheExpiresAt = Date.now() + AccountStore.MAZE_LIST_CACHE_TTL_MS;
        this.mazeListPromise = null;
        return records;
      })
      .catch(error => {
        this.mazeListPromise = null;
        throw error;
      });

    return this.mazeListPromise;
  }

  public setCurrentUser(user: User | null): void {
    const previousUserId = this.currentUser?.id ?? null;
    const nextUserId = user?.id ?? null;
    this.currentUser = user;
    this.currentUserLoaded = true;
    this.userPromise = null;

    if (previousUserId !== nextUserId) {
      this.invalidateMazeList();
    }
  }

  public invalidateMazeList(): void {
    this.mazeListCache = null;
    this.mazeListCacheUserId = null;
    this.mazeListCacheExpiresAt = 0;
    this.mazeListPromise = null;
  }

  public reset(): void {
    this.currentUser = null;
    this.currentUserLoaded = false;
    this.userPromise = null;
    this.invalidateMazeList();
  }

  private ensureAuthSubscription(): void {
    if (this.unsubscribeAuthStateChange || !isSupabaseConfigured()) {
      return;
    }

    this.unsubscribeAuthStateChange = subscribeToAuthStateChange(session => {
      this.setCurrentUser(session?.user ?? null);
      this.emit();
    });
  }

  private emit(): void {
    this.listeners.forEach(listener => {
      listener(this.currentUser);
    });
  }
}

export const accountStore = new AccountStore();
