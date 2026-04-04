/** Single fill / marker from IBKR export (aligned to chart bars). */
export interface TradeMarkerItem {
  time: string;
  minuteTime?: string;
  symbol: string;
  side: string;
  shares: number;
  price: number;
  executionType: string;
  positionEffect: string;
  shape: string;
  color: string;
  text: string;
  /** Present when the marker was matched to a TradeSetup via Execution time/price. */
  setupId?: string | null;
  setupType?: string | null;
}

/** Root JSON from `data/trades/{symbol}/{YYYYMMDD}-markers.json`. */
export interface TradeMarkerFilePayload {
  symbol: string;
  tradeDate: string;
  timezone: string;
  rawCount: number;
  mergedCount: number;
  markers: TradeMarkerItem[];
}
