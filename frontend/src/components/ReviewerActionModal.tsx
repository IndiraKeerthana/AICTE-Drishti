import React, { useState } from 'react';
import { X, ShieldAlert, CheckCircle, AlertCircle } from 'lucide-react';
import { Finding } from '../types';

interface ReviewerActionModalProps {
  finding: Finding | null;
  onClose: () => void;
  onSubmit: (findingId: number, data: { action_type: string; justification_remarks: string; reviewer_name?: string }) => Promise<void>;
}

export const ReviewerActionModal: React.FC<ReviewerActionModalProps> = ({
  finding,
  onClose,
  onSubmit,
}) => {
  const [actionType, setActionType] = useState('REQUEST_DEFICIENCY');
  const [justification, setJustification] = useState('');
  const [reviewerName, setReviewerName] = useState('Dr. V. Sharma (AICTE Scrutiny Officer)');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!finding) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (justification.trim().length < 5) {
      setError('Please provide a substantive justification remark (at least 5 characters).');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(finding.id, {
        action_type: actionType,
        justification_remarks: justification.trim(),
        reviewer_name: reviewerName.trim(),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record reviewer action');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-sm">
              Record Official Scrutiny Decision
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
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Target Finding Info */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block mb-1">
              Active Finding
            </span>
            <div className="font-bold text-slate-800">{finding.title}</div>
            <div className="text-slate-500 font-mono text-[11px] mt-0.5">
              Code: {finding.finding_code} | Severity: {finding.severity}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Official Scrutiny Action
            </label>
            <select
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              className="w-full text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="REQUEST_DEFICIENCY">
                Issue Formal Deficiency Query (Requires Document Replacement)
              </option>
              <option value="ACKNOWLEDGE">
                Acknowledge Discrepancy (Mark for In-Person Scrutiny Committee)
              </option>
              <option value="RESOLVE">
                Resolve Finding (Deem Satisfactorily Verified)
              </option>
              <option value="OVERRIDE">
                Officer Administrative Override (State Gazette / Relaxation)
              </option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reviewer Name & Designation
            </label>
            <input
              type="text"
              required
              value={reviewerName}
              onChange={(e) => setReviewerName(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mandatory Justification Remarks & Audit Notes
            </label>
            <textarea
              required
              rows={3}
              placeholder="State the regulatory grounds, certificate verification details, or exact deficiency notice instructions for the applicant..."
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 leading-relaxed"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              This action will be appended to the cryptographically linked SHA-256 audit trail.
            </p>
          </div>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-4 py-2 text-xs rounded-lg shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Recording Action...' : 'Confirm Scrutiny Action'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
