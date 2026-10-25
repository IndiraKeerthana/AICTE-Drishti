import React, { useState } from 'react';
import { X, AlertTriangle, Send, CheckSquare, Square } from 'lucide-react';
import { Finding } from '../types';

interface DeficiencyNoticeModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationNumber: string;
  findings: Finding[];
  onSubmit: (findingIds: number[], instructions: string) => Promise<void>;
}

export const DeficiencyNoticeModal: React.FC<DeficiencyNoticeModalProps> = ({
  isOpen,
  onClose,
  applicationNumber,
  findings,
  onSubmit,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>(
    findings.filter(f => f.review_status !== 'RESOLVED').map(f => f.id)
  );
  const [instructions, setInstructions] = useState(
    'Please rectify the specified regulatory discrepancy and upload the replacement statutory document.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const toggleFinding = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError('Please select at least one finding for the deficiency notice.');
      return;
    }
    if (instructions.trim().length < 5) {
      setError('Please enter clear instructions for the institution.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(selectedIds, instructions.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to issue deficiency notice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-amber-700 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-200" />
            <h3 className="font-bold text-sm">
              Issue Deficiency Notice — {applicationNumber}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-amber-200 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block font-bold text-slate-800 mb-2">
              Select Deficiencies Requiring Institution Correction ({selectedIds.length} of {findings.length})
            </label>
            <div className="max-h-48 overflow-y-auto space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
              {findings.map((f) => {
                const isSelected = selectedIds.includes(f.id);
                return (
                  <div
                    key={f.id}
                    onClick={() => toggleFinding(f.id)}
                    className={`p-2.5 rounded border cursor-pointer transition-colors flex items-start gap-2.5 ${
                      isSelected
                        ? 'bg-amber-50/80 border-amber-300'
                        : 'bg-white border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="mt-0.5 text-amber-600">
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-slate-800">{f.title}</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">{f.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Instructions for Applicant Institution
            </label>
            <p className="text-[11px] text-slate-500 mb-1.5">
              Explain clearly what the institution must rectify or what replacement document is required.
            </p>
            <textarea
              rows={3}
              required
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-800"
            />
          </div>

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-slate-600 hover:bg-slate-100 font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2 rounded-lg transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Sending Notice...' : 'Send Deficiency Notice'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
