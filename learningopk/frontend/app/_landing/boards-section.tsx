"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useInView } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { Card, CardBody } from "@/components/ui";
import { BoardBadge } from "@/components/common/board-badge";

/* ─── Types ─── */
interface Board {
  readonly key: string;
  readonly name: string;
  readonly slug: string;
  readonly subjectCount: number;
  readonly description: string;
}

interface BoardsSectionProps {
  boards: readonly Board[];
}

/* ─── Animation variants ─── */
const EASE: [number, number, number, number] = [0.25, 0.46, 0.45, 0.94];

const cardVariant = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: EASE,
      delay: i * 0.12,
    },
  }),
};

/* ═══════════════════════════════════════════════════════════════
   Boards Section — Three elevated cards linking to each board
   ═══════════════════════════════════════════════════════════════ */
export function BoardsSection({ boards }: BoardsSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });

  return (
    <div
      ref={ref}
      className="grid grid-cols-1 gap-6 md:grid-cols-3"
    >
      {boards.map((board, i) => (
        <motion.div
          key={board.key}
          custom={i}
          variants={cardVariant}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
        >
          <Link href={`/${board.slug}`} className="block h-full">
            <Card
              variant="elevated"
              className="group h-full cursor-pointer"
            >
              <CardBody className="flex flex-col gap-4 p-6">
                <BoardBadge board={board.key} size="lg" />

                <div className="flex-1">
                  <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-text-primary">
                    {board.name}
                  </h3>
                  <p className="mt-1.5 text-sm text-text-secondary">
                    {board.description}
                  </p>
                </div>

                <div className="flex items-center justify-between border-t border-border-default pt-4">
                  <span className="text-sm font-medium text-text-muted">
                    {board.subjectCount} subjects available
                  </span>
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-bg-subtle transition-colors group-hover:bg-accent-primary group-hover:text-white">
                    <ArrowRight className="h-4 w-4 text-text-muted transition-colors group-hover:text-white" />
                  </div>
                </div>
              </CardBody>
            </Card>
          </Link>
        </motion.div>
      ))}
    </div>
  );
}
