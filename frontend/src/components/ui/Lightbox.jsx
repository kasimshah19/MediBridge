import { X, ZoomIn, Download } from 'lucide-react';

export default function Lightbox({ isOpen, onClose, src, title = 'Photograph Preview' }) {
  if (!isOpen || !src) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative max-w-3xl w-full bg-white rounded-3xl overflow-hidden shadow-2xl border border-teal-900/10 z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <ZoomIn size={16} className="text-teal-700" />
            <span className="text-xs font-bold text-text-heading truncate">{title}</span>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={src}
              download="medicine-photo.jpg"
              className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              title="Download image"
            >
              <Download size={15} />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
              aria-label="Close"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Image Display */}
        <div className="p-4 flex items-center justify-center bg-slate-950/5 overflow-auto flex-1 min-h-[300px]">
          <img
            src={src}
            alt={title}
            className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-sm border border-slate-200/50"
          />
        </div>
      </div>
    </div>
  );
}

