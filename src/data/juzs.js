const JUZS = [
  { number: 1,  startSurah: 1,  startVerse: 1 },
  { number: 2,  startSurah: 2,  startVerse: 142 },
  { number: 3,  startSurah: 2,  startVerse: 253 },
  { number: 4,  startSurah: 3,  startVerse: 93 },
  { number: 5,  startSurah: 4,  startVerse: 24 },
  { number: 6,  startSurah: 4,  startVerse: 148 },
  { number: 7,  startSurah: 5,  startVerse: 82 },
  { number: 8,  startSurah: 6,  startVerse: 111 },
  { number: 9,  startSurah: 7,  startVerse: 88 },
  { number: 10, startSurah: 8,  startVerse: 41 },
  { number: 11, startSurah: 9,  startVerse: 93 },
  { number: 12, startSurah: 11, startVerse: 6 },
  { number: 13, startSurah: 12, startVerse: 53 },
  { number: 14, startSurah: 15, startVerse: 1 },
  { number: 15, startSurah: 17, startVerse: 1 },
  { number: 16, startSurah: 18, startVerse: 75 },
  { number: 17, startSurah: 21, startVerse: 1 },
  { number: 18, startSurah: 23, startVerse: 1 },
  { number: 19, startSurah: 25, startVerse: 21 },
  { number: 20, startSurah: 27, startVerse: 56 },
  { number: 21, startSurah: 29, startVerse: 46 },
  { number: 22, startSurah: 33, startVerse: 31 },
  { number: 23, startSurah: 36, startVerse: 28 },
  { number: 24, startSurah: 39, startVerse: 32 },
  { number: 25, startSurah: 41, startVerse: 47 },
  { number: 26, startSurah: 46, startVerse: 1 },
  { number: 27, startSurah: 51, startVerse: 31 },
  { number: 28, startSurah: 58, startVerse: 1 },
  { number: 29, startSurah: 67, startVerse: 1 },
  { number: 30, startSurah: 78, startVerse: 1 }
]

export function getJuzForVerse(surahNum, verseNum) {
  let juz = 1
  for (const j of JUZS) {
    if (j.startSurah < surahNum || (j.startSurah === surahNum && j.startVerse <= verseNum)) {
      juz = j.number
    }
  }
  return juz
}

export default JUZS
