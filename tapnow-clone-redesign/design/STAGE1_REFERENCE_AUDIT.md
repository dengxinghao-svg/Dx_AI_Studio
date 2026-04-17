# Stage 1 - Reference Audit And Runtime Baseline

Date: 2026-04-15
Project: `D:\AI\test\tapnow-clone-redesign`

## Goal

This document freezes the current formal runtime chain before structural refactoring.
Stage 1 only audits entry points and references. It does not yet split modules or delete files.

## 1. Formal entry pages

### Root compatibility shells

- `D:\AI\test\tapnow-clone-redesign\index.html`
  - compatibility shell only
  - meta refresh target: `./frontend/src/routes/workspace/index.html`
- `D:\AI\test\tapnow-clone-redesign\editor.html`
  - compatibility shell only
  - meta refresh target: `./frontend/src/routes/editor/index.html`

Conclusion:
- Root `index.html` and `editor.html` are already acting as jump shells.
- They should remain thin shells during the next refactor stages.

## 2. Workspace page runtime chain

Formal page:
- `D:\AI\test\tapnow-clone-redesign\frontend\src\routes\workspace\index.html`

Direct dependencies loaded by HTML:
- CSS
  - `../../lib/styles/dashboard.css`
- JS
  - `../../lib/stores/project-store.js`
  - `../../lib/scripts/dashboard.js`

Conclusion:
- Workspace page formal runtime chain is already:
  - `dashboard.css`
  - `project-store.js`
  - `dashboard.js`
- This matches the intended target architecture.

## 3. Editor page runtime chain

Formal page:
- `D:\AI\test\tapnow-clone-redesign\frontend\src\routes\editor\index.html`

Direct dependencies loaded by HTML:
- CSS
  - `../../lib/styles/editor.css`
- JS
  - `../../lib/stores/project-store.js`
  - `../../lib/scripts/editor.js`
  - `../../lib/scripts/editor-bridge.js`

Conclusion:
- Editor page formal runtime chain is already:
  - `editor.css`
  - `project-store.js`
  - `editor.js`
  - `editor-bridge.js`

## 4. Audited files requested by refactor plan

### A. Files in the formal runtime chain

- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\styles\dashboard.css`
  - formally loaded by workspace page
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\dashboard.js`
  - formally loaded by workspace page
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\stores\project-store.js`
  - formally loaded by both workspace and editor pages
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\styles\editor.css`
  - formally loaded by editor page
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor.js`
  - formally loaded by editor page
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor-bridge.js`
  - formally loaded by editor page

### B. Root-level duplicate / legacy candidate files

These files still exist at project root, but were not found in the formal HTML entry chain:

- `D:\AI\test\tapnow-clone-redesign\app-v2.js`
- `D:\AI\test\tapnow-clone-redesign\script.js`
- `D:\AI\test\tapnow-clone-redesign\style.css`
- `D:\AI\test\tapnow-clone-redesign\dashboard.css`
- `D:\AI\test\tapnow-clone-redesign\dashboard.js`
- `D:\AI\test\tapnow-clone-redesign\editor-bridge.js`
- `D:\AI\test\tapnow-clone-redesign\project-store.js`

Stage 1 conclusion:
- These root-level files are not part of the formal runtime chain.
- They must not be blindly deleted yet.
- They should be treated as compatibility leftovers or legacy candidates until Stage 3 / Stage 5 cleanup.

## 5. Legacy candidate assessment

### `script.js`

Current status:
- root-level `script.js` is not loaded by workspace or editor route HTML
- structured project already contains:
  - `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\legacy\script.js`

Stage 1 decision:
- root-level `script.js` is a legacy candidate
- do not maintain it as an active runtime file
- actual move / retirement should happen only after Stage 3 confirms no hidden dependency path remains

### `app-v2.js`

Current status:
- not in the formal HTML runtime chain
- appears to be an older monolithic editor prototype

Stage 1 decision:
- treat as legacy candidate
- do not delete in Stage 1
- verify whether any manual / offline opening still depends on it during later cleanup

## 6. High-risk findings discovered during audit

### 6.1 Editor runtime is still monolithic

File:
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor.js`

Observed:
- multiple repeated definitions exist in the same file
- confirmed duplicates:
  - `updateEditorPanel`
  - `updateGroupToolbar`
  - `renderGroups`
  - `createGroupFromSelection`
  - `layoutActiveGroup`
  - `setActiveGroupColor`
  - `ungroupActiveGroup`

Impact:
- later definitions override earlier ones
- this is a major stability risk and explains why some fixes can appear to “not take effect”

Stage impact:
- this becomes Stage 2 priority work

### 6.2 Editor file still contains dashboard / gallery logic

File:
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor.js`

Observed indicators:
- `workspaceDashboard`
- `projectGallery`
- `projectSearchInput`
- `projectCardMenu`
- `renderProjectGallery`
- `bindWorkspaceDashboardEvents`

Impact:
- editor runtime and workspace runtime are not fully separated in code responsibilities
- this duplicates the responsibility of `dashboard.js`

Stage impact:
- this becomes Stage 3 priority work

### 6.3 Duplicate store / bridge files exist at root

Observed:
- root-level `project-store.js` and `editor-bridge.js` still exist
- structured runtime uses `frontend/src/lib/stores/project-store.js` and `frontend/src/lib/scripts/editor-bridge.js`

Impact:
- future maintenance risk
- easy to patch the wrong file by mistake

Stage impact:
- cleanup candidate after runtime separation is confirmed

### 6.4 Encoding corruption exists in old copies

Observed:
- old root-level `dashboard.js`, `editor-bridge.js`, and related files contain garbled strings
- structured files under `frontend/src/...` are in better shape and should be treated as the active baseline

Impact:
- another reason not to use old root duplicates as runtime sources

## 7. Stage 1 accepted runtime baseline

### Accepted workspace runtime

- Entry:
  - `D:\AI\test\tapnow-clone-redesign\frontend\src\routes\workspace\index.html`
- Uses:
  - `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\styles\dashboard.css`
  - `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\stores\project-store.js`
  - `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\dashboard.js`

### Accepted editor runtime

- Entry:
  - `D:\AI\test\tapnow-clone-redesign\frontend\src\routes\editor\index.html`
- Uses:
  - `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\styles\editor.css`
  - `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\stores\project-store.js`
  - `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor.js`
  - `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor-bridge.js`

### Accepted shell behavior

- `D:\AI\test\tapnow-clone-redesign\index.html` -> jump shell only
- `D:\AI\test\tapnow-clone-redesign\editor.html` -> jump shell only

## 8. No-change note for Stage 1

Stage 1 intentionally did not:
- delete any files
- move any root duplicate files
- split any modules
- rewrite any runtime logic

Reason:
- first freeze the active runtime baseline
- then refactor against that baseline in Stage 2 and beyond

## 9. Recommended next stage

Proceed to Stage 2:
- clean repeated definitions inside:
  - `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor.js`
- keep only the single effective implementation for:
  - `updateEditorPanel`
  - `renderGroups`
  - `updateGroupToolbar`
  - `createGroupFromSelection`
  - `layoutActiveGroup`
  - `setActiveGroupColor`
  - `ungroupActiveGroup`
