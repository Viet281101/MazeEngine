import { t } from '../../../i18n';
import type { User } from '@supabase/supabase-js';
import { getIconPath } from '../../../constants/assets';
import { signInWithEmail, signOutCurrentUser, signUpWithEmail } from '../../../lib/auth-service';
import {
  createMazePayload,
  createMazeShareUrl,
  deleteMazeRecord,
  getMazeRecordById,
  type MazeVisibility,
  saveMazeRecord,
  updateMazeVisibility,
  type MazeRecord,
} from '../../../lib/maze-storage-service';
import { isSupabaseConfigured } from '../../../lib/supabase-client';
import { getMazeAppBridge, updateMazePreservingCamera } from '../popup-maze-app-bridge';
import type { AccountPopupDomRefs } from './account-dom';
import { accountStore } from './account-store';
import { AccountPopupView, getVisibilityLabel } from './account-view';

export class AccountPopupRuntime {
  private currentUser: User | null = null;
  private latestMazeRecords: MazeRecord[] = [];
  private currentManagedMazeId: string | null = null;
  private isPasswordVisible = false;
  private readonly view: AccountPopupView;

  constructor(private readonly refs: AccountPopupDomRefs) {
    this.view = new AccountPopupView(refs);
    this.updatePasswordVisibility(false);
  }

  async refreshAll(): Promise<void> {
    if (!isSupabaseConfigured()) {
      accountStore.reset();
      this.currentUser = null;
      this.setStatus(t('account.notConfigured'));
      this.setSignedInState(false);
      this.setAuthControlsDisabled(true);
      this.setStorageControlsDisabled(true);
      this.closeManageModal();
      this.view.renderMazeOptions([]);
      return;
    }

    this.setAuthControlsDisabled(false);

    const user = await accountStore.getCurrentUser();
    if (!user) {
      this.currentUser = null;
      this.setSignedInState(false);
      this.setStorageControlsDisabled(true);
      this.setStatus(t('account.notSignedIn'));
      this.closeManageModal();
      this.latestMazeRecords = [];
      this.view.clearMazeOptions();
      return;
    }

    this.currentUser = user;
    this.setSignedInState(true);
    this.setStorageControlsDisabled(false);
    this.setStatus(`${t('account.signedInAs')}: ${user.email ?? user.id}`);
    await this.refreshMazeList(undefined, false);
  }

  async handleAuthStateChanged(user: User | null): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }

    accountStore.setCurrentUser(user);
    this.currentUser = user;
    await this.refreshAll();
  }

  async handleSignUp(): Promise<void> {
    await this.runAuthAction(signUpWithEmail, 'account.signUpSuccess', 'account.signUpFailed');
  }

  async handleSignIn(): Promise<void> {
    await this.runAuthAction(signInWithEmail, 'account.signInSuccess', 'account.signInFailed');
  }

  handleTogglePasswordVisibility(): void {
    this.updatePasswordVisibility(!this.isPasswordVisible);
  }

  async handleSignOut(): Promise<void> {
    try {
      await signOutCurrentUser();
      accountStore.reset();
      this.currentUser = null;
      this.setStatus(t('account.signOutSuccess'));
      await this.refreshAll();
    } catch (error) {
      this.setStatus(`${t('account.signOutFailed')}: ${this.toErrorMessage(error)}`);
    }
  }

  async handleSaveMaze(): Promise<void> {
    if (!(await this.requireSignedInUser())) {
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
      accountStore.invalidateMazeList();
      this.setStatus(`${t('account.savedSuccess')}: ${saved.name}`);
      await this.refreshMazeList(saved.id, true);
    } catch (error) {
      this.setStatus(`${t('account.saveFailed')}: ${this.toErrorMessage(error)}`);
    }
  }

  async handleLoadSelectedMaze(): Promise<void> {
    if (!(await this.requireSignedInUser())) {
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
        accountStore.invalidateMazeList();
        await this.refreshMazeList(undefined, true);
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

  async handleDeleteMaze(mazeId: string): Promise<void> {
    if (!(await this.requireSignedInUser())) {
      return;
    }

    try {
      await deleteMazeRecord(mazeId);
      accountStore.invalidateMazeList();
      this.setStatus(t('account.deleteSuccess'));
      await this.refreshMazeList(undefined, true);
    } catch (error) {
      this.setStatus(`${t('account.deleteFailed')}: ${this.toErrorMessage(error)}`);
    }
  }

  async handleVisibilityChanged(mazeId: string, visibility: MazeVisibility): Promise<void> {
    if (!(await this.requireSignedInUser())) {
      return;
    }

    try {
      await updateMazeVisibility(mazeId, visibility);
      accountStore.invalidateMazeList();
      this.setStatus(`${t('account.visibilityUpdated')}: ${getVisibilityLabel(visibility)}`);
      await this.refreshMazeList(mazeId, true);
    } catch (error) {
      this.setStatus(`${t('account.visibilityUpdateFailed')}: ${this.toErrorMessage(error)}`);
      await this.refreshMazeList(mazeId, true);
    }
  }

  async handleCopyShareLink(mazeId: string): Promise<void> {
    if (!(await this.requireSignedInUser())) {
      return;
    }

    try {
      const record = await getMazeRecordById(mazeId);
      if (!record || record.visibility === 'private' || !record.shareSlug) {
        this.setStatus(t('account.shareUnavailable'));
        return;
      }

      const url = createMazeShareUrl(record.shareSlug);
      await navigator.clipboard.writeText(url);
      this.setStatus(`${t('account.shareCopied')}: ${url}`);
    } catch (error) {
      this.setStatus(`${t('account.shareCopyFailed')}: ${this.toErrorMessage(error)}`);
    }
  }

  async refreshMazeList(selectedId?: string, forceReload: boolean = true): Promise<void> {
    const user = await this.getSignedInUser();
    if (!user) {
      this.latestMazeRecords = [];
      this.view.clearMazeOptions();
      return;
    }

    try {
      const records = await accountStore.getMazeList(forceReload);
      this.latestMazeRecords = records;
      this.view.renderMazeOptions(records, selectedId);
    } catch (error) {
      this.setStatus(`${t('account.listFailed')}: ${this.toErrorMessage(error)}`);
      this.closeManageModal();
      this.latestMazeRecords = [];
      this.view.clearMazeOptions();
    }
  }

  async handleOpenManageModal(mazeId: string): Promise<void> {
    if (!(await this.requireSignedInUser())) {
      return;
    }

    const localRecord = this.latestMazeRecords.find(record => record.id === mazeId);
    const record = localRecord ?? (await getMazeRecordById(mazeId));
    if (!record) {
      this.setStatus(t('account.mazeNotFound'));
      return;
    }

    this.currentManagedMazeId = record.id;
    this.view.openManageModal(record);
  }

  closeManageModal(): void {
    this.currentManagedMazeId = null;
    this.view.closeManageModal();
  }

  async handleManageVisibilityChanged(visibility: MazeVisibility): Promise<void> {
    if (!this.currentManagedMazeId) {
      return;
    }
    await this.handleVisibilityChanged(this.currentManagedMazeId, visibility);
    await this.syncManageModalRecord();
  }

  async handleManageCopyShareLink(): Promise<void> {
    if (!this.currentManagedMazeId) {
      return;
    }
    await this.handleCopyShareLink(this.currentManagedMazeId);
    await this.syncManageModalRecord();
  }

  async handleManageDeleteMaze(): Promise<void> {
    if (!this.currentManagedMazeId) {
      return;
    }
    await this.handleDeleteMaze(this.currentManagedMazeId);
    this.closeManageModal();
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
      accountStore.invalidateMazeList();
      this.setStatus(t(successKey));
      await this.refreshAll();
    } catch (error) {
      this.setStatus(`${t(failureKey)}: ${this.toErrorMessage(error)}`);
    }
  }

  private async syncManageModalRecord(): Promise<void> {
    if (!this.currentManagedMazeId) {
      return;
    }

    const record = await getMazeRecordById(this.currentManagedMazeId);
    if (!record) {
      this.closeManageModal();
      return;
    }

    this.view.syncManageModalRecord(record);
  }

  private async getSignedInUser(): Promise<User | null> {
    if (this.currentUser) {
      return this.currentUser;
    }

    const user = await accountStore.getCurrentUser();
    this.currentUser = user;
    return user;
  }

  private async requireSignedInUser(): Promise<User | null> {
    const user = await this.getSignedInUser();
    if (!user) {
      this.setStatus(t('account.signInRequired'));
      return null;
    }
    return user;
  }

  private setSignedInState(isSignedIn: boolean): void {
    this.refs.authSection.hidden = isSignedIn;
    this.refs.signOutRow.hidden = !isSignedIn;
    this.refs.storageSection.hidden = !isSignedIn;
    this.refs.librarySection.hidden = !isSignedIn;
  }

  private setAuthControlsDisabled(disabled: boolean): void {
    this.refs.signUpBtn.disabled = disabled;
    this.refs.signInBtn.disabled = disabled;
    this.refs.emailInput.disabled = disabled;
    this.refs.passwordInput.disabled = disabled;
    this.refs.passwordToggleBtn.disabled = disabled;
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
    if (error && typeof error === 'object') {
      const candidate = error as { message?: unknown; details?: unknown; hint?: unknown };
      const parts = [candidate.message, candidate.details, candidate.hint].filter(
        value => typeof value === 'string' && value.trim().length > 0
      ) as string[];
      if (parts.length > 0) {
        return parts.join(' | ');
      }
    }
    return String(error);
  }

  private updatePasswordVisibility(isVisible: boolean): void {
    this.isPasswordVisible = isVisible;
    this.refs.passwordInput.type = isVisible ? 'text' : 'password';
    this.refs.passwordToggleIcon.src = getIconPath(isVisible ? 'visible.png' : 'invisible.png');
    const labelKey = isVisible ? 'account.hidePassword' : 'account.showPassword';
    this.refs.passwordToggleBtn.setAttribute('data-i18n-title-key', labelKey);
    this.refs.passwordToggleBtn.setAttribute('data-i18n-aria-label-key', labelKey);
    this.refs.passwordToggleBtn.title = t(labelKey);
    this.refs.passwordToggleBtn.setAttribute('aria-label', t(labelKey));
  }
}
