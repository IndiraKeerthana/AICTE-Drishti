import React, { useState, useMemo } from 'react';
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
  AlertCircle,
  ChevronDown,
  ChevronUp
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

export function getFailureDetails(
  finding: Finding,
  doc?: { original_filename?: string | null; document_category?: string } | null,
  chk?: DocumentChecklistItem | null
): {
  statusText: string;
  statusBadgeClass: string;
  shortExplanation: string;
} {
  const fUpper = (finding.finding_code || '').toUpperCase();
  const catUpper = (finding.category || '').toUpperCase();
  const titleUpper = (finding.title || '').toUpperCase();
  const descUpper = (finding.description || '').toUpperCase();
  const evidence = finding.evidence || {};
  const obs = finding.observed_value || evidence.observed_value || '';
  const exp = finding.expected_value || evidence.expected_value || '';

  let statusText = "Details don't match";
  let statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
  let shortExplanation = '';

  // 1. Record not found
  if (
    fUpper.includes('NOT_FOUND') ||
    titleUpper.includes('RECORD NOT FOUND') ||
    descUpper.includes('NOT FOUND') ||
    obs.toUpperCase().includes('NOT_FOUND')
  ) {
    statusText = 'Record not found';
    statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-300';
    shortExplanation = 'No matching approval was found in the available registry.';
  }
  // 2. Possible tampering / Integrity anomalies
  else if (
    catUpper === 'INTEGRITY_ANOMALY' ||
    fUpper.includes('PDF-MOD') ||
    fUpper.includes('PHASH') ||
    fUpper.includes('DUP') ||
    titleUpper.includes('MODIFICATION') ||
    titleUpper.includes('DUPLICATE') ||
    titleUpper.includes('REUSED')
  ) {
    statusText = 'Possible tampering';
    statusBadgeClass = 'bg-purple-50 text-purple-800 border-purple-300';
    if (fUpper.includes('PDF-MOD') || titleUpper.includes('MODIFICATION')) {
      shortExplanation = 'A document-integrity check detected a suspicious modification.';
    } else if (fUpper.includes('PHASH') || titleUpper.includes('REUSED')) {
      shortExplanation = 'A document-integrity check detected similar photo evidence reused across differing facilities.';
    } else if (fUpper.includes('DUP') || titleUpper.includes('DUPLICATE')) {
      shortExplanation = 'An identical file was uploaded under multiple different statutory categories.';
    } else {
      shortExplanation = 'A document-integrity check detected a suspicious modification.';
    }
  }
  // 3. Unable to verify
  else if (
    fUpper.includes('TIMEOUT') ||
    fUpper.includes('UNAVAILABLE') ||
    fUpper.includes('EXTRACTION') ||
    titleUpper.includes('UNAVAILABLE') ||
    titleUpper.includes('TIMEOUT') ||
    finding.evidence_classification === 'CHECK_NOT_COMPLETED' ||
    obs.toUpperCase().includes('TIMEOUT') ||
    obs.toUpperCase().includes('UNAVAILABLE')
  ) {
    statusText = 'Unable to verify';
    statusBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300';
    shortExplanation = 'The verification check could not be completed.';
  }
  // 4. Validity expired
  else if (catUpper === 'EXPIRED_DOCUMENT' || fUpper.includes('EXPIRED') || titleUpper.includes('EXPIRED')) {
    statusText = 'Validity expired';
    statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-300';
    shortExplanation = obs
      ? `The submitted clearance expired on ${obs}.`
      : 'The submitted statutory certificate has expired.';
  }
  // 5. Revoked / Rejected / Status Invalid
  else if (
    titleUpper.includes('REVOKED') ||
    titleUpper.includes('REJECTED') ||
    fUpper.includes('REVOKED') ||
    fUpper.includes('REJECTED') ||
    titleUpper.includes('STATUS INVALID')
  ) {
    statusText = 'Approval invalid';
    statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-300';
    shortExplanation = obs
      ? `Authority registry records this approval as ${obs}.`
      : 'Authority registry records this statutory approval as revoked or rejected.';
  }
  // 6. Location mismatch
  else if (
    titleUpper.includes('LOCATION') ||
    fUpper.includes('DIFF-LOC') ||
    descUpper.includes('LOCATION')
  ) {
    statusText = "Details don't match";
    statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
    shortExplanation = 'The submitted approval lists a different location from the authority record.';
  }
  // 7. Entity mismatch
  else if (
    titleUpper.includes('ENTITY') ||
    fUpper.includes('OTHER-INST') ||
    descUpper.includes('DIFFERENT INSTITUTION')
  ) {
    statusText = "Details don't match";
    statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
    shortExplanation = 'The submitted approval lists a different institution from the authority record.';
  }
  // 8. Intake mismatch
  else if (fUpper.includes('INTAKE') || titleUpper.includes('INTAKE')) {
    statusText = "Details don't match";
    statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
    shortExplanation =
      exp && obs
        ? `Declared intake (${obs}) differs from the approved baseline record (${exp}).`
        : 'Declared intake contradicts approved baseline in institutional records.';
  }
  // 9. Name consistency mismatch
  else if (fUpper.includes('NAME') || titleUpper.includes('NAME')) {
    statusText = "Details don't match";
    statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
    shortExplanation = 'The institution name in the submitted attachment does not match the registered title.';
  }
  // Default fallback
  else {
    statusText = "Details don't match";
    statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300';
    let cleanDesc = (finding.description || finding.title || '').replace(/\[PLACEHOLDER.*?\]/gi, '').trim();
    if (cleanDesc.length > 120) {
      const sentence = cleanDesc.split('.')[0] + '.';
      if (sentence.length > 20) cleanDesc = sentence;
    }
    shortExplanation = cleanDesc || 'The submitted details conflict with official records.';
  }

  return {
    statusText,
    statusBadgeClass,
    shortExplanation,
  };
}

export function getOfficerFriendlyFindingDetails(finding: Finding) {
  const evidence = finding.evidence || {};
  const fUpper = (finding.finding_code || '').toUpperCase();
  const catUpper = (finding.category || '').toUpperCase();
  const classUpper = (finding.evidence_classification || '').toUpperCase();

  // 1. Group / Category Classification per Requirement 5
  let groupType: 'MISSING' | 'DISCREPANCY' | 'AWAITING_VERIFICATION' | 'INTEGRITY' | 'INCOMPLETE' = 'DISCREPANCY';
  if (catUpper === 'MISSING_DOCUMENT' || fUpper.startsWith('FND-MISSING')) {
    groupType = 'MISSING';
  } else if (classUpper === 'CHECK_NOT_COMPLETED' || fUpper.includes('TIMEOUT') || fUpper.includes('UNAVAILABLE') || fUpper.includes('EXTRACTION')) {
    groupType = 'INCOMPLETE';
  } else if (catUpper === 'INTEGRITY_ANOMALY' || fUpper.includes('PDF-MOD') || fUpper.includes('PHASH')) {
    groupType = 'INTEGRITY';
  } else if (catUpper === 'RECORD_MISMATCH' || fUpper.includes('INTAKE') || fUpper.includes('DIFF-LOC') || fUpper.includes('OTHER-INST')) {
    groupType = 'DISCREPANCY';
  } else if (catUpper === 'EXPIRED_DOCUMENT' || catUpper === 'AUTHORITY_VERIFICATION' || fUpper.includes('AUTH') || fUpper.includes('EXPIRED')) {
    groupType = 'AWAITING_VERIFICATION';
  }

  // 2. Short, plain-English status per Requirement 6
  let statusLabel = 'Further review required';
  let statusBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300';
  let actionType: 'review' | 'clarification' = 'review';

  if (finding.review_status === 'RESOLVED') {
    statusLabel = 'Resolved';
    statusBadgeClass = 'bg-emerald-50 text-emerald-800 border-emerald-300';
  } else if (groupType === 'MISSING') {
    statusLabel = 'Documents missing';
    statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
    actionType = 'clarification';
  } else if (groupType === 'DISCREPANCY') {
    statusLabel = 'Difference found';
    statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-300 font-bold';
    actionType = 'review';
  } else if (groupType === 'INTEGRITY') {
    statusLabel = 'Further review required';
    statusBadgeClass = 'bg-purple-50 text-purple-800 border-purple-300 font-bold';
    actionType = 'review';
  } else if (groupType === 'INCOMPLETE') {
    statusLabel = 'Check incomplete';
    statusBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300 font-bold';
    actionType = 'review';
  } else if (groupType === 'AWAITING_VERIFICATION') {
    if (fUpper.includes('EXPIRED') || catUpper === 'EXPIRED_DOCUMENT') {
      statusLabel = 'Validity expired';
      statusBadgeClass = 'bg-rose-50 text-rose-800 border-rose-300 font-bold';
      actionType = 'clarification';
    } else {
      statusLabel = 'Awaiting verification';
      statusBadgeClass = 'bg-blue-50 text-blue-800 border-blue-300 font-bold';
      actionType = 'review';
    }
  }

  // 3. Question 1: What was found?
  let whatWasFound = finding.description;
  if (!whatWasFound || whatWasFound.trim().length === 0) {
    whatWasFound = finding.title;
  }
  whatWasFound = whatWasFound.replace(/\[PLACEHOLDER.*?\]/gi, '').trim();

  // 4. Question 2: Why does it matter?
  let whyItMatters = evidence.why_review_needed;
  if (!whyItMatters) {
    if (groupType === 'MISSING') {
      whyItMatters = 'Statutory regulations require all mandatory documents to be on record before an application can be cleared for approval.';
    } else if (groupType === 'DISCREPANCY') {
      whyItMatters = 'Declared figures or institutional details contradict official baseline records and must be reconciled before sanction.';
    } else if (groupType === 'AWAITING_VERIFICATION') {
      if (fUpper.includes('EXPIRED') || catUpper === 'EXPIRED_DOCUMENT') {
        whyItMatters = 'Regulatory safety certificates and statutory clearances must remain active and valid throughout the scrutiny period.';
      } else {
        whyItMatters = 'Statutory approval details must be confirmed with the issuing authority before granting regulatory clearance.';
      }
    } else if (groupType === 'INTEGRITY') {
      whyItMatters = 'Document formatting indicators show structural modifications that require visual inspection to ensure authenticity without assuming fraud.';
    } else if (groupType === 'INCOMPLETE') {
      whyItMatters = 'Automated verification could not be completed and cannot be cleared without manual inspection.';
    } else {
      whyItMatters = 'Officer review is required to verify institutional compliance against AICTE handbook standards.';
    }
  }
  whyItMatters = whyItMatters.replace(/\[PLACEHOLDER.*?\]/gi, '').trim();

  // 5. Question 3: What should happen next?
  let whatNext = finding.recommended_action;
  if (!whatNext || whatNext.includes('[PLACEHOLDER') || whatNext.trim().length < 5) {
    if (groupType === 'MISSING') {
      whatNext = 'Request applicant institution to upload missing attachments via a deficiency notice.';
    } else if (groupType === 'DISCREPANCY') {
      whatNext = 'Review baseline reconciliation records or request official clarification from the applicant.';
    } else if (groupType === 'AWAITING_VERIFICATION') {
      if (fUpper.includes('EXPIRED') || catUpper === 'EXPIRED_DOCUMENT') {
        whatNext = 'Request applicant to upload an active, renewed certificate.';
      } else {
        whatNext = 'Confirm certificate authenticity against authority registry or request applicant verification.';
      }
    } else if (groupType === 'INTEGRITY') {
      whatNext = 'Inspect document pages in the in-app viewer to confirm authenticity and absence of manipulation.';
    } else if (groupType === 'INCOMPLETE') {
      whatNext = 'Retry the external verification check or perform manual officer verification.';
    } else {
      whatNext = 'Inspect the supporting document and record an administrative determination.';
    }
  } else {
    whatNext = whatNext.replace(/\[PLACEHOLDER.*?\]/gi, '').trim();
  }

  // 6. Expected vs Observed comparison (Only when relevant - simple comparison)
  const exp = evidence.expected_value || finding.expected_value;
  const obs = evidence.observed_value || finding.observed_value;
  const isGeneric = (val?: string | null) =>
    !val ||
    val.toLowerCase().includes('statutory compliance') ||
    val.toLowerCase().includes('discrepancy detected') ||
    val.toLowerCase().includes('all mandatory documents');

  const hasComparison = Boolean(
    exp &&
    obs &&
    !isGeneric(exp) &&
    !isGeneric(obs) &&
    groupType !== 'MISSING'
  );

  return {
    groupType,
    statusLabel,
    statusBadgeClass,
    actionType,
    whatWasFound,
    whyItMatters,
    whatNext,
    hasComparison,
    expectedVal: exp,
    observedVal: obs,
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

  // Area D: Findings & Evidence filter and expanded items
  const [findingsFilter, setFindingsFilter] = useState<'ALL' | 'FLAGGED' | 'MISSING' | 'PENDING' | 'VERIFIED'>('ALL');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const toggleExpanded = (id: string) => {
    setExpandedItems((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Auto-scroll and focus finding card when navigated from alert
  React.useEffect(() => {
    if (targetFindingId) {
      setHighlightedFindingId(targetFindingId);
      setExpandedItems((prev) => ({
        ...prev,
        [`finding-${targetFindingId}`]: true,
      }));
      setFindingsFilter('ALL');
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

  // GROUP 1: Missing Mandatory Documents (Process Gating)
  const missingMandatoryDocs = application.document_checklist.filter(
    (item) => item.is_mandatory && !item.is_submitted
  );

  // All open findings
  const allFindings = application.findings || [];
  const openFindings = allFindings.filter((f) => f.review_status !== 'RESOLVED');

  // Area D Data Categorization (Clean, Compact, Easy-to-Understand)
  // 1. Missing Documents (concise list)
  const missingDocs = useMemo(() => {
    return (application.document_checklist || []).filter((item) => !item.is_submitted);
  }, [application.document_checklist]);

  // 2. Failed Verification / Flagged Items
  const failedItems = useMemo(() => {
    const openSubmittedFindings = (application.findings || []).filter(
      (f) =>
        f.review_status !== 'RESOLVED' &&
        f.category !== 'MISSING_DOCUMENT' &&
        !f.finding_code.startsWith('FND-MISSING')
    );

    return openSubmittedFindings.map((finding) => {
      const docId = finding.supporting_document_id;
      const evidence = finding.evidence || {};
      const catCode = evidence.document_category;
      const matchedDoc = application.documents?.find(
        (d) => (docId && d.id === docId) || (catCode && d.document_category === catCode)
      );
      const matchedChecklist = application.document_checklist?.find(
        (dc) => (docId && dc.document_id === docId) || (catCode && dc.category_code === catCode)
      );
      const streamUrl =
        matchedChecklist?.stream_url ||
        (matchedDoc ? `/api/documents/${matchedDoc.id}/stream` : null);
      const docName =
        matchedChecklist?.document_name || matchedDoc?.original_filename || finding.title;
      const details = getFailureDetails(finding, matchedDoc, matchedChecklist);
      const isSimulated = Boolean(
        evidence.is_simulated ||
        finding.finding_code.includes('AUTH') ||
        finding.finding_code.includes('SIMULATED') ||
        finding.title.includes('Authority') ||
        (finding.rule_code && finding.rule_code.toUpperCase().includes('AUTH')) ||
        evidence.verification_source?.includes('SIMULATED') ||
        (matchedDoc &&
          [
            'FIRE_SAFETY_NOC',
            'BUILDING_PLAN',
            'LAYOUT_APPROVAL',
            'AFFILIATION_LETTER',
            'ENVIRONMENTAL_CLEARANCE',
            'LAND_TITLE_DEED',
          ].includes(matchedDoc.document_category))
      );

      return {
        finding,
        documentName: docName,
        doc: matchedDoc,
        chk: matchedChecklist,
        streamUrl,
        isSimulated,
        ...details,
      };
    });
  }, [application.findings, application.documents, application.document_checklist]);

  // 3. Pending Verification / Awaiting Confirmation
  const pendingItems = useMemo(() => {
    const items: Array<{
      id: string;
      name: string;
      statusText: string;
      statusBadgeClass: string;
      shortExplanation: string;
      isSimulated: boolean;
      documentId?: number | null;
      filename?: string | null;
      streamUrl?: string | null;
      verificationSource?: string | null;
    }> = [];

    const failedDocIds = new Set(
      (application.findings || [])
        .filter((f) => f.review_status !== 'RESOLVED' && f.supporting_document_id)
        .map((f) => f.supporting_document_id!)
    );

    for (const chk of application.document_checklist || []) {
      if (!chk.is_submitted) continue;
      if (chk.status === 'VERIFIED') continue;
      if (chk.document_id && failedDocIds.has(chk.document_id)) continue;

      const doc = application.documents?.find((d) => d.id === chk.document_id);
      let statusText = 'Awaiting verification';
      let statusBadgeClass = 'bg-blue-50 text-blue-800 border-blue-200';
      let shortExplanation =
        chk.deficiency_reason ||
        'Submitted document received. Awaiting external authority confirmation.';

      if (chk.status === 'SOURCE_UNAVAILABLE' || chk.status === 'VERIFICATION_UNAVAILABLE') {
        statusText = 'Unable to verify';
        statusBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300';
        shortExplanation = 'The verification check could not be completed (authority gateway unavailable).';
      } else if (chk.status === 'MANUAL_REVIEW') {
        statusText = 'Manual confirmation required';
        statusBadgeClass = 'bg-amber-50 text-amber-800 border-amber-200';
        shortExplanation = 'Manual confirmation by authorised scrutiny officer required.';
      } else if (chk.status === 'UNREADABLE') {
        statusText = 'Unable to verify';
        statusBadgeClass = 'bg-slate-100 text-slate-800 border-slate-300';
        shortExplanation = 'Document text could not be extracted cleanly from scanned attachment.';
      }

      const isSimulated = Boolean(
        chk.is_simulated ||
        [
          'FIRE_SAFETY_NOC',
          'BUILDING_PLAN',
          'LAYOUT_APPROVAL',
          'AFFILIATION_LETTER',
          'ENVIRONMENTAL_CLEARANCE',
        ].includes(chk.category_code)
      );

      items.push({
        id: `pending-${chk.category_code}`,
        name: chk.document_name,
        statusText,
        statusBadgeClass,
        shortExplanation,
        isSimulated,
        documentId: chk.document_id || doc?.id || null,
        filename: chk.filename || doc?.original_filename || null,
        streamUrl: chk.stream_url || (doc ? `/api/documents/${doc.id}/stream` : null),
        verificationSource: chk.verification_source || null,
      });
    }

    return items;
  }, [application.document_checklist, application.documents, application.findings]);

  // 4. Verified Documents & Requirements (Only name + green 'Verified' status)
  const verifiedItemsForAreaD = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      isSimulated: boolean;
      documentId?: number;
      filename?: string;
      verificationSource?: string;
      isResolvedFinding?: boolean;
    }> = [];

    const seenNames = new Set<string>();

    const failedDocIds = new Set(
      (application.findings || [])
        .filter((f) => f.review_status !== 'RESOLVED' && f.supporting_document_id)
        .map((f) => f.supporting_document_id!)
    );

    // Verified checklist items
    for (const chk of application.document_checklist || []) {
      if (chk.is_submitted && chk.status === 'VERIFIED') {
        if (chk.document_id && failedDocIds.has(chk.document_id)) continue;
        const doc = application.documents?.find((d) => d.id === chk.document_id);
        const isSimulated = Boolean(
          chk.is_simulated ||
          [
            'FIRE_SAFETY_NOC',
            'BUILDING_PLAN',
            'LAYOUT_APPROVAL',
            'AFFILIATION_LETTER',
            'ENVIRONMENTAL_CLEARANCE',
          ].includes(chk.category_code)
        );
        seenNames.add(chk.document_name.toLowerCase());
        list.push({
          id: `verified-chk-${chk.category_code}`,
          name: chk.document_name,
          isSimulated,
          documentId: chk.document_id || doc?.id,
          filename: chk.filename || doc?.original_filename,
          verificationSource: chk.verification_source || 'AICTE Automated Scrutiny Rules',
        });
      }
    }

    // Passed checks from activeRun
    if (activeRun) {
      for (const cr of activeRun.check_results || []) {
        if (cr.status === 'PASSED' && !cr.check_code.includes('MANDATORY-DOCS')) {
          const meta = getPlainEnglishCheckName(cr.check_code);
          const lower = meta.title.toLowerCase();
          if (!seenNames.has(lower)) {
            seenNames.add(lower);
            list.push({
              id: `verified-cr-${cr.id}`,
              name: meta.title,
              isSimulated: cr.check_code.includes('AUTH'),
              verificationSource: 'AICTE Compliance Engine',
            });
          }
        }
      }
    }

    // Resolved findings
    for (const f of application.findings || []) {
      if (f.review_status === 'RESOLVED') {
        const doc = application.documents?.find((d) => d.id === f.supporting_document_id);
        const chk = application.document_checklist?.find(
          (c) => c.document_id === f.supporting_document_id
        );
        const name = chk?.document_name || doc?.original_filename || f.title;
        list.push({
          id: `verified-fnd-${f.id}`,
          name,
          isSimulated: Boolean(f.finding_code.includes('AUTH') || f.evidence?.is_simulated),
          documentId: f.supporting_document_id || doc?.id,
          filename: doc?.original_filename,
          verificationSource: f.evidence?.verification_source || 'Scrutiny Officer Resolution',
          isResolvedFinding: true,
        });
      }
    }

    return list;
  }, [application.document_checklist, application.documents, application.findings, activeRun]);

  // GROUP 2: Checks That Need Attention (Submitted requirements awaiting verification, confirmation, review, or clarification)
  const checksNeedingAttention = useMemo(() => {
    const items: Array<{
      id: string;
      requirementName: string;
      statusLabel: string;
      statusBadgeClass: string;
      explanation: string;
      expectedValue?: string | null;
      observedValue?: string | null;
      responsibleParty: 'Authorised Scrutiny Officer' | 'Applicant (Institution)' | 'Authority Gateway / System';
      recommendedAction: string;
      isSimulated: boolean;
      documentId?: number | null;
      documentName?: string;
      pageNumber?: number | null;
      findingId?: number | null;
    }> = [];

    const seenDocIds = new Set<number>();
    const seenFindingCodes = new Set<string>();

    // 1. Process open findings for SUBMITTED requirements (explicitly excluding missing documents)
    const openSubmittedFindings = allFindings.filter(
      (f) => f.review_status !== 'RESOLVED' &&
             f.category !== 'MISSING_DOCUMENT' &&
             !f.finding_code.startsWith('FND-MISSING')
    );

    for (const f of openSubmittedFindings) {
      seenFindingCodes.add(f.finding_code);
      const doc = application.documents?.find((d) => d.id === f.supporting_document_id);
      if (doc) seenDocIds.add(doc.id);

      // Plain-English Requirement / Document Name
      let reqName = f.title;
      const fUpper = f.finding_code.toUpperCase();
      const titleUpper = f.title.toUpperCase();

      if (fUpper.includes('AUTH') || titleUpper.includes('AUTHORITY')) {
        if (titleUpper.includes('FIRE') || fUpper.includes('FIRE')) reqName = 'Fire Safety NOC';
        else if (titleUpper.includes('BUILDING') || fUpper.includes('BUILDING')) reqName = 'Building Plan Approval';
        else if (titleUpper.includes('LAYOUT') || fUpper.includes('LAYOUT')) reqName = 'Layout Approval';
        else if (titleUpper.includes('AFFIL') || fUpper.includes('AFFIL')) reqName = 'Affiliation Letter';
        else if (titleUpper.includes('ENV') || fUpper.includes('ENV')) reqName = 'Environmental Clearance';
        else if (titleUpper.includes('LAND') || fUpper.includes('LAND')) reqName = 'Land Title Deed';
        else reqName = 'Statutory Approval Certificate';
      } else if (fUpper.includes('INTAKE')) {
        reqName = 'Sanctioned Intake Capacity';
      } else if (fUpper.includes('NAME')) {
        reqName = doc?.original_filename ? `Institution Name Consistency (${doc.original_filename})` : 'Institution Title Consistency';
      } else if (fUpper.includes('PDF-MOD')) {
        reqName = doc?.original_filename ? `Document Integrity (${doc.original_filename})` : 'Document Revision Structure';
      } else if (fUpper.includes('DUP')) {
        reqName = doc?.original_filename ? `Document Hash Verification (${doc.original_filename})` : 'Duplicate Document Check';
      } else if (fUpper.includes('PHASH')) {
        reqName = 'Campus Infrastructure Photographs';
      }

      // Plain-English status label matching Section 3
      let statusLabel = 'Details need confirmation';
      let statusBadgeClass = 'bg-amber-50 text-amber-800 border border-amber-200';
      let responsible: 'Authorised Scrutiny Officer' | 'Applicant (Institution)' | 'Authority Gateway / System' = 'Authorised Scrutiny Officer';

      if (titleUpper.includes('LOCATION MISMATCH') || (f.observed_value && f.observed_value.toLowerCase().includes('differs from declared campus'))) {
        statusLabel = 'Details need confirmation';
        statusBadgeClass = 'bg-amber-50 text-amber-800 border border-amber-200';
        responsible = 'Authorised Scrutiny Officer';
      } else if (titleUpper.includes('ENTITY MISMATCH') || titleUpper.includes('RECORD NOT FOUND')) {
        statusLabel = 'Details need confirmation';
        statusBadgeClass = 'bg-amber-50 text-amber-800 border border-amber-200';
        responsible = 'Authorised Scrutiny Officer';
      } else if (titleUpper.includes('EXPIRED') || titleUpper.includes('REVOKED') || titleUpper.includes('INVALID')) {
        statusLabel = 'Awaiting applicant clarification';
        statusBadgeClass = 'bg-rose-50 text-rose-800 border border-rose-200';
        responsible = 'Applicant (Institution)';
      } else if (titleUpper.includes('GATEWAY') || titleUpper.includes('TIMEOUT') || f.evidence_classification === 'CHECK_NOT_COMPLETED') {
        statusLabel = f.observed_value?.includes('Timeout') ? 'Awaiting external verification' : 'Verification incomplete';
        statusBadgeClass = f.observed_value?.includes('Timeout') ? 'bg-sky-50 text-sky-800 border border-sky-200' : 'bg-purple-50 text-purple-800 border border-purple-200';
        responsible = 'Authority Gateway / System';
      } else if (f.category === 'RECORD_MISMATCH') {
        statusLabel = 'Difference found';
        statusBadgeClass = 'bg-rose-50 text-rose-800 border border-rose-200';
        responsible = 'Authorised Scrutiny Officer';
      } else if (f.category === 'INTEGRITY_ANOMALY') {
        statusLabel = 'Further officer review required';
        statusBadgeClass = 'bg-indigo-50 text-indigo-800 border border-indigo-200';
        responsible = 'Authorised Scrutiny Officer';
      }

      const isSimulated = Boolean(
        fUpper.includes('AUTH') ||
        titleUpper.includes('AUTHORITY') ||
        (f.rule_code && f.rule_code.toUpperCase().includes('AUTH')) ||
        (doc && ['FIRE_SAFETY_NOC', 'BUILDING_PLAN', 'LAYOUT_APPROVAL', 'AFFILIATION_LETTER', 'ENVIRONMENTAL_CLEARANCE', 'LAND_TITLE_DEED'].includes(doc.document_category))
      );

      items.push({
        id: `finding-${f.id}`,
        requirementName: reqName,
        statusLabel,
        statusBadgeClass,
        explanation: f.description,
        expectedValue: f.expected_value,
        observedValue: f.observed_value,
        responsibleParty: responsible,
        recommendedAction: f.recommended_action || 'Review document in in-app viewer and record determination.',
        isSimulated,
        documentId: f.supporting_document_id || doc?.id || null,
        documentName: doc?.original_filename,
        pageNumber: f.supporting_page_number || 1,
        findingId: f.id,
      });
    }

    // 2. Check submitted documents in checklist whose verification is pending, unverified or incomplete
    for (const chk of application.document_checklist) {
      if (!chk.is_submitted) continue; // Skip unsubmitted documents
      if (chk.status === 'VERIFIED') continue; // Skip fully verified documents
      if (chk.document_id && seenDocIds.has(chk.document_id)) continue; // Already represented by finding

      const doc = application.documents?.find((d) => d.id === chk.document_id);
      let statusLabel = 'Awaiting external verification';
      let statusBadgeClass = 'bg-sky-50 text-sky-800 border border-sky-200';
      let responsible: 'Authorised Scrutiny Officer' | 'Applicant (Institution)' | 'Authority Gateway / System' = 'Authority Gateway / System';

      if (chk.status === 'MISMATCH_DETECTED') {
        statusLabel = 'Details need confirmation';
        statusBadgeClass = 'bg-amber-50 text-amber-800 border border-amber-200';
        responsible = 'Authorised Scrutiny Officer';
      } else if (chk.status === 'EXPIRED' || chk.status === 'INCONSISTENT') {
        statusLabel = 'Awaiting applicant clarification';
        statusBadgeClass = 'bg-rose-50 text-rose-800 border border-rose-200';
        responsible = 'Applicant (Institution)';
      } else if (chk.status === 'SOURCE_UNAVAILABLE') {
        statusLabel = 'Awaiting external verification';
        statusBadgeClass = 'bg-sky-50 text-sky-800 border border-sky-200';
        responsible = 'Authority Gateway / System';
      } else if (chk.status === 'UNREADABLE' || chk.status === 'CHECK_INCOMPLETE') {
        statusLabel = 'Verification incomplete';
        statusBadgeClass = 'bg-purple-50 text-purple-800 border border-purple-200';
        responsible = 'Authorised Scrutiny Officer';
      }

      items.push({
        id: `checklist-${chk.category_code}`,
        requirementName: chk.document_name,
        statusLabel,
        statusBadgeClass,
        explanation: chk.deficiency_reason || `Submitted document '${chk.filename || chk.document_name}' has been received and is undergoing verification.`,
        expectedValue: 'Active statutory clearance registered to institution',
        observedValue: chk.status ? chk.status.replace(/_/g, ' ') : 'Pending verification',
        responsibleParty: responsible,
        recommendedAction: 'Inspect document in in-app viewer or rerun scrutiny check.',
        isSimulated: Boolean(chk.is_simulated || ['FIRE_SAFETY_NOC', 'BUILDING_PLAN', 'LAYOUT_APPROVAL', 'AFFILIATION_LETTER', 'ENVIRONMENTAL_CLEARANCE'].includes(chk.category_code)),
        documentId: chk.document_id || doc?.id || null,
        documentName: chk.filename || doc?.original_filename,
        pageNumber: 1,
        findingId: null,
      });
    }

    return items;
  }, [application, allFindings]);

  // GROUP 3: Requirements Completed (Submitted requirements verified with no outstanding issue)
  const completedRequirements = useMemo(() => {
    const list: Array<{
      id: string;
      title: string;
      explanation: string;
      isSimulated: boolean;
      documentId?: number;
      documentName?: string;
    }> = [];

    // Checklist items that are submitted and verified without open findings
    for (const chk of application.document_checklist) {
      if (chk.is_submitted && chk.status === 'VERIFIED') {
        const hasOpenFinding = allFindings.some(
          (f) => f.review_status !== 'RESOLVED' && f.supporting_document_id === chk.document_id
        );
        if (!hasOpenFinding) {
          const doc = application.documents?.find((d) => d.id === chk.document_id);
          list.push({
            id: `comp-chk-${chk.category_code}`,
            title: chk.document_name,
            explanation: chk.verification_source
              ? `Authenticity verified via ${chk.verification_source}. Registered details match institutional application.`
              : `Statutory document attachment verified satisfactorily per approval process handbook requirements.`,
            isSimulated: Boolean(chk.is_simulated || ['FIRE_SAFETY_NOC', 'BUILDING_PLAN', 'LAYOUT_APPROVAL', 'AFFILIATION_LETTER', 'ENVIRONMENTAL_CLEARANCE'].includes(chk.category_code)),
            documentId: chk.document_id || doc?.id,
            documentName: chk.filename || doc?.original_filename,
          });
        }
      }
    }

    // Passed checks from activeRun that are not missing docs and not already in the list
    if (activeRun) {
      for (const cr of activeRun.check_results) {
        if (cr.status === 'PASSED' && !cr.check_code.includes('MANDATORY-DOCS')) {
          const meta = getPlainEnglishCheckName(cr.check_code);
          if (!list.some((item) => item.title.toLowerCase().includes(meta.title.toLowerCase()))) {
            list.push({
              id: `comp-cr-${cr.id}`,
              title: meta.title,
              explanation: cr.explanation,
              isSimulated: cr.check_code.includes('AUTH'),
            });
          }
        }
      }
    }

    return list;
  }, [application, allFindings, activeRun]);

  // Explanation of what needs attention (for Area A Summary)
  const getAttentionSummary = () => {
    if (application.final_decision) {
      return `Final statutory decision recorded (${application.final_decision.replace(/_/g, ' ')}) by ${application.decided_by || 'Authorised Officer'}.`;
    }
    if (missingMandatoryDocs.length > 0) {
      const names = missingMandatoryDocs.map((d) => d.document_name).join(', ');
      return `Application cannot proceed to approval. Required mandatory document(s) missing: ${names}. The institution must submit them before scrutiny can continue.`;
    }
    if (checksNeedingAttention.length > 0) {
      return `${checksNeedingAttention.length} submitted requirement(s) or check(s) require verification confirmation, officer review, or clarification.`;
    }
    if (plainStatus.label === 'Ready for your decision' || (plainStatus.label as string) === 'Ready for approval') {
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

          {/* GROUP 2: Checks That Need Attention (Submitted requirements awaiting verification, confirmation or review) */}
          <div className="border border-amber-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="bg-amber-50 px-4 py-3 flex items-center justify-between border-b border-amber-200 text-amber-950 font-bold">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Checks That Need Attention ({checksNeedingAttention.length})</span>
              </div>
              <span className="text-[11px] text-amber-800 font-medium">
                Submitted requirements awaiting verification, confirmation or officer review
              </span>
            </div>

            <div className="p-4 space-y-4">
              {checksNeedingAttention.length === 0 ? (
                <div className="flex items-center space-x-2 text-emerald-800 font-semibold py-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>All submitted requirements have completed verification with no outstanding discrepancies.</span>
                </div>
              ) : (
                checksNeedingAttention.map((item) => (
                  <div key={item.id} className="p-4 bg-white rounded-xl border border-slate-200 shadow-xs space-y-3">
                    {/* Header: Requirement Name + Simulated Badge + Status Badge */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></div>
                        <h3 className="text-sm font-bold text-slate-900">{item.requirementName}</h3>
                        {item.isSimulated && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded border border-slate-300">
                            SIMULATED EXTERNAL CHECK — SYNTHETIC DATA
                          </span>
                        )}
                      </div>
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${item.statusBadgeClass}`}>
                        {item.statusLabel}
                      </span>
                    </div>

                    {/* Explanation */}
                    <div className="text-xs text-slate-700 leading-relaxed">
                      <strong className="text-slate-900 font-semibold">Explanation: </strong>
                      <span>{item.explanation}</span>
                    </div>

                    {/* Evidence & Observations Box */}
                    <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                      <div className="font-semibold text-slate-700 text-[11px] uppercase tracking-wider">
                        Supporting Evidence & Observations
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                        {item.expectedValue && (
                          <div>
                            <span className="text-slate-500 font-semibold">Expected: </span>
                            <span className="text-slate-800">{item.expectedValue}</span>
                          </div>
                        )}
                        {item.observedValue && (
                          <div>
                            <span className="text-slate-500 font-semibold">Observed: </span>
                            <span className="text-slate-900 font-bold">{item.observedValue}</span>
                          </div>
                        )}
                      </div>

                      {item.documentName && (
                        <div className="text-[11px] text-slate-600 flex items-center justify-between pt-1 border-t border-slate-200/60">
                          <span>
                            Supporting attachment: <strong className="text-slate-800">{item.documentName}</strong>
                            {item.pageNumber ? ` (Page ${item.pageNumber})` : ''}
                          </span>
                          {item.documentId && (
                            <button
                              type="button"
                              onClick={() => {
                                const fullDoc = application.documents?.find((d) => d.id === item.documentId);
                                if (fullDoc) {
                                  handleOpenDocPreview(
                                    {
                                      document_id: fullDoc.id,
                                      stream_url: `/api/applications/${application.id}/documents/${fullDoc.id}/raw`,
                                      original_filename: fullDoc.original_filename,
                                      category_code: fullDoc.document_category,
                                    },
                                    item.pageNumber || 1,
                                    item.observedValue || item.explanation
                                  );
                                }
                              }}
                              className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-bold hover:underline"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Inspect Document</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Next Action & Responsible Party Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-1 text-xs gap-2">
                      <div>
                        <span className="text-slate-500 font-medium">Next action: </span>
                        <span className="text-slate-900 font-bold">{item.recommendedAction}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[11px] text-slate-500">
                          Responsible: <strong className="text-slate-700">{item.responsibleParty}</strong>
                        </span>
                        {item.findingId && (
                          <button
                            type="button"
                            onClick={() => {
                              const el = document.getElementById(`finding-${item.findingId}`);
                              if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }}
                            className="text-xs font-semibold text-blue-600 hover:underline"
                          >
                            View in Findings &darr;
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* GROUP 3: Requirements Completed (Submitted requirements verified with no outstanding issue) */}
          <div className="border border-emerald-200 rounded-xl overflow-hidden bg-white shadow-xs">
            <div className="bg-emerald-50 px-4 py-3 flex items-center justify-between border-b border-emerald-200 text-emerald-950 font-bold">
              <div className="flex items-center space-x-2">
                <CheckSquare className="w-4 h-4 text-emerald-600" />
                <span>Requirements Completed ({completedRequirements.length})</span>
              </div>
              <span className="text-[11px] text-emerald-800 font-medium">Statutory norms verified satisfactorily</span>
            </div>

            <div className="p-4 divide-y divide-slate-100">
              {completedRequirements.length === 0 ? (
                <p className="text-slate-500 py-2">No completed requirements recorded yet.</p>
              ) : (
                completedRequirements.map((item) => (
                  <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900">{item.title}</span>
                        {item.isSimulated && (
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-1.5 py-0.2 rounded border border-slate-300">
                            SIMULATED EXTERNAL CHECK — SYNTHETIC DATA
                          </span>
                        )}
                      </div>
                      <p className="text-slate-600 text-[11px] leading-relaxed">{item.explanation}</p>
                    </div>
                    <div className="flex items-center space-x-2 shrink-0">
                      {item.documentId && (
                        <button
                          type="button"
                          onClick={() => {
                            const fullDoc = application.documents?.find((d) => d.id === item.documentId);
                            if (fullDoc) {
                              handleOpenDocPreview(
                                {
                                  document_id: fullDoc.id,
                                  stream_url: `/api/applications/${application.id}/documents/${fullDoc.id}/raw`,
                                  original_filename: fullDoc.original_filename,
                                  category_code: fullDoc.document_category,
                                },
                                1,
                                item.explanation
                              );
                            }
                          }}
                          className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded font-semibold transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          <span>View Doc</span>
                        </button>
                      )}
                      <span className="text-emerald-700 font-bold text-[10px] bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded">
                        VERIFIED
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          AREA D: Findings and Supporting Evidence (Primary Officer Review Area)
          ========================================================================= */}
      {(() => {
        const totalItemsCount = missingDocs.length + failedItems.length + pendingItems.length + verifiedItemsForAreaD.length;

        return (
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center space-x-2 text-slate-800">
                <Search className="w-5 h-5 text-blue-700 shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">Findings and Supporting Evidence</h2>
                  <p className="text-xs text-slate-500">
                    Verification findings, document authenticity status, and supporting evidence
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
                {failedItems.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                    {failedItems.length} {failedItems.length === 1 ? 'Issue' : 'Issues'} Flagged
                  </span>
                )}
                {missingDocs.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    {missingDocs.length} Missing Documents
                  </span>
                )}
                {pendingItems.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    {pendingItems.length} Pending
                  </span>
                )}
                {verifiedItemsForAreaD.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                    {verifiedItemsForAreaD.length} Verified
                  </span>
                )}
              </div>
            </div>

            {/* Quick Filter Navigation Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs border-b border-slate-100">
              <button
                type="button"
                onClick={() => setFindingsFilter('ALL')}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 ${
                  findingsFilter === 'ALL'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                }`}
              >
                All Items ({totalItemsCount})
              </button>

              {failedItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFindingsFilter('FLAGGED')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
                    findingsFilter === 'FLAGGED'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Flagged Issues ({failedItems.length})</span>
                </button>
              )}

              {missingDocs.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFindingsFilter('MISSING')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
                    findingsFilter === 'MISSING'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  <FileX2 className="w-3.5 h-3.5" />
                  <span>Missing Documents ({missingDocs.length})</span>
                </button>
              )}

              {pendingItems.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFindingsFilter('PENDING')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
                    findingsFilter === 'PENDING'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Pending Verification ({pendingItems.length})</span>
                </button>
              )}

              {verifiedItemsForAreaD.length > 0 && (
                <button
                  type="button"
                  onClick={() => setFindingsFilter('VERIFIED')}
                  className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
                    findingsFilter === 'VERIFIED'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Verified ({verifiedItemsForAreaD.length})</span>
                </button>
              )}
            </div>

            {/* Empty state if nothing at all */}
            {totalItemsCount === 0 && (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold text-slate-800 text-sm">No findings or document items recorded</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Run automated scrutiny to evaluate submitted documents.
                </p>
              </div>
            )}

            {/* Content Groups */}
            <div className="space-y-5">
              {/* -------------------------------------------------------------
                  1. MISSING DOCUMENTS (Concise message + list of names + 1 action)
                  ------------------------------------------------------------- */}
              {(findingsFilter === 'ALL' || findingsFilter === 'MISSING') && missingDocs.length > 0 && (
                <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/25 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-rose-100 pb-2.5">
                    <div className="flex items-center gap-2">
                      <FileX2 className="w-5 h-5 text-rose-600 shrink-0" />
                      <h3 className="font-bold text-slate-900 text-base">
                        {missingDocs.length} {missingDocs.length === 1 ? 'document' : 'documents'} missing
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDeficiencyModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors shrink-0"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Request Missing Documents</span>
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs text-slate-600 font-medium">The following documents have not been submitted:</p>
                    <div className="flex flex-wrap gap-2 pt-0.5">
                      {missingDocs.map((doc, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-white text-slate-800 border border-rose-200 shadow-xs"
                        >
                          <span>{doc.document_name}</span>
                          {doc.is_mandatory && (
                            <span className="text-[10px] font-bold text-rose-600 uppercase tracking-wide">
                              (Mandatory)
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  2. FLAGGED ISSUES / FAILED VERIFICATION
                  ------------------------------------------------------------- */}
              {(findingsFilter === 'ALL' || findingsFilter === 'FLAGGED') && failedItems.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Verification Issues & Flagged Items ({failedItems.length})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {failedItems.map((item) => {
                      const isExpanded = !!expandedItems[`finding-${item.finding.id}`];
                      const isHighlighted = highlightedFindingId === item.finding.id;

                      return (
                        <div
                          key={item.finding.id}
                          id={`finding-card-${item.finding.id}`}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isHighlighted
                              ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500 ring-offset-2 shadow-md'
                              : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                          }`}
                        >
                          {/* Main concise line: Document Name + Status + Short Explanation */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{item.documentName}</span>
                              <span className={`px-2.5 py-0.5 rounded text-xs font-bold border ${item.statusBadgeClass}`}>
                                {item.statusText}
                              </span>
                              {item.isSimulated && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 border border-amber-600 tracking-wide shadow-xs">
                                  SIMULATED EXTERNAL CHECK &mdash; SYNTHETIC DATA
                                </span>
                              )}
                              {isHighlighted && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 text-white animate-pulse">
                                  Focused from Alert
                                </span>
                              )}
                              <span className="text-xs text-slate-600 font-normal">
                                &mdash; {item.shortExplanation}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleExpanded(`finding-${item.finding.id}`)}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold shrink-0"
                            >
                              <span>{isExpanded ? 'Hide details' : 'View details'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Supporting evidence and further details only when officer opens */}
                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-3">
                              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-2">
                                <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
                                  Supporting Evidence & Observations
                                </div>
                                <p className="text-slate-700 leading-relaxed">{item.finding.description}</p>

                                {(item.finding.expected_value || item.finding.observed_value) && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                                    {item.finding.expected_value && (
                                      <div className="bg-white p-2 rounded border border-slate-200">
                                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Expected Record</span>
                                        <span className="text-slate-800">{item.finding.expected_value}</span>
                                      </div>
                                    )}
                                    {item.finding.observed_value && (
                                      <div className="bg-white p-2 rounded border border-rose-200">
                                        <span className="text-[10px] uppercase font-bold text-rose-700 block">Observed in Submission</span>
                                        <span className="text-rose-900 font-semibold">{item.finding.observed_value}</span>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/60 gap-1">
                                  <span>
                                    Verification Source:{' '}
                                    <strong className="text-slate-700">
                                      {item.finding.evidence?.verification_source || 'AICTE Automated Scrutiny Engine'}
                                    </strong>
                                  </span>
                                  {item.doc && (
                                    <span>
                                      Attachment: <strong className="text-slate-700">{item.doc.original_filename}</strong>
                                      {item.finding.supporting_page_number ? ` (Page ${item.finding.supporting_page_number})` : ''}
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Action row */}
                              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                                {item.streamUrl ? (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenDocPreview(
                                        {
                                          document_id: item.doc?.id || item.chk?.document_id,
                                          original_filename: item.doc?.original_filename || item.chk?.original_filename,
                                          document_name: item.chk?.document_name,
                                          category_code: item.doc?.document_category || item.chk?.category_code,
                                          stream_url: item.streamUrl,
                                          status: item.chk?.status,
                                          verification_source: item.finding.evidence?.verification_source || item.chk?.verification_source,
                                          verification_evidence: item.finding.evidence?.verification_evidence || item.chk?.verification_evidence,
                                          extracted_summary: item.chk?.extracted_summary,
                                        },
                                        item.finding.supporting_page_number || 1,
                                        item.finding.observed_value || item.finding.description
                                      )
                                    }
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200 shadow-xs transition-colors"
                                  >
                                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                                    <span>
                                      Inspect Document {item.finding.supporting_page_number ? `(Page ${item.finding.supporting_page_number})` : ''}
                                    </span>
                                  </button>
                                ) : (
                                  <span className="text-[11px] text-slate-400 italic">No document file attached</span>
                                )}

                                <div className="flex items-center gap-2 ml-auto">
                                  {item.finding.review_status === 'RESOLVED' ? (
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>Resolved</span>
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedFindingForAction(item.finding)}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
                                    >
                                      <FileCheck2 className="w-3.5 h-3.5" />
                                      <span>Review Finding</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  3. PENDING VERIFICATION (Awaiting verification / Manual confirmation)
                  ------------------------------------------------------------- */}
              {(findingsFilter === 'ALL' || findingsFilter === 'PENDING') && pendingItems.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                    <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Pending Verification ({pendingItems.length})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {pendingItems.map((item) => {
                      const isExpanded = !!expandedItems[item.id];

                      return (
                        <div
                          key={item.id}
                          className="p-3.5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 shadow-xs"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                              <span className={`px-2.5 py-0.5 rounded text-xs font-semibold border ${item.statusBadgeClass}`}>
                                {item.statusText}
                              </span>
                              {item.isSimulated && (
                                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 border border-amber-600 tracking-wide shadow-xs">
                                  SIMULATED EXTERNAL CHECK &mdash; SYNTHETIC DATA
                                </span>
                              )}
                              <span className="text-xs text-slate-600 font-normal">
                                &mdash; {item.shortExplanation}
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleExpanded(item.id)}
                              className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold shrink-0"
                            >
                              <span>{isExpanded ? 'Hide details' : 'View details'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {isExpanded && (
                            <div className="mt-3 pt-3 border-t border-slate-100 text-xs space-y-2">
                              <p className="text-slate-700 leading-relaxed">{item.shortExplanation}</p>
                              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100 gap-2">
                                <span>
                                  Source: <strong className="text-slate-700">{item.verificationSource || 'Authority Gateway / Manual Queue'}</strong>
                                  {item.filename && <span className="ml-2 font-mono">({item.filename})</span>}
                                </span>
                                {item.streamUrl && item.documentId && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const fullDoc = application.documents?.find((d) => d.id === item.documentId);
                                      if (fullDoc) {
                                        handleOpenDocPreview({
                                          document_id: fullDoc.id,
                                          stream_url: `/api/applications/${application.id}/documents/${fullDoc.id}/raw`,
                                          original_filename: fullDoc.original_filename,
                                          category_code: fullDoc.document_category,
                                        });
                                      }
                                    }}
                                    className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                    <span>Inspect Document</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* -------------------------------------------------------------
                  4. VERIFIED DOCUMENTS & REQUIREMENTS (Only Name + Green Verified status)
                  ------------------------------------------------------------- */}
              {(findingsFilter === 'ALL' || findingsFilter === 'VERIFIED') && verifiedItemsForAreaD.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Verified Documents & Requirements ({verifiedItemsForAreaD.length})
                    </h3>
                  </div>

                  <div className="space-y-2">
                    {verifiedItemsForAreaD.map((item) => {
                      const isExpanded = !!expandedItems[item.id];

                      return (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 hover:bg-slate-50 transition-colors"
                        >
                          {/* Simple, clean line: Document name and simple green Verified status */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                              <span className="font-semibold text-slate-900 text-sm">{item.name}</span>
                              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                Verified
                              </span>
                              {item.isSimulated && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 border border-amber-600 tracking-wide shadow-xs">
                                  SIMULATED EXTERNAL CHECK &mdash; SYNTHETIC DATA
                                </span>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => toggleExpanded(item.id)}
                              className="inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800 shrink-0 font-medium"
                              title="Expand details"
                            >
                              <span>{isExpanded ? 'Hide details' : 'Details'}</span>
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </button>
                          </div>

                          {/* Expand details only if needed */}
                          {isExpanded && (
                            <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <span className="text-slate-500">Verification Source: </span>
                                <span className="font-semibold text-slate-800">{item.verificationSource || 'AICTE Automated Scrutiny Engine'}</span>
                                {item.filename && <span className="ml-2 font-mono text-[11px] text-slate-500">({item.filename})</span>}
                              </div>
                              {item.documentId && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const fullDoc = application.documents?.find((d) => d.id === item.documentId);
                                    if (fullDoc) {
                                      handleOpenDocPreview({
                                        document_id: fullDoc.id,
                                        stream_url: `/api/applications/${application.id}/documents/${fullDoc.id}/raw`,
                                        original_filename: fullDoc.original_filename,
                                        category_code: fullDoc.document_category,
                                      });
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold hover:underline"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Inspect Document</span>
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>
        );
      })()}

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
            Authorised Official: <strong>{currentUser?.full_name || 'Officer'}</strong>
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
