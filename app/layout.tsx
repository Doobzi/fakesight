import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "FakeSight | AI Image Investigation",
  description:
    "FakeSight helps people investigate suspicious AI-generated or manipulated images with clear, explainable trust reports.",
  applicationName: "FakeSight",
  keywords: [
    "FakeSight",
    "AI image detector",
    "AI content investigation",
    "deepfake detection",
    "image verification",
  ],
  authors: [{ name: "FakeSight" }],
  creator: "FakeSight",
  publisher: "FakeSight",
  icons: {
    icon: "/icon",
    shortcut: "/icon",
    apple: "/apple-icon",
  },
  openGraph: {
    title: "FakeSight | AI Image Investigation",
    description:
      "Investigate suspicious AI-generated or manipulated images with explainable trust reports.",
    siteName: "FakeSight",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "FakeSight | AI Image Investigation",
    description:
      "Investigate suspicious AI-generated or manipulated images with explainable trust reports.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}