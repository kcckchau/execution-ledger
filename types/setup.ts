export const SETUP_TYPES = ['VWAP', 'ORB', 'Pullback', 'Breakout', 'Reversal', 'Other'] as const;
export const GRADES = ['A+', 'A', 'B', 'C', 'D'] as const;
export const ACTION_TYPES = ['starter', 'add', 'trim', 'exit'] as const;
export const DIRECTIONS = ['long', 'short'] as const;

export type SetupType = (typeof SETUP_TYPES)[number];
export type Grade = (typeof GRADES)[number];
export type ActionType = (typeof ACTION_TYPES)[number];
export type Direction = (typeof DIRECTIONS)[number];
export type SetupStatus = 'open' | 'closed';

export interface Execution {
  id: string;
  setupId: string;
  actionType: ActionType;
  price: number;
  size: number;
  executionTime: string;
  note: string;
  createdAt: string;
  updatedAt: string;
}

export interface SetupReview {
  followedPlan: boolean | null;
  wentWell: string;
  failed: string;
  lesson: string;
}

export interface TradeSetup {
  id: string;
  /** Trading day in YYYY-MM-DD format, anchored to America/New_York. */
  setupDate: string;
  symbol: string;
  direction: Direction;
  setupType: SetupType;
  thesis: string;
  initialGrade: Grade | null;
  status: SetupStatus;
  overallNotes: string;
  review: SetupReview | null;
  executions: Execution[];
  createdAt: string;
  updatedAt: string;
}

export const GRADE_COLORS: Record<string, string> = {
  'A+': 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/25',
  'A':  'bg-blue-500/10 text-blue-400 ring-blue-500/25',
  'B':  'bg-amber-500/10 text-amber-400 ring-amber-500/25',
  'C':  'bg-zinc-700/50 text-zinc-400 ring-zinc-600/50',
  'D':  'bg-red-500/10 text-red-400 ring-red-500/25',
};

export const ACTION_DOT_COLORS: Record<ActionType, string> = {
  starter: 'bg-blue-500',
  add:     'bg-emerald-500',
  trim:    'bg-amber-500',
  exit:    'bg-rose-500',
};

export const ACTION_BORDER_COLORS: Record<ActionType, string> = {
  starter: 'border-l-blue-400',
  add:     'border-l-emerald-500',
  trim:    'border-l-amber-400',
  exit:    'border-l-rose-500',
};

export const ACTION_LABELS: Record<ActionType, string> = {
  starter: 'Starter',
  add:     'Add',
  trim:    'Trim',
  exit:    'Exit',
};
