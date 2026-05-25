import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Parchment — 166M LLM",
  description:
    "A 166-million parameter transformer language model built from scratch, " +
    "exported to ONNX FP16, and served via onnxruntime-node in Next.js.",
  icons: { icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>◈</text></svg>" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="font-mono bg-void text-[#e2e0f0] antialiased">
        {children}
      </body>
    </html>
  );
}
