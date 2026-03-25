import { type TradeSetup, type Execution, type SetupReview } from '@/types/setup';
import SetupCard from './SetupCard';

interface SetupLogProps {
  setups: TradeSetup[];
  onAddExecution: (setupId: string, execution: Execution) => void;
  onSaveReview: (setupId: string, review: SetupReview) => void;
  onUpdateStatus: (setupId: string, status: 'open' | 'closed') => void;
}

export default function SetupLog({
  setups,
  onAddExecution,
  onSaveReview,
  onUpdateStatus,
}: SetupLogProps) {
  if (setups.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-12 text-center">
        <p className="text-sm font-medium text-zinc-300">No setups logged yet.</p>
        <p className="mt-1.5 text-xs text-zinc-500 max-w-xs mx-auto">
          Start by recording a thesis, then log each execution under it.
        </p>
      </div>
    );
  }

  return (
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
  );
}
