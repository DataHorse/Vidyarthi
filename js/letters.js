// letters.js
// Ordered Telugu akshara (letters) data for Vidyarthi.
// Sequence follows the traditional teaching order used in Telugu primary
// schools: vowels (అచ్చులు) first, then consonants (హల్లులు) in their
// classic varga (row) groupings. See PROMPT.md for the scoping rationale
// (archaic Sanskrit-only vowels and the obsolete ఴ are omitted).
//
// Each entry:
//   telugu          - the Telugu glyph shown large and traced
//   translit        - simple English transliteration of the letter's sound
//   group           - teaching group, used for section headers on the home screen
//   word            - a simple, real Telugu word a child likely knows
//   wordTranslit    - transliteration of that word
//   meaning         - English meaning of the word (memory aid)
//   note            - optional short teaching note (e.g. for rare letters)

const LETTERS = [
  // ---------- అచ్చులు (Vowels) ----------
  { telugu: "అ", translit: "a", group: "Vowels", word: "అమ్మ", wordTranslit: "Amma", meaning: "Mother" },
  { telugu: "ఆ", translit: "aa", group: "Vowels", word: "ఆవు", wordTranslit: "Aavu", meaning: "Cow" },
  { telugu: "ఇ", translit: "i", group: "Vowels", word: "ఇల్లు", wordTranslit: "Illu", meaning: "House" },
  { telugu: "ఈ", translit: "ee", group: "Vowels", word: "ఈగ", wordTranslit: "Eega", meaning: "Fly (insect)" },
  { telugu: "ఉ", translit: "u", group: "Vowels", word: "ఉడుత", wordTranslit: "Uduta", meaning: "Squirrel" },
  { telugu: "ఊ", translit: "oo", group: "Vowels", word: "ఊయల", wordTranslit: "Ooyala", meaning: "Swing" },
  { telugu: "ఋ", translit: "ru", group: "Vowels", word: "ఋషి", wordTranslit: "Rushi", meaning: "Sage", note: "A rare sound in everyday Telugu — mostly seen in words borrowed from Sanskrit." },
  { telugu: "ఎ", translit: "e", group: "Vowels", word: "ఎలుక", wordTranslit: "Eluka", meaning: "Rat" },
  { telugu: "ఏ", translit: "ae", group: "Vowels", word: "ఏనుగు", wordTranslit: "Aenugu", meaning: "Elephant" },
  { telugu: "ఐ", translit: "ai", group: "Vowels", word: "ఐస్‌క్రీమ్", wordTranslit: "Ice cream", meaning: "Ice cream" },
  { telugu: "ఒ", translit: "o", group: "Vowels", word: "ఒంటె", wordTranslit: "Ontey", meaning: "Camel" },
  { telugu: "ఓ", translit: "oa", group: "Vowels", word: "ఓడ", wordTranslit: "Oda", meaning: "Ship" },
  { telugu: "ఔ", translit: "au", group: "Vowels", word: "ఔషధం", wordTranslit: "Aushadham", meaning: "Medicine" },
  { telugu: "అం", translit: "am", group: "Vowels", word: "అంగీ", wordTranslit: "Angi", meaning: "Shirt", note: "This dot sound (anusvara) is added on top of a letter, like in 'రంగు' (rangu, colour)." },
  { telugu: "అః", translit: "aha", group: "Vowels", word: "నమః", wordTranslit: "Namaha", meaning: "A respectful greeting (as in prayers)", note: "The visarga (colon-like mark) is rare and mostly appears inside words, e.g. 'దుఃఖం'." },

  // ---------- హల్లులు (Consonants) — క వర్గము ----------
  { telugu: "క", translit: "ka", group: "Ka group", word: "కోతి", wordTranslit: "Kothi", meaning: "Monkey" },
  { telugu: "ఖ", translit: "kha", group: "Ka group", word: "ఖజానా", wordTranslit: "Khajaana", meaning: "Treasure" },
  { telugu: "గ", translit: "ga", group: "Ka group", word: "గంట", wordTranslit: "Ganta", meaning: "Bell" },
  { telugu: "ఘ", translit: "gha", group: "Ka group", word: "ఘడియారం", wordTranslit: "Ghadiyaram", meaning: "Clock" },
  { telugu: "ఙ", translit: "nga", group: "Ka group", word: "", wordTranslit: "", meaning: "", note: "A very rare letter used only in a few Sanskrit-origin words — you won't see it much in everyday Telugu." },

  // ---------- చ వర్గము ----------
  { telugu: "చ", translit: "cha", group: "Cha group", word: "చందమామ", wordTranslit: "Chandamama", meaning: "Moon" },
  { telugu: "ఛ", translit: "Cha", group: "Cha group", word: "ఛత్రం", wordTranslit: "Chatram", meaning: "Umbrella" },
  { telugu: "జ", translit: "ja", group: "Cha group", word: "జింక", wordTranslit: "Jinka", meaning: "Deer" },
  { telugu: "ఝ", translit: "jha", group: "Cha group", word: "", wordTranslit: "", meaning: "", note: "A rare letter, mostly found in Sanskrit-origin words." },
  { telugu: "ఞ", translit: "nya", group: "Cha group", word: "", wordTranslit: "", meaning: "", note: "A rare letter — you'll spot it hiding inside 'జ్ఞానం' (gnyaanam, knowledge)." },

  // ---------- ట వర్గము ----------
  { telugu: "ట", translit: "Ta", group: "Ta group", word: "టమాట", wordTranslit: "Tamata", meaning: "Tomato" },
  { telugu: "ఠ", translit: "Tha", group: "Ta group", word: "ఠీవి", wordTranslit: "Theevi", meaning: "Grandeur" },
  { telugu: "డ", translit: "Da", group: "Ta group", word: "డేగ", wordTranslit: "Dega", meaning: "Eagle" },
  { telugu: "ఢ", translit: "Dha", group: "Ta group", word: "ఢిల్లీ", wordTranslit: "Dhilli", meaning: "Delhi (city)" },
  { telugu: "ణ", translit: "Na", group: "Ta group", word: "బాణం", wordTranslit: "Baanam", meaning: "Arrow", note: "This sound never starts a Telugu word, so we hear it inside a word instead." },

  // ---------- త వర్గము ----------
  { telugu: "త", translit: "ta", group: "Tha group", word: "తాబేలు", wordTranslit: "Tabelu", meaning: "Tortoise" },
  { telugu: "థ", translit: "tha", group: "Tha group", word: "థైర్యం", wordTranslit: "Thairyam", meaning: "Courage" },
  { telugu: "ద", translit: "da", group: "Tha group", word: "దీపం", wordTranslit: "Deepam", meaning: "Lamp" },
  { telugu: "ధ", translit: "dha", group: "Tha group", word: "ధనుస్సు", wordTranslit: "Dhanussu", meaning: "Bow" },
  { telugu: "న", translit: "na", group: "Tha group", word: "నక్క", wordTranslit: "Nakka", meaning: "Fox" },

  // ---------- ప వర్గము ----------
  { telugu: "ప", translit: "pa", group: "Pa group", word: "పులి", wordTranslit: "Puli", meaning: "Tiger" },
  { telugu: "ఫ", translit: "pha", group: "Pa group", word: "ఫలం", wordTranslit: "Phalam", meaning: "Fruit" },
  { telugu: "బ", translit: "ba", group: "Pa group", word: "బంతి", wordTranslit: "Banti", meaning: "Ball" },
  { telugu: "భ", translit: "bha", group: "Pa group", word: "భల్లూకం", wordTranslit: "Bhallookam", meaning: "Bear" },
  { telugu: "మ", translit: "ma", group: "Pa group", word: "మామిడి", wordTranslit: "Mamidi", meaning: "Mango" },

  // ---------- అంతస్థాలు (Semi-vowels) ----------
  { telugu: "య", translit: "ya", group: "Other letters", word: "యంత్రం", wordTranslit: "Yantram", meaning: "Machine" },
  { telugu: "ర", translit: "ra", group: "Other letters", word: "రథం", wordTranslit: "Radham", meaning: "Chariot" },
  { telugu: "ఱ", translit: "RRa", group: "Other letters", word: "", wordTranslit: "", meaning: "", note: "An old letter that sounded like a rolled 'r'. Today it's pronounced just like ర." },
  { telugu: "ల", translit: "la", group: "Other letters", word: "లడ్డు", wordTranslit: "Laddu", meaning: "Sweet treat" },
  { telugu: "ళ", translit: "La", group: "Other letters", word: "పళ్ళు", wordTranslit: "Pallu", meaning: "Fruits", note: "This sound is usually found in the middle of a word, like here." },
  { telugu: "వ", translit: "va", group: "Other letters", word: "వరి", wordTranslit: "Vari", meaning: "Rice (paddy)" },

  // ---------- ఊష్మాలు (Sibilants) ----------
  { telugu: "శ", translit: "sha", group: "Other letters", word: "శంఖం", wordTranslit: "Shankham", meaning: "Conch shell" },
  { telugu: "ష", translit: "Sha", group: "Other letters", word: "షర్టు", wordTranslit: "Shirt", meaning: "Shirt" },
  { telugu: "స", translit: "sa", group: "Other letters", word: "సముద్రం", wordTranslit: "Samudram", meaning: "Ocean" },
  { telugu: "హ", translit: "ha", group: "Other letters", word: "హంస", wordTranslit: "Hamsa", meaning: "Swan" },

  // ---------- Special conjunct letter, traditionally taught with the alphabet ----------
  { telugu: "క్ష", translit: "ksha", group: "Other letters", word: "క్షీరం", wordTranslit: "Ksheeram", meaning: "Milk" },
];

// Attach a stable index/id to every letter (used for progress tracking keys).
LETTERS.forEach((l, i) => { l.id = i; });
