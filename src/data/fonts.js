// Each font carries display metrics so it renders legibly at the shared font-size
// setting (the user's size slider multiplies sizeFactor). lineHeight gives tall-mark
// scripts (Nastaliq, full-vocalized Naskh) room so harakat never overlap.
const ARABIC_FONTS = [
  {
    id: 'amiri-quran',
    name: 'Amiri Quran',
    description: 'Quran-optimized Naskh',
    family: "'Amiri Quran', serif",
    sizeFactor: 1,
    lineHeight: 2
  },
  {
    id: 'uthmanic',
    name: 'Uthmanic Hafs',
    description: 'King Fahd Complex',
    family: "'UthmanicHafs', 'Amiri Quran', serif",
    sizeFactor: 1,
    lineHeight: 2
  },
  {
    id: 'amiri',
    name: 'Amiri',
    description: 'Classic Naskh',
    family: "'Amiri', serif",
    sizeFactor: 1,
    lineHeight: 1.95
  },
  {
    id: 'scheherazade',
    name: 'Scheherazade New',
    description: 'Full Unicode Arabic',
    family: "'Scheherazade New', serif",
    sizeFactor: 1,
    lineHeight: 2.15
  },
  {
    id: 'noto',
    name: 'Noto Naskh Arabic',
    description: 'Modern Naskh',
    family: "'Noto Naskh Arabic', serif",
    sizeFactor: 0.95,
    lineHeight: 1.95
  },
  {
    id: 'lateef',
    name: 'Lateef',
    description: 'Nastaliq-influenced (limited tashkeel)',
    family: "'Lateef', serif",
    sizeFactor: 1.1,
    lineHeight: 2.25
  },
  {
    id: 'reem-kufi',
    name: 'Reem Kufi',
    description: 'Decorative Kufi (limited tashkeel)',
    family: "'Reem Kufi', sans-serif",
    sizeFactor: 0.95,
    lineHeight: 1.85
  }
]

// Default metrics for an unknown font id.
export const DEFAULT_FONT_METRICS = { sizeFactor: 1, lineHeight: 2 }

export function getFontMetrics(id) {
  const font = ARABIC_FONTS.find(f => f.id === id)
  if (!font) {
    return DEFAULT_FONT_METRICS
  }
  return {
    sizeFactor: font.sizeFactor ?? DEFAULT_FONT_METRICS.sizeFactor,
    lineHeight: font.lineHeight ?? DEFAULT_FONT_METRICS.lineHeight
  }
}

export default ARABIC_FONTS
