import Link from "next/link";
import { ArrowLeft, CheckCircle2, AlertCircle, FileText, Github, Upload } from "lucide-react";

interface Props {
  params: { courseId: string };
}

const SECTIONS = [
  {
    icon: FileText,
    title: "General Rules",
    items: [
      "All submissions must be your own original work.",
      "Code must be clean, readable, and well-commented where appropriate.",
      "Submissions after the deadline will be marked late and may receive a grade penalty.",
      "Re-submissions are allowed up to 2 times unless otherwise stated by your instructor.",
    ],
  },
  {
    icon: Upload,
    title: "File Uploads",
    items: [
      "Accepted formats: .zip, .pdf, .png, .jpg, .mp4 (max 50 MB per file).",
      "Name your files clearly: e.g. week2-challenge-yourname.zip.",
      "Do not submit node_modules or build output folders inside zip archives.",
      "Screenshots must be high-resolution and clearly show the required output.",
    ],
  },
  {
    icon: Github,
    title: "GitHub Submissions",
    items: [
      "Repository must be public (or shared with your instructor) before the deadline.",
      "Include a README.md with: project description, setup instructions, and screenshots.",
      "Commit history should reflect your own work — avoid single large commits.",
      "Submit the repository URL via the assignment submission form.",
    ],
  },
  {
    icon: CheckCircle2,
    title: "Grading Criteria",
    items: [
      "Functionality (40%) — does the project meet the stated requirements?",
      "Code quality (30%) — structure, naming, and readability.",
      "Design & UX (20%) — visual presentation and usability.",
      "Documentation (10%) — README, comments, and commit messages.",
    ],
  },
  {
    icon: AlertCircle,
    title: "Academic Integrity",
    items: [
      "Plagiarism will result in a zero for the assignment and may lead to dismissal.",
      "You may use online resources and documentation, but must write your own code.",
      "AI-generated code must be disclosed and explained in your README.",
      "Pair programming is allowed only when explicitly permitted by the assignment brief.",
    ],
  },
];

export default function SubmissionGuidelinesPage({ params }: Props) {
  const { courseId } = params;

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Back link */}
      <Link
        href={`/courses/${courseId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to course
      </Link>

      {/* Header */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="h-2 w-full bg-blue-600" />
        <div className="px-6 py-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
            CodeStack Academy
          </p>
          <h1 className="mt-0.5 text-2xl font-bold text-gray-900">
            Submission Guidelines
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Read these guidelines carefully before submitting any assignment. Following
            them ensures fair grading and a smooth review process for everyone.
          </p>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {SECTIONS.map(({ icon: Icon, title, items }) => (
          <div
            key={title}
            className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="flex items-center gap-2.5 border-b border-gray-100 bg-gray-50 px-5 py-3">
              <Icon className="h-4 w-4 shrink-0 text-blue-500" />
              <h2 className="text-sm font-semibold text-gray-800">{title}</h2>
            </div>
            <ul className="divide-y divide-gray-100">
              {items.map((item, i) => (
                <li key={i} className="flex items-start gap-3 px-5 py-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-400" />
                  <p className="text-sm leading-relaxed text-gray-700">{item}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="rounded-xl border border-yellow-200 bg-yellow-50 px-5 py-4">
        <div className="flex items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-yellow-600" />
          <p className="text-sm text-yellow-800">
            These guidelines are subject to change. Your instructor will notify the cohort
            of any updates at the start of each week.
          </p>
        </div>
      </div>
    </div>
  );
}
