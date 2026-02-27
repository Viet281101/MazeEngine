import './style.css';
import { MainApp } from './app/MainApp';
import { initializeI18n } from './sidebar/i18n';

// ========== Application Entry Point ==========

let app: MainApp | null = null;

window.onload = async () => {
  try {
    await initializeI18n();
    app = new MainApp();
    // app.createMultiLayerMaze();
    (window as any).mazeApp = app;
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
};

// Cleanup while closing page
window.onbeforeunload = () => {
  if (app) {
    app.destroy();
    app = null;
  }
};
