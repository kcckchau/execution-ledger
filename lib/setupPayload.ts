import type {
  Context,
  DayType,
  EntryTrigger,
  KeyLevel,
  Location,
  SetupValidity,
  TradeLocation,
  TradeResult,
  Trigger,
} from '@/types/setup';

type DeprecatedSetupFields = {
  trigger: string;
  contexts: Context[];
  locations: Location[];
  entryTrigger: EntryTrigger | null;
  outcome: TradeResult | null;
  setupResult: 'PLAYED_OUT' | 'FAILED' | 'UNCLEAR' | null;
};

type CompatibilitySource = {
  triggers: Trigger[];
  dayType: DayType | null;
  location: TradeLocation | null;
  keyLevels: KeyLevel[];
  tradeResult: TradeResult | null;
  setupValidity: SetupValidity | null;
};

const LEGACY_LOCATION_MAP: Partial<Record<KeyLevel, Location>> = {
  PDH: 'PDH',
  PDL: 'PDL',
  PREMARKET_HIGH: 'PREMARKET_HIGH',
  PREMARKET_LOW: 'PREMARKET_LOW',
  RANGE_HIGH: 'RANGE_HIGH',
  RANGE_LOW: 'RANGE_LOW',
  VWAP: 'VWAP',
  WHOLE_NUMBER: 'WHOLE_NUMBER',
};

function deriveLegacyContexts(dayType: DayType | null, location: TradeLocation | null): Context[] {
  const contexts: Context[] = [];

  if (dayType) contexts.push(dayType);
  if (location === 'ABOVE_VWAP') contexts.push('ABOVE_VWAP');
  if (location === 'BELOW_VWAP') contexts.push('BELOW_VWAP');

  return [...new Set(contexts)];
}

function deriveLegacyLocations(keyLevels: KeyLevel[]): Location[] {
  return keyLevels
    .map((level) => LEGACY_LOCATION_MAP[level])
    .filter((value): value is Location => value != null);
}

function deriveLegacySetupResult(setupValidity: SetupValidity | null): DeprecatedSetupFields['setupResult'] {
  switch (setupValidity) {
    case 'CORRECT_READ':
      return 'PLAYED_OUT';
    case 'WRONG_READ':
      return 'FAILED';
    case 'PARTIAL':
      return 'UNCLEAR';
    default:
      return null;
  }
}

export function deriveDeprecatedSetupFields({
  triggers,
  dayType,
  location,
  keyLevels,
  tradeResult,
  setupValidity,
}: CompatibilitySource): DeprecatedSetupFields {
  return {
    // Deprecated free-text fallback derived from canonical triggers[].
    trigger: triggers.join(', '),
    // Deprecated compatibility fields derived from canonical context fields.
    contexts: deriveLegacyContexts(dayType, location),
    locations: deriveLegacyLocations(keyLevels),
    // No reliable canonical mapping exists anymore, so keep this empty.
    entryTrigger: null,
    // Deprecated review compatibility fields derived from canonical review fields.
    outcome: tradeResult,
    setupResult: deriveLegacySetupResult(setupValidity),
  };
}
