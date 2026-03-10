import type { Metadata } from "next";
import { DM_Serif_Display, Source_Serif_4, JetBrains_Mono, Manrope } from "next/font/google";

import { ToastProvider } from "@/components/ui/toast";
import { themeInitScript } from "@/lib/theme";

import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  display: "swap"
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif-display",
  weight: "400",
  subsets: ["latin"],
  display: "swap"
});

const sourceSerif4 = Source_Serif_4({
  variable: "--font-source-serif-4",
  subsets: ["latin"],
  display: "swap"
});

const jetBrainsMono = JetBrains_Mono({
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
        className={`${manrope.variable} ${dmSerifDisplay.variable} ${sourceSerif4.variable} ${jetBrainsMono.variable} antialiased`}
        style={{
          fontFamily: "var(--font-source-serif-4), Georgia, serif",
        }}
      >
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
