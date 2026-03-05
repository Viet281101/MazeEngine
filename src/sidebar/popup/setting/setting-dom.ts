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
  hideEdgesDuringInteractionLabel: HTMLSpanElement;
  floorGridLabel: HTMLSpanElement;
  adaptiveQualityLabel: HTMLSpanElement;
  showEdgesLabel: HTMLSpanElement;
  showDebugLabel: HTMLSpanElement;
  showPreviewLabel: HTMLSpanElement;
  cameraZoomLimitLabel: HTMLSpanElement;
  cameraZoomMinLabel: HTMLSpanElement;
  cameraZoomMaxLabel: HTMLSpanElement;
  previewLabel: HTMLSpanElement;
  previewButton: HTMLButtonElement;
  meshReductionToggle: HTMLInputElement;
  thresholdInput: HTMLInputElement;
  hideEdgesDuringInteractionToggle: HTMLInputElement;
  floorGridToggle: HTMLInputElement;
  adaptiveQualityToggle: HTMLInputElement;
  showEdgesToggle: HTMLInputElement;
  showDebugToggle: HTMLInputElement;
  showPreviewToggle: HTMLInputElement;
  cameraZoomLimitToggle: HTMLInputElement;
  cameraZoomMinInput: HTMLInputElement;
  cameraZoomMaxInput: HTMLInputElement;
  cameraZoomMinRow: HTMLLabelElement;
  cameraZoomMaxRow: HTMLLabelElement;
  cameraZoomMinIncreaseButton: HTMLButtonElement;
  cameraZoomMinDecreaseButton: HTMLButtonElement;
  cameraZoomMaxIncreaseButton: HTMLButtonElement;
  cameraZoomMaxDecreaseButton: HTMLButtonElement;
  meshReductionHelpIcon: HTMLImageElement;
  thresholdHelpIcon: HTMLImageElement;
  hideEdgesDuringInteractionHelpIcon: HTMLImageElement;
  floorGridHelpIcon: HTMLImageElement;
  adaptiveQualityHelpIcon: HTMLImageElement;
  showEdgesHelpIcon: HTMLImageElement;
  showDebugHelpIcon: HTMLImageElement;
  showPreviewHelpIcon: HTMLImageElement;
  meshReductionTooltip: HTMLDivElement;
  thresholdTooltip: HTMLDivElement;
  hideEdgesDuringInteractionTooltip: HTMLDivElement;
  floorGridTooltip: HTMLDivElement;
  adaptiveQualityTooltip: HTMLDivElement;
  showEdgesTooltip: HTMLDivElement;
  showDebugTooltip: HTMLDivElement;
  showPreviewTooltip: HTMLDivElement;
  meshReductionTooltipText: HTMLParagraphElement;
  thresholdTooltipText: HTMLParagraphElement;
  hideEdgesDuringInteractionTooltipText: HTMLParagraphElement;
  floorGridTooltipText: HTMLParagraphElement;
  adaptiveQualityTooltipText: HTMLParagraphElement;
  showEdgesTooltipText: HTMLParagraphElement;
  showDebugTooltipText: HTMLParagraphElement;
  showPreviewTooltipText: HTMLParagraphElement;
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

function getStepperButtonOrThrow(
  field: HTMLDivElement,
  selector: string,
  context: string
): HTMLButtonElement {
  const button = field.querySelector(selector);
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Missing stepper button "${selector}" for ${context}`);
  }
  return button;
}

export function createSettingsPopupDom(
  initialMeshEnabled: boolean,
  initialThreshold: number,
  initialHideEdgesDuringInteractionEnabled: boolean,
  initialFloorGridEnabled: boolean,
  initialAdaptiveQualityEnabled: boolean,
  initialShowEdgesEnabled: boolean,
  initialShowDebugEnabled: boolean,
  initialShowPreviewEnabled: boolean,
  initialCameraZoomLimitEnabled: boolean,
  initialCameraZoomMinDistance: number,
  initialCameraZoomMaxDistance: number
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

  const hideEdgesDuringInteractionRow = document.createElement('label');
  hideEdgesDuringInteractionRow.className = 'settings-popup__row';
  const hideEdgesDuringInteractionLabelWrap = document.createElement('span');
  hideEdgesDuringInteractionLabelWrap.className =
    'settings-popup__label settings-popup__label--with-help';
  const hideEdgesDuringInteractionLabel = document.createElement('span');
  hideEdgesDuringInteractionLabel.className = 'settings-popup__label-text';
  const hideEdgesDuringInteractionHelpIcon = createHelpIcon();
  hideEdgesDuringInteractionLabelWrap.appendChild(hideEdgesDuringInteractionLabel);
  hideEdgesDuringInteractionLabelWrap.appendChild(hideEdgesDuringInteractionHelpIcon);
  const hideEdgesDuringInteractionToggle = document.createElement('input');
  hideEdgesDuringInteractionToggle.type = 'checkbox';
  hideEdgesDuringInteractionToggle.className = 'settings-popup__checkbox';
  hideEdgesDuringInteractionToggle.checked = initialHideEdgesDuringInteractionEnabled;
  hideEdgesDuringInteractionRow.appendChild(hideEdgesDuringInteractionLabelWrap);
  hideEdgesDuringInteractionRow.appendChild(hideEdgesDuringInteractionToggle);
  content.appendChild(hideEdgesDuringInteractionRow);

  const adaptiveQualityRow = document.createElement('label');
  adaptiveQualityRow.className = 'settings-popup__row';
  const adaptiveQualityLabelWrap = document.createElement('span');
  adaptiveQualityLabelWrap.className = 'settings-popup__label settings-popup__label--with-help';
  const adaptiveQualityLabel = document.createElement('span');
  adaptiveQualityLabel.className = 'settings-popup__label-text';
  const adaptiveQualityHelpIcon = createHelpIcon();
  adaptiveQualityLabelWrap.appendChild(adaptiveQualityLabel);
  adaptiveQualityLabelWrap.appendChild(adaptiveQualityHelpIcon);
  const adaptiveQualityToggle = document.createElement('input');
  adaptiveQualityToggle.type = 'checkbox';
  adaptiveQualityToggle.className = 'settings-popup__checkbox';
  adaptiveQualityToggle.checked = initialAdaptiveQualityEnabled;
  adaptiveQualityRow.appendChild(adaptiveQualityLabelWrap);
  adaptiveQualityRow.appendChild(adaptiveQualityToggle);
  content.appendChild(adaptiveQualityRow);

  const showEdgesRow = document.createElement('label');
  showEdgesRow.className = 'settings-popup__row';
  const showEdgesLabelWrap = document.createElement('span');
  showEdgesLabelWrap.className = 'settings-popup__label settings-popup__label--with-help';
  const showEdgesLabel = document.createElement('span');
  showEdgesLabel.className = 'settings-popup__label-text';
  const showEdgesHelpIcon = createHelpIcon();
  showEdgesLabelWrap.appendChild(showEdgesLabel);
  showEdgesLabelWrap.appendChild(showEdgesHelpIcon);
  const showEdgesToggle = document.createElement('input');
  showEdgesToggle.type = 'checkbox';
  showEdgesToggle.className = 'settings-popup__checkbox';
  showEdgesToggle.checked = initialShowEdgesEnabled;
  showEdgesRow.appendChild(showEdgesLabelWrap);
  showEdgesRow.appendChild(showEdgesToggle);
  content.appendChild(showEdgesRow);

  const showDebugRow = document.createElement('label');
  showDebugRow.className = 'settings-popup__row';
  const showDebugLabelWrap = document.createElement('span');
  showDebugLabelWrap.className = 'settings-popup__label settings-popup__label--with-help';
  const showDebugLabel = document.createElement('span');
  showDebugLabel.className = 'settings-popup__label-text';
  const showDebugHelpIcon = createHelpIcon();
  showDebugLabelWrap.appendChild(showDebugLabel);
  showDebugLabelWrap.appendChild(showDebugHelpIcon);
  const showDebugToggle = document.createElement('input');
  showDebugToggle.type = 'checkbox';
  showDebugToggle.className = 'settings-popup__checkbox';
  showDebugToggle.checked = initialShowDebugEnabled;
  showDebugRow.appendChild(showDebugLabelWrap);
  showDebugRow.appendChild(showDebugToggle);
  content.appendChild(showDebugRow);

  const showPreviewRow = document.createElement('label');
  showPreviewRow.className = 'settings-popup__row';
  const showPreviewLabelWrap = document.createElement('span');
  showPreviewLabelWrap.className = 'settings-popup__label settings-popup__label--with-help';
  const showPreviewLabel = document.createElement('span');
  showPreviewLabel.className = 'settings-popup__label-text';
  const showPreviewHelpIcon = createHelpIcon();
  showPreviewLabelWrap.appendChild(showPreviewLabel);
  showPreviewLabelWrap.appendChild(showPreviewHelpIcon);
  const showPreviewToggle = document.createElement('input');
  showPreviewToggle.type = 'checkbox';
  showPreviewToggle.className = 'settings-popup__checkbox';
  showPreviewToggle.checked = initialShowPreviewEnabled;
  showPreviewRow.appendChild(showPreviewLabelWrap);
  showPreviewRow.appendChild(showPreviewToggle);
  content.appendChild(showPreviewRow);

  const floorGridRow = document.createElement('label');
  floorGridRow.className = 'settings-popup__row';
  const floorGridLabelWrap = document.createElement('span');
  floorGridLabelWrap.className = 'settings-popup__label settings-popup__label--with-help';
  const floorGridLabel = document.createElement('span');
  floorGridLabel.className = 'settings-popup__label-text';
  const floorGridHelpIcon = createHelpIcon();
  floorGridLabelWrap.appendChild(floorGridLabel);
  floorGridLabelWrap.appendChild(floorGridHelpIcon);
  const floorGridToggle = document.createElement('input');
  floorGridToggle.type = 'checkbox';
  floorGridToggle.className = 'settings-popup__checkbox';
  floorGridToggle.checked = initialFloorGridEnabled;
  floorGridRow.appendChild(floorGridLabelWrap);
  floorGridRow.appendChild(floorGridToggle);
  content.appendChild(floorGridRow);

  const cameraZoomLimitRow = document.createElement('label');
  cameraZoomLimitRow.className = 'settings-popup__row';
  const cameraZoomLimitLabel = document.createElement('span');
  cameraZoomLimitLabel.className = 'settings-popup__label';
  const cameraZoomLimitToggle = document.createElement('input');
  cameraZoomLimitToggle.type = 'checkbox';
  cameraZoomLimitToggle.className = 'settings-popup__checkbox';
  cameraZoomLimitToggle.checked = initialCameraZoomLimitEnabled;
  cameraZoomLimitRow.appendChild(cameraZoomLimitLabel);
  cameraZoomLimitRow.appendChild(cameraZoomLimitToggle);
  content.appendChild(cameraZoomLimitRow);

  const cameraZoomMinRow = document.createElement('label');
  cameraZoomMinRow.className = 'settings-popup__row';
  const cameraZoomMinLabel = document.createElement('span');
  cameraZoomMinLabel.className = 'settings-popup__label';
  const cameraZoomMinInput = document.createElement('input');
  cameraZoomMinInput.type = 'number';
  cameraZoomMinInput.className = 'settings-popup__input';
  cameraZoomMinInput.min = '0.5';
  cameraZoomMinInput.max = '5000';
  cameraZoomMinInput.step = '0.5';
  cameraZoomMinInput.value = String(initialCameraZoomMinDistance);
  const cameraZoomMinField = createNumberStepperField(cameraZoomMinInput, {
    increaseLabel: 'Increase camera min zoom limit',
    decreaseLabel: 'Decrease camera min zoom limit',
  });
  const cameraZoomMinIncreaseButton = getStepperButtonOrThrow(
    cameraZoomMinField,
    '.popup-number-step-btn--up',
    'camera zoom min'
  );
  const cameraZoomMinDecreaseButton = getStepperButtonOrThrow(
    cameraZoomMinField,
    '.popup-number-step-btn--down',
    'camera zoom min'
  );
  cameraZoomMinField.classList.add('settings-popup__number-field');
  cameraZoomMinRow.appendChild(cameraZoomMinLabel);
  cameraZoomMinRow.appendChild(cameraZoomMinField);
  content.appendChild(cameraZoomMinRow);

  const cameraZoomMaxRow = document.createElement('label');
  cameraZoomMaxRow.className = 'settings-popup__row';
  const cameraZoomMaxLabel = document.createElement('span');
  cameraZoomMaxLabel.className = 'settings-popup__label';
  const cameraZoomMaxInput = document.createElement('input');
  cameraZoomMaxInput.type = 'number';
  cameraZoomMaxInput.className = 'settings-popup__input';
  cameraZoomMaxInput.min = '0.5';
  cameraZoomMaxInput.max = '5000';
  cameraZoomMaxInput.step = '1';
  cameraZoomMaxInput.value = String(initialCameraZoomMaxDistance);
  const cameraZoomMaxField = createNumberStepperField(cameraZoomMaxInput, {
    increaseLabel: 'Increase camera max zoom limit',
    decreaseLabel: 'Decrease camera max zoom limit',
  });
  const cameraZoomMaxIncreaseButton = getStepperButtonOrThrow(
    cameraZoomMaxField,
    '.popup-number-step-btn--up',
    'camera zoom max'
  );
  const cameraZoomMaxDecreaseButton = getStepperButtonOrThrow(
    cameraZoomMaxField,
    '.popup-number-step-btn--down',
    'camera zoom max'
  );
  cameraZoomMaxField.classList.add('settings-popup__number-field');
  cameraZoomMaxRow.appendChild(cameraZoomMaxLabel);
  cameraZoomMaxRow.appendChild(cameraZoomMaxField);
  content.appendChild(cameraZoomMaxRow);

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

  const hideEdgesDuringInteractionTooltip = document.createElement('div');
  hideEdgesDuringInteractionTooltip.className =
    'settings-popup__tooltip settings-popup__tooltip--hide-edges';
  hideEdgesDuringInteractionTooltip.style.display = 'none';
  const hideEdgesDuringInteractionTooltipText = document.createElement('p');
  hideEdgesDuringInteractionTooltipText.className = 'settings-popup__tooltip-text';
  hideEdgesDuringInteractionTooltip.appendChild(hideEdgesDuringInteractionTooltipText);
  content.appendChild(hideEdgesDuringInteractionTooltip);

  const adaptiveQualityTooltip = document.createElement('div');
  adaptiveQualityTooltip.className = 'settings-popup__tooltip settings-popup__tooltip--adaptive';
  adaptiveQualityTooltip.style.display = 'none';
  const adaptiveQualityTooltipText = document.createElement('p');
  adaptiveQualityTooltipText.className = 'settings-popup__tooltip-text';
  adaptiveQualityTooltip.appendChild(adaptiveQualityTooltipText);
  content.appendChild(adaptiveQualityTooltip);

  const floorGridTooltip = document.createElement('div');
  floorGridTooltip.className = 'settings-popup__tooltip settings-popup__tooltip--floor-grid';
  floorGridTooltip.style.display = 'none';
  const floorGridTooltipText = document.createElement('p');
  floorGridTooltipText.className = 'settings-popup__tooltip-text';
  floorGridTooltip.appendChild(floorGridTooltipText);
  content.appendChild(floorGridTooltip);

  const showEdgesTooltip = document.createElement('div');
  showEdgesTooltip.className = 'settings-popup__tooltip settings-popup__tooltip--show-edges';
  showEdgesTooltip.style.display = 'none';
  const showEdgesTooltipText = document.createElement('p');
  showEdgesTooltipText.className = 'settings-popup__tooltip-text';
  showEdgesTooltip.appendChild(showEdgesTooltipText);
  content.appendChild(showEdgesTooltip);

  const showDebugTooltip = document.createElement('div');
  showDebugTooltip.className = 'settings-popup__tooltip settings-popup__tooltip--show-debug';
  showDebugTooltip.style.display = 'none';
  const showDebugTooltipText = document.createElement('p');
  showDebugTooltipText.className = 'settings-popup__tooltip-text';
  showDebugTooltip.appendChild(showDebugTooltipText);
  content.appendChild(showDebugTooltip);

  const showPreviewTooltip = document.createElement('div');
  showPreviewTooltip.className = 'settings-popup__tooltip settings-popup__tooltip--show-preview';
  showPreviewTooltip.style.display = 'none';
  const showPreviewTooltipText = document.createElement('p');
  showPreviewTooltipText.className = 'settings-popup__tooltip-text';
  showPreviewTooltip.appendChild(showPreviewTooltipText);
  content.appendChild(showPreviewTooltip);

  return {
    content,
    select,
    languageOptions,
    languageLabel,
    meshReductionLabel,
    thresholdLabel,
    hideEdgesDuringInteractionLabel,
    floorGridLabel,
    adaptiveQualityLabel,
    showEdgesLabel,
    showDebugLabel,
    showPreviewLabel,
    cameraZoomLimitLabel,
    cameraZoomMinLabel,
    cameraZoomMaxLabel,
    previewLabel,
    previewButton,
    meshReductionToggle,
    thresholdInput,
    hideEdgesDuringInteractionToggle,
    floorGridToggle,
    adaptiveQualityToggle,
    showEdgesToggle,
    showDebugToggle,
    showPreviewToggle,
    cameraZoomLimitToggle,
    cameraZoomMinInput,
    cameraZoomMaxInput,
    cameraZoomMinRow,
    cameraZoomMaxRow,
    cameraZoomMinIncreaseButton,
    cameraZoomMinDecreaseButton,
    cameraZoomMaxIncreaseButton,
    cameraZoomMaxDecreaseButton,
    meshReductionHelpIcon,
    thresholdHelpIcon,
    hideEdgesDuringInteractionHelpIcon,
    floorGridHelpIcon,
    adaptiveQualityHelpIcon,
    showEdgesHelpIcon,
    showDebugHelpIcon,
    showPreviewHelpIcon,
    meshReductionTooltip,
    thresholdTooltip,
    hideEdgesDuringInteractionTooltip,
    floorGridTooltip,
    adaptiveQualityTooltip,
    showEdgesTooltip,
    showDebugTooltip,
    showPreviewTooltip,
    meshReductionTooltipText,
    thresholdTooltipText,
    hideEdgesDuringInteractionTooltipText,
    floorGridTooltipText,
    adaptiveQualityTooltipText,
    showEdgesTooltipText,
    showDebugTooltipText,
    showPreviewTooltipText,
    meshReductionTooltipButton,
  };
}
