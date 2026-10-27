import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ShieldCheck,
  AlertTriangle,
  Info,
  CheckCircle2,
  Layers
} from 'lucide-react';

export interface DocumentViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentTitle: string;
  categoryCode?: string;
  streamUrl: string;
  mimeType?: string;
  pageCount?: number;
  initialPage?: number;
  extractedText?: string | null;
  verificationSource?: string | null;
  verificationStatus?: string | null;
  verificationEvidence?: string | null;
  supportingSnippet?: string | null;
}

export const DocumentViewerModal: React.FC<DocumentViewerModalProps> = ({
  isOpen,
  onClose,
  documentTitle,
  categoryCode,
  streamUrl,
  mimeType = 'application/pdf',
  pageCount = 1,
  initialPage = 1,
  extractedText,
  verificationSource,
  verificationStatus,
  verificationEvidence,
  supportingSnippet,
}) => {
  const [currentPage, setCurrentPage] = useState<number>(initialPage || 1);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [showMetadataPanel, setShowMetadataPanel] = useState<boolean>(false);

  // Sync initialPage when opened
  useEffect(() => {
    if (initialPage && initialPage > 0) {
      setCurrentPage(initialPage);
    } else {
      setCurrentPage(1);
    }
  }, [initialPage, isOpen]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isPdf =
    mimeType?.includes('pdf') ||
    documentTitle.toLowerCase().endsWith('.pdf') ||
    streamUrl.toLowerCase().includes('.pdf');

  const isImage =
    mimeType?.includes('image') ||
    documentTitle.toLowerCase().endsWith('.png') ||
    documentTitle.toLowerCase().endsWith('.jpg') ||
    documentTitle.toLowerCase().endsWith('.jpeg');

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 20, 200));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 20, 60));
  const handleResetZoom = () => setZoomLevel(100);

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage((p) => p - 1);
  };

  const handleNextPage = () => {
    if (pageCount && currentPage < pageCount) {
      setCurrentPage((p) => p + 1);
    } else if (!pageCount) {
      setCurrentPage((p) => p + 1);
    }
  };

  const pdfUrlWithPage = `${streamUrl}#page=${currentPage}&navpanes=1&toolbar=1`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden border border-slate-700">
        {/* Modal Top Bar */}
        <div className="px-5 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm text-white truncate max-w-md" title={documentTitle}>
                  {documentTitle}
                </h3>
                {categoryCode && (
                  <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700 px-2 py-0.5 rounded uppercase">
                    {categoryCode.replace(/_/g, ' ')}
                  </span>
                )}
                {initialPage && initialPage > 1 && (
                  <span className="text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 px-2 py-0.5 rounded">
                    Evidence on Page {initialPage}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                AICTE Secure Document Inspection &bull; Official In-App Preview
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center space-x-2 shrink-0">
            {/* Page Navigation Controls */}
            {(pageCount > 1 || isPdf) && (
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs text-slate-300">
                <button
                  type="button"
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-1 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono text-[11px]">
                  Page {currentPage} {pageCount ? `of ${pageCount}` : ''}
                </span>
                <button
                  type="button"
                  onClick={handleNextPage}
                  disabled={Boolean(pageCount && currentPage >= pageCount)}
                  className="p-1 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 transition-colors"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Image Zoom Controls */}
            {isImage && (
              <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs text-slate-300">
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1 hover:text-white transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="px-2 font-mono text-[11px]">{zoomLevel}%</span>
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1 hover:text-white transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="p-1 hover:text-white transition-colors border-l border-slate-700 ml-1 pl-1.5"
                  title="Fit to Screen"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Toggle Extracted Text / Metadata Button */}
            <button
              type="button"
              onClick={() => setShowMetadataPanel((prev) => !prev)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 border transition-colors ${
                showMetadataPanel
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title="Toggle Document OCR & Verification Details"
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Extracted Data</span>
            </button>

            {/* Open in external tab fallback */}
            <a
              href={streamUrl}
              target="_blank"
              rel="noreferrer"
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
              title="Open raw document stream in browser window"
            >
              <ExternalLink className="w-4 h-4" />
            </a>

            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-400 hover:text-white hover:bg-red-600 transition-colors"
              title="Close Preview (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Viewport */}
        <div className="flex-1 flex overflow-hidden bg-slate-950/70 relative">
          {/* Document Content */}
          <div className="flex-1 flex items-center justify-center overflow-auto p-2 sm:p-4 bg-slate-950">
            {isPdf ? (
              <iframe
                key={`${streamUrl}-${currentPage}`}
                src={pdfUrlWithPage}
                className="w-full h-full rounded-lg border border-slate-800 bg-white"
                title={documentTitle}
              />
            ) : isImage ? (
              <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                <img
                  src={streamUrl}
                  alt={documentTitle}
                  style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'center center' }}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-lg transition-transform duration-150"
                />
              </div>
            ) : (
              <div className="text-center p-8 max-w-md">
                <FileText className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                <h4 className="font-bold text-slate-200 mb-2">{documentTitle}</h4>
                <p className="text-xs text-slate-400 mb-4">
                  This document format ({mimeType}) can be inspected directly via native browser stream or external viewer.
                </p>
                <a
                  href={streamUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>Open Full Document Stream</span>
                </a>
              </div>
            )}
          </div>

          {/* Collapsible Extracted Information & Verification Drawer */}
          {showMetadataPanel && (
            <div className="w-80 sm:w-96 bg-slate-900 border-l border-slate-800 p-4 overflow-y-auto space-y-4 shrink-0 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center space-x-1.5 text-slate-200 font-bold">
                  <ShieldCheck className="w-4 h-4 text-blue-400" />
                  <span>Document Intelligence</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowMetadataPanel(false)}
                  className="text-slate-400 hover:text-white p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Verification Status Pill */}
              {verificationStatus && (
                <div className="p-3 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Verification Outcome
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        verificationStatus === 'VERIFIED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : verificationStatus === 'EXPIRED'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {verificationStatus}
                    </span>
                    {verificationSource && (
                      <span className="text-[10px] text-slate-300 truncate" title={verificationSource}>
                        via {verificationSource}
                      </span>
                    )}
                  </div>
                  {verificationEvidence && (
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      {verificationEvidence}
                    </p>
                  )}
                </div>
              )}

              {/* Supporting Evidence Snippet from Finding */}
              {supportingSnippet && (
                <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-800/60 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-blue-400 block">
                    Referenced Finding Evidence
                  </span>
                  <p className="text-xs text-blue-200 font-mono bg-blue-900/30 p-2 rounded border border-blue-800/40 whitespace-pre-wrap leading-relaxed">
                    {supportingSnippet}
                  </p>
                </div>
              )}

              {/* Extracted Text Content */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Extracted Text Content
                  </span>
                  <span className="text-[10px] text-slate-500">
                    {extractedText ? `${extractedText.length} characters` : 'No text'}
                  </span>
                </div>
                {extractedText ? (
                  <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 max-h-80 overflow-y-auto text-[11px] text-slate-300 font-mono leading-relaxed whitespace-pre-wrap select-text">
                    {extractedText}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/60 text-center text-slate-400 text-xs">
                    No OCR or machine-readable text was extracted from this attachment.
                  </div>
                )}
              </div>

              {/* Handbook Verification Note */}
              <div className="p-3 bg-slate-800/50 rounded-xl border border-slate-700 text-[11px] text-slate-400 flex items-start gap-2">
                <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <p>
                  AICTE Scrutiny Officers inspect the raw statutory certificate to verify official stamps, signatures, and issuing authority validity dates.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-5 py-2.5 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
            <span>Tamper-Evident Storage &bull; Streamed securely from AICTE Encrypted Vault</span>
          </div>
          <div className="flex items-center space-x-3">
            <span>Press <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-300">Esc</kbd> to close</span>
          </div>
        </div>
      </div>
    </div>
  );
};
