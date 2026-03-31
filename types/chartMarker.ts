/** Unified chart marker — the only shape SessionChart cares about. */
export interface UnifiedChartMarker {
  /** ISO timestamp string used to place the marker on the time axis. */
  time: string;
  price: number;
  shape: 'arrowUp' | 'arrowDown' | 'circle' | 'square';
  color: string;
  /** Short label shown on the chart (e.g. "S", "A", "T", "X"). */
  text: string;
}
