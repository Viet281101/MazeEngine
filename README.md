# MazeEngine

![GitHub code size in bytes](https://img.shields.io/github/languages/code-size/Viet281101/MazeEngine)
![Github language count](https://img.shields.io/github/languages/count/Viet281101/MazeEngine)
![GitHub Created At](https://img.shields.io/github/created-at/Viet281101/MazeEngine)

Practice 3D space calculations and algorithms for generating and solving mazes.

[![TypeScript](public/typescript.svg)](https://www.typescriptlang.org/) **&**
[![Three.js](public/threejs.png)](https://github.com/mrdoob/three.js) **&**
[![dat.GUI](public/dat.png)](https://github.com/dataarts/dat.gui) [dat.GUI](https://github.com/dataarts/dat.gui)

![Screenshot from 2026-03-02 09-03-08](https://github.com/user-attachments/assets/8cec386a-9cc5-443a-9473-5a9a63e18aaa)

## Quick Start

```bash
npm install
npm run dev
```

Open the app in your browser (Vite URL shown in terminal).

## Scripts

- `npm run dev`: Start local dev server.
- `npm run build`: Type-check + production build.
- `npm run preview`: Preview built output from `dist`.
- `npm run lint`: Run filename + ESLint checks.
- `npm run test`: Run lint then build (project quality gate).
- `npm run format`: Format project with Prettier.

## Browser Compatibility Policy

MazeEngine targets modern browsers with native `PointerEvent` support.

- Supported baseline: current stable Chrome, Edge, Firefox, and Safari.
- Mobile baseline: Safari on iOS/iPadOS 13.4+ and Chrome on Android (current stable).
- Legacy browsers without `PointerEvent` are out of scope.
- Toolbar/popup interactions are implemented with pointer events only (no legacy `touchstart` + `mousedown` fallback).

## Documentation

- [Contributing Guide](./CONTRIBUTING.md)
- [Architecture Overview](./docs/architecture.md)
- [How to Add a Generator](./docs/how-to-add-generator.md)

## Project Focus Areas

- Maze generation algorithms (`src/generator`)
- Maze solving algorithms (`src/solve`)
- Sidebar popup workflows (`src/sidebar/popup`)
- 3D rendering and app orchestration (`src/app`, `src/maze`)
