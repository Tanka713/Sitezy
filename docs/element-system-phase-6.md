## Phase 6 — Inspector and Sidebar Stability

This phase focused on the inspector state flow instead of adding new elements. The goal was to stop stale values, draft resets, and wrong-time rehydration while keeping the existing editor APIs and iframe protocol intact.

### What changed

- Reworked the inspector sync boundary in [EditPanel.tsx](/Users/hashem/Desktop/sitezyV2/src/components/editor/EditPanel.tsx).
- Replaced the old `lastSyncedNodeId` approach with a broader selection sync key that tracks the active node plus its text, media, widget, collection, animation, link, and list targets.
- Stopped the main sync effect from depending directly on `activeField`, so blurring a field no longer triggers a stale full-panel rehydrate before the iframe posts the updated node back.
- Moved focus locking to a ref-based check, so the inspector can still guard in-progress edits without using focus changes as a sync trigger.
- Normalized widget drafts from their declared widget fields instead of trusting partial state.
- Normalized collection drafts from their declared collection fields instead of trusting partial item payloads.
- Normalized logo draft application so the textarea and live state stay aligned after apply.
- Added safer selection-clear handling so the inspector collapses cleanly without churn when nothing is selected.

### Bugs addressed

- Text/widget/collection apply flows could briefly snap back to stale node values on blur.
- Widget and collection editors could show missing fields or partially shaped state after selection updates.
- Selection changes were keyed only to `nodeId`, which was too narrow for the newer multi-target editing model.
- Clearing selection could leave stale local state around longer than needed.

### Stability impact

- Field edits are less likely to reset while focus moves between textarea, inputs, and apply buttons.
- Widget and collection panels now keep a complete local schema shape even when saved data is partial.
- Inspector state changes now follow real node updates instead of focus churn.
- Section accordions still reset on actual selection changes, but not on routine blur events.
