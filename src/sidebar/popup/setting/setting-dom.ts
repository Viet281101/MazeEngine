import { MESH_REDUCTION } from '../../../constants/maze';
import { getLanguage, t, type AppLanguage } from '../../i18n';
import { createNumberStepperField } from '../popup-inputs';
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

  const languageOptions: Record<AppLanguage, HTMLOptionElement> = {
    vi: createLanguageOption('vi'),
    en: createLanguageOption('en'),
    fr: createLanguageOption('fr'),
  };
  const select = document.createElement('select');
  select.className = 'settings-popup__select';
  select.appendChild(languageOptions.vi);
  select.appendChild(languageOptions.en);
  select.appendChild(languageOptions.fr);
  select.value = getLanguage();
  const { row: languageRow, label: languageLabel } = createRow({
    label: 'settings.language',
    control: select,
  });
  content.appendChild(languageRow);

  const {
    row: meshReductionRow,
    toggle: meshReductionToggle,
    label: meshReductionLabel,
    helpIcon: meshReductionHelpIcon,
  } = createToggleRow({
    labelKey: 'settings.meshVisible',
    initialState: initialMeshEnabled,
    withHelp: true,
  });
  content.appendChild(meshReductionRow);

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
    row: hideEdgesRow,
    toggle: hideEdgesDuringInteractionToggle,
    label: hideEdgesDuringInteractionLabel,
    helpIcon: hideEdgesDuringInteractionHelpIcon,
  } = createToggleRow({
    labelKey: 'settings.hideEdgesDuringInteraction',
    initialState: initialHideEdgesDuringInteractionEnabled,
    withHelp: true,
  });
  content.appendChild(hideEdgesRow);

  const {
    row: adaptiveQualityRow,
    toggle: adaptiveQualityToggle,
    label: adaptiveQualityLabel,
    helpIcon: adaptiveQualityHelpIcon,
  } = createToggleRow({
    labelKey: 'settings.adaptiveQuality',
    initialState: initialAdaptiveQualityEnabled,
    withHelp: true,
  });
  content.appendChild(adaptiveQualityRow);

  const {
    row: showEdgesRow,
    toggle: showEdgesToggle,
    label: showEdgesLabel,
    helpIcon: showEdgesHelpIcon,
  } = createToggleRow({
    labelKey: 'gui.showEdges',
    initialState: initialShowEdgesEnabled,
    withHelp: true,
  });
  content.appendChild(showEdgesRow);

  const {
    row: showDebugRow,
    toggle: showDebugToggle,
    label: showDebugLabel,
    helpIcon: showDebugHelpIcon,
  } = createToggleRow({
    labelKey: 'gui.showDebug',
    initialState: initialShowDebugEnabled,
    withHelp: true,
  });
  content.appendChild(showDebugRow);

  const {
    row: showPreviewRow,
    toggle: showPreviewToggle,
    label: showPreviewLabel,
    helpIcon: showPreviewHelpIcon,
  } = createToggleRow({
    labelKey: 'gui.showPreview',
    initialState: initialShowPreviewEnabled,
    withHelp: true,
  });
  content.appendChild(showPreviewRow);

  const {
    row: floorGridRow,
    toggle: floorGridToggle,
    label: floorGridLabel,
    helpIcon: floorGridHelpIcon,
  } = createToggleRow({
    labelKey: 'settings.floorGrid',
    initialState: initialFloorGridEnabled,
    withHelp: true,
  });
  content.appendChild(floorGridRow);

  const {
    row: cameraZoomLimitRow,
    toggle: cameraZoomLimitToggle,
    label: cameraZoomLimitLabel,
  } = createToggleRow({
    labelKey: 'settings.cameraZoomLimit',
    initialState: initialCameraZoomLimitEnabled,
  });
  content.appendChild(cameraZoomLimitRow);

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
    cameraZoomMinIncreaseButton,
    cameraZoomMinDecreaseButton,
    cameraZoomMaxIncreaseButton,
    cameraZoomMaxDecreaseButton,
    cameraZoomMinRow,
    cameraZoomMaxRow,
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
