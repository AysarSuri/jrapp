export type BranchColor = {
  key: string;
  label: string;
  gradient: string;
  ring: string;
  from: string;
  to: string;
  rowBg: string;
  rowBorder: string;
  text?: string;
};

export const BRANCH_COLORS: BranchColor[] = [
  { key: "teal",   label: "تيل",     gradient: "linear-gradient(135deg,#0d9488,#06b6d4)", ring: "#0d9488", from: "#0d9488", to: "#06b6d4", rowBg: "linear-gradient(90deg,rgba(13,148,136,0.18) 0%,rgba(6,182,212,0.08) 50%,transparent 100%)", rowBorder: "#0d9488" },
  { key: "blue",   label: "أزرق",    gradient: "linear-gradient(135deg,#2563eb,#6366f1)", ring: "#2563eb", from: "#2563eb", to: "#6366f1", rowBg: "linear-gradient(90deg,rgba(37,99,235,0.18) 0%,rgba(99,102,241,0.08) 50%,transparent 100%)", rowBorder: "#2563eb" },
  { key: "purple", label: "بنفسجي",  gradient: "linear-gradient(135deg,#7c3aed,#db2777)", ring: "#7c3aed", from: "#7c3aed", to: "#db2777", rowBg: "linear-gradient(90deg,rgba(124,58,237,0.18) 0%,rgba(219,39,119,0.08) 50%,transparent 100%)", rowBorder: "#7c3aed" },
  { key: "rose",   label: "وردي",    gradient: "linear-gradient(135deg,#e11d48,#f97316)", ring: "#e11d48", from: "#e11d48", to: "#f97316", rowBg: "linear-gradient(90deg,rgba(225,29,72,0.18) 0%,rgba(249,115,22,0.08) 50%,transparent 100%)", rowBorder: "#e11d48" },
  { key: "orange", label: "برتقالي", gradient: "linear-gradient(135deg,#ea580c,#eab308)", ring: "#ea580c", from: "#ea580c", to: "#eab308", rowBg: "linear-gradient(90deg,rgba(234,88,12,0.18) 0%,rgba(234,179,8,0.08) 50%,transparent 100%)", rowBorder: "#ea580c" },
  { key: "green",  label: "أخضر",    gradient: "linear-gradient(135deg,#16a34a,#84cc16)", ring: "#16a34a", from: "#16a34a", to: "#84cc16", rowBg: "linear-gradient(90deg,rgba(22,163,74,0.18) 0%,rgba(132,204,22,0.08) 50%,transparent 100%)", rowBorder: "#16a34a" },
  { key: "sky",    label: "سماوي",   gradient: "linear-gradient(135deg,#0284c7,#38bdf8)", ring: "#0284c7", from: "#0284c7", to: "#38bdf8", rowBg: "linear-gradient(90deg,rgba(2,132,199,0.18) 0%,rgba(56,189,248,0.08) 50%,transparent 100%)", rowBorder: "#0284c7" },
  { key: "amber",  label: "عنبري",   gradient: "linear-gradient(135deg,#d97706,#f59e0b)", ring: "#d97706", from: "#d97706", to: "#f59e0b", rowBg: "linear-gradient(90deg,rgba(217,119,6,0.18) 0%,rgba(245,158,11,0.08) 50%,transparent 100%)", rowBorder: "#d97706" },
  { key: "indigo",    label: "نيلي",       gradient: "linear-gradient(135deg,#4f46e5,#8b5cf6)", ring: "#4f46e5", from: "#4f46e5", to: "#8b5cf6", rowBg: "linear-gradient(90deg,rgba(79,70,229,0.18) 0%,rgba(139,92,246,0.08) 50%,transparent 100%)", rowBorder: "#4f46e5" },
  { key: "fuchsia",   label: "فوشيا",      gradient: "linear-gradient(135deg,#c026d3,#ec4899)", ring: "#c026d3", from: "#c026d3", to: "#ec4899", rowBg: "linear-gradient(90deg,rgba(192,38,211,0.18) 0%,rgba(236,72,153,0.08) 50%,transparent 100%)", rowBorder: "#c026d3" },
  { key: "emerald",   label: "زمردي",      gradient: "linear-gradient(135deg,#059669,#10b981)", ring: "#059669", from: "#059669", to: "#10b981", rowBg: "linear-gradient(90deg,rgba(5,150,105,0.18) 0%,rgba(16,185,129,0.08) 50%,transparent 100%)", rowBorder: "#059669" },
  { key: "lime",      label: "ليموني",     gradient: "linear-gradient(135deg,#65a30d,#a3e635)", ring: "#65a30d", from: "#65a30d", to: "#a3e635", rowBg: "linear-gradient(90deg,rgba(101,163,13,0.18) 0%,rgba(163,230,53,0.08) 50%,transparent 100%)", rowBorder: "#65a30d" },
  { key: "cyan",      label: "تركواز",     gradient: "linear-gradient(135deg,#0891b2,#22d3ee)", ring: "#0891b2", from: "#0891b2", to: "#22d3ee", rowBg: "linear-gradient(90deg,rgba(8,145,178,0.18) 0%,rgba(34,211,238,0.08) 50%,transparent 100%)", rowBorder: "#0891b2" },
  { key: "red",       label: "أحمر",       gradient: "linear-gradient(135deg,#dc2626,#f87171)", ring: "#dc2626", from: "#dc2626", to: "#f87171", rowBg: "linear-gradient(90deg,rgba(220,38,38,0.18) 0%,rgba(248,113,113,0.08) 50%,transparent 100%)", rowBorder: "#dc2626" },
  { key: "slate",     label: "رصاصي",      gradient: "linear-gradient(135deg,#475569,#94a3b8)", ring: "#475569", from: "#475569", to: "#94a3b8", rowBg: "linear-gradient(90deg,rgba(71,85,105,0.18) 0%,rgba(148,163,184,0.08) 50%,transparent 100%)", rowBorder: "#475569" },
  { key: "brown",     label: "بني",        gradient: "linear-gradient(135deg,#78350f,#b45309)", ring: "#78350f", from: "#78350f", to: "#b45309", rowBg: "linear-gradient(90deg,rgba(120,53,15,0.18) 0%,rgba(180,83,9,0.08) 50%,transparent 100%)", rowBorder: "#78350f" },
  { key: "midnight",  label: "كحلي",       gradient: "linear-gradient(135deg,#1e3a8a,#3730a3)", ring: "#1e3a8a", from: "#1e3a8a", to: "#3730a3", rowBg: "linear-gradient(90deg,rgba(30,58,138,0.18) 0%,rgba(55,48,163,0.08) 50%,transparent 100%)", rowBorder: "#1e3a8a" },
  { key: "sunset",    label: "غروب",       gradient: "linear-gradient(135deg,#f43f5e,#fb923c)", ring: "#f43f5e", from: "#f43f5e", to: "#fb923c", rowBg: "linear-gradient(90deg,rgba(244,63,94,0.18) 0%,rgba(251,146,60,0.08) 50%,transparent 100%)", rowBorder: "#f43f5e" },
  { key: "ocean",     label: "محيطي",      gradient: "linear-gradient(135deg,#0369a1,#14b8a6)", ring: "#0369a1", from: "#0369a1", to: "#14b8a6", rowBg: "linear-gradient(90deg,rgba(3,105,161,0.18) 0%,rgba(20,184,166,0.08) 50%,transparent 100%)", rowBorder: "#0369a1" },
  { key: "forest",    label: "غابة",       gradient: "linear-gradient(135deg,#14532d,#65a30d)", ring: "#14532d", from: "#14532d", to: "#65a30d", rowBg: "linear-gradient(90deg,rgba(20,83,45,0.18) 0%,rgba(101,163,13,0.08) 50%,transparent 100%)", rowBorder: "#14532d" },
  { key: "royal",     label: "ملكي",       gradient: "linear-gradient(135deg,#6d28d9,#2563eb)", ring: "#6d28d9", from: "#6d28d9", to: "#2563eb", rowBg: "linear-gradient(90deg,rgba(109,40,217,0.18) 0%,rgba(37,99,235,0.08) 50%,transparent 100%)", rowBorder: "#6d28d9" },
  { key: "candy",     label: "حلوى",       gradient: "linear-gradient(135deg,#ec4899,#a855f7)", ring: "#ec4899", from: "#ec4899", to: "#a855f7", rowBg: "linear-gradient(90deg,rgba(236,72,153,0.18) 0%,rgba(168,85,247,0.08) 50%,transparent 100%)", rowBorder: "#ec4899" },
  { key: "mint",      label: "نعناعي",     gradient: "linear-gradient(135deg,#10b981,#34d399)", ring: "#10b981", from: "#10b981", to: "#34d399", rowBg: "linear-gradient(90deg,rgba(16,185,129,0.18) 0%,rgba(52,211,153,0.08) 50%,transparent 100%)", rowBorder: "#10b981" },
  { key: "gold",      label: "ذهبي",       gradient: "linear-gradient(135deg,#ca8a04,#facc15)", ring: "#ca8a04", from: "#ca8a04", to: "#facc15", rowBg: "linear-gradient(90deg,rgba(202,138,4,0.18) 0%,rgba(250,204,21,0.08) 50%,transparent 100%)", rowBorder: "#ca8a04" },
  { key: "platinum",  label: "رصاصي فاتح",  gradient: "linear-gradient(135deg,#e5e7eb,#ffffff)", ring: "#94a3b8", from: "#e5e7eb", to: "#ffffff", rowBg: "linear-gradient(90deg,rgba(148,163,184,0.20) 0%,rgba(226,232,240,0.10) 50%,transparent 100%)", rowBorder: "#cbd5e1", text: "#334155" },
  { key: "pastel",    label: "باستيل حالم", gradient: "linear-gradient(135deg,#a7f3d0,#c4b5fd)", ring: "#a78bfa", from: "#a7f3d0", to: "#c4b5fd", rowBg: "linear-gradient(90deg,rgba(167,139,250,0.18) 0%,rgba(167,243,208,0.10) 50%,transparent 100%)", rowBorder: "#c4b5fd", text: "#334155" },
];

export function getBranchColor(key: string | null | undefined): BranchColor {
  return BRANCH_COLORS.find(c => c.key === (key ?? "teal")) ?? BRANCH_COLORS[0];
}

/** Returns rgba string with given opacity (0-1) from a hex color */
export function hexAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
