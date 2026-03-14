const SURAHS = [
  {number:1,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0641\u064e\u0627\u062a\u0650\u062d\u064e\u0629\u0650",englishName:"Al-Faatiha",englishNameTranslation:"The Opening",numberOfAyahs:7,revelationType:"Meccan"},
  {number:2,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0628\u064e\u0642\u064e\u0631\u064e\u0629\u0650",englishName:"Al-Baqara",englishNameTranslation:"The Cow",numberOfAyahs:286,revelationType:"Medinan"},
  {number:3,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652 \u0639\u0650\u0645\u0652\u0631\u064e\u0627\u0646\u064e",englishName:"Aal-i-Imraan",englishNameTranslation:"The Family of Imraan",numberOfAyahs:200,revelationType:"Medinan"},
  {number:4,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0646\u0651\u0650\u0633\u064e\u0627\u0621\u0650",englishName:"An-Nisaa",englishNameTranslation:"The Women",numberOfAyahs:176,revelationType:"Medinan"},
  {number:5,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0645\u064e\u0627\u0626\u0650\u062f\u064e\u0629\u0650",englishName:"Al-Maaida",englishNameTranslation:"The Table",numberOfAyahs:120,revelationType:"Medinan"},
  {number:6,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0623\u064e\u0646\u0652\u0639\u064e\u0627\u0645\u0650",englishName:"Al-An'aam",englishNameTranslation:"The Cattle",numberOfAyahs:165,revelationType:"Meccan"},
  {number:7,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0623\u064e\u0639\u0652\u0631\u064e\u0627\u0641\u0650",englishName:"Al-A'raaf",englishNameTranslation:"The Heights",numberOfAyahs:206,revelationType:"Meccan"},
  {number:8,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0623\u064e\u0646\u0641\u064e\u0627\u0644\u0650",englishName:"Al-Anfaal",englishNameTranslation:"The Spoils of War",numberOfAyahs:75,revelationType:"Medinan"},
  {number:9,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u062a\u0651\u064e\u0648\u0652\u0628\u064e\u0629\u0650",englishName:"At-Tawba",englishNameTranslation:"The Repentance",numberOfAyahs:129,revelationType:"Medinan"},
  {number:10,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u064a\u064f\u0648\u0646\u064f\u0633\u064e",englishName:"Yunus",englishNameTranslation:"Jonas",numberOfAyahs:109,revelationType:"Meccan"},
  {number:11,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0647\u064f\u0648\u062f\u064d",englishName:"Hud",englishNameTranslation:"Hud",numberOfAyahs:123,revelationType:"Meccan"},
  {number:12,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u064a\u064f\u0648\u0633\u064f\u0641\u064e",englishName:"Yusuf",englishNameTranslation:"Joseph",numberOfAyahs:111,revelationType:"Meccan"},
  {number:13,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0631\u0651\u064e\u0639\u0652\u062f\u0650",englishName:"Ar-Ra'd",englishNameTranslation:"The Thunder",numberOfAyahs:43,revelationType:"Medinan"},
  {number:14,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0625\u0650\u0628\u0652\u0631\u064e\u0627\u0647\u0650\u064a\u0645\u064e",englishName:"Ibrahim",englishNameTranslation:"Abraham",numberOfAyahs:52,revelationType:"Meccan"},
  {number:15,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u062d\u0650\u062c\u0652\u0631\u0650",englishName:"Al-Hijr",englishNameTranslation:"The Rock",numberOfAyahs:99,revelationType:"Meccan"},
  {number:16,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0646\u0651\u064e\u062d\u0652\u0644\u0650",englishName:"An-Nahl",englishNameTranslation:"The Bee",numberOfAyahs:128,revelationType:"Meccan"},
  {number:17,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0625\u0650\u0633\u0652\u0631\u064e\u0627\u0621\u0650",englishName:"Al-Israa",englishNameTranslation:"The Night Journey",numberOfAyahs:111,revelationType:"Meccan"},
  {number:18,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0643\u064e\u0647\u0652\u0641\u0650",englishName:"Al-Kahf",englishNameTranslation:"The Cave",numberOfAyahs:110,revelationType:"Meccan"},
  {number:19,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0645\u064e\u0631\u0652\u064a\u064e\u0645\u064e",englishName:"Maryam",englishNameTranslation:"Mary",numberOfAyahs:98,revelationType:"Meccan"},
  {number:20,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0637\u0647",englishName:"Taa-Haa",englishNameTranslation:"Taa-Haa",numberOfAyahs:135,revelationType:"Meccan"},
  {number:21,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0623\u064e\u0646\u0652\u0628\u0650\u064a\u064e\u0627\u0621\u0650",englishName:"Al-Anbiyaa",englishNameTranslation:"The Prophets",numberOfAyahs:112,revelationType:"Meccan"},
  {number:22,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u062d\u064e\u062c\u0651\u0650",englishName:"Al-Hajj",englishNameTranslation:"The Pilgrimage",numberOfAyahs:78,revelationType:"Medinan"},
  {number:23,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0645\u064f\u0624\u0652\u0645\u0650\u0646\u064f\u0648\u0646\u064e",englishName:"Al-Muminoon",englishNameTranslation:"The Believers",numberOfAyahs:118,revelationType:"Meccan"},
  {number:24,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0646\u0651\u064f\u0648\u0631\u0650",englishName:"An-Noor",englishNameTranslation:"The Light",numberOfAyahs:64,revelationType:"Medinan"},
  {number:25,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0641\u064f\u0631\u0652\u0642\u064e\u0627\u0646\u0650",englishName:"Al-Furqaan",englishNameTranslation:"The Criterion",numberOfAyahs:77,revelationType:"Meccan"},
  {number:26,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0634\u0651\u064f\u0639\u064e\u0631\u064e\u0627\u0621\u0650",englishName:"Ash-Shu'araa",englishNameTranslation:"The Poets",numberOfAyahs:227,revelationType:"Meccan"},
  {number:27,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0646\u0651\u064e\u0645\u0652\u0644\u0650",englishName:"An-Naml",englishNameTranslation:"The Ant",numberOfAyahs:93,revelationType:"Meccan"},
  {number:28,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0642\u064e\u0635\u064e\u0635\u0650",englishName:"Al-Qasas",englishNameTranslation:"The Stories",numberOfAyahs:88,revelationType:"Meccan"},
  {number:29,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0639\u064e\u0646\u0652\u0643\u064e\u0628\u064f\u0648\u062a\u0650",englishName:"Al-Ankaboot",englishNameTranslation:"The Spider",numberOfAyahs:69,revelationType:"Meccan"},
  {number:30,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0631\u0651\u064f\u0648\u0645\u0650",englishName:"Ar-Room",englishNameTranslation:"The Romans",numberOfAyahs:60,revelationType:"Meccan"},
  {number:31,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0644\u064f\u0642\u0652\u0645\u064e\u0627\u0646\u064e",englishName:"Luqman",englishNameTranslation:"Luqman",numberOfAyahs:34,revelationType:"Meccan"},
  {number:32,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0633\u0651\u064e\u062c\u0652\u062f\u064e\u0629\u0650",englishName:"As-Sajda",englishNameTranslation:"The Prostration",numberOfAyahs:30,revelationType:"Meccan"},
  {number:33,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0623\u064e\u062d\u0652\u0632\u064e\u0627\u0628\u0650",englishName:"Al-Ahzaab",englishNameTranslation:"The Clans",numberOfAyahs:73,revelationType:"Medinan"},
  {number:34,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0633\u064e\u0628\u064e\u0625\u064d",englishName:"Saba",englishNameTranslation:"Sheba",numberOfAyahs:54,revelationType:"Meccan"},
  {number:35,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0641\u064e\u0627\u0637\u0650\u0631\u064d",englishName:"Faatir",englishNameTranslation:"The Originator",numberOfAyahs:45,revelationType:"Meccan"},
  {number:36,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u064a\u0633",englishName:"Yaseen",englishNameTranslation:"Yaseen",numberOfAyahs:83,revelationType:"Meccan"},
  {number:37,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0635\u0651\u064e\u0627\u0641\u0651\u064e\u0627\u062a\u0650",englishName:"As-Saaffaat",englishNameTranslation:"Those drawn up in Ranks",numberOfAyahs:182,revelationType:"Meccan"},
  {number:38,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0635",englishName:"Saad",englishNameTranslation:"The letter Saad",numberOfAyahs:88,revelationType:"Meccan"},
  {number:39,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0632\u0651\u064f\u0645\u064e\u0631\u0650",englishName:"Az-Zumar",englishNameTranslation:"The Groups",numberOfAyahs:75,revelationType:"Meccan"},
  {number:40,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u063a\u064e\u0627\u0641\u0650\u0631\u064d",englishName:"Ghafir",englishNameTranslation:"The Forgiver",numberOfAyahs:85,revelationType:"Meccan"},
  {number:41,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0641\u064f\u0635\u0651\u0650\u0644\u064e\u062a",englishName:"Fussilat",englishNameTranslation:"Explained in detail",numberOfAyahs:54,revelationType:"Meccan"},
  {number:42,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0634\u0651\u064f\u0648\u0631\u064e\u0649\u0670",englishName:"Ash-Shura",englishNameTranslation:"Consultation",numberOfAyahs:53,revelationType:"Meccan"},
  {number:43,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0632\u0651\u064f\u062e\u0652\u0631\u064f\u0641\u0650",englishName:"Az-Zukhruf",englishNameTranslation:"Ornaments of gold",numberOfAyahs:89,revelationType:"Meccan"},
  {number:44,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u062f\u0651\u064f\u062e\u064e\u0627\u0646\u0650",englishName:"Ad-Dukhaan",englishNameTranslation:"The Smoke",numberOfAyahs:59,revelationType:"Meccan"},
  {number:45,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u062c\u064e\u0627\u062b\u0650\u064a\u064e\u0629\u0650",englishName:"Al-Jaathiya",englishNameTranslation:"Crouching",numberOfAyahs:37,revelationType:"Meccan"},
  {number:46,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0623\u064e\u062d\u0652\u0642\u064e\u0627\u0641\u0650",englishName:"Al-Ahqaf",englishNameTranslation:"The Dunes",numberOfAyahs:35,revelationType:"Meccan"},
  {number:47,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0645\u064f\u062d\u064e\u0645\u0651\u064e\u062f\u064d",englishName:"Muhammad",englishNameTranslation:"Muhammad",numberOfAyahs:38,revelationType:"Medinan"},
  {number:48,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0641\u064e\u062a\u0652\u062d\u0650",englishName:"Al-Fath",englishNameTranslation:"The Victory",numberOfAyahs:29,revelationType:"Medinan"},
  {number:49,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u062d\u064f\u062c\u064f\u0631\u064e\u0627\u062a\u0650",englishName:"Al-Hujuraat",englishNameTranslation:"The Inner Apartments",numberOfAyahs:18,revelationType:"Medinan"},
  {number:50,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0642",englishName:"Qaaf",englishNameTranslation:"The letter Qaaf",numberOfAyahs:45,revelationType:"Meccan"},
  {number:51,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0630\u0651\u064e\u0627\u0631\u0650\u064a\u064e\u0627\u062a\u0650",englishName:"Adh-Dhaariyat",englishNameTranslation:"The Winnowing Winds",numberOfAyahs:60,revelationType:"Meccan"},
  {number:52,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0637\u0651\u064f\u0648\u0631\u0650",englishName:"At-Tur",englishNameTranslation:"The Mount",numberOfAyahs:49,revelationType:"Meccan"},
  {number:53,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0646\u0651\u064e\u062c\u0652\u0645\u0650",englishName:"An-Najm",englishNameTranslation:"The Star",numberOfAyahs:62,revelationType:"Meccan"},
  {number:54,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0642\u064e\u0645\u064e\u0631\u0650",englishName:"Al-Qamar",englishNameTranslation:"The Moon",numberOfAyahs:55,revelationType:"Meccan"},
  {number:55,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0631\u0651\u064e\u062d\u0652\u0645\u064e\u0670\u0646",englishName:"Ar-Rahmaan",englishNameTranslation:"The Beneficent",numberOfAyahs:78,revelationType:"Medinan"},
  {number:56,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0648\u064e\u0627\u0642\u0650\u0639\u064e\u0629\u0650",englishName:"Al-Waaqia",englishNameTranslation:"The Inevitable",numberOfAyahs:96,revelationType:"Meccan"},
  {number:57,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u062d\u064e\u062f\u0650\u064a\u062f\u0650",englishName:"Al-Hadid",englishNameTranslation:"The Iron",numberOfAyahs:29,revelationType:"Medinan"},
  {number:58,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0645\u064f\u062c\u064e\u0627\u062f\u064e\u0644\u064e\u0629\u0650",englishName:"Al-Mujaadila",englishNameTranslation:"The Pleading Woman",numberOfAyahs:22,revelationType:"Medinan"},
  {number:59,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u062d\u064e\u0634\u0652\u0631\u0650",englishName:"Al-Hashr",englishNameTranslation:"The Exile",numberOfAyahs:24,revelationType:"Medinan"},
  {number:60,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0645\u064f\u0645\u0652\u062a\u064e\u062d\u064e\u0646\u064e\u0629\u0650",englishName:"Al-Mumtahana",englishNameTranslation:"She that is to be examined",numberOfAyahs:13,revelationType:"Medinan"},
  {number:61,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0635\u0651\u064e\u0641\u0651\u0650",englishName:"As-Saff",englishNameTranslation:"The Ranks",numberOfAyahs:14,revelationType:"Medinan"},
  {number:62,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u062c\u064f\u0645\u064f\u0639\u064e\u0629\u0650",englishName:"Al-Jumu'a",englishNameTranslation:"Friday",numberOfAyahs:11,revelationType:"Medinan"},
  {number:63,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0645\u064f\u0646\u064e\u0627\u0641\u0650\u0642\u064f\u0648\u0646\u064e",englishName:"Al-Munaafiqoon",englishNameTranslation:"The Hypocrites",numberOfAyahs:11,revelationType:"Medinan"},
  {number:64,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u062a\u0651\u064e\u063a\u064e\u0627\u0628\u064f\u0646\u0650",englishName:"At-Taghaabun",englishNameTranslation:"Mutual Disillusion",numberOfAyahs:18,revelationType:"Medinan"},
  {number:65,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0637\u0651\u064e\u0644\u064e\u0627\u0642\u0650",englishName:"At-Talaaq",englishNameTranslation:"Divorce",numberOfAyahs:12,revelationType:"Medinan"},
  {number:66,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u062a\u0651\u064e\u062d\u0652\u0631\u0650\u064a\u0645\u0650",englishName:"At-Tahrim",englishNameTranslation:"The Prohibition",numberOfAyahs:12,revelationType:"Medinan"},
  {number:67,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0645\u064f\u0644\u0652\u0643\u0650",englishName:"Al-Mulk",englishNameTranslation:"The Sovereignty",numberOfAyahs:30,revelationType:"Meccan"},
  {number:68,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0642\u064e\u0644\u064e\u0645\u0650",englishName:"Al-Qalam",englishNameTranslation:"The Pen",numberOfAyahs:52,revelationType:"Meccan"},
  {number:69,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u062d\u064e\u0627\u0642\u0651\u064e\u0629\u0650",englishName:"Al-Haaqqa",englishNameTranslation:"The Reality",numberOfAyahs:52,revelationType:"Meccan"},
  {number:70,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0645\u064e\u0639\u064e\u0627\u0631\u0650\u062c\u0650",englishName:"Al-Ma'aarij",englishNameTranslation:"The Ascending Stairways",numberOfAyahs:44,revelationType:"Meccan"},
  {number:71,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0646\u064f\u0648\u062d\u064d",englishName:"Nooh",englishNameTranslation:"Noah",numberOfAyahs:28,revelationType:"Meccan"},
  {number:72,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u062c\u0650\u0646\u0651\u0650",englishName:"Al-Jinn",englishNameTranslation:"The Jinn",numberOfAyahs:28,revelationType:"Meccan"},
  {number:73,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0645\u064f\u0632\u0651\u064e\u0645\u0651\u0650\u0644\u0650",englishName:"Al-Muzzammil",englishNameTranslation:"The Enshrouded One",numberOfAyahs:20,revelationType:"Meccan"},
  {number:74,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0645\u064f\u062f\u0651\u064e\u062b\u0651\u0650\u0631\u0650",englishName:"Al-Muddaththir",englishNameTranslation:"The Cloaked One",numberOfAyahs:56,revelationType:"Meccan"},
  {number:75,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0642\u0650\u064a\u064e\u0627\u0645\u064e\u0629\u0650",englishName:"Al-Qiyaama",englishNameTranslation:"The Resurrection",numberOfAyahs:40,revelationType:"Meccan"},
  {number:76,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0625\u0650\u0646\u0633\u064e\u0627\u0646\u0650",englishName:"Al-Insaan",englishNameTranslation:"Man",numberOfAyahs:31,revelationType:"Medinan"},
  {number:77,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0645\u064f\u0631\u0652\u0633\u064e\u0644\u064e\u0627\u062a\u0650",englishName:"Al-Mursalaat",englishNameTranslation:"The Emissaries",numberOfAyahs:50,revelationType:"Meccan"},
  {number:78,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0646\u0651\u064e\u0628\u064e\u0625\u0650",englishName:"An-Naba",englishNameTranslation:"The Announcement",numberOfAyahs:40,revelationType:"Meccan"},
  {number:79,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0646\u0651\u064e\u0627\u0632\u0650\u0639\u064e\u0627\u062a\u0650",englishName:"An-Naazi'aat",englishNameTranslation:"Those who drag forth",numberOfAyahs:46,revelationType:"Meccan"},
  {number:80,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0639\u064e\u0628\u064e\u0633\u064e",englishName:"Abasa",englishNameTranslation:"He frowned",numberOfAyahs:42,revelationType:"Meccan"},
  {number:81,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u062a\u0651\u064e\u0643\u0652\u0648\u0650\u064a\u0631\u0650",englishName:"At-Takwir",englishNameTranslation:"The Overthrowing",numberOfAyahs:29,revelationType:"Meccan"},
  {number:82,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0627\u0650\u0646\u0652\u0641\u0650\u0637\u064e\u0627\u0631\u0650",englishName:"Al-Infitaar",englishNameTranslation:"The Cleaving",numberOfAyahs:19,revelationType:"Meccan"},
  {number:83,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0645\u064f\u0637\u064e\u0641\u0651\u0650\u0641\u0650\u064a\u0646\u064e",englishName:"Al-Mutaffifin",englishNameTranslation:"Defrauding",numberOfAyahs:36,revelationType:"Meccan"},
  {number:84,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0627\u0650\u0646\u0652\u0634\u0650\u0642\u064e\u0627\u0642\u0650",englishName:"Al-Inshiqaaq",englishNameTranslation:"The Splitting Open",numberOfAyahs:25,revelationType:"Meccan"},
  {number:85,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0628\u064f\u0631\u064f\u0648\u062c\u0650",englishName:"Al-Burooj",englishNameTranslation:"The Constellations",numberOfAyahs:22,revelationType:"Meccan"},
  {number:86,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0637\u0651\u064e\u0627\u0631\u0650\u0642\u0650",englishName:"At-Taariq",englishNameTranslation:"The Morning Star",numberOfAyahs:17,revelationType:"Meccan"},
  {number:87,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0623\u064e\u0639\u0652\u0644\u064e\u0649\u0670",englishName:"Al-A'laa",englishNameTranslation:"The Most High",numberOfAyahs:19,revelationType:"Meccan"},
  {number:88,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u063a\u064e\u0627\u0634\u0650\u064a\u064e\u0629\u0650",englishName:"Al-Ghaashiya",englishNameTranslation:"The Overwhelming",numberOfAyahs:26,revelationType:"Meccan"},
  {number:89,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0641\u064e\u062c\u0652\u0631\u0650",englishName:"Al-Fajr",englishNameTranslation:"The Dawn",numberOfAyahs:30,revelationType:"Meccan"},
  {number:90,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0628\u064e\u0644\u064e\u062f\u0650",englishName:"Al-Balad",englishNameTranslation:"The City",numberOfAyahs:20,revelationType:"Meccan"},
  {number:91,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0634\u0651\u064e\u0645\u0652\u0633\u0650",englishName:"Ash-Shams",englishNameTranslation:"The Sun",numberOfAyahs:15,revelationType:"Meccan"},
  {number:92,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0644\u0651\u064e\u064a\u0652\u0644\u0650",englishName:"Al-Lail",englishNameTranslation:"The Night",numberOfAyahs:21,revelationType:"Meccan"},
  {number:93,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0636\u0651\u064f\u062d\u064e\u0649\u0670",englishName:"Ad-Dhuhaa",englishNameTranslation:"The Morning Hours",numberOfAyahs:11,revelationType:"Meccan"},
  {number:94,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0634\u0651\u064e\u0631\u0652\u062d\u0650",englishName:"Ash-Sharh",englishNameTranslation:"The Consolation",numberOfAyahs:8,revelationType:"Meccan"},
  {number:95,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u062a\u0651\u0650\u064a\u0646\u0650",englishName:"At-Tin",englishNameTranslation:"The Fig",numberOfAyahs:8,revelationType:"Meccan"},
  {number:96,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0639\u064e\u0644\u064e\u0642\u0650",englishName:"Al-Alaq",englishNameTranslation:"The Clot",numberOfAyahs:19,revelationType:"Meccan"},
  {number:97,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0642\u064e\u062f\u0652\u0631\u0650",englishName:"Al-Qadr",englishNameTranslation:"The Power, Fate",numberOfAyahs:5,revelationType:"Meccan"},
  {number:98,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0628\u064e\u064a\u0651\u0650\u0646\u064e\u0629\u0650",englishName:"Al-Bayyina",englishNameTranslation:"The Evidence",numberOfAyahs:8,revelationType:"Medinan"},
  {number:99,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0632\u0651\u064e\u0644\u0652\u0632\u064e\u0644\u064e\u0629\u0650",englishName:"Az-Zalzala",englishNameTranslation:"The Earthquake",numberOfAyahs:8,revelationType:"Medinan"},
  {number:100,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0639\u064e\u0627\u062f\u0650\u064a\u064e\u0627\u062a\u0650",englishName:"Al-Aadiyaat",englishNameTranslation:"The Chargers",numberOfAyahs:11,revelationType:"Meccan"},
  {number:101,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0642\u064e\u0627\u0631\u0650\u0639\u064e\u0629\u0650",englishName:"Al-Qaari'a",englishNameTranslation:"The Calamity",numberOfAyahs:11,revelationType:"Meccan"},
  {number:102,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u062a\u0651\u064e\u0643\u064e\u0627\u062b\u064f\u0631\u0650",englishName:"At-Takaathur",englishNameTranslation:"Competition",numberOfAyahs:8,revelationType:"Meccan"},
  {number:103,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0639\u064e\u0635\u0652\u0631\u0650",englishName:"Al-Asr",englishNameTranslation:"The Declining Day, Epoch",numberOfAyahs:3,revelationType:"Meccan"},
  {number:104,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0647\u064f\u0645\u064e\u0632\u064e\u0629\u0650",englishName:"Al-Humaza",englishNameTranslation:"The Traducer",numberOfAyahs:9,revelationType:"Meccan"},
  {number:105,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0641\u0650\u064a\u0644\u0650",englishName:"Al-Fil",englishNameTranslation:"The Elephant",numberOfAyahs:5,revelationType:"Meccan"},
  {number:106,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0642\u064f\u0631\u064e\u064a\u0652\u0634\u064d",englishName:"Quraish",englishNameTranslation:"Quraysh",numberOfAyahs:4,revelationType:"Meccan"},
  {number:107,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0645\u064e\u0627\u0639\u064f\u0648\u0646\u0650",englishName:"Al-Maa'un",englishNameTranslation:"Almsgiving",numberOfAyahs:7,revelationType:"Meccan"},
  {number:108,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0643\u064e\u0648\u0652\u062b\u064e\u0631\u0650",englishName:"Al-Kawthar",englishNameTranslation:"Abundance",numberOfAyahs:3,revelationType:"Meccan"},
  {number:109,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0643\u064e\u0627\u0641\u0650\u0631\u064f\u0648\u0646\u064e",englishName:"Al-Kaafiroon",englishNameTranslation:"The Disbelievers",numberOfAyahs:6,revelationType:"Meccan"},
  {number:110,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0646\u0651\u064e\u0635\u0652\u0631\u0650",englishName:"An-Nasr",englishNameTranslation:"Divine Support",numberOfAyahs:3,revelationType:"Medinan"},
  {number:111,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0645\u064e\u0633\u064e\u062f\u0650",englishName:"Al-Masad",englishNameTranslation:"The Palm Fibre",numberOfAyahs:5,revelationType:"Meccan"},
  {number:112,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0625\u0650\u062e\u0652\u0644\u064e\u0627\u0635\u0650",englishName:"Al-Ikhlaas",englishNameTranslation:"Sincerity",numberOfAyahs:4,revelationType:"Meccan"},
  {number:113,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0652\u0641\u064e\u0644\u064e\u0642\u0650",englishName:"Al-Falaq",englishNameTranslation:"The Dawn",numberOfAyahs:5,revelationType:"Meccan"},
  {number:114,name:"\u0633\u064f\u0648\u0631\u064e\u0629\u064f \u0671\u0644\u0646\u0651\u064e\u0627\u0633\u0650",englishName:"An-Naas",englishNameTranslation:"Mankind",numberOfAyahs:6,revelationType:"Meccan"}
];

const RECITERS = [
  {identifier:"ar.alafasy",englishName:"Mishary Alafasy"},
  {identifier:"ar.abdulbasitmurattal",englishName:"Abdul Basit (Murattal)"},
  {identifier:"ar.abdulsamad",englishName:"Abdul Samad"},
  {identifier:"ar.abdurrahmaansudais",englishName:"Abdurrahmaan As-Sudais"},
  {identifier:"ar.abdullahbasfar",englishName:"Abdullah Basfar"},
  {identifier:"ar.ahmedajamy",englishName:"Ahmed al-Ajamy"},
  {identifier:"ar.aymanswoaid",englishName:"Ayman Sowaid"},
  {identifier:"ar.hanirifai",englishName:"Hani Rifai"},
  {identifier:"ar.hudhaify",englishName:"Hudhaify"},
  {identifier:"ar.husary",englishName:"Husary"},
  {identifier:"ar.husarymujawwad",englishName:"Husary (Mujawwad)"},
  {identifier:"ar.ibrahimakhbar",englishName:"Ibrahim Akhdar"},
  {identifier:"ar.mahermuaiqly",englishName:"Maher Al Muaiqly"},
  {identifier:"ar.minshawi",englishName:"Minshawi"},
  {identifier:"ar.minshawimujawwad",englishName:"Minshawy (Mujawwad)"},
  {identifier:"ar.muhammadayyoub",englishName:"Muhammad Ayyoub"},
  {identifier:"ar.muhammadjibreel",englishName:"Muhammad Jibreel"},
  {identifier:"ar.parhizgar",englishName:"Parhizgar"},
  {identifier:"ar.saoodshuraym",englishName:"Saood Ash-Shuraym"},
  {identifier:"ar.shaatree",englishName:"Abu Bakr Ash-Shaatree"}
];

const TRANSLATIONS = [
  {identifier:"en.sahih",englishName:"Saheeh International"},
  {identifier:"en.itani",englishName:"Clear Quran (Talal Itani)"},
  {identifier:"en.yusufali",englishName:"Abdullah Yusuf Ali"},
  {identifier:"en.pickthall",englishName:"Pickthall"},
  {identifier:"en.asad",englishName:"Muhammad Asad"},
  {identifier:"en.hilali",englishName:"Hilali & Khan"},
  {identifier:"en.shakir",englishName:"Shakir"},
  {identifier:"en.maududi",englishName:"Maududi"},
  {identifier:"en.ahmedali",englishName:"Ahmed Ali"},
  {identifier:"en.ahmedraza",englishName:"Ahmed Raza Khan"},
  {identifier:"en.arberry",englishName:"A. J. Arberry"},
  {identifier:"en.daryabadi",englishName:"Abdul Majid Daryabadi"},
  {identifier:"en.qaribullah",englishName:"Qaribullah & Darwish"},
  {identifier:"en.sarwar",englishName:"Muhammad Sarwar"},
  {identifier:"en.mubarakpuri",englishName:"Mubarakpuri"},
  {identifier:"en.qarai",englishName:"Qarai"},
  {identifier:"en.wahiduddin",englishName:"Wahiduddin Khan"}
];

const API_BASE = "https://api.alquran.cloud/v1";

class QuranPlayer {
  constructor() {
    this.currentSurahNum = 1;
    this.currentReciter = "ar.alafasy";
    this.currentTranslation = "en.sahih";
    this.currentVerseIndex = 0;
    this.verses = [];
    this.translationVerses = [];
    this.audioUrls = [];
    this.audio = new Audio();
    this.isPlaying = false;
    this.isLoading = false;

    this.els = {};
    this.init();
  }

  init() {
    this.loadPreferences();
    this.bindElements();
    this.populateSelects();
    this.bindEvents();
    this.loadSurah();
  }

  bindElements() {
    const ids = [
      "surah-select", "reciter-select", "translation-select",
      "surah-name-arabic", "surah-name-english", "surah-info",
      "verse-display", "loading", "error-message", "error-text", "retry-btn",
      "verse-content", "bismillah", "verse-arabic", "verse-number",
      "verse-translation", "play-btn", "play-icon", "pause-icon",
      "prev-btn", "next-btn", "prev-surah-btn", "next-surah-btn",
      "progress-bar", "progress-container", "verse-indicator", "verse-list"
    ];
    ids.forEach(id => {
      this.els[this.camelize(id)] = document.getElementById(id);
    });
  }

  camelize(str) {
    return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  }

  populateSelects() {
    this.els.surahSelect.innerHTML = SURAHS.map(s =>
      `<option value="${s.number}" ${s.number === this.currentSurahNum ? "selected" : ""}>${s.number}. ${s.englishName} - ${s.englishNameTranslation}</option>`
    ).join("");

    this.els.reciterSelect.innerHTML = RECITERS.map(r =>
      `<option value="${r.identifier}" ${r.identifier === this.currentReciter ? "selected" : ""}>${r.englishName}</option>`
    ).join("");

    this.els.translationSelect.innerHTML = TRANSLATIONS.map(t =>
      `<option value="${t.identifier}" ${t.identifier === this.currentTranslation ? "selected" : ""}>${t.englishName}</option>`
    ).join("");
  }

  bindEvents() {
    this.els.surahSelect.addEventListener("change", () => {
      this.currentSurahNum = parseInt(this.els.surahSelect.value);
      this.currentVerseIndex = 0;
      this.stop();
      this.savePreferences();
      this.loadSurah();
    });

    this.els.reciterSelect.addEventListener("change", () => {
      this.currentReciter = this.els.reciterSelect.value;
      this.stop();
      this.savePreferences();
      this.loadSurah();
    });

    this.els.translationSelect.addEventListener("change", () => {
      this.currentTranslation = this.els.translationSelect.value;
      this.stop();
      this.savePreferences();
      this.loadSurah();
    });

    this.els.playBtn.addEventListener("click", () => {
      if (this.isPlaying) {
        this.pause();
      } else {
        this.play();
      }
    });

    this.els.prevBtn.addEventListener("click", () => this.prevVerse());
    this.els.nextBtn.addEventListener("click", () => this.nextVerse());
    this.els.prevSurahBtn.addEventListener("click", () => this.prevSurah());
    this.els.nextSurahBtn.addEventListener("click", () => this.nextSurah());
    this.els.retryBtn.addEventListener("click", () => this.loadSurah());

    this.els.progressContainer.addEventListener("click", (e) => {
      if (!this.audio.duration) return;
      const rect = this.els.progressContainer.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      this.audio.currentTime = ratio * this.audio.duration;
    });

    this.audio.addEventListener("timeupdate", () => {
      if (this.audio.duration) {
        const pct = (this.audio.currentTime / this.audio.duration) * 100;
        this.els.progressBar.style.width = pct + "%";
      }
    });

    this.audio.addEventListener("ended", () => {
      if (this.currentVerseIndex < this.verses.length - 1) {
        this.currentVerseIndex++;
        this.updateDisplay();
        this.playCurrentVerse();
      } else {
        this.stop();
      }
    });

    this.audio.addEventListener("error", () => {
      if (this.isPlaying && this.currentVerseIndex < this.verses.length - 1) {
        this.currentVerseIndex++;
        this.updateDisplay();
        this.playCurrentVerse();
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.target.tagName === "SELECT" || e.target.tagName === "INPUT") return;
      if (e.code === "Space") {
        e.preventDefault();
        this.isPlaying ? this.pause() : this.play();
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        this.nextVerse();
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        this.prevVerse();
      }
    });
  }

  async loadSurah() {
    if (this.isLoading) return;
    this.isLoading = true;
    this.showLoading();

    const surah = SURAHS.find(s => s.number === this.currentSurahNum);
    this.els.surahNameArabic.textContent = surah.name;
    this.els.surahNameEnglish.textContent = surah.englishName + " - " + surah.englishNameTranslation;
    this.els.surahInfo.textContent = surah.revelationType + " | " + surah.numberOfAyahs + " verses";

    try {
      const url = `${API_BASE}/surah/${this.currentSurahNum}/editions/quran-uthmani,${this.currentTranslation},${this.currentReciter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("API error: " + res.status);
      const data = await res.json();

      if (data.code !== 200 || !data.data || data.data.length < 3) {
        throw new Error("Invalid API response");
      }

      const [arabicData, translationData, audioData] = data.data;

      this.verses = arabicData.ayahs.map(a => ({
        number: a.numberInSurah,
        text: a.text
      }));

      this.translationVerses = translationData.ayahs.map(a => ({
        number: a.numberInSurah,
        text: a.text
      }));

      this.audioUrls = audioData.ayahs.map(a => a.audio);

      if (this.currentVerseIndex >= this.verses.length) {
        this.currentVerseIndex = 0;
      }

      this.showContent();
      this.updateDisplay();
      this.renderVerseList();
    } catch (err) {
      this.showError("Failed to load surah. Please check your connection and try again.");
    } finally {
      this.isLoading = false;
    }
  }

  showLoading() {
    this.els.loading.style.display = "";
    this.els.verseContent.style.display = "none";
    this.els.errorMessage.style.display = "none";
  }

  showContent() {
    this.els.loading.style.display = "none";
    this.els.verseContent.style.display = "";
    this.els.errorMessage.style.display = "none";
  }

  showError(msg) {
    this.els.loading.style.display = "none";
    this.els.verseContent.style.display = "none";
    this.els.errorMessage.style.display = "";
    this.els.errorText.textContent = msg;
  }

  updateDisplay() {
    const verse = this.verses[this.currentVerseIndex];
    const translation = this.translationVerses[this.currentVerseIndex];
    if (!verse) return;

    // Show bismillah for surahs other than 1 and 9, only on first verse
    const showBismillah = this.currentSurahNum !== 1 && this.currentSurahNum !== 9 && this.currentVerseIndex === 0;
    this.els.bismillah.style.display = showBismillah ? "" : "none";

    // Transition animation
    this.els.verseContent.classList.add("transitioning");
    requestAnimationFrame(() => {
      this.els.verseArabic.textContent = verse.text;
      this.els.verseNumber.textContent = verse.number;
      this.els.verseTranslation.textContent = translation.text;
      this.els.verseIndicator.textContent = `Verse ${verse.number} of ${this.verses.length}`;

      requestAnimationFrame(() => {
        this.els.verseContent.classList.remove("transitioning");
      });
    });

    // Update button states
    this.els.prevBtn.disabled = this.currentVerseIndex === 0;
    this.els.nextBtn.disabled = this.currentVerseIndex >= this.verses.length - 1;
    this.els.prevSurahBtn.disabled = this.currentSurahNum <= 1;
    this.els.nextSurahBtn.disabled = this.currentSurahNum >= 114;

    // Update verse list active state
    this.updateVerseListActive();

    // Reset progress bar
    this.els.progressBar.style.width = "0%";
  }

  renderVerseList() {
    this.els.verseList.innerHTML = this.verses.map((v, i) => {
      const t = this.translationVerses[i];
      return `<div class="verse-item ${i === this.currentVerseIndex ? "active" : ""}" data-index="${i}">
        <div class="verse-item-num">${v.number}</div>
        <div class="verse-item-text">
          <p class="verse-item-arabic" dir="rtl">${v.text}</p>
          <p class="verse-item-translation">${t.text}</p>
        </div>
      </div>`;
    }).join("");

    this.els.verseList.querySelectorAll(".verse-item").forEach(item => {
      item.addEventListener("click", () => {
        const idx = parseInt(item.dataset.index);
        this.currentVerseIndex = idx;
        this.updateDisplay();
        if (this.isPlaying) {
          this.playCurrentVerse();
        }
      });
    });
  }

  updateVerseListActive() {
    const items = this.els.verseList.querySelectorAll(".verse-item");
    items.forEach((item, i) => {
      item.classList.toggle("active", i === this.currentVerseIndex);
    });

    // Scroll active verse into view
    const active = this.els.verseList.querySelector(".verse-item.active");
    if (active) {
      active.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }

  play() {
    if (this.verses.length === 0) return;
    this.isPlaying = true;
    this.els.playIcon.style.display = "none";
    this.els.pauseIcon.style.display = "";
    this.els.verseDisplay.classList.add("playing");
    this.playCurrentVerse();
  }

  pause() {
    this.isPlaying = false;
    this.audio.pause();
    this.els.playIcon.style.display = "";
    this.els.pauseIcon.style.display = "none";
    this.els.verseDisplay.classList.remove("playing");
  }

  stop() {
    this.isPlaying = false;
    this.audio.pause();
    this.audio.currentTime = 0;
    this.els.playIcon.style.display = "";
    this.els.pauseIcon.style.display = "none";
    this.els.verseDisplay.classList.remove("playing");
    this.els.progressBar.style.width = "0%";
  }

  playCurrentVerse() {
    const url = this.audioUrls[this.currentVerseIndex];
    if (!url) return;
    this.audio.src = url;
    this.audio.play().catch(() => {});
  }

  nextVerse() {
    if (this.currentVerseIndex < this.verses.length - 1) {
      this.currentVerseIndex++;
      this.updateDisplay();
      if (this.isPlaying) {
        this.playCurrentVerse();
      }
    }
  }

  prevVerse() {
    if (this.currentVerseIndex > 0) {
      this.currentVerseIndex--;
      this.updateDisplay();
      if (this.isPlaying) {
        this.playCurrentVerse();
      }
    }
  }

  nextSurah() {
    if (this.currentSurahNum < 114) {
      this.currentSurahNum++;
      this.currentVerseIndex = 0;
      this.els.surahSelect.value = this.currentSurahNum;
      this.stop();
      this.savePreferences();
      this.loadSurah();
    }
  }

  prevSurah() {
    if (this.currentSurahNum > 1) {
      this.currentSurahNum--;
      this.currentVerseIndex = 0;
      this.els.surahSelect.value = this.currentSurahNum;
      this.stop();
      this.savePreferences();
      this.loadSurah();
    }
  }

  savePreferences() {
    try {
      localStorage.setItem("quran-player-prefs", JSON.stringify({
        surah: this.currentSurahNum,
        reciter: this.currentReciter,
        translation: this.currentTranslation
      }));
    } catch (e) {}
  }

  loadPreferences() {
    try {
      const saved = localStorage.getItem("quran-player-prefs");
      if (saved) {
        const prefs = JSON.parse(saved);
        if (prefs.surah) this.currentSurahNum = prefs.surah;
        if (prefs.reciter) this.currentReciter = prefs.reciter;
        if (prefs.translation) this.currentTranslation = prefs.translation;
      }
    } catch (e) {}
  }
}

document.addEventListener("DOMContentLoaded", () => {
  new QuranPlayer();
});
