import './style.css';
import { MainApp } from './app/main-app';
import { initializeI18n } from './i18n';
import { loadSharedMazeFromUrl } from './lib/shared-maze-loader';

// ========== Application Entry Point ==========

let app: MainApp | null = null;

const handleLoad = async () => {
  try {
    await initializeI18n();
    app = new MainApp();
    // app.createMultiLayerMaze();
    window.mazeApp = app;
    await loadSharedMazeFromUrl(app);
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
};

// Cleanup while closing page
const handleBeforeUnload = () => {
  if (app) {
    app.destroy();
    app = null;
  }
};

window.addEventListener('load', handleLoad);
window.addEventListener('beforeunload', handleBeforeUnload);
