import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, BarChart3, BookOpen, ClipboardCheck, Trophy } from "lucide-react";
import heroImg from "@/assets/hero-students.jpg";
import { Brand } from "@/components/app/Brand";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GISFuture — Class 10 portal of Gayatri International School" },
      { name: "description", content: "Notes, NCERT solutions, video lectures, mock papers and online MCQ tests for Class 10 students of Gayatri International School." },
      { property: "og:title", content: "GISFuture — Gayatri International School" },
      { property: "og:description", content: "Class 10 study material, online tests and progress tracking for Gayatri International School." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const FEATURES = [
  { icon: BookOpen, title: "Chapter-wise material", text: "Notes, PDFs, NCERT solutions, important questions and video lectures for every Class 10 chapter." },
  { icon: ClipboardCheck, title: "Online tests", text: "MCQ and integer-answer tests set by your teachers, marked instantly." },
  { icon: BarChart3, title: "Know where you stand", text: "Subject-wise marks, accuracy, progress graphs and your strong and weak areas." },
  { icon: Trophy, title: "School leaderboard", text: "See the top scorers across all tests — and climb the board." },
];

function Index() {
  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
        <Brand />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/leaderboard">Leaderboard</Link>
          </Button>
          <Button asChild>
            <Link to="/auth">Sign in</Link>
          </Button>
        </nav>
      </header>

      <section className="paper-grid">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-[1.05fr_1fr] lg:py-20">
          <div className="animate-rise">
            <p className="mb-4 inline-flex rounded-full bg-saffron-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-saffron-foreground">
              Class 10 · Board year 2026–27
            </p>
            <h1 className="text-4xl font-semibold leading-[1.05] sm:text-6xl">
              Your whole <span className="highlight">board year</span>, in one place.
            </h1>
            <p className="mt-5 max-w-lg text-lg text-muted-foreground">
              GISFuture is the learning portal of Gayatri International School — study material, tests, homework and exam updates from your teachers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="hero" size="lg">
                <Link to="/auth">
                  Sign in with your phone <ArrowRight />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/leaderboard">View leaderboard</Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">You'll need the passkey shared by your school.</p>
          </div>
          <div className="relative">
            <div className="absolute -inset-3 -rotate-2 rounded-3xl bg-saffron/30" />
            <img
              src={heroImg}
              alt="Class 10 students studying together"
              width={1536}
              height={1024}
              className="relative rounded-3xl border-4 border-card object-cover shadow-lift"
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-soft">
              <div className="mb-4 grid size-11 place-items-center rounded-xl bg-primary-soft text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-5 py-6 text-sm text-muted-foreground sm:flex-row">
          <span>© {new Date().getFullYear()} Gayatri International School</span>
          <span>GISFuture learning portal</span>
        </div>
      </footer>
    </div>
  );
}
