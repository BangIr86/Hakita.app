export type ThemeMode = "cyber" | "ceria" | "arcade";

export interface ThemeStyles {
  id: ThemeMode;
  name: string;
  icon: string;
  tagline: string;
  isLight: boolean;

  // Background & Ambient Orbs
  pageBg: string;
  orb1: string;
  orb2: string;
  orb3: string;
  textColor: string;

  // Top Header / Navbar
  navBg: string;
  navBorder: string;
  navText: string;
  navBadgeBg: string;
  navBadgeBorder: string;
  navBadgeText: string;

  // Card / Container Global
  cardBg: string;
  cardBorder: string;
  cardTitle: string;
  cardSubtext: string;
  cardInnerBg: string;
  cardInnerBorder: string;

  // Input & Buttons
  inputBg: string;
  inputBorder: string;
  inputText: string;
  primaryBtn: string;
  secondaryBtn: string;

  // Chat Panel (Left)
  chatPanelBg: string;
  chatBubbleAiBg: string;
  chatBubbleAiText: string;
  chatBubbleAiBorder: string;
  chatBubbleUserBg: string;
  chatBubbleUserText: string;
  chatInputBg: string;
  chatInputBorder: string;
  chatInputText: string;

  // LKPD Panel (Right)
  lkpdPanelBg: string;
  lkpdHeaderBg: string;
  lkpdHeaderText: string;
  lkpdCardBg: string;
  lkpdCardBorder: string;
  lkpdCardText: string;
  lkpdInputBg: string;
  lkpdInputBorder: string;
  lkpdInputText: string;

  // Stukas Box
  stukasBoxBg: string;
  stukasBoxBorder: string;
  stukasTitleText: string;
  stukasDescBg: string;
  stukasDescText: string;
  stukasBadge: string;

  // Mobile Bottom Bar
  mobileNavBg: string;
  mobileNavBorder: string;
}

export const THEMES: Record<ThemeMode, ThemeStyles> = {
  cyber: {
    id: "cyber",
    name: "Cyber Detective",
    icon: "🌌",
    tagline: "Neon Futuristik & Dark Cyberpunk",
    isLight: false,

    pageBg: "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950",
    orb1: "bg-blue-600/15",
    orb2: "bg-emerald-500/10",
    orb3: "bg-indigo-600/15",
    textColor: "text-slate-100",

    navBg: "bg-slate-900/95 backdrop-blur-md",
    navBorder: "border-indigo-950/80",
    navText: "text-white",
    navBadgeBg: "bg-blue-600/30",
    navBadgeBorder: "border-blue-500/40",
    navBadgeText: "text-cyan-300",

    cardBg: "bg-slate-900/80 backdrop-blur-xl",
    cardBorder: "border-slate-700/80",
    cardTitle: "text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-emerald-400",
    cardSubtext: "text-slate-400",
    cardInnerBg: "bg-slate-950/80",
    cardInnerBorder: "border-slate-800",

    inputBg: "bg-slate-950/80",
    inputBorder: "border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/30",
    inputText: "text-white placeholder:text-slate-500",
    primaryBtn: "bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-400 text-white shadow-blue-600/30",
    secondaryBtn: "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700",

    chatPanelBg: "bg-slate-950/70",
    chatBubbleAiBg: "bg-slate-900 border-slate-800 shadow-sm",
    chatBubbleAiText: "text-slate-100",
    chatBubbleAiBorder: "border-slate-800",
    chatBubbleUserBg: "bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 text-white shadow-md shadow-blue-600/20",
    chatBubbleUserText: "text-white",
    chatInputBg: "bg-slate-950",
    chatInputBorder: "border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/30",
    chatInputText: "text-white placeholder:text-slate-500",

    lkpdPanelBg: "bg-slate-950",
    lkpdHeaderBg: "bg-slate-900 border-slate-800",
    lkpdHeaderText: "text-slate-200",
    lkpdCardBg: "bg-slate-900/90",
    lkpdCardBorder: "border-blue-500/30",
    lkpdCardText: "text-slate-200",
    lkpdInputBg: "bg-slate-950",
    lkpdInputBorder: "border-slate-700 focus:border-cyan-400 focus:ring-cyan-400/30",
    lkpdInputText: "text-white placeholder:text-slate-500",

    stukasBoxBg: "bg-gradient-to-br from-amber-500/10 via-slate-900 to-indigo-950/40",
    stukasBoxBorder: "border-amber-500/40",
    stukasTitleText: "text-amber-200",
    stukasDescBg: "bg-slate-950/80",
    stukasDescText: "text-slate-300",
    stukasBadge: "bg-amber-500/20 border-amber-500/40 text-amber-300",

    mobileNavBg: "bg-slate-900/95 border-slate-800",
    mobileNavBorder: "border-slate-800"
  },

  ceria: {
    id: "ceria",
    name: "Detektif Ramah Mata",
    icon: "🌿",
    tagline: "Teduh, Lembut & Nyaman di Mata (Bebas Silau / Eye-Care)",
    isLight: true,

    // Background & Ambient (Bebas Silau, Tanpa Bola Neon Glare)
    pageBg: "bg-[#f4f6f8]",
    orb1: "hidden opacity-0",
    orb2: "hidden opacity-0",
    orb3: "hidden opacity-0",
    textColor: "text-slate-800",

    // Top Header / Navbar
    navBg: "bg-white/95 backdrop-blur-md shadow-sm",
    navBorder: "border-slate-200",
    navText: "text-slate-900",
    navBadgeBg: "bg-slate-100",
    navBadgeBorder: "border-slate-300",
    navBadgeText: "text-slate-700",

    // Card / Container Global
    cardBg: "bg-white shadow-sm",
    cardBorder: "border-slate-200",
    cardTitle: "text-slate-900 font-extrabold",
    cardSubtext: "text-slate-600",
    cardInnerBg: "bg-slate-50",
    cardInnerBorder: "border-slate-200",

    // Input & Buttons
    inputBg: "bg-white",
    inputBorder: "border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100",
    inputText: "text-slate-900 placeholder:text-slate-400",
    primaryBtn: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm",
    secondaryBtn: "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300",

    // Chat Panel (Left)
    chatPanelBg: "bg-[#f8fafc]",
    chatBubbleAiBg: "bg-white border-slate-200 shadow-sm",
    chatBubbleAiText: "text-slate-800 leading-relaxed font-normal",
    chatBubbleAiBorder: "border-slate-200",
    chatBubbleUserBg: "bg-indigo-600 text-white shadow-sm font-medium",
    chatBubbleUserText: "text-white",
    chatInputBg: "bg-white",
    chatInputBorder: "border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100",
    chatInputText: "text-slate-900 placeholder:text-slate-400",

    // LKPD Panel (Right)
    lkpdPanelBg: "bg-[#eef2f6]",
    lkpdHeaderBg: "bg-white border-b border-slate-200 shadow-sm",
    lkpdHeaderText: "text-slate-800 font-bold",
    lkpdCardBg: "bg-white shadow-sm",
    lkpdCardBorder: "border-slate-200",
    lkpdCardText: "text-slate-800",
    lkpdInputBg: "bg-white",
    lkpdInputBorder: "border-slate-300 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100",
    lkpdInputText: "text-slate-900 placeholder:text-slate-400",

    // Stukas Box (Soft Warm Parchment / Cream)
    stukasBoxBg: "bg-amber-50/70 border-amber-200/90 shadow-sm",
    stukasBoxBorder: "border-amber-200/90",
    stukasTitleText: "text-amber-950 font-bold",
    stukasDescBg: "bg-white/95",
    stukasDescText: "text-slate-800 leading-relaxed font-normal",
    stukasBadge: "bg-amber-100 border-amber-300 text-amber-900 font-bold",

    // Mobile Bottom Bar
    mobileNavBg: "bg-white/95 border-slate-200 shadow-lg",
    mobileNavBorder: "border-slate-200"
  },

  arcade: {
    id: "arcade",
    name: "Arcade Retro",
    icon: "👾",
    tagline: "Vibrant Neon Purple & Golden Pop",
    isLight: false,

    pageBg: "bg-gradient-to-br from-[#0c041a] via-[#160829] to-[#280a3c]",
    orb1: "bg-fuchsia-600/25",
    orb2: "bg-amber-500/20",
    orb3: "bg-purple-600/30",
    textColor: "text-fuchsia-50",

    navBg: "bg-[#140727]/95 backdrop-blur-md shadow-md",
    navBorder: "border-fuchsia-900/50",
    navText: "text-white",
    navBadgeBg: "bg-fuchsia-950/70",
    navBadgeBorder: "border-fuchsia-500/50",
    navBadgeText: "text-pink-300",

    cardBg: "bg-[#170a2c]/90 backdrop-blur-xl shadow-2xl shadow-fuchsia-950/60",
    cardBorder: "border-fuchsia-500/30",
    cardTitle: "text-transparent bg-clip-text bg-gradient-to-r from-pink-400 via-fuchsia-400 to-amber-300",
    cardSubtext: "text-purple-300/80",
    cardInnerBg: "bg-[#100522]/80",
    cardInnerBorder: "border-purple-900/60",

    inputBg: "bg-[#100522]/90",
    inputBorder: "border-fuchsia-500/40 focus:border-pink-400 focus:ring-pink-500/30",
    inputText: "text-pink-100 placeholder:text-purple-400/50",
    primaryBtn: "bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 hover:from-fuchsia-500 hover:via-pink-500 hover:to-purple-500 text-white shadow-fuchsia-600/40",
    secondaryBtn: "bg-[#200d3d] hover:bg-[#2c1252] text-pink-200 border-fuchsia-900/50",

    chatPanelBg: "bg-[#100522]/70",
    chatBubbleAiBg: "bg-[#1f0d38] border-fuchsia-500/25 shadow-sm",
    chatBubbleAiText: "text-purple-100",
    chatBubbleAiBorder: "border-fuchsia-500/25",
    chatBubbleUserBg: "bg-gradient-to-r from-fuchsia-600 via-pink-600 to-purple-600 text-white shadow-lg shadow-fuchsia-600/30 font-medium",
    chatBubbleUserText: "text-white",
    chatInputBg: "bg-[#100522]",
    chatInputBorder: "border-fuchsia-500/40 focus:border-pink-400 focus:ring-pink-500/30",
    chatInputText: "text-pink-100 placeholder:text-purple-400/50",

    lkpdPanelBg: "bg-[#0e041c]",
    lkpdHeaderBg: "bg-[#16082c] border-fuchsia-900/50",
    lkpdHeaderText: "text-pink-100",
    lkpdCardBg: "bg-[#190a30]/90",
    lkpdCardBorder: "border-fuchsia-500/30",
    lkpdCardText: "text-purple-200",
    lkpdInputBg: "bg-[#110524]",
    lkpdInputBorder: "border-purple-800/80 focus:border-pink-500 focus:ring-pink-500/30",
    lkpdInputText: "text-pink-100 placeholder:text-purple-400/50",

    stukasBoxBg: "bg-gradient-to-br from-amber-500/15 via-[#1e0c3a] to-fuchsia-950/40 shadow-xl shadow-fuchsia-950/50",
    stukasBoxBorder: "border-amber-400/40",
    stukasTitleText: "text-amber-300",
    stukasDescBg: "bg-[#0f0420]/80",
    stukasDescText: "text-pink-100/90",
    stukasBadge: "bg-amber-500/20 border-amber-400/40 text-amber-300",

    mobileNavBg: "bg-[#140727]/95 border-fuchsia-900/50 shadow-md",
    mobileNavBorder: "border-fuchsia-900/50"
  }
};

