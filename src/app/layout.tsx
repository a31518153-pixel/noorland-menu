import type { Metadata, Viewport } from "next";
import { Readex_Pro, Aref_Ruqaa } from "next/font/google";
import "./globals.css";

const readex = Readex_Pro({
  subsets: ["arabic", "latin"],
  variable: "--font-readex",
  display: "swap",
});

const ruqaa = Aref_Ruqaa({
  subsets: ["arabic", "latin"],
  weight: ["400", "700"],
  variable: "--font-ruqaa",
  display: "swap",
});

export const metadata: Metadata = {
  title: "نور لاند | المرجان — المنيو الإلكتروني",
  description:
    "منيو نور لاند الإلكتروني — اطلب من طاولتك مباشرة. أطباق شرقية وعالمية، مشروبات فاخرة وشيشة.",
};

export const viewport: Viewport = {
  themeColor: "#080c0b",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ar" dir="rtl" className={`${readex.variable} ${ruqaa.variable}`}>
      <body className="grain min-h-screen bg-ink text-cream">{children}</body>
    </html>
  );
}
