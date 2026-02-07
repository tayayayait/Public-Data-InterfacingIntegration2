import { describe, expect, it } from "vitest";
import { buildNaverNewsSourceFacts } from "@/lib/sourceFacts";

describe("buildNaverNewsSourceFacts", () => {
  it("creates a digest + up to 5 per-article facts", () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      title: `title-${i + 1}`,
      link: `https://news.example.com/${i + 1}`,
      originalLink: `https://origin.example.com/${i + 1}`,
      description: `desc-${i + 1}`,
      pubDate: `Mon, 0${i + 1} Feb 2026 00:00:00 +0900`,
    }));

    const facts = buildNaverNewsSourceFacts({
      items,
      query: "용산 부동산 개발 호재",
      collectedAt: "2026-02-07T00:00:00.000Z",
      maxItems: 5,
    });

    expect(facts).toHaveLength(6);
    expect(facts[0].id).toBe("naver_news_digest");
    expect(facts[1].id).toBe("naver_news_1");
    expect(facts[5].id).toBe("naver_news_5");
    expect(facts[1].url).toBe("https://origin.example.com/1");
  });

  it("deduplicates by URL", () => {
    const facts = buildNaverNewsSourceFacts({
      items: [
        {
          title: "t1",
          link: "https://news.example.com/a",
          originalLink: "https://origin.example.com/a",
          description: "d1",
          pubDate: null,
        },
        {
          title: "t2",
          link: "https://news.example.com/a",
          originalLink: "https://origin.example.com/a",
          description: "d2",
          pubDate: null,
        },
      ],
      query: "q",
      collectedAt: "2026-02-07T00:00:00.000Z",
      maxItems: 5,
    });

    // digest + 1 unique article
    expect(facts).toHaveLength(2);
    expect(facts[1].id).toBe("naver_news_1");
    expect(facts[1].title).toBe("t1");
  });

  it("ensures summary is not empty even when description/pubDate are missing", () => {
    const facts = buildNaverNewsSourceFacts({
      items: [
        {
          title: "only title",
          link: "https://news.example.com/x",
          originalLink: null,
          description: "",
          pubDate: null,
        },
      ],
      query: "q",
      collectedAt: "2026-02-07T00:00:00.000Z",
      maxItems: 5,
    });

    expect(facts).toHaveLength(2);
    expect(facts[1].summary).toBe("only title");
  });
});

