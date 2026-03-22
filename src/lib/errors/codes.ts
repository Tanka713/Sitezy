/**
 * ============================================================
 * SITEZY — CENTRALIZED ERROR CODE REGISTRY
 * ============================================================
 *
 * Format: [DOMAIN]_[ACTION]_[NUMBER]
 *
 * How to add a new error code:
 *   1. Pick the right domain (EDITOR, STATE, SAVE, DB, API, etc.)
 *   2. Follow the naming pattern: DOMAIN_ACTION_NNN
 *   3. Add it to the correct section below
 *   4. Add a user-facing message in messages.ts
 *   5. Use createAppError({ code: ErrorCodes.YOUR_NEW_CODE, ... }) at the call site
 *
 * Domains:
 *   EDITOR     - Visual editor interactions
 *   STATE      - App/store state management
 *   SAVE       - Project save / autosave / serialize
 *   DB         - Database read/write
 *   API        - API routes and external requests
 *   VALIDATION - Input / payload validation
 *   UI         - Component rendering / UI actions
 *   AUTH       - Authentication / authorization
 *   NETWORK    - Network-level failures
 *   UNKNOWN    - Unexpected / unclassified errors
 * ============================================================
 */

// ─── EDITOR ──────────────────────────────────────────────────────────────────

export const EDITOR_SELECT_001  = "EDITOR_SELECT_001"  as const; // Failed to select node
export const EDITOR_SELECT_002  = "EDITOR_SELECT_002"  as const; // Node not found during selection
export const EDITOR_SELECT_003  = "EDITOR_SELECT_003"  as const; // Invalid selected node type

export const EDITOR_HOVER_001   = "EDITOR_HOVER_001"   as const; // Failed to resolve hover target
export const EDITOR_HOVER_002   = "EDITOR_HOVER_002"   as const; // Hover target missing node id

export const EDITOR_UPDATE_001  = "EDITOR_UPDATE_001"  as const; // Failed to update node
export const EDITOR_UPDATE_002  = "EDITOR_UPDATE_002"  as const; // Node update payload invalid
export const EDITOR_UPDATE_003  = "EDITOR_UPDATE_003"  as const; // Attempted update on missing node

export const EDITOR_DELETE_001  = "EDITOR_DELETE_001"  as const; // Failed to delete node
export const EDITOR_DELETE_002  = "EDITOR_DELETE_002"  as const; // Attempted delete on missing node
export const EDITOR_DELETE_003  = "EDITOR_DELETE_003"  as const; // Cannot delete protected root node

export const EDITOR_DUPLICATE_001 = "EDITOR_DUPLICATE_001" as const; // Failed to duplicate node
export const EDITOR_DUPLICATE_002 = "EDITOR_DUPLICATE_002" as const; // Duplicate produced invalid clone
export const EDITOR_DUPLICATE_003 = "EDITOR_DUPLICATE_003" as const; // Duplicate missing parent

export const EDITOR_INSERT_001  = "EDITOR_INSERT_001"  as const; // Failed to insert node
export const EDITOR_INSERT_002  = "EDITOR_INSERT_002"  as const; // Invalid insertion target
export const EDITOR_INSERT_003  = "EDITOR_INSERT_003"  as const; // Insert payload invalid

export const EDITOR_MOVE_001    = "EDITOR_MOVE_001"    as const; // Failed to reorder node
export const EDITOR_MOVE_002    = "EDITOR_MOVE_002"    as const; // Invalid reorder target
export const EDITOR_MOVE_003    = "EDITOR_MOVE_003"    as const; // Reorder would corrupt tree

export const EDITOR_RENDER_001  = "EDITOR_RENDER_001"  as const; // Failed to render editor node
export const EDITOR_RENDER_002  = "EDITOR_RENDER_002"  as const; // Unsupported editor node type
export const EDITOR_RENDER_003  = "EDITOR_RENDER_003"  as const; // Missing renderer for node type

export const EDITOR_PANEL_001   = "EDITOR_PANEL_001"   as const; // Failed to sync properties panel
export const EDITOR_PANEL_002   = "EDITOR_PANEL_002"   as const; // Failed to sync navigator panel

export const EDITOR_CANVAS_001  = "EDITOR_CANVAS_001"  as const; // Failed to initialize canvas
export const EDITOR_CANVAS_002  = "EDITOR_CANVAS_002"  as const; // Canvas selection desynced
export const EDITOR_CANVAS_003  = "EDITOR_CANVAS_003"  as const; // Canvas event binding failed

// ─── STATE ───────────────────────────────────────────────────────────────────

export const STATE_INIT_001     = "STATE_INIT_001"     as const; // Failed to initialize editor state
export const STATE_INIT_002     = "STATE_INIT_002"     as const; // Missing initial project data

export const STATE_HYDRATE_001  = "STATE_HYDRATE_001"  as const; // Failed to hydrate state
export const STATE_HYDRATE_002  = "STATE_HYDRATE_002"  as const; // Hydration payload invalid

export const STATE_SYNC_001     = "STATE_SYNC_001"     as const; // Editor state sync failure
export const STATE_SYNC_002     = "STATE_SYNC_002"     as const; // State source mismatch
export const STATE_SYNC_003     = "STATE_SYNC_003"     as const; // Canonical project state missing

export const STATE_UPDATE_001   = "STATE_UPDATE_001"   as const; // Invalid state update attempted
export const STATE_UPDATE_002   = "STATE_UPDATE_002"   as const; // State mutation failed
export const STATE_UPDATE_003   = "STATE_UPDATE_003"   as const; // Stale state update rejected

export const STATE_SELECTION_001 = "STATE_SELECTION_001" as const; // Selected node missing from state
export const STATE_SELECTION_002 = "STATE_SELECTION_002" as const; // Selected page missing from state

export const STATE_PAGE_001     = "STATE_PAGE_001"     as const; // Failed to switch page
export const STATE_PAGE_002     = "STATE_PAGE_002"     as const; // Page not found
export const STATE_PAGE_003     = "STATE_PAGE_003"     as const; // Page tree invalid

export const STATE_HISTORY_001  = "STATE_HISTORY_001"  as const; // Undo failed
export const STATE_HISTORY_002  = "STATE_HISTORY_002"  as const; // Redo failed
export const STATE_HISTORY_003  = "STATE_HISTORY_003"  as const; // History snapshot invalid

// ─── SAVE ────────────────────────────────────────────────────────────────────

export const SAVE_PROJECT_001   = "SAVE_PROJECT_001"   as const; // Failed to save project
export const SAVE_PROJECT_002   = "SAVE_PROJECT_002"   as const; // Save payload invalid
export const SAVE_PROJECT_003   = "SAVE_PROJECT_003"   as const; // Missing project id
export const SAVE_PROJECT_004   = "SAVE_PROJECT_004"   as const; // Save response invalid
export const SAVE_PROJECT_005   = "SAVE_PROJECT_005"   as const; // Concurrency conflict

export const SAVE_AUTOSAVE_001  = "SAVE_AUTOSAVE_001"  as const; // Autosave failed
export const SAVE_AUTOSAVE_002  = "SAVE_AUTOSAVE_002"  as const; // Autosave skipped — invalid dirty state

export const SAVE_SERIALIZE_001 = "SAVE_SERIALIZE_001" as const; // Failed to serialize project
export const SAVE_SERIALIZE_002 = "SAVE_SERIALIZE_002" as const; // Serialized payload missing required fields

export const SAVE_DESERIALIZE_001 = "SAVE_DESERIALIZE_001" as const; // Failed to deserialize saved project
export const SAVE_DESERIALIZE_002 = "SAVE_DESERIALIZE_002" as const; // Saved project schema invalid

// ─── DB ──────────────────────────────────────────────────────────────────────

export const DB_READ_001        = "DB_READ_001"        as const; // Failed to read project
export const DB_READ_002        = "DB_READ_002"        as const; // Project not found
export const DB_READ_003        = "DB_READ_003"        as const; // Invalid project shape

export const DB_WRITE_001       = "DB_WRITE_001"       as const; // Failed to write project
export const DB_WRITE_002       = "DB_WRITE_002"       as const; // Database constraint violation
export const DB_WRITE_003       = "DB_WRITE_003"       as const; // Database transaction failed

export const DB_UPDATE_001      = "DB_UPDATE_001"      as const; // Failed to update project
export const DB_UPDATE_002      = "DB_UPDATE_002"      as const; // Failed to update page

export const DB_DELETE_001      = "DB_DELETE_001"      as const; // Failed to delete resource

export const DB_CONNECTION_001  = "DB_CONNECTION_001"  as const; // Database connection failed
export const DB_CONNECTION_002  = "DB_CONNECTION_002"  as const; // Database timeout
export const DB_SCHEMA_001      = "DB_SCHEMA_001"      as const; // Schema mismatch detected

// ─── API ─────────────────────────────────────────────────────────────────────

export const API_REQUEST_001    = "API_REQUEST_001"    as const; // Invalid API request
export const API_REQUEST_002    = "API_REQUEST_002"    as const; // Missing required parameters
export const API_REQUEST_003    = "API_REQUEST_003"    as const; // Request body parsing failed

export const API_RESPONSE_001   = "API_RESPONSE_001"   as const; // Invalid API response
export const API_RESPONSE_002   = "API_RESPONSE_002"   as const; // Response missing required fields

export const API_GENERATE_001   = "API_GENERATE_001"   as const; // Site generation failed
export const API_GENERATE_002   = "API_GENERATE_002"   as const; // Generation response invalid
export const API_GENERATE_003   = "API_GENERATE_003"   as const; // Generated payload unsupported

export const API_SAVE_001       = "API_SAVE_001"       as const; // Save API route failed
export const API_SAVE_002       = "API_SAVE_002"       as const; // Save API returned failure

export const API_TIMEOUT_001    = "API_TIMEOUT_001"    as const; // API request timed out
export const API_RATE_LIMIT_001 = "API_RATE_LIMIT_001" as const; // Rate limit reached
export const API_UNKNOWN_001    = "API_UNKNOWN_001"    as const; // Unexpected API exception

// Billing / auth (mapped from Anthropic errors)
export const API_BILLING_001    = "API_BILLING_001"    as const; // Insufficient credits
export const API_AUTH_001       = "API_AUTH_001"       as const; // Invalid API key / unauthorized

// ─── VALIDATION ──────────────────────────────────────────────────────────────

export const VALIDATION_PROJECT_001 = "VALIDATION_PROJECT_001" as const; // Project payload invalid
export const VALIDATION_PROJECT_002 = "VALIDATION_PROJECT_002" as const; // Project missing required fields

export const VALIDATION_PAGE_001    = "VALIDATION_PAGE_001"    as const; // Page payload invalid
export const VALIDATION_PAGE_002    = "VALIDATION_PAGE_002"    as const; // Page missing required fields

export const VALIDATION_NODE_001    = "VALIDATION_NODE_001"    as const; // Node payload invalid
export const VALIDATION_NODE_002    = "VALIDATION_NODE_002"    as const; // Node missing required id
export const VALIDATION_NODE_003    = "VALIDATION_NODE_003"    as const; // Node missing required type
export const VALIDATION_NODE_004    = "VALIDATION_NODE_004"    as const; // Node children structure invalid

export const VALIDATION_STYLE_001   = "VALIDATION_STYLE_001"   as const; // Style payload invalid
export const VALIDATION_CONTENT_001 = "VALIDATION_CONTENT_001" as const; // Content payload invalid
export const VALIDATION_INPUT_001   = "VALIDATION_INPUT_001"   as const; // User input invalid

// ─── UI ──────────────────────────────────────────────────────────────────────

export const UI_RENDER_001      = "UI_RENDER_001"      as const; // UI render failure
export const UI_RENDER_002      = "UI_RENDER_002"      as const; // Missing UI dependency
export const UI_ACTION_001      = "UI_ACTION_001"      as const; // UI action failed
export const UI_ACTION_002      = "UI_ACTION_002"      as const; // Disabled action triggered
export const UI_MODAL_001       = "UI_MODAL_001"       as const; // Failed to open modal
export const UI_TOAST_001       = "UI_TOAST_001"       as const; // Failed to show error toast
export const UI_BOUNDARY_001    = "UI_BOUNDARY_001"    as const; // Error boundary caught failure

// ─── AUTH ────────────────────────────────────────────────────────────────────

export const AUTH_REQUIRED_001  = "AUTH_REQUIRED_001"  as const; // Authentication required
export const AUTH_SESSION_001   = "AUTH_SESSION_001"   as const; // Session invalid
export const AUTH_PERMISSION_001 = "AUTH_PERMISSION_001" as const; // Permission denied
export const AUTH_TOKEN_001     = "AUTH_TOKEN_001"     as const; // Invalid auth token

// ─── NETWORK ─────────────────────────────────────────────────────────────────

export const NETWORK_001        = "NETWORK_001"        as const; // Network request failed
export const NETWORK_002        = "NETWORK_002"        as const; // Network unavailable
export const NETWORK_003        = "NETWORK_003"        as const; // Request aborted
export const NETWORK_004        = "NETWORK_004"        as const; // Request timed out

// ─── UNKNOWN / FALLBACK ───────────────────────────────────────────────────────

export const UNKNOWN_001        = "UNKNOWN_001"        as const; // Unknown application error
export const UNKNOWN_002        = "UNKNOWN_002"        as const; // Non-error value thrown
export const UNKNOWN_003        = "UNKNOWN_003"        as const; // Unexpected fatal editor failure

// ─── Union type of all valid error codes ─────────────────────────────────────

export type ErrorCode =
  | typeof EDITOR_SELECT_001 | typeof EDITOR_SELECT_002 | typeof EDITOR_SELECT_003
  | typeof EDITOR_HOVER_001 | typeof EDITOR_HOVER_002
  | typeof EDITOR_UPDATE_001 | typeof EDITOR_UPDATE_002 | typeof EDITOR_UPDATE_003
  | typeof EDITOR_DELETE_001 | typeof EDITOR_DELETE_002 | typeof EDITOR_DELETE_003
  | typeof EDITOR_DUPLICATE_001 | typeof EDITOR_DUPLICATE_002 | typeof EDITOR_DUPLICATE_003
  | typeof EDITOR_INSERT_001 | typeof EDITOR_INSERT_002 | typeof EDITOR_INSERT_003
  | typeof EDITOR_MOVE_001 | typeof EDITOR_MOVE_002 | typeof EDITOR_MOVE_003
  | typeof EDITOR_RENDER_001 | typeof EDITOR_RENDER_002 | typeof EDITOR_RENDER_003
  | typeof EDITOR_PANEL_001 | typeof EDITOR_PANEL_002
  | typeof EDITOR_CANVAS_001 | typeof EDITOR_CANVAS_002 | typeof EDITOR_CANVAS_003
  | typeof STATE_INIT_001 | typeof STATE_INIT_002
  | typeof STATE_HYDRATE_001 | typeof STATE_HYDRATE_002
  | typeof STATE_SYNC_001 | typeof STATE_SYNC_002 | typeof STATE_SYNC_003
  | typeof STATE_UPDATE_001 | typeof STATE_UPDATE_002 | typeof STATE_UPDATE_003
  | typeof STATE_SELECTION_001 | typeof STATE_SELECTION_002
  | typeof STATE_PAGE_001 | typeof STATE_PAGE_002 | typeof STATE_PAGE_003
  | typeof STATE_HISTORY_001 | typeof STATE_HISTORY_002 | typeof STATE_HISTORY_003
  | typeof SAVE_PROJECT_001 | typeof SAVE_PROJECT_002 | typeof SAVE_PROJECT_003
  | typeof SAVE_PROJECT_004 | typeof SAVE_PROJECT_005
  | typeof SAVE_AUTOSAVE_001 | typeof SAVE_AUTOSAVE_002
  | typeof SAVE_SERIALIZE_001 | typeof SAVE_SERIALIZE_002
  | typeof SAVE_DESERIALIZE_001 | typeof SAVE_DESERIALIZE_002
  | typeof DB_READ_001 | typeof DB_READ_002 | typeof DB_READ_003
  | typeof DB_WRITE_001 | typeof DB_WRITE_002 | typeof DB_WRITE_003
  | typeof DB_UPDATE_001 | typeof DB_UPDATE_002
  | typeof DB_DELETE_001
  | typeof DB_CONNECTION_001 | typeof DB_CONNECTION_002
  | typeof DB_SCHEMA_001
  | typeof API_REQUEST_001 | typeof API_REQUEST_002 | typeof API_REQUEST_003
  | typeof API_RESPONSE_001 | typeof API_RESPONSE_002
  | typeof API_GENERATE_001 | typeof API_GENERATE_002 | typeof API_GENERATE_003
  | typeof API_SAVE_001 | typeof API_SAVE_002
  | typeof API_TIMEOUT_001 | typeof API_RATE_LIMIT_001 | typeof API_UNKNOWN_001
  | typeof API_BILLING_001 | typeof API_AUTH_001
  | typeof VALIDATION_PROJECT_001 | typeof VALIDATION_PROJECT_002
  | typeof VALIDATION_PAGE_001 | typeof VALIDATION_PAGE_002
  | typeof VALIDATION_NODE_001 | typeof VALIDATION_NODE_002
  | typeof VALIDATION_NODE_003 | typeof VALIDATION_NODE_004
  | typeof VALIDATION_STYLE_001 | typeof VALIDATION_CONTENT_001 | typeof VALIDATION_INPUT_001
  | typeof UI_RENDER_001 | typeof UI_RENDER_002
  | typeof UI_ACTION_001 | typeof UI_ACTION_002
  | typeof UI_MODAL_001 | typeof UI_TOAST_001 | typeof UI_BOUNDARY_001
  | typeof AUTH_REQUIRED_001 | typeof AUTH_SESSION_001
  | typeof AUTH_PERMISSION_001 | typeof AUTH_TOKEN_001
  | typeof NETWORK_001 | typeof NETWORK_002 | typeof NETWORK_003 | typeof NETWORK_004
  | typeof UNKNOWN_001 | typeof UNKNOWN_002 | typeof UNKNOWN_003;
