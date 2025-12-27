# Vendored Vaul Library

This directory contains a vendored copy of the [vaul](https://github.com/emilkowalski/vaul) drawer component library.

## Why Vendored?

The vaul library (v1.1.2) is unmaintained and has a bug where the `modal` prop is not passed through to the underlying Radix UI Dialog component. This causes focus trapping issues when using `modal={false}` - specifically, elements outside the drawer cannot receive focus after interacting with the drawer.

### The Bug

In the original vaul source, `DialogPrimitive.Root` is instantiated without passing the `modal` prop:

```tsx
// Original (buggy):
<DialogPrimitive.Root
  defaultOpen={defaultOpen}
  onOpenChange={...}
  open={isOpen}
>
```

This means even when you set `modal={false}` on `Drawer.Root`, Radix Dialog still runs in modal mode, which:
1. Sets `aria-hidden="true"` on the app root
2. Adds focus guard elements
3. Traps focus within the dialog

### The Fix

We pass the `modal` prop through to `DialogPrimitive.Root`:

```tsx
// Fixed:
<DialogPrimitive.Root
  defaultOpen={defaultOpen}
  onOpenChange={...}
  open={isOpen}
  modal={modal}
>
```

## Source

- **Original Library**: https://github.com/emilkowalski/vaul
- **Version**: 1.1.2
- **License**: MIT
- **Author**: Emil Kowalski (e@emilkowal.ski)

## Files

- `index.tsx` - Main drawer components (Root, Content, Overlay, Handle, etc.)
- `context.ts` - React context for drawer state
- `types.ts` - TypeScript type definitions
- `constants.ts` - Animation and behavior constants
- `helpers.ts` - Utility functions for styling and transforms
- `browser.ts` - Browser detection utilities
- `style.css` - Drawer animations and styles
- `use-*.ts` - Custom hooks for various drawer behaviors

## Usage

Import from this vendored copy instead of the `vaul` package:

```tsx
// Before:
import { Drawer } from 'vaul';

// After:
import { Drawer } from '@/lib/vaul';
```

## Maintenance

Since vaul is unmaintained, this vendored copy gives us full control over the code. If vaul becomes maintained again or an alternative library emerges, we can migrate away from this vendored copy.
