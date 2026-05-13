import { createPortal } from 'react-dom';
import { X, Download, Printer } from 'lucide-react';

export function PrintPreview({ open, onClose, pdfUrl, filename }: {
  open: boolean; onClose: () => void; pdfUrl: string; filename: string;
}) {
  if (!open || !pdfUrl) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = filename;
    a.click();
  };

  const handlePrint = () => {
    const iframe = document.getElementById('pdf-preview') as HTMLIFrameElement;
    iframe?.contentWindow?.print();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex flex-col bg-zen-ink/60 backdrop-blur-sm">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-b">
        <span className="text-sm font-bold truncate">{filename}</span>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zen-bg text-zen-ink text-[10px] uppercase tracking-widest font-bold hover:bg-zen-brand/10 transition-colors min-h-[44px]">
            <Printer size={14} /> Cetak
          </button>
          <button onClick={handleDownload} className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zen-brand text-white text-[10px] uppercase tracking-widest font-bold hover:bg-zen-ink transition-colors min-h-[44px]">
            <Download size={14} /> Download
          </button>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-zen-bg flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors">
            <X size={18} />
          </button>
        </div>
      </div>
      {/* PDF Preview */}
      <div className="flex-1 p-4 overflow-auto">
        <iframe id="pdf-preview" src={pdfUrl} className="w-full h-full rounded-2xl bg-white shadow-2xl" />
      </div>
    </div>,
    document.body
  );
}
