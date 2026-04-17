# Stage 3 - Editor / Dashboard Responsibility Decoupling

Date: 2026-04-15
Project: `D:\AI\test\tapnow-clone-redesign`

## Goal

Remove workspace / project gallery responsibilities from the editor runtime file so that:

- workspace logic stays in `dashboard.js`
- editor logic stays in `editor.js`
- shared project persistence stays in `project-store.js` and `editor-bridge.js`

Target file:
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor.js`

## What was removed from editor.js

The following editor-tail dashboard logic was removed:

- workspace dashboard DOM lookups
- in-file mock `projectStore`
- project gallery rendering
- workspace search / grid / list handlers
- project card menu logic
- open / close workspace dashboard logic
- in-file project activation / rename / move / delete logic
- in-file workspace initialization
- workspace dashboard event binding

Removed responsibility examples:

- `workspaceDashboard`
- `projectGallery`
- `projectSearchInput`
- `projectGridBtn`
- `projectListBtn`
- `projectCardMenu`
- `renderProjectGallery()`
- `bindWorkspaceDashboardEvents()`
- `setWorkspaceDashboardView()`
- `createDashboardProjectCard()`

## Why removal was safe

Current formal runtime chain already proves:

- workspace page loads:
  - `dashboard.css`
  - `project-store.js`
  - `dashboard.js`
- editor page loads:
  - `editor.css`
  - `project-store.js`
  - `editor.js`
  - `editor-bridge.js`

Also confirmed:

- `frontend/src/routes/editor/index.html` does not contain workspace dashboard DOM nodes
- therefore the removed dashboard/gallery code in `editor.js` was not part of the formal editor page DOM contract

## Result after Stage 3

### Workspace responsibility

Now belongs to:

- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\dashboard.js`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\stores\project-store.js`

### Editor responsibility

Now remains in:

- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor.js`
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor-bridge.js`

## Validation

Structural validation completed:

- no remaining `workspaceDashboard` / `projectGallery` / `projectCardMenu` references found in `editor.js`
- editor route HTML does not declare workspace dashboard DOM

## Remaining known issues

1. `editor.js` is still a large monolithic file.
2. `editor-bridge.js` still needs Stage 4 / Stage 6 attention for locale dependency safety.
3. Root legacy duplicates still remain untouched.
4. Browser walkthrough was not performed in this stage; this was a responsibility-separation pass.

## Recommended next stage

Proceed to Stage 4:
- begin editor main-logic modular split, or
- if following the stricter original order, first fix `editor-bridge.js` locale dependency and then split modules

Suggested immediate next target:
- `D:\AI\test\tapnow-clone-redesign\frontend\src\lib\scripts\editor-bridge.js`
