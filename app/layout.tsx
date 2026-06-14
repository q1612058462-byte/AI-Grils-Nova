import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Space_Grotesk, Fraunces } from "next/font/google";
import "@/styles/globals.css";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  title: "Nora - AI Digital Human MVP",
  description: "A browser-based AI avatar MVP powered by OpenAI Realtime or mock mode.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${spaceGrotesk.variable} ${fraunces.variable} bg-slate-950 text-slate-100`}>
        {children}
      </body>
    </html>
  );
}
