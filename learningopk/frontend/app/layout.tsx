import type { Metadata } from "next";
import { Montserrat, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";

import { ToastProvider } from "@/components/ui/toast";
import { themeInitScript } from "@/lib/theme";

import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  display: "swap"
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap"
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap"
});

export const metadata: Metadata = {
  title: "LearningoPK",
  description: "Board-specific chapter learning with AI tutoring",
  icons: {
    icon: "/new_logo.png",
    shortcut: "/new_logo.png",
    apple: "/new_logo.png"
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        suppressHydrationWarning
        className={`${montserrat.variable} ${plusJakartaSans.variable} ${jetbrainsMono.variable} antialiased`}
        style={{
          fontFamily: "var(--font-plus-jakarta-sans), sans-serif",
        }}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
