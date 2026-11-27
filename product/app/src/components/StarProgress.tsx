import { STAR_PARTS, type StarPart } from "@/lib/db/types";
import { STAR_LABEL } from "@/modules/stories/star";

/**
 * S · T · A · R letters, used everywhere STAR appears (My stories cards, practice feedback), so the same mark
 * means the same thing across the product (consistency / Jakob's law): filled = the part is there, dashed amber =
 * missing. Always comes with a text equivalent for screen readers.
 */
export function StarProgress({ missing, size = "sm", className = "" }: { missing: StarPart[]; size?: "sm" | "md"; className?: string }) {
  const have = STAR_PARTS.filter((p) => !missing.includes(p));
  const box = size === "md" ? "size-8 text-sm" : "size-6 text-xs";
  return (
    <span className={`flex items-center gap-1 ${className}`} data-testid="star-progress">
      {STAR_PARTS.map((p) => {
        const ok = !missing.includes(p);
        return (
          <span
            key={p}
            aria-hidden="true"
            title={`${STAR_LABEL[p]}: ${ok ? "there" : "missing"}`}
            className={`inline-flex ${box} items-center justify-center rounded font-semibold ${
              ok ? "bg-indigo-600 text-white" : "border border-dashed border-amber-500 text-amber-800 dark:text-amber-300"
            }`}
          >
            {STAR_LABEL[p][0]}
          </span>
        );
      })}
      <span className="sr-only">
        {missing.length ? `Has ${have.map((p) => STAR_LABEL[p]).join(", ") || "no parts"}; missing ${missing.map((p) => STAR_LABEL[p]).join(", ")}.` : "Has all four STAR parts."}
      </span>
    </span>
  );
}
