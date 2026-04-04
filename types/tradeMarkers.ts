/**
 * Single fill / marker from an IBKR JSON file (raw file input format).
 * This type represents the on-disk shape before import; it is NOT used in the
 * API response or chart rendering pipeline — use TradeMarker for those.
 */
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
