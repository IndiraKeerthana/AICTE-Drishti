import React from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  FileSearch,
  ArrowRight,
  UserCheck,
  Scale
} from 'lucide-react';
import { Finding } from '../types';

interface FindingsPanelProps {
  findings: Finding[];
  onOpenActionModal: (finding: Finding) => void;
}

export const FindingsPanel: React.FC<FindingsPanelProps> = ({
  findings,
  onOpenActionModal,
}) => {
  if (findings.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center shadow-sm">
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
        <h4 className="text-base font-bold text-slate-800 mb-1">No Scrutiny Deficiencies Flagged</h4>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          All automated rule checks (intake capacity, duplicate documents, and basic consistency) have passed successfully.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-800">
            Evidence-Linked Findings ({findings.length})
          </h3>
          <p className="text-xs text-slate-500">
            Identified regulatory mismatches, duplicate documents, and clause shortfalls requiring officer review.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {findings.map((f) => (
          <div
            key={f.id}
            className={`bg-white rounded-xl border p-5 shadow-sm transition-all ${
              f.severity === 'CRITICAL'
                ? 'border-red-200 hover:border-red-300'
                : 'border-amber-200 hover:border-amber-300'
            }`}
          >
            {/* Header / Severity / Finding Code */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center space-x-2.5">
                {f.severity === 'CRITICAL' ? (
                  <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center shrink-0">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-500">
                      {f.finding_code}
                    </span>
                    <span
                      className={
                        f.severity === 'CRITICAL'
                          ? 'badge-critical'
                          : 'badge-high'
                      }
                    >
                      {f.severity} PRIORITY
                    </span>
                    <span className="bg-slate-100 text-slate-700 text-[10px] font-semibold px-2 py-0.5 rounded">
                      {f.category.replace('_', ' ')}
                    </span>
                    {f.evidence_classification && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        f.evidence_classification === 'VERIFIED_FACT' ? 'bg-emerald-50 text-emerald-800 border-emerald-300' :
                        f.evidence_classification === 'AUTOMATED_INFERENCE' ? 'bg-blue-50 text-blue-800 border-blue-300' :
                        f.evidence_classification === 'POTENTIAL_ANOMALY' ? 'bg-amber-50 text-amber-800 border-amber-300' :
                        'bg-slate-100 text-slate-700 border-slate-300'
                      }`}>
                        {f.evidence_classification === 'VERIFIED_FACT' ? 'Verified Fact' :
                         f.evidence_classification === 'AUTOMATED_INFERENCE' ? 'Automated Inference' :
                         f.evidence_classification === 'POTENTIAL_ANOMALY' ? 'Potential Anomaly' :
                         f.evidence_classification.replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                  <h4 className="text-sm font-bold text-slate-800 mt-1">
                    {f.title}
                  </h4>
                </div>
              </div>

              {/* Status Badge */}
              <div>
                {f.review_status === 'OPEN' && (
                  <span className="bg-red-50 text-red-700 border border-red-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                    Action Required
                  </span>
                )}
                {f.review_status === 'ACKNOWLEDGED' && (
                  <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                    Acknowledged by Officer
                  </span>
                )}
                {f.review_status === 'RECTIFICATION_REQUESTED' && (
                  <span className="bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold px-2.5 py-1 rounded-full">
                    Deficiency Notice Issued
                  </span>
                )}
                {f.review_status === 'RESOLVED' && (
                  <span className="badge-verified">
                    Resolved & Cleared
                  </span>
                )}
              </div>
            </div>

            {/* Finding Description */}
            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {f.description}
            </p>

            {/* Side-by-Side Value Proof Comparison */}
            {(f.expected_value || f.observed_value) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-lg border border-slate-200/80 mb-4 text-xs font-mono">
                <div className="border-r border-slate-200 pr-3">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Expected Regulatory Value
                  </span>
                  <span className="text-emerald-700 font-bold">
                    {f.expected_value || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Observed Declared / Extracted Value
                  </span>
                  <span className="text-red-700 font-bold">
                    {f.observed_value || 'N/A'}
                  </span>
                </div>
              </div>
            )}

            {/* Rule Citation & Recommended Action */}
            <div className="space-y-2 text-xs mb-4">
              <div className="flex items-start gap-2 text-slate-500">
                <Scale className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-700">APH Clause Citation: </span>
                  <span className="font-mono text-[11px] text-blue-700 font-medium">{f.rule_code}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">{f.rule_description}</p>
                </div>
              </div>

              <div className="flex items-start gap-2 text-slate-600">
                <FileSearch className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-slate-700">Recommended Next Step: </span>
                  <span>{f.recommended_action}</span>
                </div>
              </div>
            </div>

            {/* Officer Remarks if present */}
            {f.resolution_notes && (
              <div className="p-3 bg-blue-50/70 rounded-lg border border-blue-200/60 mb-4 text-xs text-blue-900">
                <span className="font-bold flex items-center gap-1.5 text-blue-800 mb-0.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  Officer Recorded Justification:
                </span>
                <p className="italic">"{f.resolution_notes}"</p>
              </div>
            )}

            {/* Action Trigger Button */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={() => onOpenActionModal(f)}
                className="bg-slate-900 hover:bg-slate-800 text-white font-semibold px-3.5 py-1.5 rounded-lg text-xs transition-colors flex items-center space-x-1.5 shadow-sm active:scale-95"
              >
                <span>Take Officer Action</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
