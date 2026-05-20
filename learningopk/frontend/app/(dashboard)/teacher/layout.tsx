import type { ReactNode } from "react";

export default function TeacherLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
}
