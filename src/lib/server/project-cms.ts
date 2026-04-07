import type {
  CmsCollection,
  CmsCollectionPreset,
  CmsEntry,
  CmsEntryStatus,
  CmsField,
  CmsFieldType,
} from "@/types";
import { getCmsPresetTemplate } from "@/lib/cms/presets";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import {
  DB_READ_001,
  DB_READ_002,
  DB_SCHEMA_003,
  DB_UPDATE_001,
  DB_WRITE_001,
  DB_WRITE_002,
  VALIDATION_INPUT_001,
  createAppError,
} from "@/lib/errors";

type CmsCollectionRow = {
  id: string;
  project_id: string;
  user_id: string;
  name: string;
  slug: string;
  preset: string;
  created_at: string;
  updated_at: string;
};

type CmsFieldRow = {
  id: string;
  collection_id: string;
  project_id: string;
  user_id: string;
  key: string;
  label: string;
  field_type: string;
  required: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

type CmsEntryRow = {
  id: string;
  collection_id: string;
  project_id: string;
  user_id: string;
  title: string;
  slug: string;
  status: string;
  values_json: Record<string, unknown> | null;
  sort_order: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

type SupabaseErrorLike = {
  code?: string;
  message?: string;
  details?: string | null;
  hint?: string | null;
};

type CmsClient = ReturnType<typeof getSupabaseServerClient>;
type CmsClientOptions = { admin?: boolean };

export interface CmsProjectCollectionsResult {
  collections: CmsCollection[];
  storageReady: boolean;
}

export interface CmsCollectionCreateInput {
  name: string;
  slug?: string | null;
  preset?: CmsCollectionPreset | null;
  fields?: Array<{
    label: string;
    key?: string | null;
    type?: CmsFieldType | null;
    required?: boolean;
  }>;
}

export interface CmsCollectionUpdateInput {
  name?: string | null;
  slug?: string | null;
}

export interface CmsFieldCreateInput {
  label: string;
  type?: CmsFieldType | null;
  required?: boolean;
}

export interface CmsFieldUpdateInput {
  label?: string | null;
  type?: CmsFieldType | null;
  required?: boolean;
}

export interface CmsEntryCreateInput {
  title: string;
  slug?: string | null;
  status?: CmsEntryStatus | null;
  values?: Record<string, unknown> | null;
}

export interface CmsEntryUpdateInput {
  title?: string | null;
  slug?: string | null;
  status?: CmsEntryStatus | null;
  values?: Record<string, unknown> | null;
}

const CONSTRAINT_CODES = new Set(["23502", "23503", "23505", "23514"]);
const VALID_FIELD_TYPES = new Set<CmsFieldType>(["text", "textarea", "rich_text", "image", "url", "date"]);
const VALID_ENTRY_STATUSES = new Set<CmsEntryStatus>(["draft", "published"]);
const VALID_COLLECTION_PRESETS = new Set<CmsCollectionPreset>([
  "custom",
  "blog_posts",
  "case_studies",
  "team_members",
  "faq_items",
]);

function getCmsClient(options?: CmsClientOptions) {
  return options?.admin ? getSupabaseAdminClient() : getSupabaseServerClient();
}

function isCmsSchemaMissing(error: unknown) {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  return (
    maybe.code === "42P01" ||
    maybe.code === "42703" ||
    maybe.code === "PGRST202" ||
    maybe.code === "PGRST205" ||
    maybe.message?.includes("cms_collections") ||
    maybe.message?.includes("cms_fields") ||
    maybe.message?.includes("cms_entries") ||
    maybe.details?.includes("cms_collections") ||
    maybe.details?.includes("cms_fields") ||
    maybe.details?.includes("cms_entries")
  );
}

function buildCmsDbError(
  error: unknown,
  fallbackCode: typeof DB_READ_001 | typeof DB_WRITE_001 | typeof DB_UPDATE_001,
  devMessage: string,
  metadata?: Record<string, unknown>
) {
  const maybe = (error ?? {}) as SupabaseErrorLike;
  return createAppError({
    code: isCmsSchemaMissing(error)
      ? DB_SCHEMA_003
      : typeof maybe.code === "string" && CONSTRAINT_CODES.has(maybe.code)
      ? DB_WRITE_002
      : fallbackCode,
    devMessage,
    severity: "error",
    metadata: {
      ...metadata,
      ...(maybe.code ? { dbCode: maybe.code } : {}),
      ...(maybe.details ? { dbDetails: maybe.details } : {}),
      ...(maybe.hint ? { dbHint: maybe.hint } : {}),
    },
    cause: error,
  });
}

function slugifyCmsToken(value: string | null | undefined, fallback: string) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function normalizeCollectionPreset(value: string | null | undefined): CmsCollectionPreset {
  return VALID_COLLECTION_PRESETS.has(value as CmsCollectionPreset) ? (value as CmsCollectionPreset) : "custom";
}

function normalizeFieldType(value: string | null | undefined): CmsFieldType {
  return VALID_FIELD_TYPES.has(value as CmsFieldType) ? (value as CmsFieldType) : "text";
}

function normalizeEntryStatus(value: string | null | undefined): CmsEntryStatus {
  return VALID_ENTRY_STATUSES.has(value as CmsEntryStatus) ? (value as CmsEntryStatus) : "draft";
}

function ensureStringValue(value: unknown) {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function mapCmsField(row: CmsFieldRow): CmsField {
  return {
    id: row.id,
    collectionId: row.collection_id,
    projectId: row.project_id,
    key: row.key,
    label: row.label,
    type: normalizeFieldType(row.field_type),
    required: row.required,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCmsEntry(row: CmsEntryRow): CmsEntry {
  const values =
    row.values_json && typeof row.values_json === "object"
      ? Object.fromEntries(
          Object.entries(row.values_json).map(([key, value]) => [key, ensureStringValue(value)])
        )
      : {};

  return {
    id: row.id,
    collectionId: row.collection_id,
    projectId: row.project_id,
    title: row.title,
    slug: row.slug,
    status: normalizeEntryStatus(row.status),
    values,
    sortOrder: row.sort_order,
    publishedAt: row.published_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapCmsCollection(
  row: CmsCollectionRow,
  fields: CmsField[],
  entries: CmsEntry[]
): CmsCollection {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    slug: row.slug,
    preset: normalizeCollectionPreset(row.preset),
    fields,
    entries,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeFieldBlueprints(input: CmsCollectionCreateInput["fields"], preset: CmsCollectionPreset) {
  const presetTemplate = getCmsPresetTemplate(preset);
  const source =
    input && input.length
      ? input.map((field) => ({
          key: slugifyCmsToken(field.key || field.label, "field"),
          label: ensureStringValue(field.label).trim(),
          type: normalizeFieldType(field.type ?? "text"),
          required: Boolean(field.required),
        }))
      : presetTemplate?.fields.map((field) => ({
          key: field.key,
          label: field.label,
          type: field.type,
          required: Boolean(field.required),
        })) ?? [];

  const usedKeys = new Set<string>();
  return source
    .map((field, index) => {
      const label = field.label.trim();
      if (!label) return null;
      const baseKey = slugifyCmsToken(field.key || label, `field-${index + 1}`);
      let key = baseKey;
      let suffix = 2;
      while (usedKeys.has(key)) {
        key = `${baseKey}-${suffix}`;
        suffix += 1;
      }
      usedKeys.add(key);
      return {
        id: crypto.randomUUID(),
        key,
        label,
        type: normalizeFieldType(field.type),
        required: Boolean(field.required),
        sortOrder: index,
      };
    })
    .filter((field): field is NonNullable<typeof field> => Boolean(field));
}

function sanitizeEntryValues(fields: CmsField[], values: Record<string, unknown> | null | undefined) {
  const source = values && typeof values === "object" ? values : {};
  return Object.fromEntries(fields.map((field) => [field.key, ensureStringValue(source[field.key])]));
}

async function ensureProjectOwnership(
  client: CmsClient,
  projectId: string,
  userId: string,
  options?: CmsClientOptions
) {
  const query = client.from("projects").select("id").eq("id", projectId).limit(1);
  if (!options?.admin) {
    query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw buildCmsDbError(error, DB_READ_001, `Failed to confirm CMS project ownership for ${projectId}`, {
      projectId,
      userId,
    });
  }

  if (!data) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `Project ${projectId} does not exist for CMS access`,
      severity: "warn",
      metadata: { projectId, userId },
    });
  }
}

async function loadCollectionRow(
  client: CmsClient,
  projectId: string,
  collectionId: string,
  userId: string,
  options?: CmsClientOptions
) {
  const query = client
    .from("cms_collections")
    .select("*")
    .eq("project_id", projectId)
    .eq("id", collectionId)
    .limit(1);
  if (!options?.admin) {
    query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw buildCmsDbError(error, DB_READ_001, `Failed to load CMS collection ${collectionId}`, {
      projectId,
      collectionId,
      userId,
    });
  }
  if (!data) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `CMS collection ${collectionId} does not exist for project ${projectId}`,
      severity: "warn",
      metadata: { projectId, collectionId, userId },
    });
  }

  return data as CmsCollectionRow;
}

async function loadFieldRows(
  client: CmsClient,
  collectionIds: string[],
  userId: string,
  options?: CmsClientOptions
) {
  if (!collectionIds.length) return [] as CmsFieldRow[];

  const query = client
    .from("cms_fields")
    .select("*")
    .in("collection_id", collectionIds)
    .order("sort_order", { ascending: true });
  if (!options?.admin) {
    query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    throw buildCmsDbError(error, DB_READ_001, "Failed to load CMS fields", {
      collectionIds,
      userId,
    });
  }
  return (data ?? []) as CmsFieldRow[];
}

async function loadEntryRows(
  client: CmsClient,
  collectionIds: string[],
  userId: string,
  options?: CmsClientOptions
) {
  if (!collectionIds.length) return [] as CmsEntryRow[];

  const query = client
    .from("cms_entries")
    .select("*")
    .in("collection_id", collectionIds)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (!options?.admin) {
    query.eq("user_id", userId);
  }

  const { data, error } = await query;
  if (error) {
    throw buildCmsDbError(error, DB_READ_001, "Failed to load CMS entries", {
      collectionIds,
      userId,
    });
  }
  return (data ?? []) as CmsEntryRow[];
}

async function buildCollectionsForProject(
  client: CmsClient,
  projectId: string,
  userId: string,
  options?: CmsClientOptions
) {
  const collectionQuery = client
    .from("cms_collections")
    .select("*")
    .eq("project_id", projectId)
    .order("created_at", { ascending: true });
  if (!options?.admin) {
    collectionQuery.eq("user_id", userId);
  }

  const { data: collectionRows, error: collectionError } = await collectionQuery;
  if (collectionError) {
    throw buildCmsDbError(collectionError, DB_READ_001, `Failed to load CMS collections for project ${projectId}`, {
      projectId,
      userId,
    });
  }

  const rows = (collectionRows ?? []) as CmsCollectionRow[];
  const collectionIds = rows.map((row) => row.id);
  const [fieldRows, entryRows] = await Promise.all([
    loadFieldRows(client, collectionIds, userId, options),
    loadEntryRows(client, collectionIds, userId, options),
  ]);

  const fieldsByCollection = new Map<string, CmsField[]>();
  const entriesByCollection = new Map<string, CmsEntry[]>();

  for (const row of fieldRows) {
    const list = fieldsByCollection.get(row.collection_id) ?? [];
    list.push(mapCmsField(row));
    fieldsByCollection.set(row.collection_id, list);
  }

  for (const row of entryRows) {
    const list = entriesByCollection.get(row.collection_id) ?? [];
    list.push(mapCmsEntry(row));
    entriesByCollection.set(row.collection_id, list);
  }

  return rows.map((row) =>
    mapCmsCollection(
      row,
      fieldsByCollection.get(row.id) ?? [],
      entriesByCollection.get(row.id) ?? []
    )
  );
}

async function getAvailableCollectionSlug(
  client: CmsClient,
  projectId: string,
  userId: string,
  seed: string,
  excludeCollectionId?: string | null,
  options?: CmsClientOptions
) {
  const base = slugifyCmsToken(seed, "collection");
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const query = client
      .from("cms_collections")
      .select("id")
      .eq("project_id", projectId)
      .eq("slug", candidate)
      .limit(1);
    if (!options?.admin) {
      query.eq("user_id", userId);
    }
    if (excludeCollectionId) {
      query.neq("id", excludeCollectionId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw buildCmsDbError(error, DB_READ_001, `Failed to check CMS collection slug availability for ${candidate}`, {
        projectId,
        userId,
        candidate,
      });
    }
    if (!data) return candidate;
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

async function getAvailableEntrySlug(
  client: CmsClient,
  collectionId: string,
  userId: string,
  seed: string,
  excludeEntryId?: string | null,
  options?: CmsClientOptions
) {
  const base = slugifyCmsToken(seed, "entry");
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
    const query = client
      .from("cms_entries")
      .select("id")
      .eq("collection_id", collectionId)
      .eq("slug", candidate)
      .limit(1);
    if (!options?.admin) {
      query.eq("user_id", userId);
    }
    if (excludeEntryId) {
      query.neq("id", excludeEntryId);
    }

    const { data, error } = await query.maybeSingle();
    if (error) {
      throw buildCmsDbError(error, DB_READ_001, `Failed to check CMS entry slug availability for ${candidate}`, {
        collectionId,
        userId,
        candidate,
      });
    }
    if (!data) return candidate;
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

async function getCollectionFields(
  client: CmsClient,
  collectionId: string,
  userId: string,
  options?: CmsClientOptions
) {
  const rows = await loadFieldRows(client, [collectionId], userId, options);
  return rows.map(mapCmsField);
}

export async function listCmsCollectionsForProject(
  projectId: string,
  userId: string,
  options?: CmsClientOptions
): Promise<CmsProjectCollectionsResult> {
  const client = getCmsClient(options);
  await ensureProjectOwnership(client, projectId, userId, options);

  try {
    return {
      collections: await buildCollectionsForProject(client, projectId, userId, options),
      storageReady: true,
    };
  } catch (error) {
    if (isCmsSchemaMissing(error)) {
      return {
        collections: [],
        storageReady: false,
      };
    }
    throw error;
  }
}

export async function createCmsCollection(
  projectId: string,
  userId: string,
  input: CmsCollectionCreateInput,
  options?: CmsClientOptions
) {
  const client = getCmsClient(options);
  await ensureProjectOwnership(client, projectId, userId, options);

  const name = ensureStringValue(input.name).trim();
  if (!name) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: "CMS collection create request missing a name",
      userMessage: "Add a collection name before creating it.",
      severity: "warn",
      metadata: { projectId, userId },
    });
  }

  const preset = normalizeCollectionPreset(input.preset ?? "custom");
  const slug = await getAvailableCollectionSlug(
    client,
    projectId,
    userId,
    input.slug || name,
    null,
    options
  );
  const fields = normalizeFieldBlueprints(input.fields, preset);
  const collectionId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const { error: collectionError } = await client.from("cms_collections").insert({
      id: collectionId,
      project_id: projectId,
      user_id: userId,
      name,
      slug,
      preset,
      created_at: now,
      updated_at: now,
    });
    if (collectionError) throw collectionError;

    if (fields.length) {
      const { error: fieldError } = await client.from("cms_fields").insert(
        fields.map((field) => ({
          id: field.id,
          collection_id: collectionId,
          project_id: projectId,
          user_id: userId,
          key: field.key,
          label: field.label,
          field_type: field.type,
          required: field.required,
          sort_order: field.sortOrder,
          created_at: now,
          updated_at: now,
        }))
      );
      if (fieldError) throw fieldError;
    }
  } catch (error) {
    throw buildCmsDbError(error, DB_WRITE_001, `Failed to create CMS collection for project ${projectId}`, {
      projectId,
      userId,
      collectionId,
      preset,
    });
  }

  const collections = await buildCollectionsForProject(client, projectId, userId, options);
  return collections.find((collection) => collection.id === collectionId) ?? null;
}

export async function updateCmsCollection(
  projectId: string,
  collectionId: string,
  userId: string,
  input: CmsCollectionUpdateInput,
  options?: CmsClientOptions
) {
  const client = getCmsClient(options);
  await ensureProjectOwnership(client, projectId, userId, options);
  const collection = await loadCollectionRow(client, projectId, collectionId, userId, options);

  const nextName =
    input.name == null ? collection.name : ensureStringValue(input.name).trim() || collection.name;
  const nextSlug =
    input.slug == null
      ? collection.slug
      : await getAvailableCollectionSlug(client, projectId, userId, input.slug || nextName, collectionId, options);

  try {
    const { error } = await client
      .from("cms_collections")
      .update({
        name: nextName,
        slug: nextSlug,
        updated_at: new Date().toISOString(),
      })
      .eq("id", collectionId);
    if (error) throw error;
  } catch (error) {
    throw buildCmsDbError(error, DB_UPDATE_001, `Failed to update CMS collection ${collectionId}`, {
      projectId,
      collectionId,
      userId,
    });
  }

  const collections = await buildCollectionsForProject(client, projectId, userId, options);
  return collections.find((nextCollection) => nextCollection.id === collectionId) ?? null;
}

export async function deleteCmsCollection(
  projectId: string,
  collectionId: string,
  userId: string,
  options?: CmsClientOptions
) {
  const client = getCmsClient(options);
  await ensureProjectOwnership(client, projectId, userId, options);
  await loadCollectionRow(client, projectId, collectionId, userId, options);

  try {
    const { error } = await client.from("cms_collections").delete().eq("id", collectionId);
    if (error) throw error;
  } catch (error) {
    throw buildCmsDbError(error, DB_UPDATE_001, `Failed to delete CMS collection ${collectionId}`, {
      projectId,
      collectionId,
      userId,
    });
  }
}

export async function createCmsField(
  projectId: string,
  collectionId: string,
  userId: string,
  input: CmsFieldCreateInput,
  options?: CmsClientOptions
) {
  const client = getCmsClient(options);
  await ensureProjectOwnership(client, projectId, userId, options);
  await loadCollectionRow(client, projectId, collectionId, userId, options);

  const label = ensureStringValue(input.label).trim();
  if (!label) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: "CMS field create request missing a label",
      userMessage: "Add a field label before creating it.",
      severity: "warn",
      metadata: { projectId, collectionId, userId },
    });
  }

  const existingFields = await getCollectionFields(client, collectionId, userId, options);
  const baseKey = slugifyCmsToken(label, "field");
  let nextKey = baseKey;
  let suffix = 2;
  const usedKeys = new Set(existingFields.map((field) => field.key));
  while (usedKeys.has(nextKey)) {
    nextKey = `${baseKey}-${suffix}`;
    suffix += 1;
  }

  const fieldId = crypto.randomUUID();
  const now = new Date().toISOString();

  try {
    const { error } = await client.from("cms_fields").insert({
      id: fieldId,
      collection_id: collectionId,
      project_id: projectId,
      user_id: userId,
      key: nextKey,
      label,
      field_type: normalizeFieldType(input.type ?? "text"),
      required: Boolean(input.required),
      sort_order: existingFields.length,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
  } catch (error) {
    throw buildCmsDbError(error, DB_WRITE_001, `Failed to create CMS field in collection ${collectionId}`, {
      projectId,
      collectionId,
      userId,
    });
  }
}

export async function updateCmsField(
  projectId: string,
  fieldId: string,
  userId: string,
  input: CmsFieldUpdateInput,
  options?: CmsClientOptions
) {
  const client = getCmsClient(options);
  await ensureProjectOwnership(client, projectId, userId, options);

  const query = client
    .from("cms_fields")
    .select("*")
    .eq("project_id", projectId)
    .eq("id", fieldId)
    .limit(1);
  if (!options?.admin) {
    query.eq("user_id", userId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw buildCmsDbError(error, DB_READ_001, `Failed to load CMS field ${fieldId}`, {
      projectId,
      fieldId,
      userId,
    });
  }
  if (!data) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `CMS field ${fieldId} does not exist for project ${projectId}`,
      severity: "warn",
      metadata: { projectId, fieldId, userId },
    });
  }

  const row = data as CmsFieldRow;
  try {
    const { error: updateError } = await client
      .from("cms_fields")
      .update({
        label: input.label == null ? row.label : ensureStringValue(input.label).trim() || row.label,
        field_type: input.type == null ? row.field_type : normalizeFieldType(input.type),
        required: input.required == null ? row.required : Boolean(input.required),
        updated_at: new Date().toISOString(),
      })
      .eq("id", fieldId);
    if (updateError) throw updateError;
  } catch (updateError) {
    throw buildCmsDbError(updateError, DB_UPDATE_001, `Failed to update CMS field ${fieldId}`, {
      projectId,
      fieldId,
      userId,
    });
  }
}

export async function deleteCmsField(
  projectId: string,
  fieldId: string,
  userId: string,
  options?: CmsClientOptions
) {
  const client = getCmsClient(options);
  await ensureProjectOwnership(client, projectId, userId, options);

  const query = client
    .from("cms_fields")
    .select("id")
    .eq("project_id", projectId)
    .eq("id", fieldId)
    .limit(1);
  if (!options?.admin) {
    query.eq("user_id", userId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw buildCmsDbError(error, DB_READ_001, `Failed to confirm CMS field ${fieldId} before delete`, {
      projectId,
      fieldId,
      userId,
    });
  }
  if (!data) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `CMS field ${fieldId} does not exist for delete`,
      severity: "warn",
      metadata: { projectId, fieldId, userId },
    });
  }

  try {
    const { error: deleteError } = await client.from("cms_fields").delete().eq("id", fieldId);
    if (deleteError) throw deleteError;
  } catch (deleteError) {
    throw buildCmsDbError(deleteError, DB_UPDATE_001, `Failed to delete CMS field ${fieldId}`, {
      projectId,
      fieldId,
      userId,
    });
  }
}

export async function createCmsEntry(
  projectId: string,
  collectionId: string,
  userId: string,
  input: CmsEntryCreateInput,
  options?: CmsClientOptions
) {
  const client = getCmsClient(options);
  await ensureProjectOwnership(client, projectId, userId, options);
  await loadCollectionRow(client, projectId, collectionId, userId, options);

  const title = ensureStringValue(input.title).trim();
  if (!title) {
    throw createAppError({
      code: VALIDATION_INPUT_001,
      devMessage: "CMS entry create request missing a title",
      userMessage: "Add an entry title before creating it.",
      severity: "warn",
      metadata: { projectId, collectionId, userId },
    });
  }

  const fields = await getCollectionFields(client, collectionId, userId, options);
  const { data: latestEntry, error: latestEntryError } = await client
    .from("cms_entries")
    .select("sort_order")
    .eq("collection_id", collectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestEntryError) {
    throw buildCmsDbError(latestEntryError, DB_READ_001, `Failed to read CMS entry order for collection ${collectionId}`, {
      projectId,
      collectionId,
      userId,
    });
  }

  const status = normalizeEntryStatus(input.status ?? "draft");
  const now = new Date().toISOString();
  const entryId = crypto.randomUUID();
  const slug = await getAvailableEntrySlug(client, collectionId, userId, input.slug || title, null, options);

  try {
    const { error } = await client.from("cms_entries").insert({
      id: entryId,
      collection_id: collectionId,
      project_id: projectId,
      user_id: userId,
      title,
      slug,
      status,
      values_json: sanitizeEntryValues(fields, input.values),
      sort_order: ((latestEntry as { sort_order?: number } | null)?.sort_order ?? -1) + 1,
      published_at: status === "published" ? now : null,
      created_at: now,
      updated_at: now,
    });
    if (error) throw error;
  } catch (error) {
    throw buildCmsDbError(error, DB_WRITE_001, `Failed to create CMS entry in collection ${collectionId}`, {
      projectId,
      collectionId,
      userId,
      entryId,
    });
  }

  const query = client
    .from("cms_entries")
    .select("*")
    .eq("id", entryId)
    .limit(1);
  if (!options?.admin) {
    query.eq("user_id", userId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw buildCmsDbError(error, DB_READ_001, `Failed to reload CMS entry ${entryId} after create`, {
      projectId,
      collectionId,
      userId,
      entryId,
    });
  }

  return data ? mapCmsEntry(data as CmsEntryRow) : null;
}

export async function updateCmsEntry(
  projectId: string,
  entryId: string,
  userId: string,
  input: CmsEntryUpdateInput,
  options?: CmsClientOptions
) {
  const client = getCmsClient(options);
  await ensureProjectOwnership(client, projectId, userId, options);

  const query = client
    .from("cms_entries")
    .select("*")
    .eq("project_id", projectId)
    .eq("id", entryId)
    .limit(1);
  if (!options?.admin) {
    query.eq("user_id", userId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) {
    throw buildCmsDbError(error, DB_READ_001, `Failed to load CMS entry ${entryId}`, {
      projectId,
      entryId,
      userId,
    });
  }
  if (!data) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `CMS entry ${entryId} does not exist for project ${projectId}`,
      severity: "warn",
      metadata: { projectId, entryId, userId },
    });
  }

  const row = data as CmsEntryRow;
  const fields = await getCollectionFields(client, row.collection_id, userId, options);
  const title = input.title == null ? row.title : ensureStringValue(input.title).trim() || row.title;
  const status = input.status == null ? normalizeEntryStatus(row.status) : normalizeEntryStatus(input.status);
  const slug =
    input.slug == null
      ? row.slug
      : await getAvailableEntrySlug(client, row.collection_id, userId, input.slug || title, entryId, options);
  const nextValues =
    input.values == null
      ? sanitizeEntryValues(fields, row.values_json)
      : sanitizeEntryValues(fields, input.values);

  try {
    const { error: updateError } = await client
      .from("cms_entries")
      .update({
        title,
        slug,
        status,
        values_json: nextValues,
        published_at: status === "published" ? row.published_at ?? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", entryId);
    if (updateError) throw updateError;
  } catch (updateError) {
    throw buildCmsDbError(updateError, DB_UPDATE_001, `Failed to update CMS entry ${entryId}`, {
      projectId,
      entryId,
      userId,
    });
  }

  return {
    ...mapCmsEntry({
      ...row,
      title,
      slug,
      status,
      values_json: nextValues,
      published_at: status === "published" ? row.published_at ?? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    }),
  };
}

export async function deleteCmsEntry(
  projectId: string,
  entryId: string,
  userId: string,
  options?: CmsClientOptions
) {
  const client = getCmsClient(options);
  await ensureProjectOwnership(client, projectId, userId, options);

  const query = client
    .from("cms_entries")
    .select("id")
    .eq("project_id", projectId)
    .eq("id", entryId)
    .limit(1);
  if (!options?.admin) {
    query.eq("user_id", userId);
  }
  const { data, error } = await query.maybeSingle();
  if (error) {
    throw buildCmsDbError(error, DB_READ_001, `Failed to confirm CMS entry ${entryId} before delete`, {
      projectId,
      entryId,
      userId,
    });
  }
  if (!data) {
    throw createAppError({
      code: DB_READ_002,
      devMessage: `CMS entry ${entryId} does not exist for delete`,
      severity: "warn",
      metadata: { projectId, entryId, userId },
    });
  }

  try {
    const { error: deleteError } = await client.from("cms_entries").delete().eq("id", entryId);
    if (deleteError) throw deleteError;
  } catch (deleteError) {
    throw buildCmsDbError(deleteError, DB_UPDATE_001, `Failed to delete CMS entry ${entryId}`, {
      projectId,
      entryId,
      userId,
    });
  }
}
