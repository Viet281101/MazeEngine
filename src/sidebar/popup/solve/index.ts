import { Toolbar } from '../../toolbar';
import './solve.css';

export function showSolvePopup(toolbar: Toolbar): void {
  try {
    const popupContainer = toolbar.createPopupContainerByKey('solvePopup', 'popup.solvingMaze');
    popupContainer.classList.add('solve-popup');

    const popupCanvas = popupContainer.querySelector('canvas') as HTMLCanvasElement;
    const context = popupCanvas.getContext('2d');

    if (context) {
      context.fillStyle = '#a0a0a0';
      context.fillRect(0, 0, popupCanvas.width, popupCanvas.height);
    }
  } catch (error) {
    console.error('Failed to initialize solve popup:', error);
  }
}
