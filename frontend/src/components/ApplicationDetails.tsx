import React, { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  FileText,
  RotateCcw,
  Send,
  ShieldCheck,
  Clock,
  Layers,
  Upload,
  Search,
  ShieldAlert,
  FileX2,
  CheckSquare,
  AlertCircle
} from 'lucide-react';
import { ApplicationDetail, Finding, UserInfo, DocumentChecklistItem } from '../types';
import { getPlainStatus, getCategoryTitle, getRequiredNextAction } from './DashboardOverview';
import { DeficiencyNoticeModal } from './DeficiencyNoticeModal';
import { FinalDecisionModal } from './FinalDecisionModal';
import { ReviewerActionModal } from './ReviewerActionModal';
import { DocumentViewerModal } from './DocumentViewerModal';
import { uploadDocument, recordReviewerAction } from '../services/api';

export function getPlainEnglishCheckName(code: string): { title: string; handbookClause: string } {
  const norm = code?.toUpperCase() || '';
  if (norm.includes('PHASH')) {
    return {
      title: 'Infrastructure Photograph Similarity Check',
      handbookClause: 'APH Chapter 1 (Campus Infrastructure Norms)',
    };
  }
  if (norm.includes('PDF-MOD') || norm.includes('INTEGRITY')) {
    return {
      title: 'Document Modification & Structure Anomaly Indicator',
      handbookClause: 'APH Document Integrity Protocol',
    };
  }
  if (norm.includes('INTAKE')) {
    return {
      title: 'Sanctioned Intake Capacity vs Approved Baseline',
      handbookClause: 'APH Section 2.1 (Intake Capacity Comparison)',
    };
  }
  if (norm.includes('NAME')) {
    return {
      title: 'Institution Title Consistency & Affiliation Verification',
      handbookClause: 'APH Chapter 1 (Trust & Institutional Identity)',
    };
  }
  if (norm.includes('MANDATORY-DOCS')) {
    return {
      title: 'Mandatory Statutory Documents Completeness Checklist',
      handbookClause: 'APH Appendix 1 (Statutory Attachments Checklist)',
    };
  }
  if (norm.includes('FIRE')) {
    return {
      title: 'Fire Safety Clearance Certificate Validity',
      handbookClause: 'APH Campus & Building Safety Norms',
    };
  }
  if (norm.includes('LAND')) {
    return {
      title: 'Land Ownership Title Deed & Contiguity Check',
      handbookClause: 'APH Land Requirements for Technical Campus',
    };
  }
  if (norm.includes('BUILDING')) {
    return {
      title: 'Sanctioned Building Plan & Instructional Area Audit',
      handbookClause: 'APH Norms for Built-up Area',
    };
  }
  if (norm.includes('AUTH-VERIF')) {
    return {
      title: 'External Authority Registry Authenticity Verification',
      handbookClause: 'APH Statutory Authority Verification Norms',
    };
  }
  return {
    title: code.replace(/_/g, ' ').replace(/-/g, ' '),
    handbookClause: 'APH Compliance Verification Standard',
  };
}

export function getPlainDocStatus(item: DocumentChecklistItem): {
  label: 'Verified' | 'Needs review' | 'Check incomplete' | 'Received' | 'Missing';
  badgeClass: string;
  reviewNeeded: boolean;
} {
  if (!item.is_submitted) {
    return {
      label: 'Missing',
      badgeClass: 'bg-red-50 text-red-800 border border-red-200 font-bold',
      reviewNeeded: false
    };
  }
  if (item.status === 'VERIFIED') {
    return {
      label: 'Verified',
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
      reviewNeeded: false
    };
  }
  if (item.status === 'EXPIRED' || item.status === 'INCONSISTENT' || item.status === 'UNREADABLE') {
    return {
      label: 'Needs review',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200 font-bold',
      reviewNeeded: true
    };
  }
  if (item.status === 'VERIFICATION_UNAVAILABLE') {
    return {
      label: 'Check incomplete',
      badgeClass: 'bg-slate-100 text-slate-800 border border-slate-300',
      reviewNeeded: true
    };
  }
  return {
    label: 'Received',
    badgeClass: 'bg-blue-50 text-blue-800 border border-blue-200',
    reviewNeeded: false
  };
}

interface ApplicationDetailsProps {
  application: ApplicationDetail;
  currentUser: UserInfo;
  targetFindingId?: number | null;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onIssueDeficiencyNotice: (findingIds: number[], instructions: string) => Promise<void>;
  onReturnToReview: () => Promise<void>;
  onRecordFinalDecision: (decision: string, remarks: string) => Promise<void>;
}

export const ApplicationDetails: React.FC<ApplicationDetailsProps> = ({
  application,
  currentUser,
  targetFindingId,
  onBack,
  onRefresh,
  onIssueDeficiencyNotice,
  onReturnToReview,
  onRecordFinalDecision,
}) => {
  const [isDeficiencyModalOpen, setIsDeficiencyModalOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isReturningToReview, setIsReturningToReview] = useState(false);
  const [selectedFindingForAction, setSelectedFindingForAction] = useState<Finding | null>(null);
  const [highlightedFindingId, setHighlightedFindingId] = useState<number | null>(targetFindingId ?? null);

  // In-app document viewer state
  const [activePreviewDoc, setActivePreviewDoc] = useState<{
    isOpen: boolean;
    title: string;
    category?: string;
    streamUrl: string;
    mimeType?: string;
    pageCount?: number;
    initialPage?: number;
    extractedText?: string | null;
    verificationSource?: string | null;
    verificationStatus?: string | null;
    verificationEvidence?: string | null;
    supportingSnippet?: string | null;
  } | null>(null);

  // Replacement / resubmission state
  const [activeReplaceCategory, setActiveReplaceCategory] = useState<string | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [uploadingReplacement, setUploadingReplacement] = useState(false);
  const [replaceSuccessMsg, setReplaceSuccessMsg] = useState<string | null>(null);

  // Auto-scroll and focus finding card when navigated from alert
  React.useEffect(() => {
    if (targetFindingId) {
      setHighlightedFindingId(targetFindingId);
      const timer = setTimeout(() => {
        const el = document.getElementById(`finding-card-${targetFindingId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 300);
      const clearTimer = setTimeout(() => {
        setHighlightedFindingId(null);
      }, 4500);
      return () => {
        clearTimeout(timer);
        clearTimeout(clearTimer);
      };
    }
  }, [targetFindingId]);

  const handleOpenDocPreview = (
    item: {
      original_filename?: string | null;
      document_name?: string | null;
      category_code?: string;
      stream_url?: string | null;
      document_id?: number | null;
      status?: string;
      verification_source?: string | null;
      verification_evidence?: string | null;
      extracted_summary?: string | null;
    },
    pageNumber: number = 1,
    snippet?: string | null
  ) => {
    if (!item.stream_url) return;
    const fullDoc = application.documents?.find((d) => d.id === item.document_id);
    setActivePreviewDoc({
      isOpen: true,
      title: item.original_filename || item.document_name || fullDoc?.original_filename || 'Submitted Attachment',
      category: item.category_code || fullDoc?.document_category,
      streamUrl: item.stream_url,
      mimeType: fullDoc?.mime_type || 'application/pdf',
      pageCount: fullDoc?.page_count || 1,
      initialPage: pageNumber,
      extractedText: fullDoc?.extracted_text_preview || item.extracted_summary || null,
      verificationSource: item.verification_source || null,
      verificationStatus: item.status || null,
      verificationEvidence: item.verification_evidence || null,
      supportingSnippet: snippet || null,
    });
  };

  const [selectedRunNumber, setSelectedRunNumber] = useState<number>(
    application.scrutiny_runs.length > 0
      ? application.scrutiny_runs[application.scrutiny_runs.length - 1].run_number
      : 1
  );

  const plainStatus = getPlainStatus(application.status, application.final_decision, application.findings_count);
  const nextRequiredAction = getRequiredNextAction(application.status, application.findings_count, application.final_decision);
  const isApprover = currentUser.role === 'APPROVER' || currentUser.role === 'ADMIN' || currentUser.role === 'OFFICER';

  // Active scrutiny run selected
  const activeRun = application.scrutiny_runs.find(r => r.run_number === selectedRunNumber) ||
    application.scrutiny_runs[application.scrutiny_runs.length - 1];

  // Missing mandatory documents (Area C - Group 1)
  const missingMandatoryDocs = application.document_checklist.filter(
    (item) => item.is_mandatory && !item.is_submitted
  );

  // Grouped results for active run
  const passedChecks = activeRun ? activeRun.check_results.filter(c => c.status === 'PASSED') : [];
  const issuesRequiringCorrection = activeRun
    ? activeRun.check_results.filter(c => (c.status === 'FAILED' || c.status === 'EXPIRED' || c.status === 'INCOMPLETE') && (c.severity === 'CRITICAL' || c.severity === 'HIGH'))
    : [];
  const checksCouldNotBeCompleted = activeRun
    ? activeRun.check_results.filter(c => c.status === 'SOURCE_UNAVAILABLE' || c.status === 'UNREADABLE' || c.status === 'SKIPPED')
    : [];
  const itemsRequiringReview = activeRun
    ? activeRun.check_results.filter(c =>
        c.status !== 'PASSED' &&
        !issuesRequiringCorrection.includes(c) &&
        !checksCouldNotBeCompleted.includes(c)
      )
    : [];

  // All findings for primary review
  const allFindings = application.findings || [];
  const openFindings = allFindings.filter(f => f.review_status !== 'RESOLVED');

  // Explanation of what needs attention (for Area A Summary)
  const getAttentionSummary = () => {
    if (application.final_decision) {
      return `Final statutory decision recorded (${application.final_decision.replace(/_/g, ' ')}) by ${application.decided_by || 'Authorised Officer'}.`;
    }
    if (missingMandatoryDocs.length > 0) {
      const names = missingMandatoryDocs.map(d => d.document_name).join(', ');
      return `Application cannot proceed to approval. Required mandatory document(s) missing: ${names}. The institution must submit them before scrutiny can continue.`;
    }
    if (openFindings.length > 0) {
      return `${openFindings.length} issue(s) or discrepancy check(s) flagged for officer verification and determination.`;
    }
    if (plainStatus.label === 'Ready for approval') {
      return 'All statutory scrutiny checks and document attachments have been verified. The application is ready for the authorised officer to record a decision.';
    }
    return 'Scrutiny checks are underway.';
  };

  const handleReturnToReview = async () => {
    setIsReturningToReview(true);
    try {
      await onReturnToReview();
      await onRefresh();
    } catch (err: any) {
      alert(`Error re-scrutinizing application: ${err.message}`);
    } finally {
      setIsReturningToReview(false);
    }
  };

  const handleUploadReplacement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeReplaceCategory || !replacementFile) return;

    setUploadingReplacement(true);
    setReplaceSuccessMsg(null);
    try {
      await uploadDocument(application.id, activeReplaceCategory, replacementFile);
      setReplaceSuccessMsg(`Document for ${activeReplaceCategory} received. Scrutiny checks re-evaluated.`);
      setActiveReplaceCategory(null);
      setReplacementFile(null);
      await onRefresh();
    } catch (err: any) {
      alert(`Failed to upload document: ${err.message}`);
    } finally {
      setUploadingReplacement(false);
    }
  };

  const submissionDateFormatted = new Date(application.created_at).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Breadcrumb & Status Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Applications Queue</span>
        </button>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded text-xs font-bold ${plainStatus.badgeClass}`}>
            Status: {plainStatus.label}
          </span>
          {application.final_decision && (
            <span className="px-2.5 py-1 rounded text-xs font-bold bg-slate-900 text-white">
              Official Decision: {application.final_decision.replace(/_/g, ' ')}
            </span>
          )}
        </div>
      </div>

      {/* Replacement success banner */}
      {replaceSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{replaceSuccessMsg}</span>
        </div>
      )}

      {/* =========================================================================
          AREA A: Application Summary (Compact & Action-Oriented)
          ========================================================================= */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center space-x-2 text-slate-800">
            <Building2 className="w-5 h-5 text-blue-700 shrink-0" />
            <div>
              <h1 className="text-base font-bold text-slate-900">{application.institution.name}</h1>
              <p className="text-xs text-slate-500 font-normal">
                Permanent AICTE ID: <strong className="text-slate-700 font-mono">{application.institution.aicte_permanent_id}</strong> &bull; Location: {application.institution.district}, {application.institution.state}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded">
              {application.application_number}
            </span>
          </div>
        </div>

        {/* Compact Metadata Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Application Category</span>
            <span className="font-bold text-blue-800">{getCategoryTitle(application.category)}</span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Submission Date</span>
            <span className="text-slate-700 font-medium">{submissionDateFormatted}</span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Current Application Status</span>
            <span className={`inline-block px-2 py-0.5 rounded font-semibold text-[11px] ${plainStatus.badgeClass}`}>
              {plainStatus.label}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase block">Next Required Action</span>
            <span className="text-slate-800 font-bold">{nextRequiredAction}</span>
          </div>
        </div>

        {/* Short explanation of what needs attention */}
        <div className="pt-2 border-t border-slate-100 flex items-start space-x-2 bg-slate-50/70 p-3 rounded-lg border border-slate-200/60">
          <AlertCircle className="w-4 h-4 text-blue-700 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-800 leading-relaxed">
            <strong className="text-slate-900 font-semibold">What needs attention: </strong>
            <span>{getAttentionSummary()}</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          AREA B: Required Documents (Document Checklist)
          ========================================================================= */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center space-x-2 text-slate-800">
            <FileText className="w-5 h-5 text-indigo-700 shrink-0" />
            <h2 className="text-base font-bold text-slate-900">Required Documents Checklist</h2>
          </div>
          <p className="text-xs text-slate-500">
            Statutory documents checklist configured for <strong>{getCategoryTitle(application.category)}</strong>
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Document Name</th>
                <th className="py-2.5 px-3">Requirement</th>
                <th className="py-2.5 px-3">Received?</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Contents / Validity</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {application.document_checklist.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate-400">
                    No document requirements configured for this category.
                  </td>
                </tr>
              ) : (
                application.document_checklist.map((item, idx) => {
                  const docStatus = getPlainDocStatus(item);
                  const isReplacing = activeReplaceCategory === item.category_code;

                  return (
                    <React.Fragment key={idx}>
                      <tr className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-3 font-semibold text-slate-800 max-w-xs">
                          <div>{item.document_name}</div>
                          {item.original_filename && (
                            <div className="font-mono text-[10px] text-slate-400 truncate">
                              File: {item.original_filename}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {item.is_mandatory ? (
                            <span className="text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200 text-[10px]">
                              Mandatory
                            </span>
                          ) : (
                            <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                              Optional
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          {item.is_submitted ? (
                            <span className="inline-flex items-center text-emerald-700 font-bold gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Received</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-rose-700 font-bold gap-1">
                              <XCircle className="w-3.5 h-3.5 text-rose-600" />
                              <span>Not Received</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${docStatus.badgeClass}`}>
                            {docStatus.label}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-600 max-w-xs">
                          <div>{item.validity_info || (item.is_submitted ? 'Attachment submitted' : 'Pending submission')}</div>
                          {item.verification_source && (
                            <div className="text-[10px] text-slate-400">Source: {item.verification_source}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.is_submitted && item.stream_url && (
                              <button
                                type="button"
                                onClick={() => handleOpenDocPreview(item, 1)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold transition-colors text-[11px] border border-blue-200"
                                title="Inspect document inside application"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                <span>Inspect</span>
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setActiveReplaceCategory(isReplacing ? null : item.category_code)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-[11px] transition-colors"
                            >
                              {item.is_submitted ? 'Replace' : 'Submit'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Inline Document Submission Form */}
                      {isReplacing && (
                        <tr className="bg-blue-50/50">
                          <td colSpan={6} className="p-3">
                            <form
                              onSubmit={handleUploadReplacement}
                              className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-blue-200"
                            >
                              <div className="flex items-center space-x-2 text-xs">
                                <Upload className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="font-semibold text-slate-700">Submit file for {item.document_name}:</span>
                                <input
                                  type="file"
                                  accept=".pdf,.png,.jpg,.jpeg"
                                  required
                                  onChange={(e) => setReplacementFile(e.target.files?.[0] || null)}
                                  className="text-xs file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                />
                              </div>

                              <div className="flex items-center space-x-2">
                                <button
                                  type="button"
                                  onClick={() => setActiveReplaceCategory(null)}
                                  className="px-2.5 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="submit"
                                  disabled={uploadingReplacement || !replacementFile}
                                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded text-xs transition-colors disabled:opacity-50"
                                >
                                  {uploadingReplacement ? 'Uploading & Scrutinizing...' : 'Upload & Re-Scrutinize'}
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* =========================================================================
          AREA C: Checks and Requirements (Process Gating & Status)
          ========================================================================= */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center space-x-2 text-slate-800">
            <FileCheck2 className="w-5 h-5 text-blue-700 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Checks and Requirements</h2>
              <p className="text-xs text-slate-500">
                Clear evaluation of whether this application satisfies statutory requirements to proceed
              </p>
            </div>
          </div>

          {/* Multi-Run Selector (Compare initial run vs re-scrutiny runs) */}
          {application.scrutiny_runs.length > 1 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Scrutiny Evaluation Run:</span>
              </span>
              <select
                value={selectedRunNumber}
                onChange={(e) => setSelectedRunNumber(Number(e.target.value))}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
              >
                {application.scrutiny_runs.map((r) => (
                  <option key={r.id} value={r.run_number}>
                    Run #{r.run_number} ({r.run_number === 1 ? 'Initial Submission' : 'Post-Resubmission Re-evaluation'}) &mdash; {new Date(r.completed_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 3 Clear Groups */}
        <div className="space-y-4 text-xs">
          {/* GROUP 1: Documents Still Required (Mandatory Process Gating) */}
          <div className={`border rounded-xl overflow-hidden ${
            missingMandatoryDocs.length > 0 ? 'border-rose-300 bg-rose-50/20' : 'border-slate-200'
          }`}>
            <div className={`px-4 py-3 flex items-center justify-between border-b ${
              missingMandatoryDocs.length > 0 ? 'bg-rose-50 border-rose-200 text-rose-950' : 'bg-slate-50 border-slate-200 text-slate-800'
            }`}>
              <div className="flex items-center space-x-2 font-bold">
                <FileX2 className={`w-4 h-4 ${missingMandatoryDocs.length > 0 ? 'text-rose-600' : 'text-slate-400'}`} />
                <span>Documents Still Required ({missingMandatoryDocs.length})</span>
              </div>
              <span className="text-[11px] font-medium">
                {missingMandatoryDocs.length > 0
                  ? 'Application cannot proceed until mandatory documents are received'
                  : 'All mandatory statutory attachments received'}
              </span>
            </div>

            <div className="p-4">
              {missingMandatoryDocs.length === 0 ? (
                <div className="flex items-center space-x-2 text-emerald-800 font-semibold py-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>All mandatory statutory documents have been submitted by the institution.</span>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 leading-relaxed">
                    <p className="font-bold">
                      Application cannot proceed yet.
                    </p>
                    <p className="mt-0.5">
                      The application cannot proceed to the next scrutiny stage or approval until the required document(s) listed below are received. The institution must submit them before scrutiny can continue.
                    </p>
                  </div>

                  <div className="divide-y divide-rose-100 border border-rose-100 rounded-lg bg-white overflow-hidden">
                    {missingMandatoryDocs.map((doc, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-900">{doc.document_name}</p>
                          <p className="text-[11px] text-slate-500">
                            Category Code: {doc.category_code} &bull; Mandatory statutory attachment for {getCategoryTitle(application.category)}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveReplaceCategory(doc.category_code)}
                          className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-xs"
                        >
                          Submit Document
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* GROUP 2: Checks That Need Attention */}
          <div className="border border-amber-200 rounded-xl overflow-hidden">
            <div className="bg-amber-50 px-4 py-3 flex items-center justify-between border-b border-amber-200 text-amber-950 font-bold">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>
                  Checks That Need Attention ({issuesRequiringCorrection.length + itemsRequiringReview.length + checksCouldNotBeCompleted.length})
                </span>
              </div>
              <span className="text-[11px] text-amber-800 font-medium">Discrepancies, potential anomalies & incomplete checks</span>
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {issuesRequiringCorrection.length === 0 && itemsRequiringReview.length === 0 && checksCouldNotBeCompleted.length === 0 ? (
                <div className="flex items-center space-x-2 text-emerald-800 font-semibold py-1">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>No unresolved discrepancies or anomalous checks detected in current run.</span>
                </div>
              ) : (
                <>
                  {/* Confirmed Mismatches / Corrections Required */}
                  {issuesRequiringCorrection.map((c, i) => {
                    const meta = getPlainEnglishCheckName(c.check_code);
                    return (
                      <div key={`issue-${i}`} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">{meta.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-100 text-rose-800">
                            Confirmed Difference
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{c.explanation}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] bg-slate-50 p-2.5 rounded border border-slate-200 mt-1">
                          <div>
                            <span className="text-slate-500 font-semibold">Expected: </span>
                            <span className="text-slate-800">{c.expected_value || 'Statutory compliance'}</span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-semibold">Observed: </span>
                            <span className="text-rose-900 font-bold">{c.observed_value || 'Discrepancy detected'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Potential Anomalies & Officer Reviews */}
                  {itemsRequiringReview.map((c, i) => {
                    const meta = getPlainEnglishCheckName(c.check_code);
                    return (
                      <div key={`review-${i}`} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-900">{meta.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                            Possible Irregularity (Review Required)
                          </span>
                        </div>
                        <p className="text-slate-700 leading-relaxed">{c.explanation}</p>
                        <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                          <strong>Note:</strong> Automated indicator flagged for officer evaluation. Never treated as proof of irregularity without officer review.
                        </div>
                      </div>
                    );
                  })}

                  {/* Checks That Could Not Be Completed */}
                  {checksCouldNotBeCompleted.map((c, i) => {
                    const meta = getPlainEnglishCheckName(c.check_code);
                    return (
                      <div key={`uncompleted-${i}`} className="py-3 first:pt-0 last:pb-0 space-y-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-bold text-slate-800">{meta.title}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            Check Incomplete / Source Unavailable
                          </span>
                        </div>
                        <p className="text-slate-600">{c.explanation}</p>
                        <p className="text-[11px] text-slate-500 italic">
                          External registry source temporarily unavailable. Requires manual officer verification.
                        </p>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>

          {/* GROUP 3: Requirements Completed */}
          <div className="border border-emerald-200 rounded-xl overflow-hidden">
            <div className="bg-emerald-50 px-4 py-3 flex items-center justify-between border-b border-emerald-200 text-emerald-950 font-bold">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>Requirements Completed ({passedChecks.length})</span>
              </div>
              <span className="text-[11px] text-emerald-800 font-medium">Statutory norms verified satisfactorily</span>
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {passedChecks.length === 0 ? (
                <p className="text-slate-500 py-1">No completed checks recorded yet.</p>
              ) : (
                passedChecks.map((c, i) => {
                  const meta = getPlainEnglishCheckName(c.check_code);
                  return (
                    <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                      <div>
                        <span className="font-bold text-slate-900">{meta.title}</span>
                        <p className="text-slate-600 text-[11px] mt-0.5">{c.explanation}</p>
                      </div>
                      <span className="text-emerald-700 font-bold text-[10px] bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                        VERIFIED
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          AREA D: Findings and Supporting Evidence (Primary Officer Review Area)
          ========================================================================= */}
      <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 text-slate-800">
            <Search className="w-5 h-5 text-blue-700 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-slate-900">Findings and Supporting Evidence</h2>
              <p className="text-xs text-slate-500">
                Primary review area for examining evidence, inspecting attached documents, and determining next actions
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            Total Findings: {allFindings.length}
          </span>
        </div>

        {allFindings.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="font-bold text-slate-800 text-sm">No compliance issues or deficiencies recorded</p>
            <p className="text-xs text-slate-500 mt-0.5">
              All submitted evidence conforms to configured AICTE handbook standards.
            </p>
          </div>
        ) : (
          <div className="space-y-4 text-xs">
            {allFindings.map((finding) => {
              const evidence = finding.evidence || {};
              const isSimulated = evidence.is_simulated === true;
              const isHighlighted = highlightedFindingId === finding.id;

              // Plain-language classification badge
              let classificationLabel = 'Further review required';
              let classificationBadge = 'bg-slate-100 text-slate-700 border-slate-300';

              if (finding.evidence_classification === 'VERIFIED_FACT') {
                classificationLabel = 'Verified fact';
                classificationBadge = 'bg-emerald-50 text-emerald-800 border-emerald-300';
              } else if (
                finding.category === 'RECORD_MISMATCH' ||
                finding.finding_code.includes('INTAKE') ||
                finding.finding_code.includes('EXPIRED')
              ) {
                classificationLabel = 'Difference found';
                classificationBadge = 'bg-rose-50 text-rose-800 border-rose-300';
              } else if (
                finding.category === 'INTEGRITY_ANOMALY' ||
                finding.finding_code.includes('PDF-MOD') ||
                finding.finding_code.includes('PHASH')
              ) {
                classificationLabel = 'Possible irregularity';
                classificationBadge = 'bg-amber-50 text-amber-800 border-amber-300';
              } else if (finding.category === 'MISSING_DOCUMENT') {
                classificationLabel = 'Document missing';
                classificationBadge = 'bg-red-50 text-red-800 border-red-300 font-bold';
              }

              // Document attachment resolver
              const docId = finding.supporting_document_id;
              const catCode = evidence.document_category;
              const matchedDoc = application.documents?.find(
                (d) => (docId && d.id === docId) || (catCode && d.document_category === catCode)
              );
              const matchedChecklist = application.document_checklist?.find(
                (dc) => (docId && dc.document_id === docId) || (catCode && dc.category_code === catCode)
              );
              const streamUrl = matchedChecklist?.stream_url || (matchedDoc ? `/api/documents/${matchedDoc.id}/stream` : null);

              return (
                <div
                  key={finding.id}
                  id={`finding-card-${finding.id}`}
                  className={`p-4 rounded-xl border transition-all duration-300 space-y-3 ${
                    isHighlighted
                      ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500 ring-offset-2 shadow-lg'
                      : 'border-slate-200 bg-slate-50/50'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{finding.title}</span>
                        {isHighlighted && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white animate-pulse">
                            Focused from Alert
                          </span>
                        )}
                        {(isSimulated ||
                          finding.finding_code.includes('AUTH') ||
                          finding.finding_code.includes('SIMULATED') ||
                          evidence.verification_source?.includes('SIMULATED')) && (
                          <span className="text-[10px] bg-amber-500 text-slate-950 px-2 py-0.5 rounded font-black border border-amber-600 shadow-xs tracking-wide">
                            SIMULATED EXTERNAL CHECK &mdash; SYNTHETIC DATA
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-500">Category: {finding.category.replace(/_/g, ' ')}</span>
                        {finding.rule_code && (
                          <>
                            <span>&bull;</span>
                            <span className="text-[11px] text-slate-500">Clause: {finding.rule_code}</span>
                          </>
                        )}
                        <span>&bull;</span>
                        <span className="text-[10px] text-slate-400">
                          Checked: {new Date(finding.updated_at || finding.created_at).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${classificationBadge}`}>
                        {classificationLabel}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-semibold">
                        {finding.review_status === 'RESOLVED' ? 'Resolved' : 'Pending Action'}
                      </span>
                      {finding.review_status !== 'RESOLVED' && (
                        <button
                          type="button"
                          onClick={() => setSelectedFindingForAction(finding)}
                          className="ml-2 px-2.5 py-1 rounded text-[11px] font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex items-center gap-1 transition-colors"
                        >
                          <ShieldAlert className="w-3.5 h-3.5" />
                          <span>Take Action</span>
                        </button>
                      )}
                    </div>
                  </div>

                  <p className="text-slate-700 leading-relaxed">{finding.description}</p>

                  {/* Plain-Language Observation & Evidence Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-3 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">What was expected</span>
                      <span className="font-medium text-slate-800">
                        {evidence.expected_value || finding.expected_value || 'Statutory compliance per handbook'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">What was observed</span>
                      <span className="text-rose-700 font-bold">
                        {evidence.observed_value || finding.observed_value || 'Discrepancy detected'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">Why review is needed</span>
                      <span className="text-slate-700">
                        {finding.recommended_action || 'Determine institutional compliance and record official finding.'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">What remains uncertain</span>
                      <span className="text-slate-600 italic">
                        {evidence.what_remains_uncertain || 'Whether formal explanatory records or stay orders exist at the regional council.'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">Verification Source</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-slate-800 font-medium">
                          {evidence.verification_source || 'AICTE Scrutiny Engine'}
                        </span>
                        {(isSimulated ||
                          finding.finding_code.includes('AUTH') ||
                          evidence.verification_source?.includes('SIMULATED') ||
                          evidence.observed_value?.includes('SIMULATED')) && (
                          <span className="text-[9px] bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded font-bold border border-amber-300">
                            SIMULATED
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Supporting Document Viewer Button */}
                  {streamUrl && (
                    <div className="pt-1 flex items-center justify-between border-t border-slate-200/50">
                      <div className="text-[11px] text-slate-600">
                        {finding.supporting_page_number ? (
                          <span>Supporting evidence identified on <strong>Page {finding.supporting_page_number}</strong> of submitted document.</span>
                        ) : (
                          <span>Supporting document available for in-app inspection.</span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenDocPreview(
                            {
                              document_id: matchedDoc?.id || matchedChecklist?.document_id,
                              original_filename: matchedDoc?.original_filename || matchedChecklist?.original_filename,
                              document_name: matchedChecklist?.document_name,
                              category_code: matchedDoc?.document_category || matchedChecklist?.category_code,
                              stream_url: streamUrl,
                              status: matchedChecklist?.status,
                              verification_source: evidence.verification_source || matchedChecklist?.verification_source,
                              verification_evidence: evidence.verification_evidence || matchedChecklist?.verification_evidence,
                              extracted_summary: matchedChecklist?.extracted_summary
                            },
                            finding.supporting_page_number || 1,
                            finding.observed_value || finding.description
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition-colors shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>
                          Inspect Document {finding.supporting_page_number ? `(Page ${finding.supporting_page_number})` : ''}
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          AREA E: Officer Actions (Decision & Operational Controls)
          ========================================================================= */}
      <section className="bg-slate-900 text-white rounded-xl p-5 shadow-md space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-400 shrink-0" />
            <div>
              <h2 className="text-base font-bold text-white">Officer Actions</h2>
              <p className="text-xs text-slate-400">
                Authorised administrative actions for this application
              </p>
            </div>
          </div>
          <span className="text-xs text-slate-300">
            Authorised Official: <strong>AICTE Official</strong>
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          AI flags and explains. The authorised officer decides. You can request additional information through an official deficiency notice, re-evaluate after resubmission, or record a final statutory decision with justification.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Action 1: Request corrections / Issue deficiency notice */}
          <button
            onClick={() => setIsDeficiencyModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-lg text-xs transition-colors flex items-center space-x-2 shadow-xs"
          >
            <Send className="w-4 h-4" />
            <span>Request Additional Information (Deficiency Notice)</span>
          </button>

          {/* Action 2: Review resubmission / Re-evaluate */}
          <button
            onClick={handleReturnToReview}
            disabled={isReturningToReview}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-4 py-2.5 rounded-lg text-xs transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${isReturningToReview ? 'animate-spin' : ''}`} />
            <span>{isReturningToReview ? 'Re-evaluating...' : 'Send for Re-Scrutiny'}</span>
          </button>

          {/* Action 3: Record final statutory decision */}
          {isApprover ? (
            <button
              onClick={() => setIsDecisionModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-lg text-xs transition-colors flex items-center space-x-2 shadow-xs ml-auto"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Record Statutory Decision</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 ml-auto italic">
              (Final statutory decision requires Scrutiny Officer authority)
            </span>
          )}
        </div>
      </section>

      {/* Deficiency Notice Modal */}
      <DeficiencyNoticeModal
        isOpen={isDeficiencyModalOpen}
        onClose={() => setIsDeficiencyModalOpen(false)}
        applicationNumber={application.application_number}
        findings={application.findings}
        onSubmit={async (findingIds, instructions) => {
          await onIssueDeficiencyNotice(findingIds, instructions);
          await onRefresh();
        }}
      />

      {/* Final Decision Modal */}
      <FinalDecisionModal
        isOpen={isDecisionModalOpen}
        onClose={() => setIsDecisionModalOpen(false)}
        applicationNumber={application.application_number}
        institutionName={application.institution.name}
        currentUser={currentUser}
        onSubmit={async (decision, remarks) => {
          await onRecordFinalDecision(decision, remarks);
          await onRefresh();
        }}
      />

      {/* Reviewer Action Modal */}
      {selectedFindingForAction && (
        <ReviewerActionModal
          finding={selectedFindingForAction}
          onClose={() => setSelectedFindingForAction(null)}
          onSubmit={async (findingId, data) => {
            await recordReviewerAction(findingId, data);
            setSelectedFindingForAction(null);
            await onRefresh();
          }}
        />
      )}

      {/* In-App Document Inspection Modal */}
      {activePreviewDoc && (
        <DocumentViewerModal
          isOpen={activePreviewDoc.isOpen}
          onClose={() => setActivePreviewDoc(null)}
          documentTitle={activePreviewDoc.title}
          categoryCode={activePreviewDoc.category}
          streamUrl={activePreviewDoc.streamUrl}
          mimeType={activePreviewDoc.mimeType}
          pageCount={activePreviewDoc.pageCount}
          initialPage={activePreviewDoc.initialPage}
          extractedText={activePreviewDoc.extractedText}
          verificationSource={activePreviewDoc.verificationSource}
          verificationStatus={activePreviewDoc.verificationStatus}
          verificationEvidence={activePreviewDoc.verificationEvidence}
          supportingSnippet={activePreviewDoc.supportingSnippet}
        />
      )}
    </div>
  );
};
