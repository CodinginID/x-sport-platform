import { createPortal } from 'react-dom';
import { useToastStore } from '@/stores/toast';
import { cn } from '@/utils';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const icons = { success: CheckCircle, error: XCircle, warning: AlertTriangle, info: Info };
const styles = {
  success: 'bg-emerald-600 text-white',
  error: 'bg-red-600 text-white',
  warning: 'bg-amber-500 text-white',
  info: 'bg-zen-brand text-white',
};

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();
  if (!toasts.length) return null;

  return createPortal(
    <div aria-live="polite" aria-atomic="false" className="fixed bottom-6 left-1/2 -translate-x-1/2 md:left-auto md:translate-x-0 md:top-6 md:right-6 md:bottom-auto z-[100] flex flex-col gap-2 w-[90vw] max-w-sm">
      {toasts.map((t) => {
        const Icon = icons[t.variant];
        return (
          <div key={t.id} role="alert" className={cn('flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg animate-[slideIn_0.2s_ease]', styles[t.variant])}>
            <Icon size={18} aria-hidden="true" />
            <span className="flex-1 text-sm font-medium">{t.message}</span>
            <button onClick={() => removeToast(t.id)} aria-label="Dismiss notification" className="opacity-70 hover:opacity-100"><X size={16} /></button>
          </div>
        );
      })}
    </div>,
    document.body
  );
}
