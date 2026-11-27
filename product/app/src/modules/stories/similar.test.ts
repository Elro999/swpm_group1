import { describe, expect, it } from "vitest";
import { mostSimilar, similarity } from "./similar";

const PRICING = "In my last role we were working on pricing for a new product line. I decided to recommend a lower entry price for the first quarter. Adoption went up in the pilot.";
const PRICING_RETOLD = "I decided to recommend a lower entry price for the first quarter of the launch. The new product line pricing was split. The pilot reached its adoption target.";
const HIRING = "I hired three analysts for a new data team in Bengaluru, ran the interviews and onboarded them in two weeks so the backlog cleared.";

describe("similar stories", () => {
  it("scores a re-telling of the same event high and a different event low", () => {
    expect(similarity(PRICING, PRICING_RETOLD)).toBeGreaterThanOrEqual(0.4);
    expect(similarity(PRICING, HIRING)).toBeLessThan(0.4);
  });

  it("picks the most similar story, or none", () => {
    const stories = [
      { id: "h", rawText: HIRING },
      { id: "p", rawText: PRICING },
    ];
    expect(mostSimilar(PRICING_RETOLD, stories)?.id).toBe("p");
    expect(mostSimilar("Short unrelated text about nothing in particular at all.", stories)).toBeNull();
  });
});
