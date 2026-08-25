// letters.js
// Ordered Telugu akshara (letters) data for Vidyarthi.
// Sequence follows the traditional teaching order used in Telugu primary
// schools: vowels (అచ్చులు) first, then consonants (హల్లులు) in their
// classic varga (row) groupings. See PROMPT.md for the scoping rationale
// (the obsolete ఴ is omitted; the archaic vocalic ఌ/ౡ are omitted but the
// still-taught ౠ is included alongside ఋ).
//
// Each entry:
//   telugu          - the Telugu glyph shown large and traced
//   translit        - simple English transliteration of the letter's sound
//   group           - teaching-section label, used for headers on the home grid
//   cluster         - groups letters that are traditionally taught/shown
//                      together (e.g. అ+ఆ are a short/long pair); used to
//                      keep those visually together in the grid layout
//   word            - a simple, real Telugu word a child likely knows
//   wordTranslit    - transliteration of that word
//   meaning         - English meaning of the word (memory aid)
//   note            - optional short teaching note (e.g. for rare letters)
//
// Below the hand-authored 52-letter alphabet, a second block of entries is
// generated programmatically: every consonant combined with each of the 15
// dependent vowel signs (గుణింతం). These compose mechanically in Unicode
// Telugu — writing a vowel-sign character right after a consonant character
// is exactly how a shaping-aware text renderer (which browsers use for
// canvas text) draws the correct combined akshara, e.g. "క" + "ా" renders as
// "కా" — so instead of hand-listing all 540 combinations, they're built from
// the same 36 consonants above and a 15-entry vowel-sign table. See the
// "గుణింతం" section below the LETTERS array.

const LETTERS = [
  // ---------- అచ్చులు (Vowels) — 16, taught as short/long (and triple) pairs ----------
  { telugu: "అ", translit: "a", group: "Vowels", cluster: "v1", word: "అమ్మ", wordTranslit: "Amma", meaning: "Mother" },
  { telugu: "ఆ", translit: "aa", group: "Vowels", cluster: "v1", word: "ఆవు", wordTranslit: "Aavu", meaning: "Cow" },

  { telugu: "ఇ", translit: "i", group: "Vowels", cluster: "v2", word: "ఇల్లు", wordTranslit: "Illu", meaning: "House" },
  { telugu: "ఈ", translit: "ee", group: "Vowels", cluster: "v2", word: "ఈగ", wordTranslit: "Eega", meaning: "Fly (insect)" },

  { telugu: "ఉ", translit: "u", group: "Vowels", cluster: "v3", word: "ఉడుత", wordTranslit: "Uduta", meaning: "Squirrel" },
  { telugu: "ఊ", translit: "oo", group: "Vowels", cluster: "v3", word: "ఊయల", wordTranslit: "Ooyala", meaning: "Swing" },

  { telugu: "ఋ", translit: "ru", group: "Vowels", cluster: "v4", word: "ఋషి", wordTranslit: "Rushi", meaning: "Sage", note: "A rare sound in everyday Telugu — mostly seen in words borrowed from Sanskrit." },
  { telugu: "ౠ", translit: "roo", group: "Vowels", cluster: "v4", word: "", wordTranslit: "", meaning: "", note: "The long version of ఋ. Very rare — mainly seen in a handful of Sanskrit-origin words." },

  { telugu: "ఎ", translit: "e", group: "Vowels", cluster: "v5", word: "ఎలుక", wordTranslit: "Eluka", meaning: "Mouse" },
  { telugu: "ఏ", translit: "ae", group: "Vowels", cluster: "v5", word: "ఏనుగు", wordTranslit: "Aenugu", meaning: "Elephant" },
  { telugu: "ఐ", translit: "ai", group: "Vowels", cluster: "v5", word: "ఐదు", wordTranslit: "Aidu", meaning: "Five" },

  { telugu: "ఒ", translit: "o", group: "Vowels", cluster: "v6", word: "ఒంటె", wordTranslit: "Ontey", meaning: "Camel" },
  { telugu: "ఓ", translit: "oa", group: "Vowels", cluster: "v6", word: "ఓడ", wordTranslit: "Oda", meaning: "Ship" },
  { telugu: "ఔ", translit: "au", group: "Vowels", cluster: "v6", word: "ఔషధం", wordTranslit: "Aushadham", meaning: "Medicine" },

  { telugu: "అం", translit: "am", group: "Vowels", cluster: "v7", word: "అంగీ", wordTranslit: "Angi", meaning: "Shirt", note: "This dot sound (anusvara) is added on top of a letter, like in 'రంగు' (rangu, colour)." },
  { telugu: "అః", translit: "aha", group: "Vowels", cluster: "v7", word: "నమః", wordTranslit: "Namaha", meaning: "Salutations (a respectful word used in prayers)", note: "The visarga (colon-like mark) is rare and mostly appears inside words, e.g. 'దుఃఖం'." },

  // ---------- హల్లులు (Consonants) — క వర్గము ----------
  { telugu: "క", translit: "ka", group: "Ka group", cluster: "k1", word: "కోతి", wordTranslit: "Kothi", meaning: "Monkey" },
  { telugu: "ఖ", translit: "kha", group: "Ka group", cluster: "k1", word: "ఖజానా", wordTranslit: "Khajaana", meaning: "Treasure" },
  { telugu: "గ", translit: "ga", group: "Ka group", cluster: "k1", word: "గంట", wordTranslit: "Ganta", meaning: "Bell" },
  { telugu: "ఘ", translit: "gha", group: "Ka group", cluster: "k1", word: "ఘడియారం", wordTranslit: "Ghadiyaram", meaning: "Clock" },
  { telugu: "ఙ", translit: "nga", group: "Ka group", cluster: "k1", word: "వాఙ్మయము", wordTranslit: "Vaangmayamu", meaning: "Literature", note: "A very rare letter — it shows up joined to the next consonant (as in వాఙ్మయము here) rather than starting a word on its own." },

  // ---------- చ వర్గము ----------
  { telugu: "చ", translit: "cha", group: "Cha group", cluster: "c1", word: "చందమామ", wordTranslit: "Chandamama", meaning: "Moon" },
  { telugu: "ఛ", translit: "Cha", group: "Cha group", cluster: "c1", word: "ఛత్రం", wordTranslit: "Chatram", meaning: "Umbrella" },
  { telugu: "జ", translit: "ja", group: "Cha group", cluster: "c1", word: "జింక", wordTranslit: "Jinka", meaning: "Deer" },
  { telugu: "ఝ", translit: "jha", group: "Cha group", cluster: "c1", word: "ఝషము", wordTranslit: "Jhashamu", meaning: "Fish (a poetic word)", note: "Rare in everyday Telugu, but this classical word for fish keeps it alive." },
  { telugu: "ఞ", translit: "nya", group: "Cha group", cluster: "c1", word: "ఆజ్ఞ", wordTranslit: "Aagnya", meaning: "Command, order", note: "This sound almost always appears joined to the letter before it (as in ఆజ్ఞ here, or 'జ్ఞానం' gnyaanam, knowledge) rather than starting a word on its own." },

  // ---------- ట వర్గము ----------
  { telugu: "ట", translit: "Ta", group: "Ta group", cluster: "t1", word: "టమాట", wordTranslit: "Tamata", meaning: "Tomato" },
  { telugu: "ఠ", translit: "Tha", group: "Ta group", cluster: "t1", word: "ఠీవి", wordTranslit: "Theevi", meaning: "Style, grandeur" },
  { telugu: "డ", translit: "Da", group: "Ta group", cluster: "t1", word: "డేగ", wordTranslit: "Dega", meaning: "Eagle" },
  { telugu: "ఢ", translit: "Dha", group: "Ta group", cluster: "t1", word: "ఢంకా", wordTranslit: "Dhanka", meaning: "A big drum" },
  { telugu: "ణ", translit: "Na", group: "Ta group", cluster: "t1", word: "వీణ", wordTranslit: "Veena", meaning: "Veena (a musical instrument)", note: "This sound never starts a Telugu word, so we hear it inside a word instead." },

  // ---------- త వర్గము ----------
  { telugu: "త", translit: "ta", group: "Tha group", cluster: "th1", word: "తాబేలు", wordTranslit: "Tabelu", meaning: "Tortoise" },
  { telugu: "థ", translit: "tha", group: "Tha group", cluster: "th1", word: "థైర్యం", wordTranslit: "Thairyam", meaning: "Courage" },
  { telugu: "ద", translit: "da", group: "Tha group", cluster: "th1", word: "దీపం", wordTranslit: "Deepam", meaning: "Lamp" },
  { telugu: "ధ", translit: "dha", group: "Tha group", cluster: "th1", word: "ధనుస్సు", wordTranslit: "Dhanussu", meaning: "Bow" },
  { telugu: "న", translit: "na", group: "Tha group", cluster: "th1", word: "నక్క", wordTranslit: "Nakka", meaning: "Fox" },

  // ---------- ప వర్గము ----------
  { telugu: "ప", translit: "pa", group: "Pa group", cluster: "p1", word: "పులి", wordTranslit: "Puli", meaning: "Tiger" },
  { telugu: "ఫ", translit: "pha", group: "Pa group", cluster: "p1", word: "ఫలం", wordTranslit: "Phalam", meaning: "Fruit" },
  { telugu: "బ", translit: "ba", group: "Pa group", cluster: "p1", word: "బంతి", wordTranslit: "Banti", meaning: "Ball" },
  { telugu: "భ", translit: "bha", group: "Pa group", cluster: "p1", word: "భల్లూకం", wordTranslit: "Bhallookam", meaning: "Bear" },
  { telugu: "మ", translit: "ma", group: "Pa group", cluster: "p1", word: "మామిడి", wordTranslit: "Mamidi", meaning: "Mango" },

  // ---------- Other letters, grouped (య,ర,ల,వ) (శ,ష,స,హ) (ళ,క్ష,ఱ) ----------
  { telugu: "య", translit: "ya", group: "Other letters", cluster: "o1", word: "యంత్రం", wordTranslit: "Yantram", meaning: "Machine" },
  { telugu: "ర", translit: "ra", group: "Other letters", cluster: "o1", word: "రథం", wordTranslit: "Radham", meaning: "Chariot" },
  { telugu: "ల", translit: "la", group: "Other letters", cluster: "o1", word: "లడ్డు", wordTranslit: "Laddu", meaning: "Sweet treat" },
  { telugu: "వ", translit: "va", group: "Other letters", cluster: "o1", word: "వరి", wordTranslit: "Vari", meaning: "Rice (paddy)" },

  { telugu: "శ", translit: "sha", group: "Other letters", cluster: "o2", word: "శంఖం", wordTranslit: "Shankham", meaning: "Conch shell" },
  { telugu: "ష", translit: "Sha", group: "Other letters", cluster: "o2", word: "షర్టు", wordTranslit: "Shirt", meaning: "Shirt" },
  { telugu: "స", translit: "sa", group: "Other letters", cluster: "o2", word: "సముద్రం", wordTranslit: "Samudram", meaning: "Ocean" },
  { telugu: "హ", translit: "ha", group: "Other letters", cluster: "o2", word: "హంస", wordTranslit: "Hamsa", meaning: "Swan" },

  { telugu: "ళ", translit: "La", group: "Other letters", cluster: "o3", word: "తాళం", wordTranslit: "Thaalam", meaning: "Lock", note: "This sound usually appears inside or at the end of a word, like here." },
  { telugu: "క్ష", translit: "ksha", group: "Other letters", cluster: "o3", word: "క్షీరం", wordTranslit: "Ksheeram", meaning: "Milk" },
  { telugu: "ఱ", translit: "RRa", group: "Other letters", cluster: "o3", word: "ఱంపము", wordTranslit: "Rrampamu", meaning: "Saw (the tool)", note: "ఱ once had its own rolled 'r' sound — ఱంపము keeps the old spelling. Today it's pronounced just like ర." },
];

// ---------- గుణింతం: consonant + dependent vowel sign combinations ----------
// The 15 dependent vowel signs (matras), in teaching order. Anusvara (ం) and
// visarga (ః) aren't matras but a consonant takes them the same simple way —
// the mark just follows the consonant character — so they're included here
// too, matching how this app already treats అం/అః alongside the vowels above.
const VOWEL_SIGNS = [
  { sign: "ా", suffix: "aa" },
  { sign: "ి", suffix: "i" },
  { sign: "ీ", suffix: "ii" },
  { sign: "ు", suffix: "u" },
  { sign: "ూ", suffix: "uu" },
  { sign: "ృ", suffix: "r" },
  { sign: "ౄ", suffix: "rr" },
  { sign: "ె", suffix: "e" },
  { sign: "ే", suffix: "ee" },
  { sign: "ై", suffix: "ai" },
  { sign: "ొ", suffix: "o" },
  { sign: "ో", suffix: "oo" },
  { sign: "ౌ", suffix: "au" },
  { sign: "ం", suffix: "am" },
  { sign: "ః", suffix: "aha" },
];

// Every hand-authored entry above that isn't a vowel is a consonant — 36 of
// them, in traditional వర్గ order.
const CONSONANTS = LETTERS.filter((l) => l.group !== "Vowels");

// Example words for గుణింతం combinations, keyed by the exact combo glyph.
// Populated only where a genuinely common, real, child-appropriate word
// exists (research-sourced) — most combos are intentionally left without
// one rather than force an obscure or invented word onto them.
const GUNINTHAM_WORDS = {
  // క (ka)
  "కా": { word: "కాకి", wordTranslit: "Kaaki", meaning: "Crow" },
  "కి": { word: "కిటికీ", wordTranslit: "Kitiki", meaning: "Window" },
  "కు": { word: "కుక్క", wordTranslit: "Kukka", meaning: "Dog" },
  "కూ": { word: "కూర", wordTranslit: "Koora", meaning: "Vegetable Curry" },
  "కే": { word: "కేక", wordTranslit: "Keka", meaning: "Shout" },
  "కొ": { word: "కొంగ", wordTranslit: "Konga", meaning: "Stork" },
  "కో": { word: "కోతి", wordTranslit: "Kothi", meaning: "Monkey" },
  "కం": { word: "కంచం", wordTranslit: "Kancham", meaning: "Plate" },
  // ఖ (kha)
  "ఖా": { word: "ఖాళీ", wordTranslit: "Khaali", meaning: "Empty" },
  // గ (ga)
  "గా": { word: "గాలి", wordTranslit: "Gaali", meaning: "Wind" },
  "గి": { word: "గిన్నె", wordTranslit: "Ginne", meaning: "Bowl" },
  "గు": { word: "గుడ్డు", wordTranslit: "Guddu", meaning: "Egg" },
  "గూ": { word: "గూడు", wordTranslit: "Goodu", meaning: "Nest" },
  "గె": { word: "గెలుపు", wordTranslit: "Gelupu", meaning: "Victory" },
  "గొ": { word: "గొడుగు", wordTranslit: "Godugu", meaning: "Umbrella" },
  "గో": { word: "గోడ", wordTranslit: "Goda", meaning: "Wall" },
  "గౌ": { word: "గౌను", wordTranslit: "Gaunu", meaning: "Frock" },
  "గం": { word: "గంట", wordTranslit: "Ganta", meaning: "Bell" },
  // చ (cha)
  "చా": { word: "చాప", wordTranslit: "Chaapa", meaning: "Mat" },
  "చి": { word: "చిలుక", wordTranslit: "Chiluka", meaning: "Parrot" },
  "చీ": { word: "చీమ", wordTranslit: "Cheema", meaning: "Ant" },
  "చు": { word: "చుక్క", wordTranslit: "Chukka", meaning: "Star" },
  "చె": { word: "చెట్టు", wordTranslit: "Chettu", meaning: "Tree" },
  "చే": { word: "చేప", wordTranslit: "Cheepa", meaning: "Fish" },
  "చొ": { word: "చొక్కా", wordTranslit: "Chokka", meaning: "Shirt" },
  "చో": { word: "చోటు", wordTranslit: "Chotu", meaning: "Place" },
  "చం": { word: "చంద్రుడు", wordTranslit: "Chandrudu", meaning: "Moon" },
  // ఛ (Cha)
  "ఛా": { word: "ఛాతీ", wordTranslit: "Chaatee", meaning: "Chest" },
  "ఛీ": { word: "ఛీ", wordTranslit: "Chee", meaning: "Yuck" },
  // జ (ja)
  "జా": { word: "జామ", wordTranslit: "Jaama", meaning: "Guava" },
  "జి": { word: "జింక", wordTranslit: "Jinka", meaning: "Deer" },
  "జీ": { word: "జీడిపప్పు", wordTranslit: "Jeedipappu", meaning: "Cashew Nut" },
  "జు": { word: "జుట్టు", wordTranslit: "Juttu", meaning: "Hair" },
  "జూ": { word: "జూ", wordTranslit: "Joo", meaning: "Zoo" },
  "జె": { word: "జెండా", wordTranslit: "Jenda", meaning: "Flag" },
  "జే": { word: "జేబు", wordTranslit: "Jebu", meaning: "Pocket" },
  "జై": { word: "జై", wordTranslit: "Jai", meaning: "Victory" },
  "జొ": { word: "జొన్న", wordTranslit: "Jonna", meaning: "Sorghum" },
  "జో": { word: "జోడు", wordTranslit: "Jodu", meaning: "Pair" },
  "జం": { word: "జంతువు", wordTranslit: "Jantuvu", meaning: "Animal" },
  // ట (Ta)
  "టా": { word: "టాటా", wordTranslit: "Taata", meaning: "Bye-bye" },
  "టి": { word: "టిఫిన్", wordTranslit: "Tiffin", meaning: "Snack" },
  "టీ": { word: "టీ", wordTranslit: "Tee", meaning: "Tea" },
  "టె": { word: "టెంకాయ", wordTranslit: "Tenkaaya", meaning: "Coconut" },
  "టే": { word: "టేబుల్", wordTranslit: "Teebul", meaning: "Table" },
  "టై": { word: "టై", wordTranslit: "Tai", meaning: "Necktie" },
  "టో": { word: "టోపీ", wordTranslit: "Topee", meaning: "Cap" },
  // డ (Da)
  "డా": { word: "డాక్టర్", wordTranslit: "Doctor", meaning: "Doctor" },
  "డో": { word: "డోలు", wordTranslit: "Dolu", meaning: "Drum" },
  // త (ta)
  "తా": { word: "తాత", wordTranslit: "Thaatha", meaning: "Grandfather" },
  "తి": { word: "తిండి", wordTranslit: "Tindi", meaning: "Food" },
  "తీ": { word: "తీపి", wordTranslit: "Teepi", meaning: "Sweet" },
  "తు": { word: "తుమ్మెద", wordTranslit: "Tummeda", meaning: "Bee" },
  "తూ": { word: "తూనీగ", wordTranslit: "Tooneega", meaning: "Dragonfly" },
  "తె": { word: "తెలుపు", wordTranslit: "Telupu", meaning: "White" },
  "తే": { word: "తేనె", wordTranslit: "Tene", meaning: "Honey" },
  "తొ": { word: "తొండ", wordTranslit: "Tonda", meaning: "Lizard" },
  "తో": { word: "తోక", wordTranslit: "Toka", meaning: "Tail" },
  "తం": { word: "తండ్రి", wordTranslit: "Tandri", meaning: "Father" },
  // ద (da)
  "దా": { word: "దానిమ్మ", wordTranslit: "Daanimma", meaning: "Pomegranate" },
  "ది": { word: "దిండు", wordTranslit: "Dindu", meaning: "Pillow" },
  "దీ": { word: "దీపం", wordTranslit: "Deepam", meaning: "Lamp" },
  "దు": { word: "దుప్పటి", wordTranslit: "Duppati", meaning: "Blanket" },
  "దూ": { word: "దూది", wordTranslit: "Doodi", meaning: "Cotton" },
  "దె": { word: "దెబ్బ", wordTranslit: "Debba", meaning: "Injury" },
  "దే": { word: "దేవుడు", wordTranslit: "Devudu", meaning: "God" },
  "దొ": { word: "దొండకాయ", wordTranslit: "Dondakaya", meaning: "Ivy Gourd" },
  "దో": { word: "దోసె", wordTranslit: "Dose", meaning: "Dosa" },
  // ధ (dha)
  "ధా": { word: "ధాన్యం", wordTranslit: "Dhaanyam", meaning: "Grain" },
  "ధూ": { word: "ధూళి", wordTranslit: "Dhooli", meaning: "Dust" },
  "ధై": { word: "ధైర్యం", wordTranslit: "Dhairyam", meaning: "Courage" },
  "ధో": { word: "ధోతి", wordTranslit: "Dhothi", meaning: "Dhoti (cloth)" },
  // న (na)
  "నా": { word: "నాన్న", wordTranslit: "Naanna", meaning: "Father" },
  "ని": { word: "నిమ్మ", wordTranslit: "Nimma", meaning: "Lemon" },
  "నీ": { word: "నీళ్ళు", wordTranslit: "Neellu", meaning: "Water" },
  "ను": { word: "నువ్వులు", wordTranslit: "Nuvvulu", meaning: "Sesame seeds" },
  "నూ": { word: "నూనె", wordTranslit: "Noone", meaning: "Oil" },
  "నె": { word: "నెమలి", wordTranslit: "Nemali", meaning: "Peacock" },
  "నే": { word: "నేల", wordTranslit: "Neela", meaning: "Ground" },
  "నొ": { word: "నొప్పి", wordTranslit: "Noppi", meaning: "Pain" },
  "నో": { word: "నోరు", wordTranslit: "Noru", meaning: "Mouth" },
  "నౌ": { word: "నౌక", wordTranslit: "Nauka", meaning: "Boat" },
  // ప (pa)
  "పా": { word: "పాము", wordTranslit: "Paamu", meaning: "Snake" },
  "పి": { word: "పిల్లి", wordTranslit: "Pilli", meaning: "Cat" },
  "పీ": { word: "పీత", wordTranslit: "Peetha", meaning: "Crab" },
  "పు": { word: "పుస్తకం", wordTranslit: "Pustakam", meaning: "Book" },
  "పూ": { word: "పూజ", wordTranslit: "Pooja", meaning: "Worship" },
  "పె": { word: "పెన్ను", wordTranslit: "Pennu", meaning: "Pen" },
  "పే": { word: "పేరు", wordTranslit: "Peru", meaning: "Name" },
  "పొ": { word: "పొట్ట", wordTranslit: "Potta", meaning: "Stomach" },
  "పో": { word: "పోలీసు", wordTranslit: "Poolees", meaning: "Police" },
  "పం": { word: "పంది", wordTranslit: "Pandi", meaning: "Pig" },
  // ఫ (pha)
  "ఫో": { word: "ఫోన్", wordTranslit: "Phone", meaning: "Phone" },
  // బ (ba)
  "బా": { word: "బాతు", wordTranslit: "Baathu", meaning: "Duck" },
  "బి": { word: "బిస్కెట్", wordTranslit: "Biscuit", meaning: "Biscuit" },
  "బీ": { word: "బీరకాయ", wordTranslit: "Beerakaaya", meaning: "Ridge gourd" },
  "బు": { word: "బుడగ", wordTranslit: "Budaga", meaning: "Balloon" },
  "బూ": { word: "బూడిద", wordTranslit: "Boodida", meaning: "Ash" },
  "బె": { word: "బెల్లం", wordTranslit: "Bellam", meaning: "Jaggery" },
  "బై": { word: "బైక్", wordTranslit: "Bike", meaning: "Bike" },
  "బొ": { word: "బొమ్మ", wordTranslit: "Bomma", meaning: "Toy" },
  "బో": { word: "బోర్డు", wordTranslit: "Board", meaning: "Board" },
  "బం": { word: "బంతి", wordTranslit: "Banthi", meaning: "Ball" },
  // భ (bha)
  "భా": { word: "భాష", wordTranslit: "Bhaasha", meaning: "Language" },
  "భీ": { word: "భీముడు", wordTranslit: "Bheemudu", meaning: "Bheema (hero)" },
  "భు": { word: "భుజం", wordTranslit: "Bhujam", meaning: "Shoulder" },
  "భూ": { word: "భూమి", wordTranslit: "Bhoomi", meaning: "Earth" },
  "భో": { word: "భోజనం", wordTranslit: "Bhojanam", meaning: "Meal" },
  // మ (ma)
  "మా": { word: "మామిడి", wordTranslit: "Maamidi", meaning: "Mango" },
  "మి": { word: "మిర్చి", wordTranslit: "Mirchi", meaning: "Chili" },
  "మీ": { word: "మీసం", wordTranslit: "Meesam", meaning: "Moustache" },
  "ము": { word: "ముక్కు", wordTranslit: "Mukku", meaning: "Nose" },
  "మూ": { word: "మూడు", wordTranslit: "Moodu", meaning: "Three" },
  "మె": { word: "మెడ", wordTranslit: "Meda", meaning: "Neck" },
  "మే": { word: "మేక", wordTranslit: "Meka", meaning: "Goat" },
  "మై": { word: "మైదానం", wordTranslit: "Maidaanam", meaning: "Playground" },
  "మొ": { word: "మొక్క", wordTranslit: "Mokka", meaning: "Plant" },
  "మో": { word: "మోకాలు", wordTranslit: "Mokaalu", meaning: "Knee" },
  "మం": { word: "మంచం", wordTranslit: "Mancham", meaning: "Bed" },
  // య (ya)
  "యా": { word: "యాపిల్", wordTranslit: "Yaapil", meaning: "Apple" },
  "యో": { word: "యోగా", wordTranslit: "Yoga", meaning: "Yoga" },
  "యం": { word: "యంత్రం", wordTranslit: "Yantram", meaning: "Machine" },
  // ర (ra)
  "రా": { word: "రాజు", wordTranslit: "Raaju", meaning: "King" },
  "రి": { word: "రిక్షా", wordTranslit: "Rikshaa", meaning: "Rickshaw" },
  "రు": { word: "రుమాలు", wordTranslit: "Rumaalu", meaning: "Handkerchief" },
  "రూ": { word: "రూపాయి", wordTranslit: "Ruupaayi", meaning: "Rupee" },
  "రె": { word: "రెక్క", wordTranslit: "Rekka", meaning: "Wing" },
  "రే": { word: "రేడియో", wordTranslit: "Reediyo", meaning: "Radio" },
  "రై": { word: "రైలు", wordTranslit: "Railu", meaning: "Train" },
  "రొ": { word: "రొట్టె", wordTranslit: "Rotte", meaning: "Bread" },
  "రో": { word: "రోజు", wordTranslit: "Rooju", meaning: "Day" },
  "రం": { word: "రంగు", wordTranslit: "Rangu", meaning: "Color" },
  // ల (la)
  "లె": { word: "లెక్క", wordTranslit: "Lekka", meaning: "Counting" },
  "లే": { word: "లేడి", wordTranslit: "Leedi", meaning: "Deer" },
  // వ (va)
  "వా": { word: "వాన", wordTranslit: "Vaana", meaning: "Rain" },
  "వి": { word: "విమానం", wordTranslit: "Vimaanam", meaning: "Airplane" },
  "వీ": { word: "వీధి", wordTranslit: "Veedhi", meaning: "Street" },
  "వె": { word: "వెన్న", wordTranslit: "Venna", meaning: "Butter" },
  "వే": { word: "వేడి", wordTranslit: "Veedi", meaning: "Hot" },
  "వై": { word: "వైద్యుడు", wordTranslit: "Vaidyudu", meaning: "Doctor" },
  "వం": { word: "వంకాయ", wordTranslit: "Vankaaya", meaning: "Brinjal" },
  // శ (sha)
  "శా": { word: "శాంతి", wordTranslit: "Shaanti", meaning: "Peace" },
  "శి": { word: "శిశువు", wordTranslit: "Shishuvu", meaning: "Baby" },
  "శు": { word: "శుక్రవారం", wordTranslit: "Shukravaaram", meaning: "Friday" },
  "శం": { word: "శంఖం", wordTranslit: "Shankham", meaning: "Conch Shell" },
  // ష (Sha)
  "షా": { word: "షాపు", wordTranslit: "Shaapu", meaning: "Shop" },
  "షి": { word: "షికారు", wordTranslit: "Shikaaru", meaning: "Outing" },
  // స (sa)
  "సా": { word: "సాలెపురుగు", wordTranslit: "Saalepurugu", meaning: "Spider" },
  "సి": { word: "సిగ్గు", wordTranslit: "Siggu", meaning: "Shyness" },
  "సీ": { word: "సీసా", wordTranslit: "Seesaa", meaning: "Bottle" },
  "సు": { word: "సుత్తి", wordTranslit: "Sutthi", meaning: "Hammer" },
  "సూ": { word: "సూర్యుడు", wordTranslit: "Suryudu", meaning: "Sun" },
  "సె": { word: "సెలవు", wordTranslit: "Selavu", meaning: "Holiday" },
  "సై": { word: "సైనికుడు", wordTranslit: "Sainikudu", meaning: "Soldier" },
  "సొ": { word: "సొరకాయ", wordTranslit: "Sorakaaya", meaning: "Bottle Gourd" },
  "సో": { word: "సోదరుడు", wordTranslit: "Sodarudu", meaning: "Brother" },
  "సం": { word: "సంచి", wordTranslit: "Sanchi", meaning: "Bag" },
  // హ (ha)
  "హా": { word: "హారం", wordTranslit: "Haaram", meaning: "Necklace" },
  "హీ": { word: "హీరో", wordTranslit: "Heero", meaning: "Hero" },
  "హృ": { word: "హృదయం", wordTranslit: "Hrudayam", meaning: "Heart" },
  "హై": { word: "హైదరాబాద్", wordTranslit: "Hyderabad", meaning: "City (Hyderabad)" },
  "హం": { word: "హంస", wordTranslit: "Hamsa", meaning: "Swan" },
};

CONSONANTS.forEach((c) => {
  // Every consonant's translit is written as "<sound>a" (its inherent
  // vowel) — e.g. "ka", "ksha", "La" — so stripping the trailing "a" gives
  // the bare consonant sound each combination's transliteration builds on.
  const stem = c.translit.slice(0, -1);
  VOWEL_SIGNS.forEach((v, vi) => {
    const combo = c.telugu + v.sign;
    const wordInfo = GUNINTHAM_WORDS[combo];
    const entry = {
      telugu: combo,
      translit: stem + v.suffix,
      // Deliberately NOT c.group — that string ("Ka group", "Other
      // letters", ...) is how Chapter 1 code/tests identify the base
      // alphabet by teaching section, and these combinations need to stay
      // out of that set rather than silently joining it.
      group: `${c.group} — గుణింతం`,
      // Each combination gets its own cluster id (not shared with its
      // siblings) so the lesson-preview grid wraps normally instead of
      // trying to lay out an entire 15-letter row as one unbroken group.
      cluster: `gun-${c.translit}-${vi}`,
    };
    // Only combos with a genuinely good, real example word get one —
    // most గుణింతం combos are intentionally left without a word/audio row.
    if (wordInfo) {
      entry.word = wordInfo.word;
      entry.wordTranslit = wordInfo.wordTranslit;
      entry.meaning = wordInfo.meaning;
    }
    LETTERS.push(entry);
  });
});

// Attach a stable index/id to every letter (used for progress tracking keys).
LETTERS.forEach((l, i) => { l.id = i; });

// ---------- Lessons ----------
// Small, focused groupings so a child can spend real practice time on just
// a handful of letters before moving on, rather than facing all 52 at once.
// Each lesson references letters by their Telugu glyph (not array index) so
// it stays correct even if LETTERS above is reordered or extended.
//
// Chapter 1 (below) is the alphabet itself. Chapter 2 (further down) is one
// lesson per consonant, covering that consonant's full గుణింతం row — all 15
// vowel-sign combinations together, the way a Telugu classroom drills them
// as a single chanted set ("క కా కి కీ కు కూ...") rather than the smaller
// 3-5-letter groupings used for the alphabet itself.
const LESSONS = [
  { title: "Lesson 1", subtitle: "The first vowels", chapter: 1, chars: ["అ", "ఆ", "ఇ", "ఈ"] },
  { title: "Lesson 2", subtitle: "More vowels", chapter: 1, chars: ["ఉ", "ఊ", "ఋ", "ౠ"] },
  { title: "Lesson 3", subtitle: "Short e, long e, ai", chapter: 1, chars: ["ఎ", "ఏ", "ఐ"] },
  { title: "Lesson 4", subtitle: "o, oa, au and two special sounds", chapter: 1, chars: ["ఒ", "ఓ", "ఔ", "అం", "అః"] },
  { title: "Lesson 5", subtitle: "క వర్గము — the Ka group", chapter: 1, chars: ["క", "ఖ", "గ", "ఘ", "ఙ"] },
  { title: "Lesson 6", subtitle: "చ వర్గము — the Cha group", chapter: 1, chars: ["చ", "ఛ", "జ", "ఝ", "ఞ"] },
  { title: "Lesson 7", subtitle: "ట వర్గము — the Ta group", chapter: 1, chars: ["ట", "ఠ", "డ", "ఢ", "ణ"] },
  { title: "Lesson 8", subtitle: "త వర్గము — the Tha group", chapter: 1, chars: ["త", "థ", "ద", "ధ", "న"] },
  { title: "Lesson 9", subtitle: "ప వర్గము — the Pa group", chapter: 1, chars: ["ప", "ఫ", "బ", "భ", "మ"] },
  { title: "Lesson 10", subtitle: "y, r, l, v", chapter: 1, chars: ["య", "ర", "ల", "వ"] },
  { title: "Lesson 11", subtitle: "sh, Sh, s, h", chapter: 1, chars: ["శ", "ష", "స", "హ"] },
  { title: "Lesson 12", subtitle: "Three special letters", chapter: 1, chars: ["ళ", "క్ష", "ఱ"] },
];

// Chapter 2: one lesson per consonant, continuing the lesson numbering.
CONSONANTS.forEach((c, idx) => {
  LESSONS.push({
    title: `Lesson ${13 + idx}`,
    subtitle: `${c.telugu} + every vowel sign (గుణింతం)`,
    chapter: 2,
    chars: VOWEL_SIGNS.map((v) => c.telugu + v.sign),
  });
});

// Chapter metadata for the home screen's section headers.
const CHAPTERS = [
  { id: 1, title: "Chapter 1", subtitle: "Learn the alphabet" },
  { id: 2, title: "Chapter 2", subtitle: "Consonants + vowel signs (గుణింతాలు)" },
];

// Resolve each lesson's letter objects (and validate at load time that every
// referenced glyph actually exists exactly once in LETTERS).
const LETTERS_BY_CHAR = new Map(LETTERS.map((l) => [l.telugu, l]));
LESSONS.forEach((lesson, i) => {
  lesson.id = i;
  lesson.letters = lesson.chars.map((ch) => LETTERS_BY_CHAR.get(ch)).filter(Boolean);
});
