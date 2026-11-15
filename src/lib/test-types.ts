export type StudentQuestion = {
  id: string;
  qtype: "mcq" | "integer";
  prompt: string;
  options: string[];
  marks: number;
  negative_marks: number;
};

export type StudentTestPayload = {
  test: {
    id: string;
    title: string;
    description: string | null;
    duration_minutes: number;
    subject_id: string | null;
    total_marks: number;
    question_count: number;
  };
  questions: StudentQuestion[];
  existing_attempt: string | null;
};

export type ReviewPayload = {
  attempt: {
    id: string;
    score: number;
    max_score: number;
    correct_count: number;
    wrong_count: number;
    skipped_count: number;
    total_questions: number;
    time_taken_seconds: number | null;
    submitted_at: string;
    answers: Record<string, { answer: string | null; correct: boolean | null }>;
  };
  test: { id: string; title: string; subject_id: string | null };
  questions: (StudentQuestion & { correct_index: number | null; correct_value: number | null; explanation: string | null })[];
};
