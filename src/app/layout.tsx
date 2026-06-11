import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "codemod-studio — Write, test and preview jscodeshift codemods live in the browser",
  description: "An in-browser IDE for jscodeshift codemods. Source → Transform → Output, instantly.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
