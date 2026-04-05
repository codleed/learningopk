"use client";

import { useMemo } from "react";
import { AlertTriangle, Download, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ContentRenderer } from "@/components/common/content-renderer";
import { EmptyState } from "@/components/ui/states";

type RevisionNotes = {
  keyFormulas: string[];
  keyDefinitions: Array<{ term: string; definition: string }>;
  commonMistakes: string;
  examTips: string;
};

type Props = {
  chapterTitle: string;
  chapterNumber?: number;
  revisionNotes: RevisionNotes;
};

const splitLines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);

export function QuickRevisionView({ chapterTitle, chapterNumber, revisionNotes }: Props) {
  const mistakeList = useMemo(() => splitLines(revisionNotes.commonMistakes), [revisionNotes.commonMistakes]);
  const tipList = useMemo(() => splitLines(revisionNotes.examTips), [revisionNotes.examTips]);

  const hasContent =
    revisionNotes.keyFormulas.length > 0 ||
    revisionNotes.keyDefinitions.length > 0 ||
    mistakeList.length > 0 ||
    tipList.length > 0;

  const handleDownloadPdf = () => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer,width=1100,height=900");
    if (!printWindow) return;

    const sectionHtml = `
      <div class="sheet">
        <header class="hero">
          <div>
            <p class="eyebrow">Quick Revision Cheat Sheet</p>
            <h1>Chapter ${chapterNumber ?? ""}: ${chapterTitle}</h1>
          </div>
        </header>
        <section>
          <h2>Key Formulas</h2>
          <ul>${revisionNotes.keyFormulas.map((formula) => `<li>${formula}</li>`).join("")}</ul>
        </section>
        <section>
          <h2>Key Definitions</h2>
          <ul>${revisionNotes.keyDefinitions.map((item) => `<li><strong>${item.term}:</strong> ${item.definition}</li>`).join("")}</ul>
        </section>
        <section>
          <h2>Common Mistakes</h2>
          <ul>${mistakeList.map((item) => `<li>${item}</li>`).join("")}</ul>
        </section>
        <section>
          <h2>Exam Tips</h2>
          <ul>${tipList.map((item) => `<li>${item}</li>`).join("")}</ul>
        </section>
      </div>`;

    printWindow.document.write(`
      <html>
        <head>
          <title>${chapterTitle} Revision Cheat Sheet</title>
          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.33/dist/katex.min.css" />
          <style>
            @page { size: A4; margin: 10mm; }
            body { font-family: Arial, sans-serif; margin: 0; color: #111827; }
            .sheet { max-width: 190mm; margin: 0 auto; display: grid; gap: 10px; }
            .hero { border: 1px solid #d1d5db; border-radius: 12px; padding: 12px 16px; background: #f8fafc; }
            .eyebrow { margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: .12em; color: #64748b; }
            h1 { margin: 0; font-size: 22px; }
            h2 { margin: 0 0 6px; font-size: 15px; }
            section { border: 1px solid #e5e7eb; border-radius: 12px; padding: 10px 12px; break-inside: avoid; }
            ul { margin: 0; padding-left: 18px; }
            li { margin: 2px 0; font-size: 12px; line-height: 1.4; }
            strong { font-weight: 700; }
          </style>
        </head>
        <body>${sectionHtml}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
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
              <Badge variant="info" className="w-fit">90% shorter quick recap</Badge>
              <h3 className="text-2xl font-semibold">Quick Revision</h3>
              <p className="max-w-2xl text-sm text-text-secondary">Condensed formulas, definitions, pitfalls, and exam tactics for the fastest last-minute pass.</p>
            </div>
            <Button className="gap-2 print:hidden" onClick={handleDownloadPdf}>
              <Download className="h-4 w-4" />
              Download as PDF
            </Button>
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
                  <div key={`${formula}-${index}`} className="rounded-xl border border-border-default bg-bg-subtle p-3 shadow-[var(--shadow-sm)]">
                    <ContentRenderer content={`$$${formula}$$`} variant="compact" className="[&_p]:my-0 [&_.katex]:text-accent-primary" />
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
                  <div key={`${item.term}-${index}`} className="rounded-xl border border-border-default p-3">
                    <p className="text-sm font-semibold text-text-primary">{item.term}</p>
                    <ContentRenderer content={item.definition} variant="compact" className="mt-1 text-sm" />
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
                  <Badge key={`${mistake}-${index}`} variant="warning" className="px-3 py-1 text-xs leading-relaxed">
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
                    <li key={`${tip}-${index}`} className="rounded-xl border border-border-default bg-bg-subtle px-3 py-2">
                      {tip}
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </CardBody>
      </Card>
    </div>
  );
}
