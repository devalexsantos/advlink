export const CURATED_ICONS = [
  // Legal / Law
  "Scale", "Gavel", "Landmark", "BookOpen", "BookText", "FileText", "FileBadge",
  "ScrollText", "ShieldCheck", "Shield", "ShieldAlert",
  // Business
  "Briefcase", "Building", "Building2", "Handshake", "BadgeCheck", "Award",
  "Trophy", "Target", "TrendingUp", "BarChart3", "PieChart",
  // People / Communication
  "User", "Users", "UserCheck", "HeartHandshake", "Heart", "MessageSquare",
  "MessageCircle", "Phone", "Mail", "AtSign",
  // Content
  "Newspaper", "FileSearch", "FolderOpen", "ClipboardList", "ListTree",
  "AlignLeft", "Quote", "Megaphone",
  // Navigation / Web
  "Globe", "Link2", "ExternalLink", "MapPin", "Map", "Navigation", "Compass",
  // Media
  "Images", "Image", "Camera", "Video", "Mic", "Music",
  // Time / Calendar
  "Calendar", "CalendarDays", "Clock", "Timer", "History",
  // Misc
  "Star", "Sparkles", "Zap", "Lightbulb", "Rocket", "Flag",
  "Lock", "Key", "Eye", "Search", "Settings", "Wrench",
  "GraduationCap", "School", "Stethoscope", "Palette",
  "ArrowUpDown", "LayoutGrid", "Layers", "Package",
] as const

export type CuratedIconName = (typeof CURATED_ICONS)[number]
