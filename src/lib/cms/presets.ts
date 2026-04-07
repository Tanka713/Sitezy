import type { CmsCollectionPreset, CmsFieldType } from "@/types";

export interface CmsPresetFieldTemplate {
  key: string;
  label: string;
  type: CmsFieldType;
  required?: boolean;
}

export interface CmsPresetTemplate {
  preset: Exclude<CmsCollectionPreset, "custom">;
  label: string;
  description: string;
  suggestedCollectionName: string;
  fields: CmsPresetFieldTemplate[];
}

export const CMS_PRESET_TEMPLATES: CmsPresetTemplate[] = [
  {
    preset: "blog_posts",
    label: "Blog posts",
    description: "Article publishing with excerpt, cover image, author, and body content.",
    suggestedCollectionName: "Blog posts",
    fields: [
      { key: "excerpt", label: "Excerpt", type: "textarea", required: true },
      { key: "cover_image", label: "Cover image", type: "image" },
      { key: "author", label: "Author", type: "text" },
      { key: "publish_date", label: "Publish date", type: "date" },
      { key: "body", label: "Body", type: "rich_text", required: true },
    ],
  },
  {
    preset: "case_studies",
    label: "Case studies",
    description: "Project results with client, summary, image, and outcome details.",
    suggestedCollectionName: "Case studies",
    fields: [
      { key: "summary", label: "Summary", type: "textarea", required: true },
      { key: "client", label: "Client", type: "text" },
      { key: "industry", label: "Industry", type: "text" },
      { key: "cover_image", label: "Cover image", type: "image" },
      { key: "outcome", label: "Outcome", type: "textarea" },
      { key: "body", label: "Body", type: "rich_text", required: true },
    ],
  },
  {
    preset: "team_members",
    label: "Team members",
    description: "People profiles with role, bio, headshot, and contact fields.",
    suggestedCollectionName: "Team members",
    fields: [
      { key: "role", label: "Role", type: "text", required: true },
      { key: "bio", label: "Bio", type: "textarea" },
      { key: "headshot", label: "Headshot", type: "image" },
      { key: "email", label: "Email", type: "text" },
      { key: "profile_url", label: "Profile URL", type: "url" },
    ],
  },
  {
    preset: "faq_items",
    label: "FAQ items",
    description: "Question-and-answer content with optional category grouping.",
    suggestedCollectionName: "FAQ items",
    fields: [
      { key: "answer", label: "Answer", type: "textarea", required: true },
      { key: "category", label: "Category", type: "text" },
    ],
  },
];

export function getCmsPresetTemplate(preset: CmsCollectionPreset | null | undefined) {
  return CMS_PRESET_TEMPLATES.find((template) => template.preset === preset) ?? null;
}
