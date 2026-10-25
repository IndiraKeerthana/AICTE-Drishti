import React, { useState, useMemo } from 'react';
import {
  FileText,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Search,
  Filter,
  ArrowRight,
  Building2,
  FileCheck2
} from 'lucide-react';
import { Application, AlertItem } from '../types';

interface DashboardOverviewProps {
  applications: Application[];
  alerts?: AlertItem[];
  onSelectApplication: (id: number, findingId?: number) => void;
  onAcknowledgeAlert?: (id: number) => Promise<void>;
  onNavigateToApplications?: () => void;
  isQueueView?: boolean;
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

export function getPlainStatus(status: string, finalDecision?: string | null): {
  label: 'Submitted' | 'Scrutiny in progress' | 'Corrections required' | 'Ready for officer review' | 'Decision recorded';
  badgeClass: string;
} {
  if (finalDecision || status === 'APPROVED' || status === 'REJECTED' || status === 'DECISION_RECORDED') {
    return {
      label: 'Decision recorded',
      badgeClass: 'bg-emerald-50 text-emerald-800 border border-emerald-200'
    };
  }
  if (status === 'DEFICIENCY_FLAGGED' || status === 'CORRECTIONS_REQUIRED') {
    return {
      label: 'Corrections required',
      badgeClass: 'bg-amber-50 text-amber-800 border border-amber-200'
    };
  }
  if (status === 'READY_FOR_REVIEW') {
    return {
      label: 'Ready for officer review',
      badgeClass: 'bg-blue-50 text-blue-800 border border-blue-200'
    };
  }
  if (status === 'UNDER_SCRUTINY' || status === 'CHECKING_DOCUMENTS') {
    return {
      label: 'Scrutiny in progress',
      badgeClass: 'bg-indigo-50 text-indigo-800 border border-indigo-200'
    };
  }
  return {
    label: 'Submitted',
    badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200'
  };
}

export function getRequiredNextAction(status: string, findingsCount: number, finalDecision?: string | null): string {
  if (finalDecision || status === 'APPROVED' || status === 'REJECTED') {
    return 'Decision recorded';
  }
  if (status === 'DEFICIENCY_FLAGGED' || status === 'CORRECTIONS_REQUIRED') {
    return 'Awaiting institution corrections';
  }
  if (status === 'READY_FOR_REVIEW') {
    return 'Record statutory decision';
  }
  if (status === 'UNDER_SCRUTINY' || status === 'CHECKING_DOCUMENTS') {
    return findingsCount > 0 ? 'Review preliminary findings' : 'Review scrutiny report';
  }
  return 'Review intake declarations';
}

export function getCategoryTitle(code: string): string {
  switch (code) {
    case 'INCREASE_INTAKE':
      return 'Increase in Sanctioned Intake';
    case 'NEW_INSTITUTE':
      return 'Establishment of New Institution';
    case 'EOA_REGULAR':
      return 'Extension of Approval (EoA) Regular';
    default:
      return code.replace(/_/g, ' ');
  }
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  applications,
  alerts = [],
  onSelectApplication,
  onAcknowledgeAlert,
  onNavigateToApplications,
  isQueueView = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  // The 4 Specific Operational Indicators requested for Officer Work:
  const newApplicationsCount = applications.filter(a => a.status === 'SUBMITTED').length;
  const applicationsBeingCheckedCount = applications.filter(
    a => a.status === 'UNDER_SCRUTINY' || a.status === 'CHECKING_DOCUMENTS'
  ).length;
  const applicationsRequiringCorrectionsCount = applications.filter(
    a => a.status === 'DEFICIENCY_FLAGGED' || a.status === 'CORRECTIONS_REQUIRED'
  ).length;
  const applicationsReadyForReviewCount = applications.filter(
    a => a.status === 'READY_FOR_REVIEW' || (a.status === 'UNDER_SCRUTINY' && a.findings_count === 0 && !a.final_decision)
  ).length;

  // Filtered applications table
  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      const plainStatus = getPlainStatus(app.status, app.final_decision).label;
      const matchesSearch =
        app.application_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.institution.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        app.institution.aicte_permanent_id.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'ALL' || app.category === selectedCategory;

      const matchesStatus =
        selectedStatus === 'ALL' || plainStatus === selectedStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [applications, searchTerm, selectedCategory, selectedStatus]);

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
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [alerts]);

  const displayedAlerts = useMemo(() => attentionAlerts.slice(0, 5), [attentionAlerts]);

  return (
    <div className="space-y-6">
      {/* 4 Action-Oriented Operational Indicators (Shown on Dashboard) */}
      {!isQueueView && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. New applications */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                New applications
              </p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{newApplicationsCount}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Awaiting initial scrutiny</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
          </div>

          {/* 2. Applications being checked */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Applications being checked
              </p>
              <p className="text-2xl font-bold text-blue-700 mt-1">{applicationsBeingCheckedCount}</p>
              <p className="text-[11px] text-blue-600/80 mt-0.5">Scrutiny in progress</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* 3. Applications requiring corrections */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Applications requiring corrections
              </p>
              <p className="text-2xl font-bold text-amber-700 mt-1">{applicationsRequiringCorrectionsCount}</p>
              <p className="text-[11px] text-amber-600 mt-0.5">Deficiency notice active</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          {/* 4. Applications ready for officer review */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Applications ready for officer review
              </p>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{applicationsReadyForReviewCount}</p>
              <p className="text-[11px] text-emerald-600 mt-0.5">Checks completed</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
        </div>
      )}

      {/* Compact "Needs Your Attention" Section (Shown on Dashboard) */}
      {!isQueueView && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-800">Needs Your Attention</h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {attentionAlerts.length}
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-normal">
              Applications requiring officer action or follow-up
            </span>
          </div>

          {attentionAlerts.length === 0 ? (
            <div className="p-6 text-center">
              <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 mx-auto flex items-center justify-center mb-2">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <p className="text-sm font-bold text-slate-800">No applications currently need your attention.</p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                All submitted applications are either proceeding smoothly through automated checks or have their statutory decisions recorded.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {displayedAlerts.map((alert) => {
                const sev = getSeverityBadge(alert.severity);
                const matchingApp = applications.find((a) => a.id === alert.application_id);
                const instName = alert.institution_name || matchingApp?.institution.name || 'Technical Institution';
                const appRef = alert.application_reference || matchingApp?.application_number || `APP-${alert.application_id}`;
                const appStatus = getPlainStatus(alert.application_status || matchingApp?.status || '').label;
                const formattedDate = alert.created_at
                  ? new Date(alert.created_at).toLocaleDateString(undefined, {
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
                        <strong className="text-slate-900">{alert.title}: </strong>
                        <span>{alert.message}</span>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      {alert.status === 'ACTIVE' && onAcknowledgeAlert && (
                        <button
                          type="button"
                          onClick={() => onAcknowledgeAlert(alert.id)}
                          className="px-2.5 py-1.5 rounded text-[11px] font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                          title="Mark this alert as seen (does not resolve the underlying deficiency)"
                        >
                          Mark as seen
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onSelectApplication(alert.application_id, alert.finding_id || undefined)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors"
                      >
                        <span>View Application</span>
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
                    <span>Showing top 5 of {attentionAlerts.length} urgent items. View all in Approval Applications Queue</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Applications Table (Searchable & Filterable) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Header & Controls */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-bold text-slate-800">
              {isQueueView ? 'Approval Applications Queue' : 'Officer Work Queue'}
            </h2>
            <span className="text-xs text-slate-400 font-normal">
              ({filteredApplications.length} applications)
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
                <option value="INCREASE_INTAKE">Increase Intake</option>
                <option value="NEW_INSTITUTE">New Technical Institution</option>
                <option value="EOA_REGULAR">Extension of Approval (EoA)</option>
              </select>
            </div>

            {/* Understandable Status Filter */}
            <div className="flex items-center space-x-1 text-xs">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ALL">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Scrutiny in progress">Scrutiny in progress</option>
                <option value="Corrections required">Corrections required</option>
                <option value="Ready for officer review">Ready for officer review</option>
                <option value="Decision recorded">Decision recorded</option>
              </select>
            </div>
          </div>
        </div>

        {/* Compact Table showing Institution, Category, Submitted Date, Status, Next Action */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Application / Reference No.</th>
                <th className="py-3 px-4">Institution Name</th>
                <th className="py-3 px-4">Approval Category</th>
                <th className="py-3 px-4">Submitted Date</th>
                <th className="py-3 px-4">Current Status</th>
                <th className="py-3 px-4">Next Action</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredApplications.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No applications found matching the selected filters.
                  </td>
                </tr>
              ) : (
                filteredApplications.map((app) => {
                  const plainStatus = getPlainStatus(app.status, app.final_decision);
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
                        {app.application_number}
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
                      <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
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
