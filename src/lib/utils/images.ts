/**
 * Image URL utilities for Sitezy generation.
 *
 * Uses two sources — both free, no API key required:
 *   • Unsplash Source  https://source.unsplash.com  — keyword-matched photography
 *   • Picsum Photos    https://picsum.photos        — fast Lorem-Ipsum style images
 *
 * Unsplash Source format:
 *   https://source.unsplash.com/{w}x{h}/?{keyword},{keyword}
 *
 * We append a numeric seed so the same slot always renders the same photo
 * within a generation, but different slots get different photos.
 */

// ─── Site-type → Unsplash keyword banks ──────────────────────────────────────

const SITE_TYPE_KEYWORDS: Record<string, string[]> = {
  agency:         ["creative,studio", "modern,office", "team,collaboration", "design,workspace", "branding,identity", "city,architecture"],
  restaurant:     ["restaurant,food", "fine,dining", "food,plating", "kitchen,chef", "interior,restaurant", "meal,table"],
  cafe:           ["coffee,cafe", "espresso,cup", "cafe,interior", "barista,coffee", "pastry,breakfast", "cozy,cafe"],
  gym:            ["gym,fitness", "workout,training", "athlete,sport", "crossfit,exercise", "weights,gym", "running,sport"],
  "personal brand": ["portrait,professional", "speaker,stage", "creative,person", "laptop,work", "professional,headshot", "workspace,desk"],
  portfolio:      ["creative,art", "design,portfolio", "artwork,studio", "photography,art", "illustration,creative", "minimal,workspace"],
  "saas startup": ["technology,software", "dashboard,interface", "startup,office", "data,analytics", "code,developer", "modern,tech"],
  event:          ["event,conference", "crowd,concert", "stage,performance", "gathering,people", "celebration,party", "venue,event"],
  consultancy:    ["business,meeting", "professional,office", "strategy,whiteboard", "handshake,business", "corporate,office", "analytics,business"],
  "real estate":  ["luxury,home", "architecture,house", "interior,design", "property,modern", "house,exterior", "apartment,city"],
  "creative studio": ["art,studio", "creative,workspace", "design,tools", "artist,painting", "photography,studio", "creative,process"],
  ecommerce:      ["product,photography", "shopping,lifestyle", "fashion,product", "minimal,product", "still,life", "commercial,photography"],
  "board game cafe": ["board,games", "friends,playing", "game,night", "cafe,social", "tabletop,gaming", "fun,group"],
  "local business": ["local,shop", "small,business", "storefront,street", "community,local", "shopkeeper,store", "neighbourhood,shop"],
};

// ─── Section-type → Unsplash keyword banks ────────────────────────────────────

const SECTION_KEYWORDS: Record<string, string[]> = {
  hero:           ["wide,landscape", "aerial,city", "dramatic,light", "minimalist,space", "texture,abstract"],
  team:           ["portrait,professional", "team,office", "headshot,person", "professional,smile", "business,person"],
  gallery:        ["photography,art", "creative,portfolio", "architecture,detail", "nature,landscape", "abstract,texture"],
  testimonials:   ["portrait,candid", "person,smiling", "professional,headshot", "happy,person", "real,person"],
  "blog-preview": ["writing,desk", "reading,book", "creative,writing", "laptop,coffee", "journal,pen"],
  "case-studies": ["project,success", "before,after", "business,results", "team,work", "presentation,office"],
  menu:           ["food,photography", "dish,plating", "menu,food", "culinary,art", "fresh,ingredients"],
  "menu-section": ["food,photography", "dish,plating", "menu,food", "culinary,art", "fresh,ingredients"],
  booking:        ["calendar,schedule", "appointment,desk", "reservation,luxury", "hotel,lobby", "service,premium"],
  "logo-cloud":   ["brand,logos", "technology,icons", "business,corporate", "abstract,minimal", "clean,white"],
  features:       ["product,detail", "technology,close", "innovation,abstract", "minimal,clean", "modern,design"],
  stats:          ["data,chart", "growth,graph", "success,metrics", "analytics,modern", "numbers,abstract"],
  pricing:        ["premium,luxury", "choice,selection", "plan,business", "value,service", "subscription,plan"],
  contact:        ["communication,phone", "message,letter", "contact,desk", "reach,out", "connect,people"],
  "cta":          ["call,action", "motivation,success", "bold,poster", "dramatic,light", "impact,visual"],
};

// ─── Aspect-ratio presets ─────────────────────────────────────────────────────

export type ImageRole =
  | "hero"           // full-width, landscape, dramatic
  | "card"           // square-ish thumbnails
  | "portrait"       // tall, person/team
  | "wide"           // section backgrounds, banners
  | "square"         // avatars, logos, icons
  | "product"        // product photography
  | "gallery"        // mixed gallery images
  | "blog"           // blog thumbnails 16:9

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

// ─── Main URL generators ──────────────────────────────────────────────────────

/**
 * Returns a single Unsplash Source URL for the given role + keyword context.
 * `seed` keeps the image stable across re-renders but unique per slot.
 */
export function unsplashUrl(
  role: ImageRole,
  keywords: string,
  seed = 1
): string {
  const { w, h } = DIMENSIONS[role];
  // Unsplash Source uses sig param for deterministic seeding
  return `https://source.unsplash.com/${w}x${h}/?${encodeURIComponent(keywords)}&sig=${seed}`;
}

/**
 * Returns a Picsum URL — faster CDN, no keyword matching, good for backgrounds/placeholders.
 */
export function picsumUrl(role: ImageRole, seed = 1): string {
  const { w, h } = DIMENSIONS[role];
  return `https://picsum.photos/seed/${seed}/${w}/${h}`;
}

/**
 * Given a site type, returns an array of N Unsplash URLs with appropriate keywords.
 * Used to inject a pre-computed image palette into the generation prompt.
 */
export function getSiteImagePalette(
  siteType: string,
  count = 12
): ImagePalette {
  const key = siteType.toLowerCase();
  const keywords = SITE_TYPE_KEYWORDS[key] ?? SITE_TYPE_KEYWORDS["agency"];
  const extra = SECTION_KEYWORDS;

  const palette: ImagePalette = {
    hero: [],
    wide: [],
    card: [],
    portrait: [],
    square: [],
    product: [],
    gallery: [],
    blog: [],
  };

  // Generate multiple images per role
  for (let i = 0; i < 4; i++) {
    const kw = keywords[i % keywords.length];
    palette.hero.push(unsplashUrl("hero", kw, i + 1));
    palette.wide.push(unsplashUrl("wide", kw, i + 10));
    palette.card.push(unsplashUrl("card", kw, i + 20));
    palette.gallery.push(unsplashUrl("gallery", kw, i + 30));
  }

  // Team portraits always use person keywords
  for (let i = 0; i < 6; i++) {
    palette.portrait.push(unsplashUrl("portrait", "portrait,professional", i + 40));
  }

  // Blog thumbnails
  for (let i = 0; i < 4; i++) {
    palette.blog.push(unsplashUrl("blog", keywords[i % keywords.length], i + 50));
  }

  // Product images
  for (let i = 0; i < 4; i++) {
    palette.product.push(unsplashUrl("product", keywords[i % keywords.length] + ",product", i + 60));
  }

  // Squares for avatars
  for (let i = 0; i < 6; i++) {
    palette.square.push(unsplashUrl("square", "portrait,professional", i + 70));
  }

  return palette;
}

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
 * Serializes the palette into a compact string block for injection into prompts.
 * Claude reads this and uses the URLs directly in the generated HTML.
 */
export function formatPaletteForPrompt(palette: ImagePalette): string {
  return `
AVAILABLE IMAGE URLS — use these directly in <img src="..."> and CSS background-image. Do NOT use picsum.photos or placeholder images.

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
