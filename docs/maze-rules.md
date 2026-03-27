# Common Maze Rules

This document describes the shared validation rules applied to both single-layer and multi-layer mazes.
Rules live in `frontend/src/generator/core/maze-rules.ts` and are enforced in the generator registry. Some
algorithms (like Binary Tree) may retry generation internally, but the registry still applies the
same rules to all outputs.

## Rule Pipeline

1. **Fix rules** mutate the maze in-place to guarantee invariant basics (e.g., border walls).
2. **Validation rules** check invariants and return a list of failed rule IDs.
3. The registry re-runs generation up to `DEFAULT_GENERATION_ATTEMPTS` if any rule fails.

Rule scope:

- `single`: only single-layer mazes.
- `multi`: only multi-layer mazes.
- `both`: applied to all mazes.

The scope is inferred from topology and/or layer count.

## End-to-End Flow (UI → Rules)

1. **Generate Popup UI**
   - `frontend/src/sidebar/popup/generate/index.ts`
   - `frontend/src/sidebar/popup/generate/generator-row.ts`
2. **Runner**
   - `frontend/src/sidebar/popup/generate/generate-runner.ts`
3. **Registry + Topology Adapters**
   - `frontend/src/generator/core/registry.ts`
   - `frontend/src/generator/core/topology-adapters.ts`
4. **Common Rules**
   - `frontend/src/generator/core/maze-rules.ts`

Notes:

- The registry applies `applyCommonMazeRules` to every generator output.
- Some generators (Binary Tree) may re-run internally before returning a final output,
  so total retries can exceed `DEFAULT_GENERATION_ATTEMPTS`.

## Rule Context (Inputs + Defaults)

These are normalized inside `applyCommonMazeRules`:

- `complexity`: `low | normal | high` (default `normal`).
- `minConnectorDistance`: default `2`, clamped to `1..6`. Values `<= 1` effectively disable the rule.
- `minConnectorsPerTransition`: default `null`, clamped to `1..8`. Values `<= 0` mean no limit.
- `maxConnectorsPerTransition`: default `null`, clamped to `1..8`. Values `<= 0` mean no limit.
- `noConnectorOnBorder`: default `false`.

## UI Option Mapping (Generate Popup)

These controls live in `frontend/src/sidebar/popup/generate/generator-row.ts` under **Binary Tree -> More setup**.

- **Complexity** (`generate.complexity`)
  - Maps to `context.complexity` for `min-path-length`.
  - In multi-layer mode, it also auto-syncs connector min/max defaults:
    - `low` → min/max `1 / 2`
    - `normal` → min/max `2 / 5`
    - `high` → min/max `4 / 8`
  - Users can override min/max manually; the UI preserves manual edits.

- **Minimum connector distance** (`generate.minConnectorDistance`)
  - Maps to `context.minConnectorDistance` for `connector-min-distance`.

- **Connector count per transition (min/max)** (`generate.minConnectorsPerTransition`,
  `generate.maxConnectorsPerTransition`)
  - Map to `context.minConnectorsPerTransition` / `context.maxConnectorsPerTransition`
    for `connector-count-per-transition`.
  - `0` means “no limit”.

- **No connector on border** (`generate.noConnectorOnBorder`)
  - Maps to `context.noConnectorOnBorder` for `connector-not-on-border`.

Non-rule options (generator-only):

- **Randomize start/end** (`generate.randomizeStartEnd`)
- **Randomize start/end layers** (`generate.randomizeStartEndLayers`)
- **Force start/end different layers** (`generate.forceDifferentLayers`)

These affect marker placement in the generator but do not change rule validation.

### Topology-Driven Defaults (Multi-Layer)

In `frontend/src/sidebar/popup/generate/index.ts`, connector min/max can also auto-sync from topology
`shaftDensity` presets for multi-layer mazes. This runs **before** generation and only updates
fields that the user has not edited manually. If `complexity` is not `normal`, the UI prefers
complexity-driven defaults and marks the connector fields with `data-connector-source="complexity"`,
so shaft-density sync will skip them.

Shaft density presets:

- `sparse` → min/max `1 / 3`
- `normal` → min/max `1 / 5`
- `dense` → min/max `2 / 8`

### Topology Params (Multi-Layer)

Defined in `frontend/src/sidebar/popup/generate/index.ts`:

- **Layers** (`generate.layers`)
  - Controls number of layers for `multiLayerRect`.
- **Shaft density** (`generate.shaftDensity`)
  - Influences connector min/max defaults (see above).

These values are passed via `multiLayerParams` to the generator and topology adapter.

## Rules (Single + Multi)

- **`outer-walls`** (`both`, fix)
  - Ensures the outer border is walled on every layer.
  - The only border openings are the `start` and `end` markers (walkable cells).

- **`marker-walkable`** (`both`, fix)
  - Forces the start and end marker cells to be walkable.

- **`path-exists`** (`both`, validate)
  - Requires at least one valid path from `start` to `end`.
  - Uses BFS for single-layer or multi-layer as appropriate.

- **`min-path-length`** (`both`, validate)
  - Enforces a minimum solution length based on maze size and complexity.
  - Formula (single layer):
    - `minLength = max(6, floor((rows + cols) * ratio))`
    - `ratio` by complexity: `low = 0.2`, `normal = 0.35`, `high = 0.5`.
  - Multi-layer adds `+ (layers - 1)` as a small bonus threshold.

## Rules (Multi-Layer Only)

- **`connector-min-distance`** (`multi`, validate)
  - Ensures connectors in the same layer are at least `minConnectorDistance` apart
    (Manhattan distance).

- **`connector-count-per-transition`** (`multi`, validate)
  - Enforces `minConnectorsPerTransition` / `maxConnectorsPerTransition` between each
    adjacent layer pair.
  - Only counts connectors that have a walkable cell directly below.

- **`connector-not-on-border`** (`multi`, validate)
  - When `noConnectorOnBorder` is enabled, connectors cannot be placed on the outer border.

- **`connector-not-stacked`** (`multi`, validate)
  - Prevents connectors from appearing at the same `(row, col)` in two consecutive layers.
  - This avoids stacked stairs that visually overlap.

- **`connector-exits-valid`** (`multi`, validate)
  - Ensures every connector has a valid exit:
    - Connectors must have a walkable cell directly below on the lower layer.
    - Directional connectors must point to a walkable neighbor in-bounds on the upper layer.
    - Non-directional connectors must have at least one walkable neighbor on the upper layer.

## Connector Definition

Connectors are the multi-layer opening values from `MULTI_LAYER_MAZE`:

- `OPENING_CELL_VALUE`
- `OPENING_NORTH_CELL_VALUE`
- `OPENING_EAST_CELL_VALUE`
- `OPENING_SOUTH_CELL_VALUE`
- `OPENING_WEST_CELL_VALUE`

These values define whether a cell is a connector and, if directional, which adjacent cell it must
open toward.

## Validation Outcomes

`applyCommonMazeRules` returns `{ ok, failedRuleIds }`:

- `ok: true` means all applicable rules passed.
- `failedRuleIds` is a list of rule IDs that failed validation (in order of evaluation).

If rules fail, the registry attempts to regenerate up to `DEFAULT_GENERATION_ATTEMPTS` and falls back
to the last generated output if no attempt passes all rules.

## When to Update This Doc

- If you add/remove a rule in `maze-rules.ts`, update this file.
- If you add new rule context parameters or change defaults, update this file.
