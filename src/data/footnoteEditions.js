// Quran.com translation resource ids known to embed <sup foot_note=...> markers
// (sampled on Al-Baqara 2:1–5 and related verses). Used for UI badges and to decide
// when an edition can show the footnotes feature. Source: api.quran.com scan.
//
// Other public APIs (alquran.cloud, Tanzil downloads, fawazahmed0/quran-api) do not
// expose structured translation footnotes today; Quran.com remains the only free
// structured footnotes source we use.

export const FOOTNOTE_QURANCOM_IDS = new Set([
  // English
  20, // Saheeh International
  203, // Hilali & Khan
  95, // Maududi (Tafhim)
  149, // Bridges (sparse)
  // Albanian
  88,
  // Chechen
  106,
  // French
  31, // Hamidullah
  136, // Montada
  779, // Rashid Maash
  // Hausa
  115,
  // Hindi
  122,
  // Indonesian
  33, // Ministry
  134, // KFQC
  141, // Sabiq
  // Italian
  153, // Piccardo
  // Kannada
  771,
  // Kinyarwanda
  774,
  // Romanian
  782,
  // Spanish
  83, // Isa Garcia (sparse)
  140, // Montada
  199, // Noor
  // Tajik
  139,
  // Urdu
  54, // Junagarhi
  97, // Maududi Tafheem
  151, // Mahmud al-Hasan
  // Uzbek
  55,
  101,
  127,
  // Vietnamese
  220,
  // Yau/Yuw
  798,
  // Yoruba
  125
])
