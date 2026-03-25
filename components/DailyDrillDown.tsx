import { type TradeSetup, type Execution, type SetupReview } from '@/types/setup';
import { calcSetupPnl, formatPnl } from '@/lib/pnl';
import { formatSetupDate } from '@/lib/dateUtils';
import SetupCard from './SetupCard';

interface DailyDrillDownProps {
  date: string; // YYYY-MM-DD
  setups: TradeSetup[];
  onAddExecution: (setupId: string, execution: Execution) => void;
  onSaveReview: (setupId: string, review: SetupReview) => void;
  onUpdateStatus: (setupId: string, status: 'open' | 'closed') => void;
}

export default function DailyDrillDown({
  date,
  setups,
  onAddExecution,
  onSaveReview,
  onUpdateStatus,
}: DailyDrillDownProps) {
  const totalPnl = setups.reduce(
    (sum, s) => sum + calcSetupPnl(s.executions, s.direction).realizedPnl,
    0,
  );
  const hasPnl = setups.some((s) =>
    s.executions.some((e) => e.actionType === 'trim' || e.actionType === 'exit'),
  );

  return (
    <div className="flex flex-col gap-4">
      {/* ── Day header ── */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h3 className="text-sm font-semibold text-white">{formatSetupDate(date)}</h3>
          <p className="mt-0.5 text-xs text-zinc-500">
            {setups.length === 0
              ? 'No setups'
              : `${setups.length} setup${setups.length !== 1 ? 's' : ''}`}
          </p>
        </div>

        {hasPnl && (
          <div className="text-right">
            <p className="text-[10px] text-zinc-500 uppercase tracking-wider">
              Daily P&L
            </p>
            <p
              className={`text-base font-bold tabular-nums ${
                totalPnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {formatPnl(totalPnl)}
            </p>
          </div>
        )}
      </div>

      {/* ── Setup cards or empty state ── */}
      {setups.length === 0 ? (
        <p className="text-sm text-zinc-600 italic text-center py-6">
          No setups logged for this day.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {setups.map((setup) => (
            <SetupCard
              key={setup.id}
              setup={setup}
              onAddExecution={onAddExecution}
              onSaveReview={onSaveReview}
              onUpdateStatus={onUpdateStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}
