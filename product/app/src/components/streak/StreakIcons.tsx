/** Small inline icons for the streak UI (no icon library, per the design rules in doc 06). Decorative only. */
const base = { "aria-hidden": true, focusable: false, fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round", strokeLinejoin: "round", viewBox: "0 0 24 24" } as const;

export function FlameIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M12 3c.5 3-1.5 4.5-3 6.5S7 13 7 15a5 5 0 0 0 10 0c0-2.5-1.5-4-2.5-5.5-.4 1.4-1.2 2.2-2 2.5.5-2.5 0-6-0.5-9Z" />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="m5 12 5 5L20 7" />
    </svg>
  );
}

export function BriefcaseIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" />
    </svg>
  );
}

export function MoonIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg {...base} className={className}>
      <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
    </svg>
  );
}
