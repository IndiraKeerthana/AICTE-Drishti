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

  // Area D: Category filter and expandable technical details
  const [findingsFilter, setFindingsFilter] = useState<'ALL' | 'MISSING' | 'DISCREPANCY' | 'AWAITING' | 'INTEGRITY' | 'INCOMPLETE'>('ALL');
  const [expandedTechnicalDetails, setExpandedTechnicalDetails] = useState<Record<number, boolean>>({});

  const toggleTechnicalDetails = (id: number) => {
    setExpandedTechnicalDetails((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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

  // GROUP 1: Missing Mandatory Documents (Process Gating)
  const missingMandatoryDocs = application.document_checklist.filter(
    (item) => item.is_mandatory && !item.is_submitted
  );

  // All open findings
  const allFindings = application.findings || [];
  const openFindings = allFindings.filter((f) => f.review_status !== 'RESOLVED');

  // 5 Distinct Finding Categories per Requirement 5
  const missingDocFindings = allFindings.filter(
    (f) => getOfficerFriendlyFindingDetails(f).groupType === 'MISSING'
  );
  const discrepancyFindings = allFindings.filter(
    (f) => getOfficerFriendlyFindingDetails(f).groupType === 'DISCREPANCY'
  );
  const awaitingAuthFindings = allFindings.filter(
    (f) => getOfficerFriendlyFindingDetails(f).groupType === 'AWAITING_VERIFICATION'
  );
  const integrityFindings = allFindings.filter(
    (f) => getOfficerFriendlyFindingDetails(f).groupType === 'INTEGRITY'
  );
  const incompleteFindings = allFindings.filter(
    (f) => getOfficerFriendlyFindingDetails(f).groupType === 'INCOMPLETE'
  );

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
        const renderOfficerFindingCard = (finding: Finding) => {
          const evidence = finding.evidence || {};
          const isSimulated = evidence.is_simulated === true;
          const isHighlighted = highlightedFindingId === finding.id;
          const details = getOfficerFriendlyFindingDetails(finding);
          const isTechExpanded = !!expandedTechnicalDetails[finding.id];

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
                  ? 'border-blue-500 bg-blue-50/70 ring-2 ring-blue-500 ring-offset-2 shadow-md'
                  : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
              }`}
            >
              {/* Header: Title, Simulated Notice, and Status Badge */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-bold text-slate-900 text-sm leading-snug">
                      {finding.title}
                    </h4>
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
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${details.statusBadgeClass}`}>
                    {details.statusLabel}
                  </span>
                </div>
              </div>

              {/* The Three Core Questions (Requirement 8) */}
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-bold text-slate-900 block sm:inline sm:mr-1">What was found:</span>
                  <span className="text-slate-700 leading-relaxed">{details.whatWasFound}</span>
                </div>

                {/* Expected vs Observed (Only when relevant - simple 2-column comparison) */}
                {details.hasComparison && (
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs my-1.5">
                    <div className="bg-white p-2 rounded border border-slate-200/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block mb-0.5">
                        Expected standard
                      </span>
                      <span className="text-slate-800 font-medium">{details.expectedVal}</span>
                    </div>
                    <div className="bg-white p-2 rounded border border-rose-200/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 block mb-0.5">
                        Observed in submission
                      </span>
                      <span className="text-rose-900 font-semibold">{details.observedVal}</span>
                    </div>
                  </div>
                )}

                <div>
                  <span className="font-bold text-slate-900 block sm:inline sm:mr-1">Why does it matter:</span>
                  <span className="text-slate-700 leading-relaxed">{details.whyItMatters}</span>
                </div>

                <div>
                  <span className="font-bold text-slate-900 block sm:inline sm:mr-1">What should happen next:</span>
                  <span className="text-slate-700 leading-relaxed">{details.whatNext}</span>
                </div>
              </div>

              {/* Expandable Technical Details Area (Requirement 7) */}
              {isTechExpanded && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 text-[11px] space-y-2 text-slate-600">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Verification Source</span>
                      <span className="font-medium text-slate-800">{evidence.verification_source || 'AICTE Automated Scrutiny Engine'}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Classification Standard</span>
                      <span className="font-medium text-slate-800">{finding.rule_description?.replace(/\[PLACEHOLDER.*?\]/gi, '').trim() || 'AICTE APH Compliance Protocol'}</span>
                    </div>
                  </div>
                  {finding.source_snippet && (
                    <div>
                      <span className="text-slate-400 font-bold block text-[10px] uppercase tracking-wider">Extracted Reference Snippet</span>
                      <span className="font-mono text-[10px] text-slate-700 bg-white p-2 rounded border border-slate-200 block truncate">
                        {finding.source_snippet}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Actions Row */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-t border-slate-100">
                <div className="flex items-center gap-2 flex-wrap">
                  {streamUrl ? (
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
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs border border-blue-200 transition-colors shadow-xs"
                    >
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span>
                        View evidence {finding.supporting_page_number ? `(Page ${finding.supporting_page_number})` : ''}
                      </span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-400 italic">No document file attached</span>
                  )}

                  {/* Toggle Technical Details (Requirement 7) */}
                  <button
                    type="button"
                    onClick={() => toggleTechnicalDetails(finding.id)}
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                  >
                    {isTechExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    <span>{isTechExpanded ? 'Hide technical details' : 'Technical details'}</span>
                  </button>
                </div>

                <div className="flex items-center gap-2 sm:ml-auto">
                  {finding.review_status === 'RESOLVED' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Resolved</span>
                    </span>
                  ) : (
                    <>
                      {details.actionType === 'clarification' ? (
                        <button
                          type="button"
                          onClick={() => setSelectedFindingForAction(finding)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Request clarification</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedFindingForAction(finding)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs transition-colors"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                          <span>Review finding</span>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        };

        const renderMissingMandatoryCard = () => (
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/20 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 border-b border-rose-100 pb-2">
              <h4 className="font-bold text-slate-900 text-sm">
                Mandatory Statutory Documents Omitted
              </h4>
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                Documents missing
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="font-bold text-slate-900 block sm:inline sm:mr-1">What was found:</span>
                <span className="text-slate-700 leading-relaxed">
                  The following {missingMandatoryDocs.length} mandatory document(s) have not been uploaded: {missingMandatoryDocs.map((d) => d.document_name).join(', ')}.
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-900 block sm:inline sm:mr-1">Why does it matter:</span>
                <span className="text-slate-700 leading-relaxed">
                  Statutory regulations require all mandatory documents to be on record before an application can be cleared for approval.
                </span>
              </div>
              <div>
                <span className="font-bold text-slate-900 block sm:inline sm:mr-1">What should happen next:</span>
                <span className="text-slate-700 leading-relaxed">
                  Issue a deficiency notice requesting the applicant to upload the missing statutory documents.
                </span>
              </div>
            </div>
            <div className="pt-2 flex justify-end border-t border-rose-100">
              <button
                type="button"
                onClick={() => setIsDeficiencyModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Request clarification</span>
              </button>
            </div>
          </div>
        );

        return (
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-5">
            {/* Section Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
              <div className="flex items-center space-x-2 text-slate-800">
                <Search className="w-5 h-5 text-blue-700 shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-slate-900">Findings and Supporting Evidence</h2>
                  <p className="text-xs text-slate-500">
                    Primary review area for examining evidence, inspecting attached documents, and determining next actions
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap text-xs font-semibold">
                {(missingDocFindings.length > 0 || missingMandatoryDocs.length > 0) && (
                  <span className="px-2.5 py-0.5 rounded bg-rose-50 text-rose-800 border border-rose-200">
                    {missingDocFindings.length || missingMandatoryDocs.length} Missing Documents
                  </span>
                )}
                {discrepancyFindings.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                    {discrepancyFindings.length} Discrepanc{discrepancyFindings.length > 1 ? 'ies' : 'y'}
                  </span>
                )}
                {awaitingAuthFindings.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                    {awaitingAuthFindings.length} Awaiting Verification
                  </span>
                )}
                {integrityFindings.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded bg-purple-50 text-purple-800 border border-purple-200">
                    {integrityFindings.length} Integrity Review
                  </span>
                )}
                {incompleteFindings.length > 0 && (
                  <span className="px-2.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                    {incompleteFindings.length} Incomplete Checks
                  </span>
                )}
              </div>
            </div>

            {/* Category Navigation Tabs (Requirement 5) */}
            {allFindings.length > 0 && (
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
                  All Categories ({allFindings.length})
                </button>

                {(missingDocFindings.length > 0 || missingMandatoryDocs.length > 0) && (
                  <button
                    type="button"
                    onClick={() => setFindingsFilter('MISSING')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
                      findingsFilter === 'MISSING'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <FileX2 className="w-3.5 h-3.5" />
                    <span>Missing Documents ({missingDocFindings.length || missingMandatoryDocs.length})</span>
                  </button>
                )}

                {discrepancyFindings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFindingsFilter('DISCREPANCY')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
                      findingsFilter === 'DISCREPANCY'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Discrepancies ({discrepancyFindings.length})</span>
                  </button>
                )}

                {awaitingAuthFindings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFindingsFilter('AWAITING')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
                      findingsFilter === 'AWAITING'
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    <span>Awaiting Verification ({awaitingAuthFindings.length})</span>
                  </button>
                )}

                {integrityFindings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFindingsFilter('INTEGRITY')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
                      findingsFilter === 'INTEGRITY'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border border-purple-200'
                    }`}
                  >
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>Document Integrity ({integrityFindings.length})</span>
                  </button>
                )}

                {incompleteFindings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setFindingsFilter('INCOMPLETE')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-colors shrink-0 flex items-center gap-1.5 ${
                      findingsFilter === 'INCOMPLETE'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>Incomplete Checks ({incompleteFindings.length})</span>
                  </button>
                )}
              </div>
            )}

            {allFindings.length === 0 && missingMandatoryDocs.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
                <p className="font-bold text-slate-800 text-sm">No compliance issues or deficiencies recorded</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  All submitted evidence conforms to configured AICTE handbook standards.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* GROUP 1: Missing Mandatory Documents */}
                {(findingsFilter === 'ALL' || findingsFilter === 'MISSING') && (missingDocFindings.length > 0 || missingMandatoryDocs.length > 0) && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-rose-100 pb-2 gap-1">
                      <div className="flex items-center gap-2">
                        <FileX2 className="w-4 h-4 text-rose-600 shrink-0" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                          Missing Mandatory Documents ({missingDocFindings.length || missingMandatoryDocs.length})
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Statutory attachments omitted from submission; required before approval can proceed
                      </span>
                    </div>

                    {missingDocFindings.length > 0 ? (
                      missingDocFindings.map(renderOfficerFindingCard)
                    ) : (
                      renderMissingMandatoryCard()
                    )}
                  </div>
                )}

                {/* GROUP 2: Discrepancies & Baseline Differences */}
                {(findingsFilter === 'ALL' || findingsFilter === 'DISCREPANCY') && discrepancyFindings.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-amber-100 pb-2 gap-1">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                          Discrepancies & Baseline Differences ({discrepancyFindings.length})
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Declared figures or institutional details contradict official baseline records
                      </span>
                    </div>

                    {discrepancyFindings.map(renderOfficerFindingCard)}
                  </div>
                )}

                {/* GROUP 3: Submitted Requirements Awaiting Verification or Approval */}
                {(findingsFilter === 'ALL' || findingsFilter === 'AWAITING') && awaitingAuthFindings.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-100 pb-2 gap-1">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-900">
                          Submitted Requirements Awaiting Verification or Approval ({awaitingAuthFindings.length})
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Statutory approvals and certificates requiring external confirmation or active renewal
                      </span>
                    </div>

                    {awaitingAuthFindings.map(renderOfficerFindingCard)}
                  </div>
                )}

                {/* GROUP 4: Potential Document Integrity Issues */}
                {(findingsFilter === 'ALL' || findingsFilter === 'INTEGRITY') && integrityFindings.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-purple-100 pb-2 gap-1">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-purple-900">
                          Potential Document Integrity Issues ({integrityFindings.length})
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Document structure indicators requiring visual inspection to confirm authenticity
                      </span>
                    </div>

                    {integrityFindings.map(renderOfficerFindingCard)}
                  </div>
                )}

                {/* GROUP 5: Incomplete Checks & Gateway Limitations */}
                {(findingsFilter === 'ALL' || findingsFilter === 'INCOMPLETE') && incompleteFindings.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-2 gap-1">
                      <div className="flex items-center gap-2">
                        <HelpCircle className="w-4 h-4 text-slate-600 shrink-0" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                          Incomplete Checks & Gateway Limitations ({incompleteFindings.length})
                        </h3>
                      </div>
                      <span className="text-[11px] text-slate-500">
                        Automated checks that could not be fully completed due to service or extraction limits
                      </span>
                    </div>

                    {incompleteFindings.map(renderOfficerFindingCard)}
                  </div>
                )}
              </div>
            )}
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
