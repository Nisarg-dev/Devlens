import "./globals.css";
import Providers from "./Providers";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "./api/auth/[...nextauth]/route";

import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "DevLens — GitHub Portfolio Analyzer",
  description:
    "Paste a GitHub username and get AI-powered portfolio analysis with project scores, skill gaps, and job-readiness percentages.",
};

export default async function RootLayout({ children }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#050505] text-gray-200 min-h-screen flex flex-col`}>
        <Providers>
          {/* Simple Navbar */}
          <nav className="border-b border-gray-800 bg-black/50 backdrop-blur-md sticky top-0 z-50">
            <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
              <Link href="/" className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="text-indigo-500">✦</span> DevLens
              </Link>
              {session && (
                <div className="flex items-center gap-6">
                  <Link href="/recruiter" className="text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    Recruiter Mode
                  </Link>
                  <Link href="/dashboard" className="text-sm font-medium text-gray-300 hover:text-white transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/api/auth/signout" className="text-sm font-medium px-4 py-2 rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors">
                    Sign out
                  </Link>
                </div>
              )}
            </div>
          </nav>
          
          {/* Main Content */}
          <main className="flex-1 flex flex-col">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
