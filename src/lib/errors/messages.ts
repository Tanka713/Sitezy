/**
 * User-facing message map.
 *
 * Rules:
 * - Never expose technical details, stack traces, or metadata
 * - Always calm, helpful, and actionable copy
 * - Keep messages short (1 sentence max)
 * - When adding new error codes, add a message here too
 */

import type { ErrorCode } from "./codes";

export const USER_MESSAGES: Record<ErrorCode, string> = {
  // EDITOR — SELECT
  EDITOR_SELECT_001: "Something went wrong selecting this element.",
  EDITOR_SELECT_002: "That element could not be found.",
  EDITOR_SELECT_003: "This element type cannot be selected.",

  // EDITOR — HOVER
  EDITOR_HOVER_001: "Couldn't highlight that element.",
  EDITOR_HOVER_002: "Element is missing a required identifier.",

  // EDITOR — UPDATE
  EDITOR_UPDATE_001: "Couldn't apply that change right now.",
  EDITOR_UPDATE_002: "The update contained invalid data.",
  EDITOR_UPDATE_003: "The element you're editing no longer exists.",

  // EDITOR — DELETE
  EDITOR_DELETE_001: "We couldn't delete that item right now.",
  EDITOR_DELETE_002: "That element has already been removed.",
  EDITOR_DELETE_003: "This element is protected and cannot be deleted.",

  // EDITOR — DUPLICATE
  EDITOR_DUPLICATE_001: "Couldn't duplicate that element.",
  EDITOR_DUPLICATE_002: "The duplicated element is invalid.",
  EDITOR_DUPLICATE_003: "Couldn't find a parent to duplicate into.",

  // EDITOR — INSERT
  EDITOR_INSERT_001: "Couldn't insert that element.",
  EDITOR_INSERT_002: "That insertion point isn't supported.",
  EDITOR_INSERT_003: "The element data is invalid.",

  // EDITOR — MOVE
  EDITOR_MOVE_001: "Couldn't move that element.",
  EDITOR_MOVE_002: "That move destination isn't valid.",
  EDITOR_MOVE_003: "That move would break the page structure.",

  // EDITOR — RENDER
  EDITOR_RENDER_001: "Couldn't render that element.",
  EDITOR_RENDER_002: "This element type isn't supported.",
  EDITOR_RENDER_003: "No renderer found for this element.",

  // EDITOR — PANEL
  EDITOR_PANEL_001: "The properties panel couldn't sync.",
  EDITOR_PANEL_002: "The navigator panel couldn't sync.",

  // EDITOR — CANVAS
  EDITOR_CANVAS_001: "The editor canvas failed to load.",
  EDITOR_CANVAS_002: "Editor selection got out of sync — please click to reselect.",
  EDITOR_CANVAS_003: "Editor interaction couldn't be set up.",

  // STATE — INIT
  STATE_INIT_001: "The editor couldn't start properly. Please refresh.",
  STATE_INIT_002: "Project data is missing. Please reload.",

  // STATE — HYDRATE
  STATE_HYDRATE_001: "Your project data couldn't be loaded.",
  STATE_HYDRATE_002: "Project data is in an unexpected format.",

  // STATE — SYNC
  STATE_SYNC_001: "Editor state got out of sync. Please refresh.",
  STATE_SYNC_002: "A data mismatch was detected.",
  STATE_SYNC_003: "Project state is missing. Please reload.",

  // STATE — UPDATE
  STATE_UPDATE_001: "That update isn't valid in the current state.",
  STATE_UPDATE_002: "Couldn't apply that change.",
  STATE_UPDATE_003: "This change is outdated and was rejected.",

  // STATE — SELECTION
  STATE_SELECTION_001: "The selected element no longer exists.",
  STATE_SELECTION_002: "The selected page no longer exists.",

  // STATE — PAGE
  STATE_PAGE_001: "Couldn't switch to that page.",
  STATE_PAGE_002: "That page doesn't exist.",
  STATE_PAGE_003: "The page structure is corrupted.",

  // STATE — HISTORY
  STATE_HISTORY_001: "Undo isn't available right now.",
  STATE_HISTORY_002: "Redo isn't available right now.",
  STATE_HISTORY_003: "That history snapshot is invalid.",

  // SAVE
  SAVE_PROJECT_001: "Your changes could not be saved. Please try again.",
  SAVE_PROJECT_002: "Save failed — the data wasn't in the right format.",
  SAVE_PROJECT_003: "Save failed — project ID is missing.",
  SAVE_PROJECT_004: "Save returned an unexpected response.",
  SAVE_PROJECT_005: "Save failed due to a conflict — please refresh and try again.",
  SAVE_AUTOSAVE_001: "Auto-save failed. Your changes may not be saved.",
  SAVE_AUTOSAVE_002: "Auto-save was skipped.",
  SAVE_SERIALIZE_001: "Couldn't prepare your project for saving.",
  SAVE_SERIALIZE_002: "Save preparation is missing required data.",
  SAVE_DESERIALIZE_001: "Couldn't load your saved project.",
  SAVE_DESERIALIZE_002: "Your saved project data is in an unexpected format.",

  // DB
  DB_READ_001: "Couldn't load your project from the database.",
  DB_READ_002: "That project doesn't exist.",
  DB_READ_003: "Project data from the database is in an unexpected format.",
  DB_WRITE_001: "We couldn't save your project right now.",
  DB_WRITE_002: "A database constraint prevented saving.",
  DB_WRITE_003: "The save transaction failed. Please try again.",
  DB_UPDATE_001: "Couldn't update your project.",
  DB_UPDATE_002: "Couldn't update that page.",
  DB_DELETE_001: "Couldn't delete that item.",
  DB_CONNECTION_001: "Database connection failed. Please try again.",
  DB_CONNECTION_002: "The database took too long to respond.",
  DB_SCHEMA_001: "A database error was detected. Please contact support.",

  // API
  API_REQUEST_001: "The request was invalid.",
  API_REQUEST_002: "Some required information is missing.",
  API_REQUEST_003: "Couldn't parse the request.",
  API_RESPONSE_001: "The server returned an unexpected response.",
  API_RESPONSE_002: "The server response is missing required data.",
  API_GENERATE_001: "We couldn't generate the site right now. Please try again.",
  API_GENERATE_002: "The generated content wasn't in the expected format.",
  API_GENERATE_003: "The generated content isn't supported.",
  API_SAVE_001: "The save request failed.",
  API_SAVE_002: "The save request returned a failure.",
  API_TIMEOUT_001: "The request took too long. Please try again.",
  API_RATE_LIMIT_001: "You've hit the rate limit. Please wait a moment and try again.",
  API_UNKNOWN_001: "An unexpected error occurred. Please try again.",
  API_BILLING_001: "Your credit balance is too low. Please add credits to continue.",
  API_AUTH_001: "Your API key is invalid or expired. Please check your settings.",

  // VALIDATION
  VALIDATION_PROJECT_001: "Project data is invalid.",
  VALIDATION_PROJECT_002: "Project is missing required fields.",
  VALIDATION_PAGE_001: "Page data is invalid.",
  VALIDATION_PAGE_002: "Page is missing required fields.",
  VALIDATION_NODE_001: "Element data is invalid.",
  VALIDATION_NODE_002: "Element is missing a required ID.",
  VALIDATION_NODE_003: "Element is missing a required type.",
  VALIDATION_NODE_004: "Element children structure is invalid.",
  VALIDATION_STYLE_001: "Style data is invalid.",
  VALIDATION_CONTENT_001: "Content data is invalid.",
  VALIDATION_INPUT_001: "Please check your input and try again.",

  // UI
  UI_RENDER_001: "Something went wrong displaying this part of the page.",
  UI_RENDER_002: "A required component couldn't be loaded.",
  UI_ACTION_001: "That action failed. Please try again.",
  UI_ACTION_002: "That action isn't available right now.",
  UI_MODAL_001: "Couldn't open that dialog. Please try again.",
  UI_TOAST_001: "Couldn't display the notification.",
  UI_BOUNDARY_001: "Something went wrong. Please refresh the page.",

  // AUTH
  AUTH_REQUIRED_001: "Please sign in to continue.",
  AUTH_SESSION_001: "Your session has expired. Please sign in again.",
  AUTH_PERMISSION_001: "You don't have permission to do that.",
  AUTH_TOKEN_001: "Authentication failed. Please sign in again.",

  // NETWORK
  NETWORK_001: "The request failed. Please check your connection.",
  NETWORK_002: "No internet connection. Please reconnect and try again.",
  NETWORK_003: "The request was cancelled.",
  NETWORK_004: "The request timed out. Please try again.",

  // UNKNOWN
  UNKNOWN_001: "An unexpected error occurred. Please try again.",
  UNKNOWN_002: "An unexpected problem occurred.",
  UNKNOWN_003: "A fatal editor error occurred. Please refresh the page.",
};

/**
 * Get the safe user-facing message for any error code.
 * Falls back to a generic message if the code isn't in the map.
 */
export function getUserMessage(code: string): string {
  return (USER_MESSAGES as Record<string, string>)[code]
    ?? "An unexpected error occurred. Please try again.";
}
