export const BLOCK_ALIASES = {
  "nav-simple": "navbar",
  "hero-centered": "hero",
  "section-basic": "section",
  "features-3": "features",
  "cta-solid": "cta",
  "footer-simple": "footer",
  logos: "logo-wall",
} as const;

export type BlockAliasId = keyof typeof BLOCK_ALIASES;

export function resolveBlockAlias(blockId: string): string {
  return BLOCK_ALIASES[blockId as BlockAliasId] ?? blockId;
}

export function getAliasesForCanonicalBlock(blockId: string): string[] {
  return Object.entries(BLOCK_ALIASES)
    .filter(([, canonical]) => canonical === blockId)
    .map(([alias]) => alias);
}
