import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';
import { UserInfo } from '../types';

interface FinalDecisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  applicationNumber: string;
  institutionName: string;
  currentUser: UserInfo;
  onSubmit: (decision: string, justificationRemarks: string) => Promise<void>;
}

export const FinalDecisionModal: React.FC<FinalDecisionModalProps> = ({
  isOpen,
  onClose,
  applicationNumber,
  institutionName,
  currentUser,
  onSubmit,
}) => {
  const [decision, setDecision] = useState('RECOMMEND_APPROVAL');
  const [remarks, setRemarks] = useState(
    'All statutory document checks and institutional declarations verified. Recommended for Approval by Scrutiny Committee.'
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (remarks.trim().length < 10) {
      setError('Please provide a substantive justification remark of at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(decision, remarks.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record decision');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 text-xs">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h3 className="font-bold text-sm">
              Record Statutory Regulatory Decision
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {/* Target Application */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <p className="font-mono text-blue-700 font-bold">{applicationNumber}</p>
            <p className="text-slate-700 font-medium">{institutionName}</p>
            <p className="text-[11px] text-slate-500 mt-1">
              Authorised Official: <strong>{currentUser.full_name}</strong> ({currentUser.designation})
            </p>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Select Final Regulatory Decision
            </label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <button
                type="button"
                onClick={() => setDecision('RECOMMEND_APPROVAL')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  decision === 'RECOMMEND_APPROVAL'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 font-bold ring-2 ring-emerald-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CheckCircle2 className="w-4 h-4 mx-auto mb-1 text-emerald-600" />
                <span>Recommend Approval</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('RECOMMEND_REJECTION')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  decision === 'RECOMMEND_REJECTION'
                    ? 'border-red-500 bg-red-50 text-red-800 font-bold ring-2 ring-red-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <XCircle className="w-4 h-4 mx-auto mb-1 text-red-600" />
                <span>Recommend Rejection</span>
              </button>

              <button
                type="button"
                onClick={() => setDecision('DEFICIENCY_NOTICE')}
                className={`p-3 rounded-lg border text-center transition-all ${
                  decision === 'DEFICIENCY_NOTICE'
                    ? 'border-amber-500 bg-amber-50 text-amber-800 font-bold ring-2 ring-amber-500/20'
                    : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                }`}
              >
                <AlertCircle className="w-4 h-4 mx-auto mb-1 text-amber-600" />
                <span>Deficiency Notice</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 mb-1">
              Statutory Justification & Committee Remarks
            </label>
            <p className="text-[11px] text-slate-500 mb-1.5">
              Record the statutory rationale for the permanent official audit trail.
            </p>
            <textarea
              rows={3}
              required
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-800"
            />
          </div>

          <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-lg text-[11px] text-blue-900 leading-relaxed">
            <strong>Human Authority Assurance:</strong> AICTE-Drishti automated scrutiny assists by extracting, comparing, and flagging evidence. The final approval or rejection is recorded solely under statutory human authorization.
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
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2 rounded-lg transition-colors flex items-center space-x-1.5 disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Recording Decision...' : 'Record Official Decision'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
