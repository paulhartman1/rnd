import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Rush N Dush | Sell Your House Fast for Cash",
  description:
    "Need to sell your house fast? Get a no-obligation cash offer from Rush N Dush Logistics. We buy houses in any condition. No repairs, no fees, close on your timeline.",
  icons: {
    icon: "/favicon.PNG",
  },
  openGraph: {
    title: "Rush N Dush | Sell Your House Fast for Cash",
    description:
      "Need to sell your house fast? Get a no-obligation cash offer from Rush N Dush Logistics. We buy houses in any condition. No repairs, no fees, close on your timeline.",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Rush N Dush | Sell Your House Fast for Cash",
    description:
      "Need to sell your house fast? Get a no-obligation cash offer from Rush N Dush Logistics. We buy houses in any condition.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
      </body>
    </html>
  );
}
