"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button 
        className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 transition-colors text-lg shadow-sm border border-gray-200 dark:border-gray-700 opacity-0"
        aria-label="Toggle Dark Mode"
      />
    );
  }

  const currentTheme = theme === 'system' ? resolvedTheme : theme;

  return (
    <button 
      onClick={() => setTheme(currentTheme === 'dark' ? 'light' : 'dark')}
      className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-lg shadow-sm border border-gray-200 dark:border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      aria-label="Toggle Dark Mode"
      title="Toggle Theme"
    >
      {currentTheme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}
