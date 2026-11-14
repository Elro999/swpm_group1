/**
 * Shared Tailwind class strings, so screens look consistent without a component library.
 * Accessibility: visible focus rings, ≥ 44px touch targets on buttons, sufficient contrast in both themes.
 */
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600";

export const ui = {
  page: "mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14",
  h1: "text-3xl font-semibold tracking-tight sm:text-4xl",
  h2: "text-lg font-semibold tracking-tight",
  lead: "text-lg text-zinc-600 dark:text-zinc-400",
  muted: "text-sm text-zinc-500 dark:text-zinc-400",
  card: "rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-950",
  btnPrimary: `inline-flex min-h-11 items-center justify-center rounded-lg bg-indigo-600 px-5 font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 ${focus}`,
  btnSecondary: `inline-flex min-h-11 items-center justify-center rounded-lg border border-zinc-300 px-5 font-medium hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-zinc-700 dark:hover:bg-zinc-900 ${focus}`,
  link: `font-medium text-indigo-700 underline-offset-2 hover:underline dark:text-indigo-400 ${focus}`,
  label: "block text-sm font-medium",
  input: `mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-base dark:border-zinc-700 dark:bg-zinc-950 ${focus}`,
  error: "mt-1 text-sm text-red-700 dark:text-red-400",
  chip: "inline-flex items-center rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200",
  quote: "border-l-2 border-zinc-300 pl-3 text-sm italic text-zinc-600 dark:border-zinc-700 dark:text-zinc-400",
} as const;
