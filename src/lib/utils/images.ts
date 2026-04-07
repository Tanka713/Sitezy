/**
 * Image URL utilities for Sitezy generation.
 *
 * Uses images.unsplash.com with curated photo IDs — free, no API key, reliable CDN.
 * URL format: https://images.unsplash.com/photo-{ID}?w={W}&h={H}&fit=crop&auto=format&q=80
 */

// ─── Curated photo banks per site type ───────────────────────────────────────
// Each entry: [id, role] where role hints at best usage

const PHOTO_BANK: Record<string, string[]> = {
  restaurant: [
    "1414235077428-338989a2e8c0", // food spread
    "1565299624946-b28f40a0ae38", // pizza
    "1504674900247-0877df9cc836", // food overhead
    "1547592180-85f173990554",    // burger
    "1565958011703-44f9829ba187", // pasta
    "1559847844-5315695dadae",    // steak
    "1484980859-702cfea06aba",    // sushi
    "1555396273-367ea4eb4db5",    // restaurant interior
    "1517248135467-4c7edcad34c4", // dining room
    "1466978913421-dad2ebd01d17", // restaurant bar
    "1577219491135-ce391730fb2c", // chef
    "1551218372-a8789b81b253",    // cooking
    "1567620905732-2d1ec7ab7445", // pancakes
    "1482049016688-2d3e1b311543", // avocado toast
    "1473093226795-af9932fe5856", // coffee and food
  ],
  cafe: [
    "1495474472287-4d8a9528e100", // latte art
    "1511920183353-b8f0b946c7b6", // coffee shop
    "1453614512568-2a1dc0cc6960", // espresso
    "1461023058943-07fcbe16d735", // coffee beans
    "1509042239860-f550ce710b93", // cappuccino
    "1442512595331-8f70b4c8cf2e", // cafe interior
    "1554118811-1e0d58224f24",    // minimalist cafe
    "1521017432531-fbd92d768814", // bookstore cafe
    "1504630083234-14187a9df0f5", // croissant
    "1600093463592-8e36ae95ef56", // pastry display
    "1556742049-0cfed4f6a45d",    // barista
    "1530126483408-aa533e55bdb2", // coffee pour
  ],
  gym: [
    "1534438327431-dec0bedf4c5a", // gym weights
    "1571019613454-1cb2f99b2d8b", // fitness workout
    "1581009137042-c6e72870b300", // gym interior
    "1517963879433-6ad2171073a9", // running
    "1549576490-b0an08bf2545",    // yoga
    "1483721310020-749a2ba9a438", // stretching
    "1526506118085-60ce8714f8c5", // weight training
    "1574680096145-d05b474e2155", // cycling
    "1541534741688-6078c087553f", // boxing
    "1593079831268-3381b0db4a77", // crossfit
    "1518611540400-6b85a1020be0", // athlete
    "1567598088908-fd9e46bc6784", // swimming
  ],
  agency: [
    "1460925895917-afdab827c52f", // tech workspace
    "1551434678-e076c223a692",    // modern office
    "1497366216548-37526070297c", // office open plan
    "1497366754035-f200581a7de2", // business meeting
    "1522071820081-009f0129c71c", // team collaboration
    "1557804506-669a67965ba0",    // creative workspace
    "1542744094-3a31f272c490",    // laptop design
    "1561070791-2526d30994b5",    // design mockup
    "1559136555-9303baea8eae",    // digital marketing
    "1600880292203-757bb62b31f7", // conference room
    "1573496359142-b8d87734a5a2", // diverse team
    "1553877522-43269d4ea984",    // startup team
  ],
  "personal brand": [
    "1507003211169-0a1dd7228f2d", // professional portrait male
    "1438761681033-6461ffad8d80", // professional portrait female
    "1500648767791-00dcc994a43e", // headshot male
    "1544005313-94ddf0286df2",    // headshot female
    "1560250097-0b93528c311a",    // speaker on stage
    "1517245386807-bb43f82c33c4", // writing/laptop
    "1499750310107-5fef28a66643", // working at desk
    "1454165804606-c3d57bc86b40", // professional desk setup
    "1524178232363-1fb2b075b655", // podcast/microphone
    "1531746020798-e6953c6e8e04", // entrepreneur
  ],
  portfolio: [
    "1558618666-fcd25c85cd64",    // creative art
    "1541701494-7e5bff7e0e09",    // architecture
    "1513519245088-8b91e1e9d6f5", // design tools
    "1572044162444-ad60f128bdea", // photography
    "1507003211169-0a1dd7228f2d", // portrait
    "1534351590666-13e3e96b5702", // minimal workspace
    "1468779036391-52341f60b55d", // film/camera
    "1547826039-a009523f8f62",    // graphic design
    "1432958576632-8a39f6b97dc7", // sculpture art
    "1485846234645-a62644f84728", // creative studio
  ],
  "saas startup": [
    "1460925895917-afdab827c52f", // tech workspace
    "1551434678-e076c223a692",    // modern office
    "1518770660439-4636190af475", // code on screen
    "1551288049-bebda4e38f71",    // data/analytics
    "1563986768609-322da13575f3", // dashboard
    "1485827404703-89b55fcc595e", // robot/AI
    "1504868584819-f8e8b4b6d7e3", // server/infrastructure
    "1516116216624-53ad0879edd5", // UI design
    "1543286386-713bdd548da4",    // mobile app
    "1467232004584-a241de8bcf5d", // startup team
    "1522202176988-66273c261211", // remote work
    "1531482615713-2afd69097998", // product demo
  ],
  event: [
    "1540575467537-4b8d1b6a831a", // conference
    "1492684223066-81342ee5ff30", // concert crowd
    "1501281668745-ae7f63297176", // festival
    "1511578314322-379afb496ed8", // wedding
    "1464366400600-ac60e524c0f0", // wedding reception
    "1530103862676-de8c9debad1d", // outdoor event
    "1506157786151-b8491531f063", // music stage
    "1531058020387-3be344556be6", // party
    "1519671282429-b7216b5b4a72", // gala dinner
    "1491438590914-bc09fcaaf77a", // conference keynote
  ],
  consultancy: [
    "1497366754035-f200581a7de2", // business meeting
    "1573497019940-1c28c88b4f3e", // professional woman
    "1507679799987-c73779587ccf", // handshake
    "1454165804606-c3d57bc86b40", // desk work
    "1600880292203-757bb62b31f7", // boardroom
    "1573496359142-b8d87734a5a2", // diverse professionals
    "1529400971008-f566de0e6dfc", // strategy whiteboard
    "1552664730-d307ca884978",    // presentation
    "1560179707-f14e90ef3623",    // analytics
    "1521791136064-7986c2920216", // business chart
  ],
  "real estate": [
    "1600585154340-be6161a56a0c", // luxury home exterior
    "1560448204-e02f11c3d0e2",    // modern interior
    "1512917774080-9991f1c4c750", // luxury apartment
    "1558618666-fcd25c85cd64",    // kitchen
    "1484154218962-a197022b5858", // living room
    "1502005097973-6a7082348e02", // bedroom
    "1564013799919-ab600027ffc6", // home exterior
    "1580587771525-78b9dba3b914", // pool
    "1449844908441-8d51a33b8a3e", // architecture detail
    "1486325212027-8081e485255e", // city apartment view
    "1613490493576-5942ae21c5e1", // modern kitchen
    "1600566753086-00f18fb6b3ea", // luxury interior
  ],
  ecommerce: [
    "1490481651871-ab68de25d43d", // fashion
    "1441986300917-64674bd600d8", // shopping
    "1523275335684-37898b6baf30", // watch product
    "1491553895911-0055eca6402d", // sneakers
    "1556742049-0cfed4f6a45d",    // lifestyle product
    "1512436991641-6745cae1c4cc", // clothing rack
    "1558769132-cb1aea421bd1",    // perfume product
    "1585386959984-a4155224a1ad", // beauty products
    "1560393464-5c69a73c5770",    // food product
    "1542291026-7eec264c27ff",    // shoes product
  ],
  "board game cafe": [
    "1606503825008-909a67e63c3d", // board games
    "1611329828782-dae3e8a69004", // playing cards
    "1585504842129-5e19e84d6e7c", // chess
    "1528819622765-d6bcf132f793", // friends playing games
    "1541544537050-8b5bdcbded94", // game night
    "1519501025264-65ba15a82390", // cafe social
    "1518611540400-6b85a1020be0", // group activity
    "1543443258-92b50b66b8a7",    // board game pieces
  ],
  dental: [
    "1606811971618-4486d14f3f99", // dental chair
    "1588776814546-1ffbb172ffc7", // dentist at work
    "1609840114035-3c981b782dfe", // dental tools
    "1598256519226-3ce5a0d3add3", // bright smile
    "1519864600265-abb23847ef2c", // dental exam
    "1576091160399-112ba8d25d1d", // healthcare office
    "1505751172876-fa1923c5c528", // medical team
    "1582750433449-648ed127bb54", // patient care
    "1551190822-a9333d879b1f",    // clinic reception
    "1516549655169-df83a0774514", // doctor smiling
  ],
  medical: [
    "1505751172876-fa1923c5c528", // medical team
    "1576091160399-112ba8d25d1d", // healthcare
    "1516549655169-df83a0774514", // doctor smiling
    "1582750433449-648ed127bb54", // patient care
    "1551190822-a9333d879b1f",    // clinic
    "1584820927498-cad076eecebe", // hospital corridor
    "1579684385127-1ef15d508118", // medical equipment
    "1559757175-5700dde675bc",    // health professional
    "1530026405845-4c22d7c71b26", // medical consultation
    "1512678080884-cfda6d40543c", // healthcare tech
  ],
  law: [
    "1589829545856-d10d557cf95f", // law books
    "1521587760801-5e62c86f0f84", // courtroom
    "1507003211169-0a1dd7228f2d", // professional portrait
    "1507679799987-c73779587ccf", // handshake
    "1450101499163-c8848c66ca85", // contract signing
    "1479142506502-19583a4c0b7c", // scales of justice
    "1454165804606-c3d57bc86b40", // desk with papers
    "1573496359142-b8d87734a5a2", // legal team
    "1560179707-f14e90ef3623",    // analytics/charts
    "1544717305-2782549b8p00",    // legal consultation
  ],
  salon: [
    "1560066984-138dafc5e6d0",    // hair salon
    "1522337360826-af23e6dfa4e8", // hair styling
    "1487412947147-5cebf100ffc2", // beauty salon
    "1519699047748-de8e457a634e", // hairstyle
    "1595476108010-09451bb85a8e", // barber
    "1503951914875-452162b0f3f1", // haircut
    "1521590832167-7bcbfaa6381f", // manicure
    "1516975080664-ed2fc6a32937", // beauty treatment
    "1562322140-8baeacacf3df",    // spa treatment
    "1457972729786-0411a3b2b626", // beauty products
  ],
  hotel: [
    "1566073771259-470de1bed1be", // hotel lobby
    "1520250497591-112b2b40a2f2", // hotel room
    "1584132967334-10e028bd69f7", // luxury hotel pool
    "1551882547-ff40c4a49fb7",    // hotel exterior
    "1571003123894-1ffe658b3a3c", // hotel bed
    "1542314831-068cd1dbfeeb",    // hotel reception
    "1530521954074-e0a103488d0d", // hotel restaurant
    "1506059612708-99d6d3db59f7", // hotel view
    "1563911302283-d2bc129e7570", // hotel suite
    "1580822184713-fc5400e7fe10", // luxury amenities
  ],
  spa: [
    "1544161515-4159fe1b8b6a",    // spa candles
    "1507652313519-a3aefb01fcee", // relaxation
    "1515377905703-c4788e51af15", // massage
    "1600334129128-685c5582fd35", // spa pool
    "1540555700478-4be289fbecef", // wellness
    "1519823551278-64ac92734fb1", // meditation
    "1602415628244-53e3b1a1af40", // beauty treatment
    "1561362573-65b87e57d94c",    // essential oils
    "1571902943202-507ec2618e8f", // facial treatment
    "1559498619-4c30c7c3c0f5",    // zen garden
  ],
  bakery: [
    "1509440159596-0249088772ff", // fresh bread
    "1464349153174-a9f91f729d5b", // pastries
    "1486427944299-d1955d23e34d", // cakes
    "1558961363-fa8fdf82db35",    // croissants
    "1549931319-a545dcf3bc73",    // donuts
    "1578985545062-70f463e48072", // cupcakes
    "1517433670267-08feff4c1d6a", // baking
    "1555507036-ab1f4038808a",    // bread loaves
    "1542826438-bd32f3fea12c",    // baker at work
    "1587241321921-91a834d6d191", // cinnamon rolls
  ],
  yoga: [
    "1544367654-a8ac57ceb7d9",    // yoga pose
    "1506126613408-eca07ce68773", // meditation
    "1524901548305-08eeddc35080", // yoga class
    "1599901860904-17e6ed7083a0", // stretching
    "1575052814086-f385e2e2ad1b", // yoga studio
    "1593811167562-9cef47bfc4a7", // mindfulness
    "1588286840104-8957b019727f", // yoga mat
    "1552196563-55cd4e45efb3",    // outdoor yoga
    "1545389336-cf090694435e",    // breathing exercise
    "1517836357463-d25dfeac3438", // fitness wellness
  ],
  education: [
    "1509062522246-3755977927d5", // classroom
    "1524178232363-1fb2b075b655", // lecture
    "1580582932707-520aed937b7b", // students studying
    "1427504494785-3a9ca7044f45", // books
    "1488190211105-4a88e40a3b6c", // graduation
    "1456513080510-7bf3a84b82f8", // library
    "1503676260728-1c00da094a0b", // campus
    "1544531586-fde5298cdd40",    // online learning
    "1596495578065-6e0763fa1178", // school building
    "1520333789090-1afc82db536a", // teacher
  ],
  photography: [
    "1452587974818-fa1c828a6cd8", // camera
    "1503023345310-164a519b9f07", // photographer
    "1478369402113-1fd47c7f4e7b", // photo shoot
    "1516035069371-29a1b244cc32", // camera equipment
    "1554048612-b6a482bc67e5",    // photography studio
    "1500051638674-ff996a0c29ad", // portrait session
    "1495385819049-e4734ca42aa9", // landscape photography
    "1568602471122-7832951cc4c3", // photo editing
    "1493863641943-9b68992a8d07", // wedding photography
    "1476842634003-7dcca8f832de", // street photography
  ],
  construction: [
    "1504307651254-35680f356dfd", // construction site
    "1558618666-fcd25c85cd64",    // architecture
    "1541888946425-d81bb19240f5", // building
    "1464746133101-a2c3f88e0dd9", // construction workers
    "1486325212027-8081e485255e", // blueprint/plans
    "1503387762-592deb58ef4e",    // crane
    "1507721999472-8ed4421c4af2", // tools
    "1517694712202-14dd9538aa97", // interior construction
    "1521141700264-80de7b21e4f0", // renovation
    "1426604966848-d7adac402bff", // architecture exterior
  ],
  automotive: [
    "1492144534655-ae79c964c9d7", // car
    "1503376779699-8987ba6b2f78", // luxury car
    "1568605114967-8130f3a36994", // car detail
    "1544636331-9849d86e6f45",    // mechanic
    "1487754180451-c456f719a1fc", // auto shop
    "1511919884226-fd3cad34687c", // car showroom
    "1616422285762-9370ac0c4be0", // electric car
    "1552519507-da3b142b6f3b",    // sports car
    "1536700503339-1e771d4c Reset", // car interior
    "1449965408869-eaa3f722e40d", // driving
  ],
  nonprofit: [
    "1469571486292-0ba58a3f068b", // community
    "1559027615-cd4628902d4a",    // volunteering
    "1488521787816-4e55fe0a2f6b", // helping hands
    "1532629345422-7515f3d16bb6", // charity event
    "1517486430-2e9e3d4c634a",    // team volunteer
    "1542810634-71277d2b851b",    // donation
    "1509099836639-18ba1795216d", // community meeting
    "1475721027785-f74eccf877e2", // people together
    "1491438590914-bc09fcaaf77a", // presentation
    "1582213782179-e0d53f98f2ca", // helping community
  ],
  default: [
    "1460925895917-afdab827c52f",
    "1551434678-e076c223a692",
    "1497366216548-37526070297c",
    "1522071820081-009f0129c71c",
    "1573496359142-b8d87734a5a2",
    "1507003211169-0a1dd7228f2d",
    "1438761681033-6461ffad8d80",
    "1600880292203-757bb62b31f7",
    "1541701494-7e5bff7e0e09",
    "1558618666-fcd25c85cd64",
    "1499750310107-5fef28a66643",
    "1542744094-3a31f272c490",
  ],
};

// Portrait / team photos used across all site types
const PORTRAIT_IDS = [
  "1507003211169-0a1dd7228f2d",
  "1438761681033-6461ffad8d80",
  "1500648767791-00dcc994a43e",
  "1544005313-94ddf0286df2",
  "1573496359142-b8d87734a5a2",
  "1560250097-0b93528c311a",
  "1531746020798-e6953c6e8e04",
  "1573497019940-1c28c88b4f3e",
];

// ─── Aspect-ratio presets ─────────────────────────────────────────────────────

export type ImageRole =
  | "hero"      // full-width, landscape, dramatic
  | "card"      // square-ish thumbnails
  | "portrait"  // tall, person/team
  | "wide"      // section backgrounds, banners
  | "square"    // avatars, logos, icons
  | "product"   // product photography
  | "gallery"   // mixed gallery images
  | "blog"      // blog thumbnails 16:9

const DIMENSIONS: Record<ImageRole, { w: number; h: number }> = {
  hero:     { w: 1600, h: 900 },
  wide:     { w: 1400, h: 600 },
  card:     { w: 800,  h: 600 },
  portrait: { w: 600,  h: 800 },
  square:   { w: 600,  h: 600 },
  product:  { w: 800,  h: 800 },
  gallery:  { w: 900,  h: 700 },
  blog:     { w: 900,  h: 506 },
};

// ─── Main URL builder ─────────────────────────────────────────────────────────

function unsplashIdUrl(photoId: string, role: ImageRole): string {
  const { w, h } = DIMENSIONS[role];
  return `https://images.unsplash.com/photo-${photoId}?w=${w}&h=${h}&fit=crop&auto=format&q=80`;
}

/** @deprecated kept for API compatibility — now uses images.unsplash.com with curated IDs */
export function unsplashUrl(role: ImageRole, _keywords: string, seed = 1): string {
  const { w, h } = DIMENSIONS[role];
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

/** Returns a Picsum URL as a reliable fallback */
export function picsumUrl(role: ImageRole, seed = 1): string {
  const { w, h } = DIMENSIONS[role];
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

// ─── Palette builder ──────────────────────────────────────────────────────────

export interface ImagePalette {
  hero: string[];
  wide: string[];
  card: string[];
  portrait: string[];
  square: string[];
  product: string[];
  gallery: string[];
  blog: string[];
}

/**
 * Returns a curated image palette from real Unsplash photos for the given site type.
 * All URLs use images.unsplash.com — no API key required.
 */
// Keyword aliases — maps terms that appear in site type strings to photo bank keys
const TYPE_ALIASES: Array<[string, string]> = [
  ["dentist", "dental"],
  ["orthodont", "dental"],
  ["doctor", "medical"],
  ["clinic", "medical"],
  ["hospital", "medical"],
  ["health", "medical"],
  ["physio", "medical"],
  ["chiro", "medical"],
  ["attorney", "law"],
  ["lawyer", "law"],
  ["legal", "law"],
  ["law firm", "law"],
  ["barbershop", "salon"],
  ["barber", "salon"],
  ["hair", "salon"],
  ["beauty", "salon"],
  ["nail", "salon"],
  ["resort", "hotel"],
  ["hostel", "hotel"],
  ["accommodation", "hotel"],
  ["lodg", "hotel"],
  ["inn", "hotel"],
  ["wellness", "spa"],
  ["massage", "spa"],
  ["retreat", "spa"],
  ["pilates", "yoga"],
  ["meditation", "yoga"],
  ["fitness studio", "yoga"],
  ["pastry", "bakery"],
  ["patisserie", "bakery"],
  ["bread", "bakery"],
  ["dessert", "bakery"],
  ["cake", "bakery"],
  ["school", "education"],
  ["university", "education"],
  ["college", "education"],
  ["academy", "education"],
  ["tutor", "education"],
  ["training", "education"],
  ["course", "education"],
  ["learn", "education"],
  ["photog", "photography"],
  ["studio", "photography"],
  ["portrait", "photography"],
  ["contractor", "construction"],
  ["builder", "construction"],
  ["architect", "construction"],
  ["remodel", "construction"],
  ["renovation", "construction"],
  ["car dealer", "automotive"],
  ["dealership", "automotive"],
  ["mechanic", "automotive"],
  ["garage", "automotive"],
  ["auto", "automotive"],
  ["charity", "nonprofit"],
  ["foundation", "nonprofit"],
  ["ngo", "nonprofit"],
  ["nonprofit", "nonprofit"],
  ["non-profit", "nonprofit"],
  ["volunteer", "nonprofit"],
];

function resolvePhotoKey(siteType: string): string {
  const lower = siteType.toLowerCase();
  // Exact match first
  if (PHOTO_BANK[lower]) return lower;
  // Alias check — first matching alias wins
  for (const [term, key] of TYPE_ALIASES) {
    if (lower.includes(term)) return key;
  }
  // Partial match against bank keys
  for (const key of Object.keys(PHOTO_BANK)) {
    if (key !== "default" && (lower.includes(key) || key.includes(lower))) return key;
  }
  return "default";
}

export function getSiteImagePalette(siteType: string, _count = 12): ImagePalette {
  const key = resolvePhotoKey(siteType);
  const ids = PHOTO_BANK[key] ?? PHOTO_BANK["default"];

  // Helper: pick N ids starting at offset, cycling through the bank
  const pick = (offset: number, n: number) =>
    Array.from({ length: n }, (_, i) => ids[(offset + i) % ids.length]);

  return {
    hero:     pick(0, 3).map((id) => unsplashIdUrl(id, "hero")),
    wide:     pick(2, 3).map((id) => unsplashIdUrl(id, "wide")),
    card:     pick(4, 5).map((id) => unsplashIdUrl(id, "card")),
    portrait: PORTRAIT_IDS.slice(0, 6).map((id) => unsplashIdUrl(id, "portrait")),
    square:   PORTRAIT_IDS.slice(0, 6).map((id) => unsplashIdUrl(id, "square")),
    product:  pick(6, 4).map((id) => unsplashIdUrl(id, "product")),
    gallery:  pick(8, 4).map((id) => unsplashIdUrl(id, "gallery")),
    blog:     pick(10, 4).map((id) => unsplashIdUrl(id, "blog")),
  };
}

/**
 * Serializes the palette into a compact string block for injection into prompts.
 * The AI reads this and uses the URLs directly in the generated HTML.
 */
export function formatPaletteForPrompt(palette: ImagePalette): string {
  return `
AVAILABLE IMAGE URLS — use these directly in <img src="..."> and CSS background-image. Do NOT use placeholder.com or make up any other URLs.

HERO / FULL-WIDTH BACKGROUNDS (1600×900):
${palette.hero.map((u, i) => `  hero-${i + 1}: ${u}`).join("\n")}

WIDE SECTION BACKGROUNDS (1400×600):
${palette.wide.map((u, i) => `  wide-${i + 1}: ${u}`).join("\n")}

CARD / THUMBNAIL IMAGES (800×600):
${palette.card.map((u, i) => `  card-${i + 1}: ${u}`).join("\n")}

PORTRAIT / TEAM PHOTOS (600×800):
${palette.portrait.map((u, i) => `  portrait-${i + 1}: ${u}`).join("\n")}

SQUARE AVATARS (600×600):
${palette.square.map((u, i) => `  square-${i + 1}: ${u}`).join("\n")}

PRODUCT IMAGES (800×800):
${palette.product.map((u, i) => `  product-${i + 1}: ${u}`).join("\n")}

GALLERY IMAGES (900×700):
${palette.gallery.map((u, i) => `  gallery-${i + 1}: ${u}`).join("\n")}

BLOG THUMBNAILS (900×506):
${palette.blog.map((u, i) => `  blog-${i + 1}: ${u}`).join("\n")}

RULES FOR IMAGE USAGE:
- Use hero images for full-width hero sections and page headers
- Use wide images for section backgrounds (set as CSS background-image with cover)
- Use card images for feature cards, service cards, portfolio items
- Use portrait images for team members, testimonial authors
- Use square images for avatar circles, client logos placeholders
- Use product images for product showcases, ecommerce items
- Use gallery images for image grids and galleries
- Use blog images for blog post cards
- Always add alt text describing what the image shows
- For CSS backgrounds: style="background-image: url('URL'); background-size: cover; background-position: center;"
- For img tags: <img src="URL" alt="description" class="w-full h-full object-cover" loading="lazy">
- Mix and vary which numbered images you use — don't just use -1 for everything
`.trim();
}
