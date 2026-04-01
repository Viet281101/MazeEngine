export type ActionTool = 'hand' | 'pen' | 'eraser';

export interface ActionBarRefs {
  root: HTMLDivElement;
  handButton: HTMLButtonElement;
  penButton: HTMLButtonElement;
  eraserButton: HTMLButtonElement;
  undoButton: HTMLButtonElement;
  clearButton: HTMLButtonElement;
  viewModeSelect: HTMLSelectElement;
  viewModeAllOption: HTMLOptionElement;
  viewModeFocusUpperOption: HTMLOptionElement;
  viewModeFocusOnlyOption: HTMLOptionElement;
}
