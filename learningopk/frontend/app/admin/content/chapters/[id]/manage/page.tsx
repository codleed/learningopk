import type { ReactNode } from "react";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ChapterManagePage({ params }: PageProps): Promise<ReactNode> {
  const { id } = await params;
  const chapterId = parseInt(id, 10);

  // Validate chapterId
  if (isNaN(chapterId)) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-semibold text-destructive">Invalid Chapter ID</h1>
          <p className="text-muted-foreground mt-2">The chapter ID must be a valid number.</p>
        </div>
      </div>
    );
  }

  // Import client component dynamically to avoid SSR issues with hooks
  const ChapterManageClient = await import("./chapter-manage-client").then((mod) => mod.ChapterManageClient);

  return <ChapterManageClient chapterId={chapterId} />;
}
