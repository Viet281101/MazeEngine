import { MESH_REDUCTION } from '../../../constants/maze';
import { getIconPath } from '../../../constants/assets';
import { getLanguage, t, type AppLanguage } from '../../i18n';
import { createNumberStepperField } from '../popup-inputs';

export interface SettingsPopupDom {
  content: HTMLDivElement;
  select: HTMLSelectElement;
  languageOptions: Record<AppLanguage, HTMLOptionElement>;
  languageLabel: HTMLSpanElement;
  meshReductionLabel: HTMLSpanElement;
  thresholdLabel: HTMLSpanElement;
  previewLabel: HTMLSpanElement;
  previewButton: HTMLButtonElement;
  meshReductionToggle: HTMLInputElement;
  thresholdInput: HTMLInputElement;
  meshReductionHelpIcon: HTMLImageElement;
  thresholdHelpIcon: HTMLImageElement;
  meshReductionTooltip: HTMLDivElement;
  thresholdTooltip: HTMLDivElement;
  meshReductionTooltipText: HTMLParagraphElement;
  thresholdTooltipText: HTMLParagraphElement;
  meshReductionTooltipButton: HTMLButtonElement;
}

function createLanguageOption(language: AppLanguage): HTMLOptionElement {
  const option = document.createElement('option');
  option.value = language;
  option.setAttribute('data-language', language);
  option.textContent = t(`settings.language.${language}`);
  return option;
}

function createHelpIcon(): HTMLImageElement {
  const icon = document.createElement('img');
  icon.className = 'settings-popup__help-icon';
  icon.src = getIconPath('question.png');
  icon.alt = 'Help';
  icon.tabIndex = 0;
  icon.setAttribute('role', 'button');
  return icon;
}

export function createSettingsPopupDom(
  initialMeshEnabled: boolean,
  initialThreshold: number
): SettingsPopupDom {
  const content = document.createElement('div');
  content.className = 'settings-popup__content';

  const languageRow = document.createElement('label');
  languageRow.className = 'settings-popup__row';
  const languageLabel = document.createElement('span');
  languageLabel.className = 'settings-popup__label';
  const select = document.createElement('select');
  select.className = 'settings-popup__select';
  const languageOptions: Record<AppLanguage, HTMLOptionElement> = {
    vi: createLanguageOption('vi'),
    en: createLanguageOption('en'),
    fr: createLanguageOption('fr'),
  };
  select.appendChild(languageOptions.vi);
  select.appendChild(languageOptions.en);
  select.appendChild(languageOptions.fr);
  select.value = getLanguage();
  languageRow.appendChild(languageLabel);
  languageRow.appendChild(select);
  content.appendChild(languageRow);

  const meshReductionRow = document.createElement('label');
  meshReductionRow.className = 'settings-popup__row';
  const meshReductionLabelWrap = document.createElement('span');
  meshReductionLabelWrap.className = 'settings-popup__label settings-popup__label--with-help';
  const meshReductionLabel = document.createElement('span');
  meshReductionLabel.className = 'settings-popup__label-text';
  const meshReductionHelpIcon = createHelpIcon();
  meshReductionLabelWrap.appendChild(meshReductionLabel);
  meshReductionLabelWrap.appendChild(meshReductionHelpIcon);
  const meshReductionToggle = document.createElement('input');
  meshReductionToggle.type = 'checkbox';
  meshReductionToggle.className = 'settings-popup__checkbox';
  meshReductionToggle.checked = initialMeshEnabled;
  meshReductionRow.appendChild(meshReductionLabelWrap);
  meshReductionRow.appendChild(meshReductionToggle);
  content.appendChild(meshReductionRow);

  const thresholdRow = document.createElement('label');
  thresholdRow.className = 'settings-popup__row';
  const thresholdLabelWrap = document.createElement('span');
  thresholdLabelWrap.className = 'settings-popup__label settings-popup__label--with-help';
  const thresholdLabel = document.createElement('span');
  thresholdLabel.className = 'settings-popup__label-text';
  const thresholdHelpIcon = createHelpIcon();
  const thresholdInput = document.createElement('input');
  thresholdInput.type = 'number';
  thresholdInput.className = 'settings-popup__input';
  thresholdInput.min = String(MESH_REDUCTION.MIN_THRESHOLD);
  thresholdInput.max = String(MESH_REDUCTION.MAX_THRESHOLD);
  thresholdInput.step = '1';
  thresholdInput.value = String(initialThreshold);
  thresholdLabelWrap.appendChild(thresholdLabel);
  thresholdLabelWrap.appendChild(thresholdHelpIcon);
  const thresholdField = createNumberStepperField(thresholdInput, {
    increaseLabel: 'Increase threshold',
    decreaseLabel: 'Decrease threshold',
  });
  thresholdField.classList.add('settings-popup__number-field');
  thresholdRow.appendChild(thresholdLabelWrap);
  thresholdRow.appendChild(thresholdField);
  content.appendChild(thresholdRow);

  const previewRow = document.createElement('div');
  previewRow.className = 'settings-popup__row';
  const previewLabel = document.createElement('span');
  previewLabel.className = 'settings-popup__label';
  const previewButton = document.createElement('button');
  previewButton.type = 'button';
  previewButton.className = 'settings-popup__action-btn';
  previewButton.disabled = true;
  previewRow.appendChild(previewLabel);
  previewRow.appendChild(previewButton);
  content.appendChild(previewRow);

  const meshReductionTooltip = document.createElement('div');
  meshReductionTooltip.className = 'settings-popup__tooltip settings-popup__tooltip--mesh';
  meshReductionTooltip.style.display = 'none';
  const meshReductionTooltipText = document.createElement('p');
  meshReductionTooltipText.className = 'settings-popup__tooltip-text';
  const meshReductionTooltipButton = document.createElement('button');
  meshReductionTooltipButton.type = 'button';
  meshReductionTooltipButton.className = 'settings-popup__tooltip-btn';
  meshReductionTooltipButton.disabled = true;
  meshReductionTooltip.appendChild(meshReductionTooltipText);
  meshReductionTooltip.appendChild(meshReductionTooltipButton);
  content.appendChild(meshReductionTooltip);

  const thresholdTooltip = document.createElement('div');
  thresholdTooltip.className = 'settings-popup__tooltip settings-popup__tooltip--threshold';
  thresholdTooltip.style.display = 'none';
  const thresholdTooltipText = document.createElement('p');
  thresholdTooltipText.className = 'settings-popup__tooltip-text';
  thresholdTooltip.appendChild(thresholdTooltipText);
  content.appendChild(thresholdTooltip);

  return {
    content,
    select,
    languageOptions,
    languageLabel,
    meshReductionLabel,
    thresholdLabel,
    previewLabel,
    previewButton,
    meshReductionToggle,
    thresholdInput,
    meshReductionHelpIcon,
    thresholdHelpIcon,
    meshReductionTooltip,
    thresholdTooltip,
    meshReductionTooltipText,
    thresholdTooltipText,
    meshReductionTooltipButton,
  };
}
