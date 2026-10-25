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
  ExternalLink
} from 'lucide-react';
import { ApplicationDetail, Finding, UserInfo } from '../types';
import { getPlainStatus, getCategoryTitle } from './DashboardOverview';
import { DeficiencyNoticeModal } from './DeficiencyNoticeModal';
import { FinalDecisionModal } from './FinalDecisionModal';
import { uploadDocument } from '../services/api';

interface ApplicationDetailsProps {
  application: ApplicationDetail;
  currentUser: UserInfo;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onIssueDeficiencyNotice: (findingIds: number[], instructions: string) => Promise<void>;
  onReturnToReview: () => Promise<void>;
  onRecordFinalDecision: (decision: string, remarks: string) => Promise<void>;
}

export const ApplicationDetails: React.FC<ApplicationDetailsProps> = ({
  application,
  currentUser,
  onBack,
  onRefresh,
  onIssueDeficiencyNotice,
  onReturnToReview,
  onRecordFinalDecision,
}) => {
  const [isDeficiencyModalOpen, setIsDeficiencyModalOpen] = useState(false);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [isReturningToReview, setIsReturningToReview] = useState(false);

  // Replacement upload state within application details
  const [activeReplaceCategory, setActiveReplaceCategory] = useState<string | null>(null);
  const [replacementFile, setReplacementFile] = useState<File | null>(null);
  const [uploadingReplacement, setUploadingReplacement] = useState(false);
  const [replaceSuccessMsg, setReplaceSuccessMsg] = useState<string | null>(null);

  const [selectedRunNumber, setSelectedRunNumber] = useState<number>(
    application.scrutiny_runs.length > 0
      ? application.scrutiny_runs[application.scrutiny_runs.length - 1].run_number
      : 1
  );

  const plainStatus = getPlainStatus(application.status, application.final_decision);
  const isApprover = currentUser.role === 'APPROVER' || currentUser.role === 'ADMIN' || currentUser.role === 'OFFICER';

  // Active scrutiny run selected
  const activeRun = application.scrutiny_runs.find(r => r.run_number === selectedRunNumber) ||
    application.scrutiny_runs[application.scrutiny_runs.length - 1];

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

  // All findings for Section D (Evidence breakdown)
  const allFindings = application.findings || [];

  const handleReturnToReview = async () => {
    setIsReturningToReview(true);
    try {
      await onReturnToReview();
      await onRefresh();
    } catch (err: any) {
      alert(`Error returning application to review: ${err.message}`);
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
      setReplaceSuccessMsg(`Replacement document for ${activeReplaceCategory} uploaded successfully. Automated scrutiny re-run completed!`);
      setActiveReplaceCategory(null);
      setReplacementFile(null);
      await onRefresh();
    } catch (err: any) {
      alert(`Failed to upload replacement document: ${err.message}`);
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
      {/* Top Breadcrumb & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm transition-colors w-fit"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Applications Queue</span>
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

      {/* Replacement success alert */}
      {replaceSuccessMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{replaceSuccessMsg}</span>
        </div>
      )}

      {/* =========================================================================
          SECTION A: Institution and Application Summary
          ========================================================================= */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 text-slate-800">
            <Building2 className="w-5 h-5 text-blue-700" />
            <h2 className="text-base font-bold">Section A: Institution & Application Summary</h2>
          </div>
          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded">
            {application.application_number}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Institution Name</span>
            <span className="font-bold text-slate-900 text-sm">{application.institution.name}</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Recognised Identifier</span>
            <span className="font-mono font-bold text-slate-800">Permanent ID: {application.institution.aicte_permanent_id}</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Campus Location</span>
            <span className="text-slate-700">{application.institution.address}, {application.institution.district}, {application.institution.state}</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Submission Date</span>
            <span className="text-slate-700">{submissionDateFormatted}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-100 text-xs">
          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Approval Category</span>
            <span className="font-bold text-blue-700">{getCategoryTitle(application.category)}</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Declared Programme & Course</span>
            <span className="text-slate-800 font-medium">{application.declared_programme} &mdash; {application.declared_course}</span>
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Declared Intake Capacity</span>
            <span className="font-mono font-bold text-slate-900">{application.declared_intake} Sanctioned Seats</span>
            {application.baseline_record && (
              <span className="text-[10px] text-slate-500 block">
                Baseline Record: {application.baseline_record.approved_intake} Seats
              </span>
            )}
          </div>

          <div>
            <span className="text-[11px] font-semibold text-slate-400 uppercase block">Campus Land Area</span>
            <span className="font-mono font-bold text-slate-900">{application.declared_land_acres} Registered Acres</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION B: Required-Document Checklist
          ========================================================================= */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center space-x-2 text-slate-800">
            <FileText className="w-5 h-5 text-indigo-700" />
            <h2 className="text-base font-bold">Section B: Required-Document Checklist</h2>
          </div>
          <p className="text-xs text-slate-500">
            Checklist showing required, submitted, missing, unreadable, expired, and verified documents for <strong>{getCategoryTitle(application.category)}</strong>
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
            <thead className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3">Document Name</th>
                <th className="py-2.5 px-3">Requirement</th>
                <th className="py-2.5 px-3">Submitted?</th>
                <th className="py-2.5 px-3">Extracted Key Info</th>
                <th className="py-2.5 px-3">Validity / Expiry</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Verification Source</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {application.document_checklist.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-slate-400">
                    No document requirements configured for this category.
                  </td>
                </tr>
              ) : (
                application.document_checklist.map((item, idx) => {
                  let statusBadge = 'bg-slate-100 text-slate-700';
                  let statusText = item.status;

                  if (item.status === 'VERIFIED') {
                    statusBadge = 'bg-emerald-50 text-emerald-800 border border-emerald-200';
                    statusText = 'Verified';
                  } else if (item.status === 'EXPIRED') {
                    statusBadge = 'bg-rose-50 text-rose-800 border border-rose-200';
                    statusText = 'Expired';
                  } else if (item.status === 'VERIFICATION_UNAVAILABLE') {
                    statusBadge = 'bg-slate-100 text-slate-800 border border-slate-300';
                    statusText = 'Verification pending / unavailable';
                  } else if (item.status === 'INCONSISTENT') {
                    statusBadge = 'bg-amber-50 text-amber-800 border border-amber-200';
                    statusText = 'Inconsistent';
                  } else if (item.status === 'UNREADABLE') {
                    statusBadge = 'bg-orange-50 text-orange-800 border border-orange-200';
                    statusText = 'Unreadable';
                  } else if (item.status === 'MISSING') {
                    statusBadge = 'bg-red-50 text-red-800 border border-red-200';
                    statusText = 'Missing (Required)';
                  } else if (item.status === 'NOT_SUBMITTED') {
                    statusBadge = 'bg-slate-50 text-slate-500 border border-slate-200';
                    statusText = 'Not submitted';
                  }

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
                              Required
                            </span>
                          ) : (
                            <span className="text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded text-[10px]">
                              Optional
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3">
                          {item.is_submitted ? (
                            <span className="text-emerald-700 font-bold flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Yes</span>
                            </span>
                          ) : (
                            <span className="text-slate-400 flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5 text-slate-300" />
                              <span>No</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 max-w-xs text-slate-600">
                          {item.extracted_summary || <span className="text-slate-400 italic">None</span>}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap font-medium text-slate-700">
                          {item.validity_info || <span className="text-slate-400">&mdash;</span>}
                        </td>
                        <td className="py-3 px-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold ${statusBadge}`}>
                            {statusText}
                          </span>
                        </td>
                        <td className="py-3 px-3 max-w-xs text-slate-600">
                          {item.verification_source ? (
                            <div>
                              <span className="font-semibold text-slate-800 block text-[11px]">
                                {item.verification_source}
                              </span>
                              <span className="text-[10px] text-slate-500 block leading-tight">
                                {item.verification_evidence}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">&mdash;</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1.5">
                            {item.stream_url && (
                              <a
                                href={item.stream_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold transition-colors text-[11px]"
                              >
                                <Eye className="w-3 h-3 text-slate-600" />
                                <span>View</span>
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => setActiveReplaceCategory(isReplacing ? null : item.category_code)}
                              className="px-2 py-1 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-[11px] transition-colors"
                            >
                              {item.is_submitted ? 'Replace' : 'Upload'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Inline Replacement Form */}
                      {isReplacing && (
                        <tr className="bg-blue-50/50">
                          <td colSpan={8} className="p-3">
                            <form
                              onSubmit={handleUploadReplacement}
                              className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-blue-200"
                            >
                              <div className="flex items-center space-x-2 text-xs">
                                <Upload className="w-4 h-4 text-blue-600 shrink-0" />
                                <span className="font-semibold text-slate-700">Upload document for {item.document_name}:</span>
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
          SECTION C: Automated Scrutiny Findings (Grouped)
          ========================================================================= */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
          <div className="flex items-center space-x-2 text-slate-800">
            <FileCheck2 className="w-5 h-5 text-blue-700" />
            <h2 className="text-base font-bold">Section C: Automated Scrutiny Findings</h2>
          </div>

          {/* Multi-Run Selector (Compare initial run vs post-correction runs) */}
          {application.scrutiny_runs.length > 1 && (
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-semibold text-slate-600 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                <span>Scrutiny History Run:</span>
              </span>
              <select
                value={selectedRunNumber}
                onChange={(e) => setSelectedRunNumber(Number(e.target.value))}
                className="bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none"
              >
                {application.scrutiny_runs.map((r) => (
                  <option key={r.id} value={r.run_number}>
                    Run #{r.run_number} ({r.run_number === 1 ? 'Initial Submission' : 'Post-Correction Re-validation'}) &mdash; {new Date(r.completed_at).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* 4 Grouped Categories */}
        <div className="space-y-4 text-xs">
          {/* 1. Passed Checks */}
          <div className="border border-emerald-200 rounded-xl overflow-hidden">
            <div className="bg-emerald-50 px-4 py-3 flex items-center justify-between border-b border-emerald-200">
              <div className="flex items-center space-x-2 text-emerald-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>1. Passed Checks ({passedChecks.length})</span>
              </div>
              <span className="text-[11px] text-emerald-800 font-medium">Statutory norms verified satisfactorily</span>
            </div>
            <div className="p-4 divide-y divide-slate-100">
              {passedChecks.length === 0 ? (
                <p className="text-slate-500 py-2">No checks passed yet.</p>
              ) : (
                passedChecks.map((c, i) => (
                  <div key={i} className="py-2.5 first:pt-0 last:pb-0 flex items-start justify-between gap-3">
                    <div>
                      <span className="font-bold text-slate-900">{c.check_code}</span>
                      <p className="text-slate-600 text-[11px] mt-0.5">{c.explanation}</p>
                    </div>
                    <span className="text-emerald-700 font-bold text-[10px] bg-emerald-100 px-2 py-0.5 rounded shrink-0">
                      PASSED
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 2. Issues Requiring Correction */}
          <div className="border border-amber-200 rounded-xl overflow-hidden">
            <div className="bg-amber-50 px-4 py-3 flex items-center justify-between border-b border-amber-200">
              <div className="flex items-center space-x-2 text-amber-900 font-bold">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>2. Issues Requiring Correction ({issuesRequiringCorrection.length})</span>
              </div>
              <span className="text-[11px] text-amber-800 font-medium">Deficiency notices can be issued for these items</span>
            </div>
            <div className="p-4 divide-y divide-slate-100">
              {issuesRequiringCorrection.length === 0 ? (
                <p className="text-slate-500 py-2">No critical compliance issues requiring correction.</p>
              ) : (
                issuesRequiringCorrection.map((c, i) => (
                  <div key={i} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{c.check_code}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        {c.severity} Priority
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
                        <span className="text-amber-900 font-bold">{c.observed_value || 'Discrepancy detected'}</span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 3. Items Requiring Officer Review */}
          <div className="border border-blue-200 rounded-xl overflow-hidden">
            <div className="bg-blue-50 px-4 py-3 flex items-center justify-between border-b border-blue-200">
              <div className="flex items-center space-x-2 text-blue-900 font-bold">
                <HelpCircle className="w-4 h-4 text-blue-600" />
                <span>3. Items Requiring Officer Review ({itemsRequiringReview.length})</span>
              </div>
              <span className="text-[11px] text-blue-800 font-medium">Anomalies requiring administrative scrutiny</span>
            </div>
            <div className="p-4 divide-y divide-slate-100">
              {itemsRequiringReview.length === 0 ? (
                <p className="text-slate-500 py-2">No items requiring special officer review.</p>
              ) : (
                itemsRequiringReview.map((c, i) => (
                  <div key={i} className="py-3 first:pt-0 last:pb-0 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">{c.check_code}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                        Officer Review
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed">{c.explanation}</p>
                    <div className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded border border-slate-200">
                      <strong>Guidance:</strong> Examine submitted document and compare against regional records before deciding.
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* 4. Checks That Could Not Be Completed */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-3 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center space-x-2 text-slate-800 font-bold">
                <Clock className="w-4 h-4 text-slate-500" />
                <span>4. Checks That Could Not Be Completed ({checksCouldNotBeCompleted.length})</span>
              </div>
              <span className="text-[11px] text-slate-600 font-medium">Source unavailable or document unreadable</span>
            </div>
            <div className="p-4 divide-y divide-slate-100">
              {checksCouldNotBeCompleted.length === 0 ? (
                <p className="text-slate-500 py-2">All configured verification services were accessible.</p>
              ) : (
                checksCouldNotBeCompleted.map((c, i) => (
                  <div key={i} className="py-3 first:pt-0 last:pb-0 space-y-1">
                    <span className="font-bold text-slate-800">{c.check_code}</span>
                    <p className="text-slate-600">{c.explanation}</p>
                    <p className="text-[11px] text-slate-500 italic">
                      Result marked as "Verification pending or unavailable" without supporting registry evidence.
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION D: Evidence for Each Finding
          ========================================================================= */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center space-x-2 text-slate-800">
            <Search className="w-5 h-5 text-blue-700" />
            <h2 className="text-base font-bold">Section D: Evidence for Each Scrutiny Finding</h2>
          </div>
          <span className="text-xs text-slate-500">
            Total Recorded Findings: {allFindings.length}
          </span>
        </div>

        {allFindings.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            No compliance deficiencies or anomalies detected in current scrutiny run.
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            {allFindings.map((finding) => {
              const evidence = finding.evidence || {};
              const isSimulated = evidence.is_simulated === true;

              return (
                <div
                  key={finding.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">{finding.title}</span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="font-mono text-[10px] text-blue-700">Code: {finding.finding_code}</span>
                        <span>&bull;</span>
                        <span className="text-[11px] text-slate-500">Category: {finding.category}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        finding.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                        finding.severity === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                      }`}>
                        {finding.severity}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-700 font-semibold">
                        {finding.review_status}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-700 leading-relaxed">{finding.description}</p>

                  {/* Ordinary-Language Evidence Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-3 rounded-lg border border-slate-200 text-[11px]">
                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">Document / Field</span>
                      <span className="font-medium text-slate-800">
                        {evidence.document_category || evidence.field || 'Application Record'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">Expected Value</span>
                      <span className="text-slate-800 font-medium">
                        {evidence.expected_value || evidence.required || 'Statutory compliance'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">Observed Value</span>
                      <span className="text-rose-700 font-bold">
                        {evidence.observed_value || evidence.extracted || 'Deficient'}
                      </span>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">Verification Source</span>
                      <div className="flex items-center gap-1">
                        <span className="text-slate-800 font-medium">
                          {evidence.verification_source || 'AICTE Rules Engine'}
                        </span>
                        {isSimulated && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 px-1 py-0.2 rounded font-bold">
                            Simulated
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400 font-semibold block uppercase text-[10px]">Result</span>
                      <span className="text-amber-800 font-bold">
                        {finding.review_status === 'RESOLVED' ? 'Resolved' : 'Requires Rectification'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* =========================================================================
          SECTION E: Officer Actions & Statutory Decision
          ========================================================================= */}
      <section className="bg-slate-900 text-white rounded-xl p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-400" />
            <h2 className="text-base font-bold">Section E: Officer Actions & Statutory Decision</h2>
          </div>
          <span className="text-xs text-slate-400">
            Active Officer: <strong>{currentUser.full_name}</strong> ({currentUser.designation})
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          AICTE Scrutiny Officers examine findings, issue official deficiency notices to institutions, review resubmissions after corrected documents are uploaded, and record the authorised final statutory approval decision.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          {/* Action 1: Request corrections from the institution */}
          <button
            onClick={() => setIsDeficiencyModalOpen(true)}
            className="bg-amber-600 hover:bg-amber-500 text-white font-bold px-4 py-2.5 rounded-lg text-xs transition-colors flex items-center space-x-2 shadow-sm"
          >
            <Send className="w-4 h-4" />
            <span>Request Corrections (Issue Deficiency Notice)</span>
          </button>

          {/* Action 2: Review a resubmission / Re-evaluate */}
          <button
            onClick={handleReturnToReview}
            disabled={isReturningToReview}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold px-4 py-2.5 rounded-lg text-xs transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <RotateCcw className={`w-4 h-4 ${isReturningToReview ? 'animate-spin' : ''}`} />
            <span>{isReturningToReview ? 'Re-evaluating...' : 'Review Resubmission (Re-run Scrutiny)'}</span>
          </button>

          {/* Action 3: Record the final decision */}
          {isApprover ? (
            <button
              onClick={() => setIsDecisionModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white font-bold px-4 py-2.5 rounded-lg text-xs transition-colors flex items-center space-x-2 shadow-sm ml-auto"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Record Final Statutory Decision</span>
            </button>
          ) : (
            <span className="text-[11px] text-slate-400 ml-auto italic">
              (Final statutory decision requires Scrutiny Officer / Approver authority)
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
    </div>
  );
};
