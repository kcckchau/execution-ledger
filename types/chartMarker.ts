/**
 * Canonical chart marker type used across the API → UI pipeline.
 *
 * Explicit linkage fields (executionId, setupId) are always populated for
 * DB-backed IBKR markers and must be used for any setup-level filtering.
 * They are optional (null) only for file-based/mock markers that have not
 * been imported into the database yet.
 */
export interface TradeMarker {
  // ── Identity ───────────────────────────────────────────────────────────────
  id: string;

  // ── Visual / chart rendering ───────────────────────────────────────────────
  time: string;   // ISO timestamp
  price: number;
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
  color: string;
  text: string;   // short chart label (e.g. "B", "S")

  // ── Execution semantics ────────────────────────────────────────────────────
  action: 'BUY' | 'SELL';
  quantity?: number;
  note?: string;

  // ── Explicit linkage (deterministic, no approximate matching) ──────────────
  /**
   * FK → Execution.id.
   * Derived at import time: `"exec-" + ChartMarker.externalId`.
   * Null for file-based or unlinked markers.
   */
  executionId?: string | null;
  /**
   * FK → TradeSetup.id.
   * Set at import time from the auto-generated setup for this (symbol, date).
   * Null for file-based or unlinked markers.
   */
  setupId?: string | null;
  setupType?: string | null;
  setupLabel?: string | null; // computed from SETUP_TYPE_LABELS on the client
}

/**
 * Descriptor for a setup that owns at least one chart marker on a given day.
 * Returned alongside tradeMarkers by /api/chart-data.
 */
export interface SetupMarkerMeta {
  id: string;
  setupType: string;
  /** Optional human-readable name. Preferred over setupType for display. */
  setupName?: string | null;
}

/**
 * @deprecated Use TradeMarker instead.
 * Kept temporarily so existing callers don't break during migration.
 */
export type UnifiedChartMarker = TradeMarker;
