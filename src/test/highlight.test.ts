import { describe, expect, it } from "vitest";
import { splitHighlights } from "@/lib/highlight";

describe("splitHighlights", () => {
  it("splits a single ==highlight== into 3 segments", () => {
    expect(splitHighlights("a ==b== c")).toEqual([
      { text: "a ", highlighted: false },
      { text: "b", highlighted: true },
      { text: " c", highlighted: false },
    ]);
  });

  it("preserves order with multiple highlights", () => {
    expect(splitHighlights("==A== and ==B==")).toEqual([
      { text: "A", highlighted: true },
      { text: " and ", highlighted: false },
      { text: "B", highlighted: true },
    ]);
  });

  it("returns one non-highlight segment when there is no marker", () => {
    expect(splitHighlights("plain text")).toEqual([{ text: "plain text", highlighted: false }]);
  });
});

