import { MESH_REDUCTION } from '../../../constants/maze';
import {
  SUPPORTED_LANGUAGES,
  getLanguage,
  t,
  type AppLanguage,
  type TranslationKey,
} from '../../../i18n';
import { createNumberStepperField } from '../utils';
import { createLabelWithHelp, createRow, createToggleRow } from '../popup-rows';

export interface SettingsPopupDom {
  content: HTMLDivElement;
  select: HTMLSelectElement;
  languageOptions: Record<AppLanguage, HTMLOptionElement>;
  languageLabel: HTMLElement;
  meshReductionLabel: HTMLElement;
  thresholdLabel: HTMLElement;
  hideEdgesDuringInteractionLabel: HTMLElement;
  floorGridLabel: HTMLElement;
  adaptiveQualityLabel: HTMLElement;
  allowMultipleMazePopupPanelsLabel: HTMLElement;
  showEdgesLabel: HTMLElement;
  showDebugLabel: HTMLElement;
  showPreviewLabel: HTMLElement;
  cameraZoomLimitLabel: HTMLElement;
  cameraZoomMinLabel: HTMLElement;
  cameraZoomMaxLabel: HTMLElement;
  cameraZoomMinRow: HTMLLabelElement;
  cameraZoomMaxRow: HTMLLabelElement;
  previewLabel: HTMLElement;
  previewButton: HTMLButtonElement;
  meshReductionToggle: HTMLInputElement;
  thresholdInput: HTMLInputElement;
  hideEdgesDuringInteractionToggle: HTMLInputElement;
  floorGridToggle: HTMLInputElement;
  adaptiveQualityToggle: HTMLInputElement;
  allowMultipleMazePopupPanelsToggle: HTMLInputElement;
  showEdgesToggle: HTMLInputElement;
  showDebugToggle: HTMLInputElement;
  showPreviewToggle: HTMLInputElement;
  cameraZoomLimitToggle: HTMLInputElement;
  cameraZoomMinInput: HTMLInputElement;
  cameraZoomMaxInput: HTMLInputElement;
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

function appendToggleSettingRow(
  container: HTMLElement,
  options: {
    labelKey: TranslationKey;
    initialState: boolean;
    withHelp?: boolean;
  }
) {
  const rowResult = createToggleRow(options);
  container.appendChild(rowResult.row);
  return rowResult;
}

function createTooltipBlock(
  container: HTMLElement,
  className: string,
  includeButton: boolean = false
): {
  tooltip: HTMLDivElement;
  text: HTMLParagraphElement;
  button?: HTMLButtonElement;
} {
  const tooltip = document.createElement('div');
  tooltip.className = className;
  tooltip.style.display = 'none';

  const text = document.createElement('p');
  text.className = 'settings-popup__tooltip-text';
  tooltip.appendChild(text);

  let button: HTMLButtonElement | undefined;
  if (includeButton) {
    button = document.createElement('button');
    button.type = 'button';
    button.className = 'settings-popup__tooltip-btn';
    button.disabled = true;
    tooltip.appendChild(button);
  }

  container.appendChild(tooltip);
  return { tooltip, text, button };
}

export function createSettingsPopupDom(
  initialMeshEnabled: boolean,
  initialThreshold: number,
  initialHideEdgesDuringInteractionEnabled: boolean,
  initialFloorGridEnabled: boolean,
  initialAdaptiveQualityEnabled: boolean,
  initialAllowMultipleMazePopupPanelsEnabled: boolean,
  initialShowEdgesEnabled: boolean,
  initialShowDebugEnabled: boolean,
  initialShowPreviewEnabled: boolean,
  initialCameraZoomLimitEnabled: boolean,
  initialCameraZoomMinDistance: number,
  initialCameraZoomMaxDistance: number
): SettingsPopupDom {
  const content = document.createElement('div');
  content.className = 'settings-popup__content';

  const languageOptions = {} as Record<AppLanguage, HTMLOptionElement>;
  SUPPORTED_LANGUAGES.forEach(language => {
    languageOptions[language] = createLanguageOption(language);
  });
  const select = document.createElement('select');
  select.className = 'settings-popup__select';
  SUPPORTED_LANGUAGES.forEach(language => {
    select.appendChild(languageOptions[language]);
  });
  select.value = getLanguage();
  const { row: languageRow, label: languageLabel } = createRow({
    label: 'settings.language',
    control: select,
  });
  content.appendChild(languageRow);

  const {
    toggle: meshReductionToggle,
    label: meshReductionLabel,
    helpIcon: meshReductionHelpIcon,
  } = appendToggleSettingRow(content, {
    labelKey: 'settings.meshVisible',
    initialState: initialMeshEnabled,
    withHelp: true,
  });

  const thresholdInput = document.createElement('input');
  thresholdInput.type = 'number';
  thresholdInput.className = 'settings-popup__input';
  thresholdInput.min = String(MESH_REDUCTION.MIN_THRESHOLD);
  thresholdInput.max = String(MESH_REDUCTION.MAX_THRESHOLD);
  thresholdInput.step = '1';
  thresholdInput.value = String(initialThreshold);
  const thresholdField = createNumberStepperField(thresholdInput, {
    increaseLabel: 'Increase threshold',
    decreaseLabel: 'Decrease threshold',
  });
  thresholdField.classList.add('settings-popup__number-field');
  const {
    labelWrap: thresholdLabelWrap,
    labelText: thresholdLabel,
    helpIcon: thresholdHelpIcon,
  } = createLabelWithHelp('settings.meshReductionThreshold');
  const { row: thresholdRow } = createRow({ label: thresholdLabelWrap, control: thresholdField });
  content.appendChild(thresholdRow);

  const {
    toggle: hideEdgesDuringInteractionToggle,
    label: hideEdgesDuringInteractionLabel,
    helpIcon: hideEdgesDuringInteractionHelpIcon,
  } = appendToggleSettingRow(content, {
    labelKey: 'settings.hideEdgesDuringInteraction',
    initialState: initialHideEdgesDuringInteractionEnabled,
    withHelp: true,
  });

  const {
    toggle: adaptiveQualityToggle,
    label: adaptiveQualityLabel,
    helpIcon: adaptiveQualityHelpIcon,
  } = appendToggleSettingRow(content, {
    labelKey: 'settings.adaptiveQuality',
    initialState: initialAdaptiveQualityEnabled,
    withHelp: true,
  });

  const { toggle: allowMultipleMazePopupPanelsToggle, label: allowMultipleMazePopupPanelsLabel } =
    appendToggleSettingRow(content, {
      labelKey: 'settings.allowMultipleMazePopupPanels',
      initialState: initialAllowMultipleMazePopupPanelsEnabled,
    });

  const {
    toggle: showEdgesToggle,
    label: showEdgesLabel,
    helpIcon: showEdgesHelpIcon,
  } = appendToggleSettingRow(content, {
    labelKey: 'gui.showEdges',
    initialState: initialShowEdgesEnabled,
    withHelp: true,
  });

  const {
    toggle: showDebugToggle,
    label: showDebugLabel,
    helpIcon: showDebugHelpIcon,
  } = appendToggleSettingRow(content, {
    labelKey: 'gui.showDebug',
    initialState: initialShowDebugEnabled,
    withHelp: true,
  });

  const {
    toggle: showPreviewToggle,
    label: showPreviewLabel,
    helpIcon: showPreviewHelpIcon,
  } = appendToggleSettingRow(content, {
    labelKey: 'gui.showPreview',
    initialState: initialShowPreviewEnabled,
    withHelp: true,
  });

  const {
    toggle: floorGridToggle,
    label: floorGridLabel,
    helpIcon: floorGridHelpIcon,
  } = appendToggleSettingRow(content, {
    labelKey: 'settings.floorGrid',
    initialState: initialFloorGridEnabled,
    withHelp: true,
  });

  const { toggle: cameraZoomLimitToggle, label: cameraZoomLimitLabel } = appendToggleSettingRow(
    content,
    {
      labelKey: 'settings.cameraZoomLimit',
      initialState: initialCameraZoomLimitEnabled,
    }
  );

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
  const { row: cameraZoomMinRow, label: cameraZoomMinLabel } = createRow({
    label: 'settings.cameraZoomLimitMin',
    control: cameraZoomMinField,
  });
  content.appendChild(cameraZoomMinRow);

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
  const { row: cameraZoomMaxRow, label: cameraZoomMaxLabel } = createRow({
    label: 'settings.cameraZoomLimitMax',
    control: cameraZoomMaxField,
  });
  content.appendChild(cameraZoomMaxRow);

  const previewButton = document.createElement('button');
  previewButton.type = 'button';
  previewButton.className = 'settings-popup__action-btn';
  previewButton.disabled = true;
  const { row: previewRow, label: previewLabel } = createRow({
    label: 'settings.previewWindow',
    control: previewButton,
  });
  content.appendChild(previewRow);

  const meshTooltipBlock = createTooltipBlock(
    content,
    'settings-popup__tooltip settings-popup__tooltip--mesh',
    true
  );
  const thresholdTooltipBlock = createTooltipBlock(
    content,
    'settings-popup__tooltip settings-popup__tooltip--threshold'
  );
  const hideEdgesTooltipBlock = createTooltipBlock(
    content,
    'settings-popup__tooltip settings-popup__tooltip--hide-edges'
  );
  const adaptiveTooltipBlock = createTooltipBlock(
    content,
    'settings-popup__tooltip settings-popup__tooltip--adaptive'
  );
  const floorGridTooltipBlock = createTooltipBlock(
    content,
    'settings-popup__tooltip settings-popup__tooltip--floor-grid'
  );
  const showEdgesTooltipBlock = createTooltipBlock(
    content,
    'settings-popup__tooltip settings-popup__tooltip--show-edges'
  );
  const showDebugTooltipBlock = createTooltipBlock(
    content,
    'settings-popup__tooltip settings-popup__tooltip--show-debug'
  );
  const showPreviewTooltipBlock = createTooltipBlock(
    content,
    'settings-popup__tooltip settings-popup__tooltip--show-preview'
  );

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
    allowMultipleMazePopupPanelsLabel,
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
    allowMultipleMazePopupPanelsToggle,
    showEdgesToggle,
    showDebugToggle,
    showPreviewToggle,
    cameraZoomLimitToggle,
    cameraZoomMinInput,
    cameraZoomMaxInput,
    cameraZoomMinIncreaseButton,
    cameraZoomMinDecreaseButton,
    cameraZoomMaxIncreaseButton,
    cameraZoomMaxDecreaseButton,
    cameraZoomMinRow,
    cameraZoomMaxRow,
    meshReductionHelpIcon: meshReductionHelpIcon as HTMLImageElement,
    thresholdHelpIcon,
    hideEdgesDuringInteractionHelpIcon: hideEdgesDuringInteractionHelpIcon as HTMLImageElement,
    floorGridHelpIcon: floorGridHelpIcon as HTMLImageElement,
    adaptiveQualityHelpIcon: adaptiveQualityHelpIcon as HTMLImageElement,
    showEdgesHelpIcon: showEdgesHelpIcon as HTMLImageElement,
    showDebugHelpIcon: showDebugHelpIcon as HTMLImageElement,
    showPreviewHelpIcon: showPreviewHelpIcon as HTMLImageElement,
    meshReductionTooltip: meshTooltipBlock.tooltip,
    thresholdTooltip: thresholdTooltipBlock.tooltip,
    hideEdgesDuringInteractionTooltip: hideEdgesTooltipBlock.tooltip,
    floorGridTooltip: floorGridTooltipBlock.tooltip,
    adaptiveQualityTooltip: adaptiveTooltipBlock.tooltip,
    showEdgesTooltip: showEdgesTooltipBlock.tooltip,
    showDebugTooltip: showDebugTooltipBlock.tooltip,
    showPreviewTooltip: showPreviewTooltipBlock.tooltip,
    meshReductionTooltipText: meshTooltipBlock.text,
    thresholdTooltipText: thresholdTooltipBlock.text,
    hideEdgesDuringInteractionTooltipText: hideEdgesTooltipBlock.text,
    floorGridTooltipText: floorGridTooltipBlock.text,
    adaptiveQualityTooltipText: adaptiveTooltipBlock.text,
    showEdgesTooltipText: showEdgesTooltipBlock.text,
    showDebugTooltipText: showDebugTooltipBlock.text,
    showPreviewTooltipText: showPreviewTooltipBlock.text,
    meshReductionTooltipButton: meshTooltipBlock.button as HTMLButtonElement,
  };
}
