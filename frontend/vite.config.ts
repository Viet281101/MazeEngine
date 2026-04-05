import { defineConfig } from 'vite';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  base: '/MazeEngine/',
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) {
            return 'three';
          }

          if (id.includes('node_modules/dat.gui')) {
            return 'datgui';
          }

          return undefined;
        },
      },
    },
  },
  server: {
    open: true,
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: 'src',
          dest: 'src',
        },
      ],
    }),
  ],
});
