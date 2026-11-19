import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#090a0f",
};

export const metadata: Metadata = {
  title: "Treenimaster – Älykäs voima- ja fysiologiavalmentaja",
  description:
    "Henkilökohtainen tekoälyvalmennussovellus 8 viikon perusvoimaohjelman, 4 viikon piikkauksen, kokonaiskuormituksen ja palautumisen seurantaan Gemini API:n, NotebookLM-tietopohjan ja Supabasen avulla.",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "Treenimaster",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi" className="dark">
      <body className="min-h-screen overflow-x-hidden bg-[#090a0f] text-[#f5f5f7] antialiased selection:bg-blue-600 selection:text-white">
        {children}
      </body>
    </html>
  );
}
