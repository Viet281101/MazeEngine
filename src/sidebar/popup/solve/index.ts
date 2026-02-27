import { Toolbar } from '../../toolbar';
import './solve.css';

export function showSolvePopup(toolbar: Toolbar) {
  const popupContainer = toolbar.createPopupContainerByKey('solvePopup', 'popup.solvingMaze');
  popupContainer.classList.add('solve-popup');

  const popup = popupContainer.querySelector('canvas') as HTMLCanvasElement;
  const ctx = popup.getContext('2d');

  if (ctx) {
    ctx.fillStyle = '#a0a0a0';
    ctx.fillRect(0, 0, popup.width, popup.height);
  }
}
