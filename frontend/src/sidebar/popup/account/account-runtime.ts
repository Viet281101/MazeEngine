import { t } from '../../../i18n';
import {
  getCurrentUser,
  signInWithEmail,
  signOutCurrentUser,
  signUpWithEmail,
} from '../../../lib/auth-service';
import {
  createMazePayload,
  getMazeRecordById,
  listMazeRecords,
  saveMazeRecord,
  type MazeRecord,
} from '../../../lib/maze-storage-service';
import { isSupabaseConfigured } from '../../../lib/supabase-client';
import { getMazeAppBridge, updateMazePreservingCamera } from '../popup-maze-app-bridge';
import type { AccountPopupDomRefs } from './account-dom';

export class AccountPopupRuntime {
  constructor(private readonly refs: AccountPopupDomRefs) {}

  async refreshAll(): Promise<void> {
    if (!isSupabaseConfigured()) {
      this.setStatus(t('account.notConfigured'));
      this.setSignedInState(false);
      this.setAuthControlsDisabled(true);
      this.setStorageControlsDisabled(true);
      return;
    }

    this.setAuthControlsDisabled(false);

    const user = await getCurrentUser().catch(() => null);
    if (!user) {
      this.setSignedInState(false);
      this.setStorageControlsDisabled(true);
      this.setStatus(t('account.notSignedIn'));
      this.clearMazeOptions();
      return;
    }

    this.setSignedInState(true);
    this.setStorageControlsDisabled(false);
    this.setStatus(`${t('account.signedInAs')}: ${user.email ?? user.id}`);
    await this.refreshMazeList();
  }

  async handleSignUp(): Promise<void> {
    await this.runAuthAction(signUpWithEmail, 'account.signUpSuccess', 'account.signUpFailed');
  }

  async handleSignIn(): Promise<void> {
    await this.runAuthAction(signInWithEmail, 'account.signInSuccess', 'account.signInFailed');
  }

  async handleSignOut(): Promise<void> {
    try {
      await signOutCurrentUser();
      this.setStatus(t('account.signOutSuccess'));
      await this.refreshAll();
    } catch (error) {
      this.setStatus(`${t('account.signOutFailed')}: ${this.toErrorMessage(error)}`);
    }
  }

  async handleSaveMaze(): Promise<void> {
    const user = await getCurrentUser().catch(() => null);
    if (!user) {
      this.setStatus(t('account.signInRequired'));
      return;
    }

    const mazeApp = getMazeAppBridge();
    if (!mazeApp || typeof mazeApp.getMazeDataRef !== 'function') {
      this.setStatus(t('account.appUnavailable'));
      return;
    }

    const mazeData = mazeApp.getMazeDataRef();
    const markers = typeof mazeApp.getMazeMarkers === 'function' ? mazeApp.getMazeMarkers() : null;
    if (!Array.isArray(mazeData) || mazeData.length === 0) {
      this.setStatus(t('account.noMazeToSave'));
      return;
    }

    const mazeName =
      this.refs.mazeNameInput.value.trim() || `${t('account.defaultMazeName')} ${Date.now()}`;

    try {
      const payload = createMazePayload({ mazeData, markers });
      const saved = await saveMazeRecord(mazeName, payload);
      this.setStatus(`${t('account.savedSuccess')}: ${saved.name}`);
      await this.refreshMazeList(saved.id);
    } catch (error) {
      this.setStatus(`${t('account.saveFailed')}: ${this.toErrorMessage(error)}`);
    }
  }

  async handleLoadSelectedMaze(): Promise<void> {
    const user = await getCurrentUser().catch(() => null);
    if (!user) {
      this.setStatus(t('account.signInRequired'));
      return;
    }

    const mazeId = this.refs.mazeSelect.value;
    if (!mazeId) {
      this.setStatus(t('account.selectMazeFirst'));
      return;
    }

    const mazeApp = getMazeAppBridge();
    if (!mazeApp) {
      this.setStatus(t('account.appUnavailable'));
      return;
    }

    try {
      const record = await getMazeRecordById(mazeId);
      if (!record) {
        this.setStatus(t('account.mazeNotFound'));
        await this.refreshMazeList();
        return;
      }

      const markers = record.payload.markers;
      updateMazePreservingCamera(mazeApp, record.payload.mazeData, record.payload.multiLayer, {
        start: markers?.start ?? null,
        end: markers?.end ?? null,
      });
      this.setStatus(`${t('account.loadedSuccess')}: ${record.name}`);
    } catch (error) {
      this.setStatus(`${t('account.loadFailed')}: ${this.toErrorMessage(error)}`);
    }
  }

  async refreshMazeList(selectedId?: string): Promise<void> {
    const user = await getCurrentUser().catch(() => null);
    if (!user) {
      this.clearMazeOptions();
      return;
    }

    try {
      const records = await listMazeRecords(50);
      this.renderMazeOptions(records, selectedId);
    } catch (error) {
      this.setStatus(`${t('account.listFailed')}: ${this.toErrorMessage(error)}`);
      this.clearMazeOptions();
    }
  }

  private async runAuthAction(
    action: (email: string, password: string) => Promise<unknown>,
    successKey: 'account.signUpSuccess' | 'account.signInSuccess',
    failureKey: 'account.signUpFailed' | 'account.signInFailed'
  ): Promise<void> {
    const email = this.refs.emailInput.value.trim();
    const password = this.refs.passwordInput.value;
    if (!email || !password) {
      this.setStatus(t('account.missingCredentials'));
      return;
    }

    try {
      await action(email, password);
      this.setStatus(t(successKey));
      await this.refreshAll();
    } catch (error) {
      this.setStatus(`${t(failureKey)}: ${this.toErrorMessage(error)}`);
    }
  }

  private renderMazeOptions(records: MazeRecord[], selectedId?: string): void {
    this.refs.mazeSelect.textContent = '';

    if (records.length === 0) {
      this.refs.mazeSelect.appendChild(this.createNoSavedMazeOption());
      return;
    }

    records.forEach(record => {
      const option = document.createElement('option');
      option.value = record.id;
      option.textContent = `${record.name} (${new Date(record.updatedAt).toLocaleString()})`;
      this.refs.mazeSelect.appendChild(option);
    });

    if (selectedId) {
      this.refs.mazeSelect.value = selectedId;
    }
  }

  private clearMazeOptions(): void {
    this.refs.mazeSelect.textContent = '';
    this.refs.mazeSelect.appendChild(this.createNoSavedMazeOption());
  }

  private createNoSavedMazeOption(): HTMLOptionElement {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = t('account.noSavedMaze');
    return option;
  }

  private setSignedInState(isSignedIn: boolean): void {
    this.refs.authSection.hidden = isSignedIn;
    this.refs.storageSection.hidden = !isSignedIn;
  }

  private setAuthControlsDisabled(disabled: boolean): void {
    this.refs.signUpBtn.disabled = disabled;
    this.refs.signInBtn.disabled = disabled;
    this.refs.emailInput.disabled = disabled;
    this.refs.passwordInput.disabled = disabled;
  }

  private setStorageControlsDisabled(disabled: boolean): void {
    this.refs.signOutBtn.disabled = disabled;
    this.refs.saveBtn.disabled = disabled;
    this.refs.refreshBtn.disabled = disabled;
    this.refs.loadBtn.disabled = disabled;
    this.refs.mazeNameInput.disabled = disabled;
    this.refs.mazeSelect.disabled = disabled;
  }

  private setStatus(message: string): void {
    this.refs.statusEl.textContent = message;
  }

  private toErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
