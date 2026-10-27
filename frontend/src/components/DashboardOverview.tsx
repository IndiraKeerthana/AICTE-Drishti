import React, { useState, useMemo } from 'react';
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  ArrowRight,
  Building2,
  FileCheck2,
  UserCheck
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

export function getSeverityBadge(severity: string): { label: string; badgeClass: string } {
  const norm = severity?.toLowerCase() || '';
  if (norm.includes('action') || norm.includes('critical') || norm.includes('high')) {
    return {
      label: 'Action required',
      badgeClass: 'bg-red-50 text-red-700 border border-red-200'
    };
  }
  if (norm.includes('waiting') || norm.includes('pending') || norm.includes('unavailable')) {
    return {
      label: 'Waiting for verification',
      badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200'
    };
  }
  return {
    label: 'Review required',
    badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200'
  };
}

export type PlainStatusLabel =
  | 'Newly submitted'
  | 'Under review'
  | 'Needs resubmission'
  | 'Further review required'
  | 'Ready for approval'
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
      label: 'Ready for approval',
      badgeClass: 'bg-blue-50 text-blue-800 border border-blue-200'
    };
  }
  if (status === 'DEFICIENCY_FLAGGED' || status === 'CORRECTIONS_REQUIRED' || status === 'NEEDS_RESUBMISSION') {
    return {
      label: 'Needs resubmission',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200'
    };
  }
  if (status === 'UNDER_SCRUTINY' || status === 'CHECKING_DOCUMENTS') {
    if (findingsCount > 0) {
      return {
        label: 'Further review required',
        badgeClass: 'bg-indigo-50 text-indigo-800 border border-indigo-200'
      };
    }
    return {
      label: 'Under review',
      badgeClass: 'bg-sky-50 text-sky-800 border border-sky-200'
    };
  }
  return {
    label: 'Newly submitted',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200'
  };
}

export function getRequiredNextAction(status: string, findingsCount: number, finalDecision?: string | null): string {
  if (finalDecision || status === 'APPROVED' || status === 'REJECTED') {
    return 'Decision recorded';
  }
  if (status === 'DEFICIENCY_FLAGGED' || status === 'CORRECTIONS_REQUIRED') {
    return 'Awaiting institution resubmission';
  }
  if (status === 'READY_FOR_REVIEW') {
    return 'Record statutory decision';
  }
  if (status === 'UNDER_SCRUTINY' || status === 'CHECKING_DOCUMENTS') {
    return findingsCount > 0 ? 'Review preliminary findings' : 'Review scrutiny report';
  }
  return 'Initiate scrutiny review';
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

export function formatAlertTitle(title: string): string {
  if (!title) return 'Compliance Alert';
  let t = title;
  t = t.replace(/DETECTOR-PHASH(-\d+)?/gi, 'Infrastructure photograph similarity check');
  t = t.replace(/APH-INTEGRITY-PDF-MOD(-\d+)?/gi, 'Document modification indicator');
  t = t.replace(/APH-2026-INTAKE(-\d+)?/gi, 'Sanctioned intake comparison');
  t = t.replace(/APH-2026-NAME(-\d+)?/gi, 'Institution title consistency');
  return t;
}

export function formatAlertMessage(msg: string): string {
  if (!msg) return '';
  let m = msg;
  m = m.replace(/DETECTOR-PHASH(-\d+)?/gi, 'Infrastructure photograph similarity check ($&)');
  m = m.replace(/APH-INTEGRITY-PDF-MOD(-\d+)?/gi, 'Document modification indicator ($&)');
  m = m.replace(/APH-2026-INTAKE(-\d+)?/gi, 'Sanctioned intake comparison ($&)');
  m = m.replace(/APH-2026-NAME(-\d+)?/gi, 'Institution title check ($&)');
  return m;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  applications,
  alerts = [],
  onSelectApplication,
  onAcknowledgeAlert,
  onNavigateToApplications,
  isQueueView = false,
  isReadyForApprovalView = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // The 4 Useful Operational Counts derived from actual backend data:
  const newApplicationsCount = applications.filter(a => a.status === 'SUBMITTED').length;
  const applicationsUnderReviewCount = applications.filter(
    a => a.status === 'UNDER_SCRUTINY' || a.status === 'CHECKING_DOCUMENTS'
  ).length;
  const applicationsRequiringCorrectionsCount = applications.filter(
    a => a.status === 'DEFICIENCY_FLAGGED' || a.status === 'CORRECTIONS_REQUIRED'
  ).length;
  const applicationsReadyForApprovalCount = applications.filter(
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

  // Filtered and CHRONOLOGICALLY SORTED applications table (Oldest submission first)
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

  const urgencyWeight = (sev: string) => {
    const s = sev?.toLowerCase() || '';
    if (s.includes('action') || s.includes('critical')) return 1;
    if (s.includes('review') || s.includes('high')) return 2;
    if (s.includes('waiting') || s.includes('pending')) return 3;
    return 4;
  };

  const attentionAlerts = useMemo(() => {
    if (!alerts) return [];
    return alerts
      .filter((a) => a.status === 'ACTIVE' || a.status === 'ACKNOWLEDGED')
      .sort((a, b) => {
        const diff = urgencyWeight(a.severity) - urgencyWeight(b.severity);
        if (diff !== 0) return diff;
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  }, [alerts]);

  const displayedAlerts = useMemo(() => attentionAlerts.slice(0, 5), [attentionAlerts]);

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

      {/* 4 Action-Oriented Operational Indicators (Shown on Dashboard only) */}
      {!isQueueView && !isReadyForApprovalView && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. Newly submitted */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Newly submitted
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{newApplicationsCount}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Awaiting scrutiny initiation</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          {/* 2. Under review */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Under review
              </p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{applicationsUnderReviewCount}</p>
              <p className="text-[11px] text-blue-600/80 mt-0.5">Scrutiny checks in progress</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* 3. Needs resubmission */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Needs resubmission
              </p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{applicationsRequiringCorrectionsCount}</p>
              <p className="text-[11px] text-amber-600 mt-0.5">Deficiency notice issued</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          {/* 4. Ready for approval */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Ready for approval
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{applicationsReadyForApprovalCount}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">All checks complete &bull; Awaiting decision</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Compact "Needs Your Attention" Section (Shown on Dashboard only) */}
      {!isQueueView && !isReadyForApprovalView && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800">Items Needing Attention</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {attentionAlerts.length}
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-normal">
              Chronological order &bull; Oldest active alert first
            </span>
          </div>

          {attentionAlerts.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-800">No applications currently need urgent attention.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                All submitted applications are either proceeding through scrutiny checks or have their decisions recorded.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {displayedAlerts.map((alert) => {
                const sev = getSeverityBadge(alert.severity);
                const matchingApp = applications.find((a) => a.id === alert.application_id);
                const instName = alert.institution_name || matchingApp?.institution.name || 'Technical Institution';
                const appRef = alert.application_reference || matchingApp?.application_number || `APP-${alert.application_id}`;
                const appStatus = getPlainStatus(
                  alert.application_status || matchingApp?.status || '',
                  matchingApp?.final_decision,
                  matchingApp?.findings_count
                ).label;
                const formattedDate = alert.created_at
                  ? new Date(alert.created_at).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })
                  : 'Recently';

                return (
                  <div
                    key={alert.id}
                    className="p-4 hover:bg-slate-50/60 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sev.badgeClass}`}>
                          {sev.label}
                        </span>
                        <span className="font-bold text-slate-900 truncate">
                          {instName}
                        </span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="font-mono text-slate-600 font-semibold">
                          {appRef}
                        </span>
                        <span className="text-slate-400">&bull;</span>
                        <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          {appStatus}
                        </span>
                        {alert.status === 'ACKNOWLEDGED' && (
                          <span className="text-[10px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 font-medium">
                            Seen by officer
                          </span>
                        )}
                        <span className="text-slate-400 text-[11px] ml-auto md:ml-0">
                          {formattedDate}
                        </span>
                      </div>

                      <p className="text-slate-700 text-xs leading-relaxed">
                        <strong className="text-slate-900">{formatAlertTitle(alert.title)}: </strong>
                        <span>{formatAlertMessage(alert.message)}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {alert.status === 'ACTIVE' && onAcknowledgeAlert && (
                        <button
                          type="button"
                          onClick={() => onAcknowledgeAlert(alert.id)}
                          className="px-2.5 py-1.5 rounded text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Mark this alert as seen"
                        >
                          Mark as seen
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectApplication(alert.application_id, alert.finding_id || undefined)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors"
                      >
                        <span>Open Application</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {attentionAlerts.length > 5 && (
                <div className="p-3 bg-slate-50/50 text-center border-t border-slate-100">
                  <button
                    type="button"
                    onClick={onNavigateToApplications}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                  >
                    <span>Showing 5 of {attentionAlerts.length} items. View all in Applications Queue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Applications Table (Chronological: Oldest First) */}
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

            {/* Understandable Status Filter (Hidden if already in Ready for Approval queue) */}
            {!isReadyForApprovalView && (
              <div className="flex items-center space-x-1 text-xs">
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Newly submitted">Newly submitted</option>
                  <option value="Under review">Under review</option>
                  <option value="Needs resubmission">Needs resubmission</option>
                  <option value="Further review required">Further review required</option>
                  <option value="Ready for approval">Ready for approval</option>
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

        {/* Ready for Approval helper banner */}
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

        {/* Chronological Table (Oldest First, No Priority Column) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Application / Reference No.</th>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">Approval Category</th>
                <th className="py-3 px-4">Submission Date</th>
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
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-sans px-1.5 py-0.2 rounded border border-slate-200">
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
