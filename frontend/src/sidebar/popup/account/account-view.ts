import { t } from '../../../i18n';
import { getIconPath } from '../../../constants/assets';
import type { MazeRecord, MazeVisibility } from '../../../lib/maze-storage-service';
import type { AccountPopupDomRefs } from './account-dom';

const VISIBILITY_OPTIONS: MazeVisibility[] = ['private', 'unlisted', 'public'];

export function getVisibilityLabel(value: MazeVisibility): string {
  if (value === 'public') {
    return t('account.visibility.public');
  }
  if (value === 'unlisted') {
    return t('account.visibility.unlisted');
  }
  return t('account.visibility.private');
}

export class AccountPopupView {
  constructor(private readonly refs: AccountPopupDomRefs) {}

  renderMazeOptions(records: MazeRecord[], selectedId?: string): void {
    this.refs.mazeSelect.textContent = '';

    if (records.length === 0) {
      this.refs.mazeSelect.appendChild(this.createNoSavedMazeOption());
      this.renderMazeLibrary(records);
      return;
    }

    records.forEach(record => {
      const option = document.createElement('option');
      option.value = record.id;
      option.textContent = record.name;
      this.refs.mazeSelect.appendChild(option);
    });

    if (selectedId) {
      this.refs.mazeSelect.value = selectedId;
    }

    this.renderMazeLibrary(records);
  }

  clearMazeOptions(): void {
    this.refs.mazeSelect.textContent = '';
    this.refs.mazeSelect.appendChild(this.createNoSavedMazeOption());
    this.renderMazeLibrary([]);
  }

  openManageModal(record: MazeRecord): void {
    this.refs.manageModalBackdrop.hidden = false;
    this.refs.manageModalTitle.textContent = `${t('account.manageMaze')}: ${record.name}`;
    this.renderManageVisibilityOptions(record.visibility);
    this.refs.manageCopyBtn.disabled = record.visibility === 'private' || !record.shareSlug;
  }

  closeManageModal(): void {
    this.refs.manageModalBackdrop.hidden = true;
  }

  syncManageModalRecord(record: MazeRecord): void {
    this.renderManageVisibilityOptions(record.visibility);
    this.refs.manageCopyBtn.disabled = record.visibility === 'private' || !record.shareSlug;
  }

  private createNoSavedMazeOption(): HTMLOptionElement {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = t('account.noSavedMaze');
    return option;
  }

  private renderMazeLibrary(records: MazeRecord[]): void {
    this.refs.libraryTableBody.textContent = '';

    if (records.length === 0) {
      const row = document.createElement('tr');
      row.className = 'account-popup__table-empty-row';

      const cell = document.createElement('td');
      cell.className = 'account-popup__table-empty';
      cell.colSpan = 3;
      cell.textContent = t('account.noSavedMaze');

      row.appendChild(cell);
      this.refs.libraryTableBody.appendChild(row);
      return;
    }

    records.forEach(record => {
      const row = document.createElement('tr');

      const nameCell = document.createElement('td');
      nameCell.textContent = record.name;

      const timeCell = document.createElement('td');
      timeCell.textContent = new Date(record.updatedAt).toLocaleString();

      const actionsCell = document.createElement('td');
      actionsCell.className = 'account-popup__table-actions';

      const editButton = document.createElement('button');
      editButton.type = 'button';
      editButton.className = 'account-popup__btn account-popup__table-btn account-popup__table-edit-btn';
      editButton.dataset.mazeManageId = record.id;
      editButton.title = t('account.edit');
      editButton.setAttribute('aria-label', t('account.edit'));
      const editIcon = document.createElement('img');
      editIcon.className = 'account-popup__table-btn-icon';
      editIcon.src = getIconPath('edit.png');
      editIcon.alt = '';
      editIcon.setAttribute('aria-hidden', 'true');
      editButton.appendChild(editIcon);

      actionsCell.appendChild(editButton);
      row.appendChild(nameCell);
      row.appendChild(timeCell);
      row.appendChild(actionsCell);
      this.refs.libraryTableBody.appendChild(row);
    });
  }

  private renderManageVisibilityOptions(selected: MazeVisibility): void {
    this.refs.manageVisibilitySelect.textContent = '';
    VISIBILITY_OPTIONS.forEach(optionValue => {
      const option = document.createElement('option');
      option.value = optionValue;
      option.textContent = getVisibilityLabel(optionValue);
      option.selected = optionValue === selected;
      this.refs.manageVisibilitySelect.appendChild(option);
    });
  }
}
