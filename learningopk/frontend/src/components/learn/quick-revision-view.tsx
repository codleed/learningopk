"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, Sparkles, Target } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { ContentRenderer } from "@/components/common/content-renderer";
import { EmptyState } from "@/components/ui/states";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

type RevisionNotes = {
  keyFormulas: string[];
  keyDefinitions: Array<{ term: string; definition: string }>;
  commonMistakes: string;
  examTips: string;
};

type PersonalizedRevision = {
  personalizedTips: string[];
  focusAreas: string[];
  strengthAreas: string[];
};

type Props = {
  chapterId: number;
  chapterTitle: string;
  chapterNumber?: number;
  revisionNotes: RevisionNotes;
};

const splitLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

export function QuickRevisionView({
  chapterId,
  chapterTitle,
  chapterNumber,
  revisionNotes,
}: Props) {
  const mistakeList = useMemo(
    () => splitLines(revisionNotes.commonMistakes),
    [revisionNotes.commonMistakes]
  );
  const tipList = useMemo(() => splitLines(revisionNotes.examTips), [revisionNotes.examTips]);

  // ── Personalized revision state ───────────────────────────────────────────
  const [personalized, setPersonalized] = useState<PersonalizedRevision | null>(null);
  const [personalizeLoading, setPersonalizeLoading] = useState(false);
  const [personalizeError, setPersonalizeError] = useState<string | null>(null);
  const personalizedRef = useRef<HTMLDivElement>(null);

  const handlePersonalize = useCallback(async () => {
    // If already loaded, just scroll to the section
    if (personalized) {
      personalizedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setPersonalizeLoading(true);
    setPersonalizeError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/learn/revision/${chapterId}/personalize`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `Request failed (${response.status})`);
      }

      const json = (await response.json()) as { data?: PersonalizedRevision };
      if (json.data) {
        setPersonalized(json.data);
        // Scroll to results after render
        setTimeout(() => {
          personalizedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      } else {
        throw new Error("Unexpected response format");
      }
    } catch (error) {
      setPersonalizeError(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setPersonalizeLoading(false);
    }
  }, [chapterId, personalized]);

  const hasContent =
    revisionNotes.keyFormulas.length > 0 ||
    revisionNotes.keyDefinitions.length > 0 ||
    mistakeList.length > 0 ||
    tipList.length > 0;

  const handleDownloadPdf = () => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
    if (!printWindow) return;

    const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 40" width="36" height="36" fill="none">
      <rect width="40" height="40" rx="10" fill="#2563eb"/>
      <path d="M20 8L6 15l14 7 14-7-14-7z" fill="#fff"/>
      <path d="M10 17.5v7c0 1 2.5 4.5 10 4.5s10-3.5 10-4.5v-7l-10 5-10-5z" fill="#93c5fd"/>
      <path d="M32 15v10" stroke="#fbbf24" stroke-width="2" stroke-linecap="round"/>
      <circle cx="32" cy="27" r="1.5" fill="#fbbf24"/>
    </svg>`;

    const chapterLabel = chapterNumber ? `Chapter ${chapterNumber}: ` : "";

    const formulasHtml =
      revisionNotes.keyFormulas.length > 0
        ? `
      <section class="content-section">
        <h2><span class="section-icon">&#x1D453;</span> Key Formulas</h2>
        <div class="formula-grid">
          ${revisionNotes.keyFormulas.map((formula) => `<div class="formula-card">${formula}</div>`).join("")}
        </div>
      </section>`
        : "";

    const definitionsHtml =
      revisionNotes.keyDefinitions.length > 0
        ? `
      <section class="content-section">
        <h2><span class="section-icon">&#x1F4D6;</span> Key Definitions</h2>
        <dl class="definitions-list">
          ${revisionNotes.keyDefinitions.map((item) => `<div class="def-item"><dt>${item.term}</dt><dd>${item.definition}</dd></div>`).join("")}
        </dl>
      </section>`
        : "";

    const mistakesHtml =
      mistakeList.length > 0
        ? `
      <section class="content-section mistakes-section">
        <h2><span class="section-icon">&#x26A0;</span> Common Mistakes</h2>
        <ul>${mistakeList.map((item) => `<li>${item}</li>`).join("")}</ul>
      </section>`
        : "";

    const tipsHtml =
      tipList.length > 0
        ? `
      <section class="content-section tips-section">
        <h2><span class="section-icon">&#x1F4A1;</span> Exam Tips</h2>
        <ul>${tipList.map((item) => `<li>${item}</li>`).join("")}</ul>
      </section>`
        : "";

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>${chapterTitle} \u2014 Quick Revision Cheat Sheet</title>
    <link
      id="katex-css"
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/katex@0.16.33/dist/katex.min.css"
      crossorigin="anonymous"
    />
    <style>
      /* ---- Page & Print ---- */
      @page {
        size: A4;
        margin: 16mm 14mm 20mm;
      }
      @media print {
        html, body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        .page-footer { position: fixed; bottom: 0; left: 0; right: 0; }
      }

      /* ---- Base ---- */
      *, *::before, *::after { box-sizing: border-box; }
      html { font-size: 14px; }
      body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        margin: 0;
        color: #1e293b;
        line-height: 1.6;
        background: #fff;
      }

      /* ---- Container ---- */
      .sheet {
        max-width: 190mm;
        margin: 0 auto;
        padding: 0 4mm;
      }

      /* ---- Branded Header ---- */
      .brand-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 14px 0 12px;
        border-bottom: 2px solid #2563eb;
        margin-bottom: 20px;
      }
      .brand-left {
        display: flex;
        align-items: center;
        gap: 10px;
      }
      .brand-name {
        font-size: 22px;
        font-weight: 700;
        color: #2563eb;
        letter-spacing: -0.02em;
      }
      .brand-tagline {
        font-size: 10px;
        color: #64748b;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        margin-top: 2px;
      }
      .brand-date {
        font-size: 11px;
        color: #94a3b8;
      }

      /* ---- Hero ---- */
      .hero {
        background: linear-gradient(135deg, #eff6ff 0%, #f0f9ff 100%);
        border: 1px solid #bfdbfe;
        border-radius: 12px;
        padding: 18px 22px;
        margin-bottom: 20px;
      }
      .hero .eyebrow {
        margin: 0 0 4px;
        font-size: 10px;
        text-transform: uppercase;
        letter-spacing: 0.14em;
        color: #2563eb;
        font-weight: 600;
      }
      .hero h1 {
        margin: 0;
        font-size: 24px;
        font-weight: 700;
        color: #0f172a;
        line-height: 1.3;
      }

      /* ---- Section ---- */
      .content-section {
        border: 1px solid #e2e8f0;
        border-radius: 10px;
        padding: 16px 20px;
        margin-bottom: 16px;
        break-inside: avoid;
        page-break-inside: avoid;
      }
      .content-section h2 {
        margin: 0 0 12px;
        font-size: 15px;
        font-weight: 700;
        color: #0f172a;
        padding-bottom: 8px;
        border-bottom: 2px solid #2563eb;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .section-icon {
        font-size: 16px;
      }

      /* ---- Formulas ---- */
      .formula-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
        gap: 10px;
      }
      .formula-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 13px;
        line-height: 1.5;
        text-align: center;
      }

      /* ---- Definitions ---- */
      .definitions-list {
        margin: 0;
        display: grid;
        gap: 10px;
      }
      .def-item {
        background: #fafbff;
        border-left: 3px solid #2563eb;
        border-radius: 0 8px 8px 0;
        padding: 10px 14px;
      }
      .def-item dt {
        font-weight: 700;
        font-size: 13px;
        color: #1e40af;
        margin-bottom: 2px;
      }
      .def-item dd {
        margin: 0;
        font-size: 12.5px;
        color: #334155;
        line-height: 1.5;
      }

      /* ---- Mistakes ---- */
      .mistakes-section {
        border-color: #fde68a;
        background: #fffbeb;
      }
      .mistakes-section h2 {
        border-bottom-color: #f59e0b;
        color: #92400e;
      }
      .mistakes-section ul { margin: 0; padding-left: 20px; }
      .mistakes-section li {
        font-size: 12.5px;
        margin: 6px 0;
        line-height: 1.5;
        color: #78350f;
      }
      .mistakes-section li::marker { color: #f59e0b; }

      /* ---- Tips ---- */
      .tips-section {
        border-color: #bbf7d0;
        background: #f0fdf4;
      }
      .tips-section h2 {
        border-bottom-color: #22c55e;
        color: #166534;
      }
      .tips-section ul {
        margin: 0;
        padding-left: 20px;
        columns: 2;
        column-gap: 24px;
      }
      .tips-section li {
        font-size: 12.5px;
        margin: 6px 0;
        line-height: 1.5;
        color: #14532d;
        break-inside: avoid;
      }
      .tips-section li::marker { color: #22c55e; }

      /* ---- General list fallback ---- */
      .content-section ul {
        margin: 0;
        padding-left: 20px;
      }
      .content-section li {
        font-size: 12.5px;
        margin: 6px 0;
        line-height: 1.5;
      }

      /* ---- Footer ---- */
      .page-footer {
        margin-top: 24px;
        padding: 12px 0 4px;
        border-top: 1px solid #e2e8f0;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 10px;
        color: #94a3b8;
      }
      .page-footer .footer-brand {
        display: flex;
        align-items: center;
        gap: 4px;
        font-weight: 600;
        color: #64748b;
      }

      /* ---- KaTeX overrides ---- */
      .katex { font-size: 1em !important; }
      .katex-display { margin: 0.3em 0 !important; }
    </style>
  </head>
  <body>
    <div class="sheet">
      <header class="brand-header">
        <div class="brand-left">
          ${logoSvg}
          <div>
            <div class="brand-name">Learningo</div>
            <div class="brand-tagline">Your Learning Companion</div>
          </div>
        </div>
        <div class="brand-date">${new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div>
      </header>

      <div class="hero">
        <p class="eyebrow">Quick Revision Cheat Sheet</p>
        <h1>${chapterLabel}${chapterTitle}</h1>
      </div>

      ${formulasHtml}
      ${definitionsHtml}
      ${mistakesHtml}
      ${tipsHtml}

      <footer class="page-footer">
        <div class="footer-brand">
          ${logoSvg.replace('width="36" height="36"', 'width="14" height="14"')}
          Generated by Learningo &mdash; Your Learning Companion
        </div>
        <div>learningo.pk</div>
      </footer>
    </div>
  </body>
</html>`;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Wait for KaTeX CSS to fully load before triggering print
    const katexLink = printWindow.document.getElementById("katex-css") as HTMLLinkElement | null;
    const triggerPrint = () => {
      printWindow.focus();
      printWindow.print();
    };

    if (katexLink) {
      katexLink.onload = triggerPrint;
      katexLink.onerror = triggerPrint; // print even if KaTeX CSS fails
    } else {
      triggerPrint();
    }
  };

  if (!hasContent) {
    return (
      <EmptyState
        title="Quick revision coming soon"
        description="This chapter does not have condensed revision notes yet. Review the full summary for now."
      />
    );
  }

  return (
    <div className="space-y-6" data-testid="quick-revision-view">
      <Card variant="gradient" className="overflow-hidden">
        <CardHeader className="border-b border-border-default/60 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_55%)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <Badge variant="info" className="w-fit">
                90% shorter quick recap
              </Badge>
              <h3 className="text-2xl font-semibold">Quick Revision</h3>
              <p className="max-w-2xl text-sm text-text-secondary">
                Condensed formulas, definitions, pitfalls, and exam tactics for the fastest
                last-minute pass.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row print:hidden">
              <Button
                variant="primary"
                className="gap-2"
                onClick={handlePersonalize}
                disabled={personalizeLoading}
              >
                {personalizeLoading ? <Spinner size="sm" /> : <Sparkles className="h-4 w-4" />}
                {personalized ? "View personalized" : "Personalize for me"}
              </Button>
              <Button className="gap-2" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4" />
                Download as PDF
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardBody className="grid gap-4 p-5 lg:grid-cols-2">
          <Card className="border-dashed">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent-primary" />
                <h4 className="text-base font-semibold">Key formulas</h4>
              </div>
            </CardHeader>
            <CardBody className="space-y-3 pt-0">
              {revisionNotes.keyFormulas.length === 0 ? (
                <p className="text-sm text-text-secondary">No formulas added yet.</p>
              ) : (
                revisionNotes.keyFormulas.map((formula, index) => (
                  <div
                    key={`${formula}-${index}`}
                    className="rounded-xl border border-border-default bg-bg-subtle p-3 shadow-[var(--shadow-sm)]"
                  >
                    <ContentRenderer
                      content={`$$${formula}$$`}
                      variant="compact"
                      className="[&_p]:my-0 [&_.katex]:text-accent-primary"
                    />
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card className="border-dashed">
            <CardHeader>
              <h4 className="text-base font-semibold">Key definitions</h4>
            </CardHeader>
            <CardBody className="grid gap-3 pt-0">
              {revisionNotes.keyDefinitions.length === 0 ? (
                <p className="text-sm text-text-secondary">No definitions added yet.</p>
              ) : (
                revisionNotes.keyDefinitions.map((item, index) => (
                  <div
                    key={`${item.term}-${index}`}
                    className="rounded-xl border border-border-default p-3"
                  >
                    <p className="text-sm font-semibold text-text-primary">{item.term}</p>
                    <ContentRenderer
                      content={item.definition}
                      variant="compact"
                      className="mt-1 text-sm"
                    />
                  </div>
                ))
              )}
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <h4 className="text-base font-semibold">Common mistakes</h4>
              </div>
            </CardHeader>
            <CardBody className="flex flex-wrap gap-2 pt-0">
              {mistakeList.length === 0 ? (
                <p className="text-sm text-text-secondary">No warning notes added yet.</p>
              ) : (
                mistakeList.map((mistake, index) => (
                  <Badge
                    key={`${mistake}-${index}`}
                    variant="warning"
                    className="px-3 py-1 text-xs leading-relaxed"
                  >
                    {mistake}
                  </Badge>
                ))
              )}
            </CardBody>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <h4 className="text-base font-semibold">Exam tips</h4>
            </CardHeader>
            <CardBody className="pt-0">
              {tipList.length === 0 ? (
                <p className="text-sm text-text-secondary">No exam tips added yet.</p>
              ) : (
                <ul className="grid gap-2 text-sm text-text-primary sm:grid-cols-2">
                  {tipList.map((tip, index) => (
                    <li
                      key={`${tip}-${index}`}
                      className="rounded-xl border border-border-default bg-bg-subtle px-3 py-2"
                    >
                      {tip}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </CardBody>
      </Card>

      {/* ── Personalization error ──────────────────────────────────────────── */}
      {personalizeError ? (
        <Card className="border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-950/30">
          <CardBody className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Could not personalize revision notes
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">{personalizeError}</p>
            </div>
            <Button size="sm" variant="ghost" className="ml-auto" onClick={handlePersonalize}>
              Retry
            </Button>
          </CardBody>
        </Card>
      ) : null}

      {/* ── Loading skeleton ───────────────────────────────────────────────── */}
      {personalizeLoading ? (
        <Card className="animate-pulse overflow-hidden">
          <CardHeader className="border-b border-border-default/60 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_55%)]">
            <div className="flex items-center gap-3">
              <Spinner size="sm" />
              <div>
                <h3 className="text-lg font-semibold text-text-primary">
                  Personalizing your revision...
                </h3>
                <p className="text-sm text-text-secondary">
                  Analyzing your quiz history and learning patterns
                </p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="grid gap-4 p-5 lg:grid-cols-2">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`space-y-3 rounded-xl border border-border-default p-4 ${i === 3 ? "lg:col-span-2" : ""}`}
              >
                <div className="h-4 w-1/3 rounded bg-bg-subtle" />
                <div className="h-3 w-full rounded bg-bg-subtle" />
                <div className="h-3 w-2/3 rounded bg-bg-subtle" />
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      {/* ── Personalized revision content ──────────────────────────────────── */}
      {personalized ? (
        <div ref={personalizedRef}>
          <Card variant="gradient" className="overflow-hidden">
            <CardHeader className="border-b border-border-default/60 bg-[radial-gradient(circle_at_top_right,rgba(168,85,247,0.12),transparent_55%)]">
              <div className="space-y-2">
                <Badge variant="info" className="w-fit gap-1.5">
                  <Sparkles className="h-3 w-3" />
                  AI-personalized
                </Badge>
                <h3 className="text-xl font-semibold">Your Personalized Revision</h3>
                <p className="max-w-2xl text-sm text-text-secondary">
                  Tailored tips and focus areas based on your quiz history, weak areas, and learning
                  progress.
                </p>
              </div>
            </CardHeader>
            <CardBody className="grid gap-4 p-5 lg:grid-cols-2">
              {/* Focus areas */}
              <Card className="border-amber-200 bg-amber-50/50 dark:border-amber-800 dark:bg-amber-950/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    <h4 className="text-base font-semibold text-amber-900 dark:text-amber-200">
                      Your Focus Areas
                    </h4>
                  </div>
                </CardHeader>
                <CardBody className="grid gap-2 pt-0">
                  {personalized.focusAreas.map((area, index) => (
                    <div
                      key={`focus-${area}-${index}`}
                      className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-100"
                    >
                      {area}
                    </div>
                  ))}
                </CardBody>
              </Card>

              {/* Strength areas */}
              <Card className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <h4 className="text-base font-semibold text-emerald-900 dark:text-emerald-200">
                      Your Strengths
                    </h4>
                  </div>
                </CardHeader>
                <CardBody className="grid gap-2 pt-0">
                  {personalized.strengthAreas.length === 0 ? (
                    <p className="text-sm text-emerald-700 dark:text-emerald-400">
                      Keep studying — your strengths will show as you complete more quizzes!
                    </p>
                  ) : (
                    personalized.strengthAreas.map((area, index) => (
                      <div
                        key={`strength-${area}-${index}`}
                        className="rounded-lg border border-emerald-200 bg-white px-3 py-2 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-100"
                      >
                        {area}
                      </div>
                    ))
                  )}
                </CardBody>
              </Card>

              {/* Personalized tips */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-500" />
                    <h4 className="text-base font-semibold">AI Revision Tips</h4>
                  </div>
                </CardHeader>
                <CardBody className="pt-0">
                  <ul className="grid gap-2 text-sm text-text-primary">
                    {personalized.personalizedTips.map((tip, index) => (
                      <li
                        key={`tip-${tip}-${index}`}
                        className="rounded-xl border border-purple-200 bg-purple-50/50 px-4 py-3 dark:border-purple-800 dark:bg-purple-950/20"
                      >
                        {tip}
                      </li>
                    ))}
                  </ul>
                </CardBody>
              </Card>
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
