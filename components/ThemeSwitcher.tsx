"use client";

import { ThemeMode, THEMES } from "@/lib/theme";

interface ThemeSwitcherProps {
  currentTheme: ThemeMode;
  onThemeChange: (theme: ThemeMode) => void;
  compact?: boolean;
}

export default function ThemeSwitcher({
  currentTheme,
  onThemeChange,
  compact = false
}: ThemeSwitcherProps) {
  const themeList: ThemeMode[] = ["cyber", "ceria", "arcade"];

  return (
    <div 
      className={`inline-flex items-center gap-1 p-1 rounded-2xl border transition-all ${
        currentTheme === "ceria"
          ? "bg-slate-100 border-slate-300 shadow-sm"
          : currentTheme === "arcade"
          ? "bg-[#17092e]/90 border-fuchsia-500/30 shadow-md shadow-fuchsia-950/40"
          : "bg-slate-900/80 border-slate-700/80 shadow-md"
      }`}
      role="group"
      aria-label="Pilih Mode Tema"
    >
      <span className={`text-[10px] font-bold px-1.5 hidden md:inline ${currentTheme === "ceria" ? "text-slate-600" : "text-slate-400"}`}>
        Tema:
      </span>
      {themeList.map((t) => {
        const item = THEMES[t];
        const isActive = currentTheme === t;

        return (
          <button
            key={t}
            type="button"
            onClick={() => onThemeChange(t)}
            title={`${item.name} - ${item.tagline}`}
            className={`px-2 sm:px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
              isActive
                ? t === "cyber"
                  ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/30 scale-105"
                  : t === "ceria"
                  ? "bg-indigo-600 text-white shadow-sm scale-105"
                  : "bg-gradient-to-r from-fuchsia-600 to-pink-600 text-white shadow-md shadow-fuchsia-600/40 scale-105"
                : currentTheme === "ceria"
                ? "text-slate-700 hover:text-slate-900 hover:bg-slate-200"
                : currentTheme === "arcade"
                ? "text-purple-300 hover:text-pink-200 hover:bg-purple-950/60"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            }`}
          >
            <span className="text-xs">{item.icon}</span>
            {!compact && (
              <span className="hidden xs:inline">
                {t === "cyber" ? "Cyber" : t === "ceria" ? "Ramah Mata" : "Arcade"}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

