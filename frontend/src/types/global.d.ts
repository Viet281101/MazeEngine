import type { MazeAppBridge } from './maze';

declare global {
  interface Window {
    mazeApp?: MazeAppBridge;
  }
}

export {};
