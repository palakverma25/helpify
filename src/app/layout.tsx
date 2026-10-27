import type { Metadata } from "next";
import { Noto_Sans_Devanagari } from "next/font/google";
import "./globals.css";

const noto = Noto_Sans_Devanagari({
  subsets: ["devanagari", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-noto",
});

export const metadata: Metadata = {
  title: "तहसील सहायक",
  description: "आय प्रमाण पत्र आवेदनों की समीक्षा",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="hi" className={`${noto.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
