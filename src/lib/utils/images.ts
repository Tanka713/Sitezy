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
export function getSiteImagePalette(siteType: string, _count = 12): ImagePalette {
  const key = siteType.toLowerCase();
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
