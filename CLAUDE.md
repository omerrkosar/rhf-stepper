# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`rhf-stepper` is a lightweight React library that adds multi-step form (wizard) capabilities to react-hook-form. It provides automatic per-step field registration and validation through a context-based architecture.

## Commands

- `pnpm build` — Build with tsup (outputs ESM + CJS + types to `dist/`)
- `pnpm dev` — Watch mode build
- `pnpm lint` — ESLint on `src/`
- `pnpm typecheck` — TypeScript type checking (`tsc --noEmit`)

No test suite exists yet. Package manager is pnpm (v10.28.0).

## Architecture

The library has 4 source files in `src/`, all re-exported through `src/index.ts`.

### Two-Layer Context System

**Public context** (`FormContext` in `form.tsx`) — Exposed via `useFormContext()`. Holds stepper state: current step path, navigation functions (`next`/`prev`/`setCurrentStep`), validation tracking, and the RHF form instance.

**Internal context** (`InternalFormContext` in `form.tsx`) — Used only by `Step` components for step tree registration. Not exported to consumers.

### Step Tree

Steps are tracked as a recursive tree structure (`StepTree = StepTree[] | string`). Leaf nodes are field name strings; arrays represent step groupings. The tree is built dynamically as `<Step>` and `<Controller>` components mount and register themselves via context.

Navigation (`next`/`prev`) works by finding the next/previous "leaf parent" — an array node whose children are all strings (field names). The path through the tree is tracked as `number[]` indices.

### Component Roles

- **`Form`** (`form.tsx`) — Root component. Wraps a `<form>`, creates both contexts, manages step state and validation logic. Automatically wraps children in a root `<Step>`. Supports render-function children for context access.
- **`Step`** (`step.tsx`) — Registers itself in the step tree via parent Step or Form context. Supports nesting. Must always be mounted (conditionally render children, not the Step itself).
- **`Controller`** (`controller.tsx`) — Wraps RHF's `Controller`. On mount, registers its field name with the nearest `Step` context. Auto-resolves `control` from Form context.

### Registration Flow

1. `Form` renders → creates root `Step`
2. Each `Step` mounts → registers with parent via `registerStep()`
3. Each `Controller` mounts → calls `registerField()` on nearest Step
4. Step tree rebuilds when components mount/unmount (via `rebuildSteps()` + `registrationKey` counter)

### Validation

Three modes controlled by `stepValidationMode` prop: `'forward'` (default, validates on forward navigation only), `'all'` (validates on any navigation), `'none'` (no auto-validation). Validation calls `form.trigger()` with the current step's field names.
