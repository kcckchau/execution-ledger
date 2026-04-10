import path from 'path';
import { readFileSync } from 'fs';
import { config } from 'dotenv';
import { PrismaClient, SetupType, TriggerType } from '../lib/generated/prisma/client';

config({ path: path.resolve(process.cwd(), '.env') });

const prisma = new PrismaClient();

type Candle = {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number;
};

type MarketFile = {
  symbol: string;
  tradingDate: string;
  sessions: {
    regular: { candles: Candle[] };
  };
  levels: Record<string, number | null>;
};

type Candidate = {
  time: string;
  entry: number;
  stop: number;
  target: number;
  rr: number;
  extension: number;
  score: number;
  quality: 'A' | 'B' | 'C';
  reasons: string[];
};

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  return {
    symbol: get('--symbol'),
    date: get('--date'),
    dryRun: argv.includes('--dry-run'),
    verbose: argv.includes('--verbose'),
    onlyIdeal: argv.includes('--only-ideal'),
  };
}

function loadMarket(symbol: string, date: string): MarketFile {
  const p = path.resolve(`data/market/${symbol}/${date}.json`);
  return JSON.parse(readFileSync(p, 'utf8'));
}

function minutesFromOpen(t: string) {
  const dt = new Date(t);
  const open = new Date(t);
  open.setHours(9, 30, 0, 0);
  return (dt.getTime() - open.getTime()) / 60000;
}

function round(n: number) {
  return Math.round(n * 10000) / 10000;
}

function detect(data: MarketFile): Candidate[] {
  const candles = data.sessions.regular.candles;
  const results: Candidate[] = [];

  for (let i = 3; i < candles.length - 2; i++) {
    const c1 = candles[i - 1];
    const c2 = candles[i];
    const n1 = candles[i + 1];

    const reasons: string[] = [];

    const wasBelow = c1.close < c1.vwap;
    if (!wasBelow) reasons.push('not below VWAP before');

    const reclaim = c2.close > c2.vwap && c2.open <= c2.vwap;
    if (!reclaim) reasons.push('no reclaim candle');

    const hold = n1.low >= n1.vwap * 0.999;
    if (!hold) reasons.push('no hold');

    const extension = ((c2.close - c2.vwap) / c2.vwap) * 100;
    if (extension > 0.35) reasons.push('too extended');

    const mins = minutesFromOpen(c2.time);
    if (mins < 5 || mins > 120) reasons.push('bad timing');

    const entry = c2.close;
    const stop = Math.min(c1.low, c2.low);
    const risk = entry - stop;
    if (risk <= 0) continue;

    const target = entry + risk * 2;
    const rr = (target - entry) / risk;
    if (rr < 1.3) reasons.push('low RR');

    let score = 0;
    if (reclaim) score++;
    if (hold) score++;
    if (extension < 0.2) score++;
    if (rr > 1.8) score++;

    let quality: 'A' | 'B' | 'C';
    if (score >= 3) quality = 'A';
    else if (score === 2) quality = 'B';
    else quality = 'C';

    results.push({
      time: c2.time,
      entry,
      stop,
      target,
      rr,
      extension,
      score,
      quality,
      reasons,
    });
  }

  return results;
}

async function insert(symbol: string, date: string, cands: Candidate[], onlyIdeal: boolean) {
  let inserted = 0;

  for (const c of cands) {
    if (onlyIdeal && c.quality !== 'A') continue;

    await prisma.tradeSetup.create({
      data: {
        setupDate: date,
        symbol,
        setupType: SetupType.VWAP_RECLAIM,
        triggerType: TriggerType.VWAP_RECLAIM,
        direction: 'long',
        entryPrice: round(c.entry),
        stopPrice: round(c.stop),
        targetPrice: round(c.target),
        riskEntry: c.entry.toString(),
        riskStop: c.stop.toString(),
        riskTarget: c.target.toString(),
        trigger: 'VWAP reclaim (auto)',
        decisionTarget: 'auto-detected',
        overallNotes: JSON.stringify({
          time: c.time,
          rr: c.rr,
          extension: c.extension,
          score: c.score,
          reasons: c.reasons,
        }),
        isIdeal: c.quality === 'A',
      },
    });

    inserted++;
  }

  return inserted;
}

async function main() {
  const { symbol, date, dryRun, verbose, onlyIdeal } = parseArgs(process.argv);

  if (!symbol || !date) {
    console.error('Usage: --symbol QQQ --date YYYY-MM-DD');
    process.exit(1);
  }

  const data = loadMarket(symbol, date);
  const cands = detect(data);

  console.log(`Total candidates: ${cands.length}`);

  if (verbose) {
    for (const c of cands) {
      console.log(
        `${c.time} | ${c.quality} | RR=${c.rr.toFixed(2)} | ext=${c.extension.toFixed(3)} | ${c.reasons.join(', ')}`
      );
    }
  }

  if (!dryRun) {
    const inserted = await insert(symbol, date, cands, onlyIdeal);
    console.log(`Inserted ${inserted}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
