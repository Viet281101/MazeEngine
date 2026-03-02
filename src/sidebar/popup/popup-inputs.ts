import type { TranslationKey } from '../i18n';
import { setI18nText } from './popup-i18n';
import './popup-inputs.css';

interface LabeledNumberInputConfig {
  labelKey: TranslationKey;
  min: number;
  max: number;
  value: number;
  wrapperClassName: string;
}

interface NumberStepperFieldOptions {
  increaseLabel?: string;
  decreaseLabel?: string;
}

/**
 * Creates a labeled number input with i18n-ready label text.
 */
export function createLabeledNumberInput(config: LabeledNumberInputConfig): {
  wrapper: HTMLLabelElement;
  input: HTMLInputElement;
} {
  const wrapper = document.createElement('label');
  wrapper.className = config.wrapperClassName;

  const span = document.createElement('span');
  setI18nText(span, config.labelKey);

  const input = document.createElement('input');
  input.type = 'number';
  input.className = 'popup-number-input';
  input.min = String(config.min);
  input.max = String(config.max);
  input.step = '1';
  input.value = String(config.value);

  const steppedField = createNumberStepperField(input);

  wrapper.appendChild(span);
  wrapper.appendChild(steppedField);

  return { wrapper, input };
}

/**
 * Wraps a number input with large custom stepper buttons.
 */
export function createNumberStepperField(
  input: HTMLInputElement,
  options: NumberStepperFieldOptions = {}
): HTMLDivElement {
  input.type = 'number';
  input.classList.add('popup-number-input');

  const numberField = document.createElement('div');
  numberField.className = 'popup-number-field';

  const stepper = document.createElement('div');
  stepper.className = 'popup-number-stepper';

  const increaseButton = document.createElement('button');
  increaseButton.type = 'button';
  increaseButton.className = 'popup-number-step-btn popup-number-step-btn--up';
  increaseButton.setAttribute('aria-label', options.increaseLabel ?? 'Increase');
  increaseButton.textContent = '▲';
  increaseButton.addEventListener('click', () => {
    adjustNumberInputValue(input, 1);
  });

  const decreaseButton = document.createElement('button');
  decreaseButton.type = 'button';
  decreaseButton.className = 'popup-number-step-btn popup-number-step-btn--down';
  decreaseButton.setAttribute('aria-label', options.decreaseLabel ?? 'Decrease');
  decreaseButton.textContent = '▼';
  decreaseButton.addEventListener('click', () => {
    adjustNumberInputValue(input, -1);
  });

  stepper.appendChild(increaseButton);
  stepper.appendChild(decreaseButton);
  numberField.appendChild(input);
  numberField.appendChild(stepper);

  return numberField;
}

function adjustNumberInputValue(input: HTMLInputElement, delta: number): void {
  const step = Number.parseFloat(input.step || '1');
  const min = Number.parseFloat(input.min);
  const max = Number.parseFloat(input.max);
  const current = Number.parseFloat(input.value);

  const safeStep = Number.isFinite(step) ? step : 1;
  const safeCurrent = Number.isFinite(current)
    ? current
    : Number.isFinite(min)
      ? min
      : Number.isFinite(max)
        ? max
        : 0;

  let nextValue = safeCurrent + safeStep * delta;
  if (Number.isFinite(min)) {
    nextValue = Math.max(nextValue, min);
  }
  if (Number.isFinite(max)) {
    nextValue = Math.min(nextValue, max);
  }

  const decimals = inferFractionDigits(safeStep, safeCurrent, min, max);
  input.value = toStableNumberString(nextValue, decimals);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function inferFractionDigits(...values: number[]): number {
  let maxDigits = 0;
  values.forEach(value => {
    if (!Number.isFinite(value)) {
      return;
    }
    const text = String(value);
    const dotIndex = text.indexOf('.');
    if (dotIndex === -1) {
      return;
    }
    maxDigits = Math.max(maxDigits, text.length - dotIndex - 1);
  });
  return Math.min(maxDigits, 6);
}

function toStableNumberString(value: number, digits: number): string {
  if (digits <= 0) {
    return String(Math.round(value));
  }
  return value.toFixed(digits).replace(/\.?0+$/, '');
}
