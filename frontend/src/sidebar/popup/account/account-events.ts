import type { AccountPopupDomRefs } from './account-dom';
import type { AccountPopupRuntime } from './account-runtime';

export function bindAccountPopupEvents(
  refs: AccountPopupDomRefs,
  runtime: AccountPopupRuntime
): () => void {
  const onSignUp = () => {
    void runtime.handleSignUp();
  };
  const onSignIn = () => {
    void runtime.handleSignIn();
  };
  const onSignOut = () => {
    void runtime.handleSignOut();
  };
  const onSave = () => {
    void runtime.handleSaveMaze();
  };
  const onRefresh = () => {
    void runtime.refreshMazeList();
  };
  const onLoad = () => {
    void runtime.handleLoadSelectedMaze();
  };
  const onLibraryClick = (event: Event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) {
      return;
    }

    const editButton = target.closest<HTMLButtonElement>('[data-maze-manage-id]');
    const mazeId = editButton?.dataset.mazeManageId;
    if (!mazeId) {
      return;
    }

    void runtime.handleOpenManageModal(mazeId);
  };
  const onManageClose = () => {
    runtime.closeManageModal();
  };
  const onManageBackdropClick = (event: Event) => {
    if (event.target !== refs.manageModalBackdrop) {
      return;
    }
    runtime.closeManageModal();
  };
  const onManageVisibilityChange = () => {
    const value = refs.manageVisibilitySelect.value;
    if (value !== 'private' && value !== 'unlisted' && value !== 'public') {
      return;
    }
    void runtime.handleManageVisibilityChanged(value);
  };
  const onManageCopy = () => {
    void runtime.handleManageCopyShareLink();
  };
  const onManageDelete = () => {
    void runtime.handleManageDeleteMaze();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') {
      return;
    }
    runtime.closeManageModal();
  };

  refs.signUpBtn.addEventListener('click', onSignUp);
  refs.signInBtn.addEventListener('click', onSignIn);
  refs.signOutBtn.addEventListener('click', onSignOut);
  refs.saveBtn.addEventListener('click', onSave);
  refs.refreshBtn.addEventListener('click', onRefresh);
  refs.loadBtn.addEventListener('click', onLoad);
  refs.libraryTableBody.addEventListener('click', onLibraryClick);
  refs.manageCloseBtn.addEventListener('click', onManageClose);
  refs.manageModalBackdrop.addEventListener('click', onManageBackdropClick);
  refs.manageVisibilitySelect.addEventListener('change', onManageVisibilityChange);
  refs.manageCopyBtn.addEventListener('click', onManageCopy);
  refs.manageDeleteBtn.addEventListener('click', onManageDelete);
  window.addEventListener('keydown', onKeyDown);

  return () => {
    refs.signUpBtn.removeEventListener('click', onSignUp);
    refs.signInBtn.removeEventListener('click', onSignIn);
    refs.signOutBtn.removeEventListener('click', onSignOut);
    refs.saveBtn.removeEventListener('click', onSave);
    refs.refreshBtn.removeEventListener('click', onRefresh);
    refs.loadBtn.removeEventListener('click', onLoad);
    refs.libraryTableBody.removeEventListener('click', onLibraryClick);
    refs.manageCloseBtn.removeEventListener('click', onManageClose);
    refs.manageModalBackdrop.removeEventListener('click', onManageBackdropClick);
    refs.manageVisibilitySelect.removeEventListener('change', onManageVisibilityChange);
    refs.manageCopyBtn.removeEventListener('click', onManageCopy);
    refs.manageDeleteBtn.removeEventListener('click', onManageDelete);
    window.removeEventListener('keydown', onKeyDown);
  };
}

