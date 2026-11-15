export type AttemptForStats = {
  score: number;
  max_score: number;
  correct_count: number;
  wrong_count: number;
  skipped_count: number;
  submitted_at: string;
  subject_id: string | null;
  chapter_id: string | null;
  title: string;
};

export type GroupStat = {
  id: string;
  name: string;
  tests: number;
  score: number;
  max: number;
  percent: number; // marks scored as % of max (0..100)
  accuracy: number; // correct / attempted questions (0..100)
  correct: number;
  wrong: number;
  skipped: number;
};

const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);

export function groupStats(
  attempts: AttemptForStats[],
  key: "subject_id" | "chapter_id",
  names: Record<string, string>,
): GroupStat[] {
  const map = new Map<string, GroupStat>();
  for (const a of attempts) {
    const id = a[key];
    if (!id) continue;
    const g =
      map.get(id) ??
      { id, name: names[id] ?? "Other", tests: 0, score: 0, max: 0, percent: 0, accuracy: 0, correct: 0, wrong: 0, skipped: 0 };
    g.tests += 1;
    g.score += Number(a.score);
    g.max += Number(a.max_score);
    g.correct += a.correct_count;
    g.wrong += a.wrong_count;
    g.skipped += a.skipped_count;
    map.set(id, g);
  }
  return [...map.values()]
    .map((g) => ({ ...g, percent: pct(g.score, g.max), accuracy: pct(g.correct, g.correct + g.wrong) }))
    .sort((a, b) => b.percent - a.percent);
}

export function overall(attempts: AttemptForStats[]) {
  const s = attempts.reduce(
    (acc, a) => {
      acc.score += Number(a.score);
      acc.max += Number(a.max_score);
      acc.correct += a.correct_count;
      acc.wrong += a.wrong_count;
      acc.skipped += a.skipped_count;
      return acc;
    },
    { score: 0, max: 0, correct: 0, wrong: 0, skipped: 0 },
  );
  return { ...s, tests: attempts.length, percent: pct(s.score, s.max), accuracy: pct(s.correct, s.correct + s.wrong) };
}

/** Strength: accuracy at or above 70%. Weakness: accuracy below 50%. */
export function strengthsAndWeaknesses(stats: GroupStat[]) {
  const attempted = stats.filter((s) => s.correct + s.wrong > 0);
  return {
    strengths: attempted.filter((s) => s.accuracy >= 70),
    weaknesses: attempted.filter((s) => s.accuracy < 50),
  };
}
