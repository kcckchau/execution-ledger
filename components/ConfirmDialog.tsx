'use client';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirm',
  danger = true,
  pending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70" onClick={pending ? undefined : onCancel} />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-lg border border-zinc-700 bg-zinc-900 p-5 shadow-xl">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-400">{message}</p>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            className="h-8 px-4 rounded-md text-xs font-medium text-zinc-400 transition-colors hover:text-white disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            className={`h-8 px-4 rounded-md text-xs font-medium transition-colors disabled:opacity-60 ${
              danger
                ? 'bg-rose-600 text-white hover:bg-rose-500'
                : 'bg-indigo-600 text-white hover:bg-indigo-500'
            }`}
          >
            {pending ? 'Deleting…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
