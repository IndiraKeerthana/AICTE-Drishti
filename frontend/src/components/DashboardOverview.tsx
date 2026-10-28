import React, { useState, useMemo } from 'react';
import {
  FileText,
  Clock,
  CheckCircle2,
  Search,
  ArrowRight,
  FileCheck2,
  UserCheck,
  AlertCircle
} from 'lucide-react';
import { Application, AlertItem } from '../types';

interface DashboardOverviewProps {
  applications: Application[];
  alerts?: AlertItem[];
  onSelectApplication: (id: number, findingId?: number) => void;
  onAcknowledgeAlert?: (id: number) => Promise<void>;
  onNavigateToApplications?: () => void;
  isQueueView?: boolean;
  isReadyForApprovalView?: boolean;
}

export type PlainStatusLabel =
  | 'Just submitted'
  | 'Being reviewed'
  | 'Waiting for documents'
  | 'Checks in progress'
  | 'Further review needed'
  | 'Ready for your decision'
  | 'Decision recorded';

export function getPlainStatus(
  status: string,
  finalDecision?: string | null,
  findingsCount: number = 0
): {
  label: PlainStatusLabel;
  badgeClass: string;
} {
  if (finalDecision || status === 'APPROVED' || status === 'REJECTED' || status === 'DECISION_RECORDED') {
    return {
      label: 'Decision recorded',
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200'
    };
  }
  if (status === 'READY_FOR_REVIEW') {
    return {
      label: 'Ready for your decision',
      badgeClass: 'bg-blue-50 text-blue-800 border border-blue-200'
    };
  }
  if (status === 'DEFICIENCY_FLAGGED' || status === 'CORRECTIONS_REQUIRED' || status === 'NEEDS_RESUBMISSION') {
    return {
      label: 'Waiting for documents',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200'
    };
  }
  if (status === 'CHECKING_DOCUMENTS') {
    return {
      label: 'Checks in progress',
      badgeClass: 'bg-purple-50 text-purple-800 border border-purple-200'
    };
  }
  if (status === 'UNDER_SCRUTINY') {
    if (findingsCount > 0) {
      return {
        label: 'Further review needed',
        badgeClass: 'bg-indigo-50 text-indigo-800 border border-indigo-200'
      };
    }
    return {
      label: 'Being reviewed',
      badgeClass: 'bg-sky-50 text-sky-800 border border-sky-200'
    };
  }
  return {
    label: 'Just submitted',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200'
  };
}

export function getRequiredNextAction(
  status: string,
  findingsCount: number = 0,
  finalDecision?: string | null
): string {
  if (finalDecision || status === 'APPROVED' || status === 'REJECTED' || status === 'DECISION_RECORDED') {
    return 'No further action currently required';
  }
  if (status === 'READY_FOR_REVIEW') {
    return 'Open application and record your decision';
  }
  if (status === 'DEFICIENCY_FLAGGED' || status === 'CORRECTIONS_REQUIRED' || status === 'NEEDS_RESUBMISSION') {
    return "Await the applicant's missing documents";
  }
  if (status === 'CHECKING_DOCUMENTS') {
    return 'Complete the outstanding checks';
  }
  if (status === 'UNDER_SCRUTINY') {
    return findingsCount > 0
      ? 'Review the identified discrepancy'
      : 'Continue reviewing the submitted documents';
  }
  if (status === 'SUBMITTED') {
    return 'Begin application scrutiny';
  }
  return 'Review application details';
}

export function getCategoryTitle(code: string): string {
  switch (code) {
    case 'INCREASE_INTAKE':
      return 'Increase in sanctioned intake';
    case 'NEW_INSTITUTE':
      return 'Establishment of new institution';
    case 'EOA_REGULAR':
      return 'Extension of Approval (EoA)';
    default:
      return code.replace(/_/g, ' ');
  }
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  applications,
  onSelectApplication,
  isQueueView = false,
  isReadyForApprovalView = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // Operational Workload Counts
  const justSubmittedCount = applications.filter(a => a.status === 'SUBMITTED').length;
  const beingReviewedCount = applications.filter(
    a => a.status === 'UNDER_SCRUTINY' || a.status === 'CHECKING_DOCUMENTS'
  ).length;
  const waitingForDocsCount = applications.filter(
    a => a.status === 'DEFICIENCY_FLAGGED' || a.status === 'CORRECTIONS_REQUIRED' || a.status === 'NEEDS_RESUBMISSION'
  ).length;
  const readyForDecisionCount = applications.filter(
    a => !a.final_decision && a.status !== 'APPROVED' && a.status !== 'REJECTED' &&
         (a.status === 'READY_FOR_REVIEW' || (a.status === 'UNDER_SCRUTINY' && a.findings_count === 0))
  ).length;

  // Base applications list depends on whether this is Ready For Approval queue
  const baseApplications = useMemo(() => {
    if (isReadyForApprovalView) {
      return applications.filter(
        a => !a.final_decision && a.status !== 'APPROVED' && a.status !== 'REJECTED' &&
             (a.status === 'READY_FOR_REVIEW' || (a.status === 'UNDER_SCRUTINY' && a.findings_count === 0))
      );
    }
    return applications;
  }, [applications, isReadyForApprovalView]);

  // Filtered and CHRONOLOGICALLY SORTED applications table (Oldest submission first / FIFO)
  const filteredApplications = useMemo(() => {
    return baseApplications
      .filter((app) => {
        const plainStatus = getPlainStatus(app.status, app.final_decision, app.findings_count).label;
        const matchesSearch =
          app.application_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.institution.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          app.institution.aicte_permanent_id.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory =
          selectedCategory === 'ALL' || app.category === selectedCategory;

        const matchesStatus =
          selectedStatus === 'ALL' || plainStatus === selectedStatus;

        return matchesSearch && matchesCategory && matchesStatus;
      })
      // Strictly sort by submission timestamp, oldest first (FIFO order)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }, [baseApplications, searchTerm, selectedCategory, selectedStatus]);

  const hasActiveFilters = searchTerm !== '' || selectedCategory !== 'ALL' || selectedStatus !== 'ALL';

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setSelectedStatus('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Officer Welcome & Summary Banner (Dashboard only) */}
      {!isQueueView && !isReadyForApprovalView && (
        <div className="bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h2 className="text-base font-bold text-white">Welcome, AICTE Official</h2>
              <span className="text-xs bg-blue-500/20 text-blue-300 font-semibold px-2 py-0.5 rounded border border-blue-400/30">
                Scrutiny & Approval Division
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl">
              Applications are listed in chronological submission order (oldest first). Select an application to inspect required documents, review verified checks, and record statutory decisions.
            </p>
          </div>
          <div className="flex items-center space-x-2 shrink-0">
            <span className="text-xs bg-slate-800 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300">
              Total Applications: <strong>{applications.length}</strong>
            </span>
          </div>
        </div>
      )}

      {/* 4 Calm, Data-Driven Workload Summary Cards (Shown on Dashboard only) */}
      {!isQueueView && !isReadyForApprovalView && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Just submitted */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Just submitted
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{justSubmittedCount}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Awaiting scrutiny initiation</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          {/* 2. Being reviewed */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Being reviewed
              </p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{beingReviewedCount}</p>
              <p className="text-[11px] text-blue-600/80 mt-0.5">Scrutiny checks in progress</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* 3. Waiting for documents */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Waiting for documents
              </p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{waitingForDocsCount}</p>
              <p className="text-[11px] text-amber-600 mt-0.5">Awaiting applicant resubmission</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>

          {/* 4. Ready for your decision */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Ready for your decision
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{readyForDecisionCount}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">All checks complete &bull; Awaiting decision</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Main Applications Queue Table (Chronological: Oldest First) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
              {isReadyForApprovalView ? (
                <>
                  <UserCheck className="w-4 h-4 text-emerald-600" />
                  <span>Ready for Approval Queue</span>
                </>
              ) : isQueueView ? (
                <>
                  <FileCheck2 className="w-4 h-4 text-blue-600" />
                  <span>All Applications Queue</span>
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span>Applications Queue</span>
                </>
              )}
            </h2>
            <span className="text-xs text-slate-400 font-normal">
              ({filteredApplications.length} applications &bull; sorted oldest first)
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative min-w-[240px] flex-1 md:flex-initial">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2" />
              <input
                type="text"
                placeholder="Search reference no., institution..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center space-x-1 text-xs">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Categories</option>
                <option value="INCREASE_INTAKE">Increase in sanctioned intake</option>
                <option value="NEW_INSTITUTE">Establishment of new institution</option>
                <option value="EOA_REGULAR">Extension of Approval (EoA)</option>
              </select>
            </div>

            {/* Understandable Status Filter */}
            {!isReadyForApprovalView && (
              <div className="flex items-center space-x-1 text-xs">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Just submitted">Just submitted</option>
                  <option value="Being reviewed">Being reviewed</option>
                  <option value="Waiting for documents">Waiting for documents</option>
                  <option value="Checks in progress">Checks in progress</option>
                  <option value="Further review needed">Further review needed</option>
                  <option value="Ready for your decision">Ready for your decision</option>
                  <option value="Decision recorded">Decision recorded</option>
                </select>
              </div>
            )}

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="px-2.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                title="Reset search and filters"
              >
                Clear Filters
              </button>
            )}
          </div>
        </div>

        {/* Ready for Approval queue explanation banner */}
        {isReadyForApprovalView && (
          <div className="px-4 py-2.5 bg-emerald-50/70 border-b border-emerald-100 text-xs text-emerald-900 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                These applications have completed all required scrutiny checks with all mandatory documents received and no outstanding blocking issues. They are awaiting an authorised officer's decision.
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-800 shrink-0 ml-2">
              Completion of scrutiny is not approval. The officer must record the decision.
            </span>
          </div>
        )}

        {/* Main Application Queue Table (Oldest First, No Priority Column) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Application Reference</th>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">Application Type</th>
                <th className="py-3 px-4">Submitted on</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Next Action</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    <p className="font-semibold text-slate-600">
                      {isReadyForApprovalView
                        ? 'No applications are currently awaiting approval decision.'
                        : 'No applications match the active filters.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="mt-2 text-xs text-blue-600 hover:underline font-bold"
                      >
                        Reset search & filters
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app, index) => {
                  const plainStatus = getPlainStatus(app.status, app.final_decision, app.findings_count);
                  const nextAction = getRequiredNextAction(app.status, app.findings_count, app.final_decision);
                  const submissionDate = new Date(app.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  });

                  return (
                    <tr
                      key={app.id}
                      onClick={() => onSelectApplication(app.id)}
                      className="hover:bg-blue-50/40 cursor-pointer transition-colors group"
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-blue-700 whitespace-nowrap">
                        <div className="flex items-center space-x-1.5">
                          <span>{app.application_number}</span>
                          {index === 0 && !hasActiveFilters && (
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-sans px-1.5 py-0.5 rounded border border-slate-200">
                              Earliest
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-800">{app.institution.name}</div>
                        <div className="text-[11px] text-slate-400">
                          Permanent ID: {app.institution.aicte_permanent_id}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700">
                        {getCategoryTitle(app.category)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                        {submissionDate}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-semibold ${plainStatus.badgeClass}`}>
                          {plainStatus.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-700 font-medium">
                        {nextAction}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="text-blue-600 font-semibold group-hover:underline inline-flex items-center gap-1">
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
