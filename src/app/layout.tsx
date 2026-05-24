import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../components/ThemeProvider";
import { ThemeToggle } from "../components/ThemeToggle";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Memegern",
  description: "Offline-first meme generator",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100 transition-colors`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:p-4 focus:bg-blue-600 focus:text-white z-50">
            Skip to main content
          </a>
          
          <header className="w-full p-4 border-b border-gray-200 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-900 shadow-sm">
            <div className="font-bold text-xl tracking-tight">Memegern</div>
            <nav aria-label="Main Navigation" className="flex items-center gap-4">
              <ThemeToggle />
            </nav>
          </header>
          
          <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto">
            <main id="main-content" className="flex-1 flex flex-col items-center justify-start p-4 md:p-8">
              {children}
            </main>
          </div>
          
          <footer className="w-full p-4 border-t border-gray-200 dark:border-gray-800 text-center text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900">
            <p>&copy; {new Date().getFullYear()} Memegern</p>
          </footer>
        </ThemeProvider>
      </body>
    </html>
  );
}
