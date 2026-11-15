import { describe, expect, it } from "vitest";
import { normalizePhone } from "@/lib/phone";
import { groupStats, strengthsAndWeaknesses, type AttemptForStats } from "@/lib/analytics";

describe("phone numbers", () => {
  it("accepts a 10-digit Indian mobile number with or without +91", () => {
    expect(normalizePhone("98765 43210")).toBe("9876543210");
    expect(normalizePhone("+91 98765-43210")).toBe("9876543210");
  });
  it("rejects numbers that are too short or not mobile", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("1234567890")).toBeNull();
  });
});

const a = (subject_id: string, correct: number, wrong: number): AttemptForStats => ({
  score: correct * 4, max_score: (correct + wrong) * 4, correct_count: correct, wrong_count: wrong,
  skipped_count: 0, submitted_at: "2026-01-01", subject_id, chapter_id: null, title: "t",
});

describe("strength and weakness analysis", () => {
  it("marks 70%+ accuracy as strength and under 50% as weakness", () => {
    const stats = groupStats([a("m", 8, 2), a("s", 4, 6), a("e", 6, 4)], "subject_id", { m: "Maths", s: "Science", e: "English" });
    const { strengths, weaknesses } = strengthsAndWeaknesses(stats);
    expect(strengths.map((s) => s.name)).toEqual(["Maths"]);
    expect(weaknesses.map((s) => s.name)).toEqual(["Science"]);
  });
});
