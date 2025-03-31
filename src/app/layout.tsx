import type { Metadata } from "next";
import { Roboto, Roboto_Condensed } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { metadata as baseMetadata } from "./metadata";

const roboto = Roboto({
  subsets: ["latin"],
  display: "swap",
  weight: ["100", "300", "400", "500", "700", "900"],
  variable: "--font-roboto",
});

const robotoCondensed = Roboto_Condensed({
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "700"],
  variable: "--font-roboto-condensed",
});

export const metadata: Metadata = {
  ...baseMetadata,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fi" className={`${roboto.variable} ${robotoCondensed.variable}`}>
      <body className="min-h-screen flex flex-col bg-white text-gray-800">
        <Navigation />
        <main className="flex-grow pt-12"> {/* Adjusted padding-top again for even shorter navbar */}
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
