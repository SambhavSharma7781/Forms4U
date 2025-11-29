import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { ClerkProvider } from '@clerk/nextjs';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Forms4U - Create Beautiful Forms",
  description: "Create forms, collect responses, and analyze data",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-screen flex flex-col overflow-x-hidden`}
          style={{ 
            backgroundColor: '#f3f4f6', 
            backgroundAttachment: 'fixed',
            overscrollBehavior: 'none'
          }}
        >
          <Navbar />
          <main className="pt-0 flex-1 relative">
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}
