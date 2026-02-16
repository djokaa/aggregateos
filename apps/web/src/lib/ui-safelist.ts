/**
 * Tailwind CSS safelist for @aggregateos/ui components.
 *
 * Tailwind v4 scans source files for class-name tokens. Because the shared
 * UI package lives in `packages/ui/` (outside the web-app source tree),
 * Turbopack's CSS pipeline may not detect classes that are only referenced
 * inside that package (e.g. button variant colours).
 *
 * This file exists solely so that Tailwind's content scanner picks up every
 * utility used in our component variants. It is never imported at runtime.
 */

export const __ui_safelist = [
  // ---------------------------------------------------------------------------
  // button.tsx – variant classes
  // ---------------------------------------------------------------------------
  "bg-zinc-900 text-zinc-50 shadow hover:bg-zinc-800",
  "bg-red-500 text-zinc-50 shadow-sm hover:bg-red-600",
  "border border-zinc-200 bg-white shadow-sm hover:bg-zinc-100 hover:text-zinc-900",
  "bg-zinc-100 text-zinc-900 shadow-sm hover:bg-zinc-200",
  "hover:bg-zinc-100 hover:text-zinc-900",
  "text-zinc-900 underline-offset-4 hover:underline",
  "h-9 px-4 py-2",
  "h-8 rounded-md px-3 text-xs",
  "h-10 rounded-md px-8",
  "h-9 w-9",
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2",
  "disabled:pointer-events-none disabled:opacity-50",
  "[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",

  // ---------------------------------------------------------------------------
  // badge.tsx – base + semantic variants
  // ---------------------------------------------------------------------------
  "rounded-full px-3 py-1 text-xs font-medium",
  "px-2 py-0.5 text-[11px]",
  "px-4 py-1.5 text-sm",
  "border border-transparent bg-zinc-900 text-zinc-50 shadow-sm",
  "border border-zinc-200 bg-zinc-50 text-zinc-700",
  "border border-transparent bg-red-500 text-white shadow-sm",
  "border border-zinc-200 text-zinc-700 bg-white",
  "border border-emerald-200 bg-emerald-50 text-emerald-700",
  "border border-amber-200 bg-amber-50 text-amber-700",
  "border border-blue-200 bg-blue-50 text-blue-700",
  "border border-red-200 bg-red-50 text-red-700",
  "border border-purple-200 bg-purple-50 text-purple-700",
  "border border-orange-200 bg-orange-50 text-orange-700",

  // ---------------------------------------------------------------------------
  // dialog.tsx
  // ---------------------------------------------------------------------------
  "fixed inset-0 z-50 bg-black/80",
  "data-[state=open]:animate-in data-[state=open]:fade-in-0",
  "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
  "data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
  "data-[state=closed]:zoom-out-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]",
  "translate-x-[-50%] translate-y-[-50%]",
  "max-w-lg gap-4 border bg-white p-6 shadow-lg duration-200 sm:rounded-lg",
  "flex flex-col space-y-1.5 text-center sm:text-left",
  "text-lg font-semibold leading-none tracking-tight",
  "text-sm text-zinc-500",
  "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",

  // ---------------------------------------------------------------------------
  // dropdown-menu.tsx
  // ---------------------------------------------------------------------------
  "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-white p-1 text-zinc-950 shadow-md",
  "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
  "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
  "relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none",
  "focus:bg-zinc-100 focus:text-zinc-900",
  "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",

  // ---------------------------------------------------------------------------
  // select.tsx
  // ---------------------------------------------------------------------------
  // trigger
  "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm shadow-sm",
  "ring-offset-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-1",
  "disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
  // content
  "relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border border-zinc-200 bg-white text-zinc-950 shadow-md",
  "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1",
  "data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
  // viewport
  "bg-white p-1 h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]",
  // item
  "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none",
  "focus:bg-zinc-100 focus:text-zinc-900 data-[disabled]:pointer-events-none data-[disabled]:opacity-50",

  // ---------------------------------------------------------------------------
  // tabs.tsx
  // ---------------------------------------------------------------------------
  "inline-flex h-9 items-center justify-center rounded-lg bg-zinc-100 p-1 text-zinc-500",
  "inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-white transition-all",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2",
  "data-[state=active]:bg-white data-[state=active]:text-zinc-950 data-[state=active]:shadow",

  // ---------------------------------------------------------------------------
  // table.tsx
  // ---------------------------------------------------------------------------
  "w-full caption-bottom text-sm",
  "[&_tr]:border-b [&_tr:last-child]:border-0",
  "border-b transition-colors hover:bg-zinc-100/50 data-[state=selected]:bg-zinc-100",
  "h-10 px-2 text-left align-middle font-medium text-zinc-500 [&:has([role=checkbox])]:pr-0",
  "p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",

  // ---------------------------------------------------------------------------
  // input.tsx / textarea.tsx / label.tsx
  // ---------------------------------------------------------------------------
  "flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm shadow-sm transition-colors",
  "file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-zinc-950",
  "placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400",
  "disabled:cursor-not-allowed disabled:opacity-50",
  "min-h-[60px]",
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",

  // ---------------------------------------------------------------------------
  // card.tsx
  // ---------------------------------------------------------------------------
  "rounded-xl border bg-white text-zinc-950 shadow",
  "flex flex-col space-y-1.5 p-6",
  "font-semibold leading-none tracking-tight",

  // ---------------------------------------------------------------------------
  // tooltip.tsx
  // ---------------------------------------------------------------------------
  "z-50 overflow-hidden rounded-md bg-zinc-900 px-3 py-1.5 text-xs text-zinc-50",
  "fade-in-0 zoom-in-95",

  // ---------------------------------------------------------------------------
  // avatar.tsx
  // ---------------------------------------------------------------------------
  "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full",
  "aspect-square h-full w-full",
  "flex h-full w-full items-center justify-center rounded-full bg-zinc-100",

  // ---------------------------------------------------------------------------
  // estimate detail page – send card, status colors
  // ---------------------------------------------------------------------------
  "bg-green-600 hover:bg-green-700 text-white",
  "bg-green-50/30 border-green-200",
  "text-green-600 text-green-700",
  "text-red-600 text-red-700",
  "text-orange-600 text-orange-700",
  "text-purple-600 text-purple-700",
  "text-blue-600",
  "bg-blue-50/50 border-blue-200",

  // ---------------------------------------------------------------------------
  // separator.tsx
  // ---------------------------------------------------------------------------
  "shrink-0 bg-zinc-200",
  "h-[1px] w-full",
  "h-full w-[1px]",
] as const;
