import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlideEngage — Interactive Learning Platform",
  description: "Add polls, quizzes, Q&A, word clouds, and live feedback directly inside PowerPoint and Google Slides.",
  icons: {
    icon: [
      { url: "/assets/icons/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/assets/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/assets/icons/icon-256.png", sizes: "256x256", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
