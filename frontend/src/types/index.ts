export interface Institution {
  id: number;
  aicte_permanent_id: string;
  name: string;
  institution_type: string;
  address: string;
  state: string;
  district: string;
  created_at: string;
}

export interface BaselineRecord {
  id: number;
  institution_id: number;
  record_type: string;
  academic_year: string;
  programme: string;
  course: string;
  approved_intake: number;
  source_system: string;
  is_simulated: boolean;
  created_at: string;
}

export interface DocumentItem {
  id: number;
  application_id: number;
  document_category: string;
  original_filename: string;
  file_size_bytes: number;
  mime_type: string;
  sha256_hash: string;
  status: string;
  page_count: number;
  extracted_text_preview?: string;
  uploaded_at: string;
}

export interface DocumentChecklistItem {
  category_code: string;
  document_name: string;
  is_mandatory: boolean;
  is_submitted: boolean;
  document_id?: number | null;
  original_filename?: string | null;
  status: 'VERIFIED' | 'EXPIRED' | 'UNREADABLE' | 'INCONSISTENT' | 'MISSING' | 'NOT_SUBMITTED' | 'VERIFICATION_UNAVAILABLE' | string;
  extracted_summary?: string | null;
  validity_info?: string | null;
  verification_result?: string | null;
  verification_source?: string | null;
  verification_evidence?: string | null;
  stream_url?: string | null;
  deficiency_reason?: string | null;
  filename?: string | null;
  is_simulated?: boolean;
}

export interface CheckResult {
  id: number;
  check_code: string;
  category: string;
  status: 'PASSED' | 'FAILED' | 'EXPIRED' | 'MANUAL_REVIEW' | 'SOURCE_UNAVAILABLE' | 'INCOMPLETE' | string;
  expected_value?: string | null;
  observed_value?: string | null;
  explanation: string;
  severity: string;
  requires_human_review: boolean;
}

export interface ScrutinyReportGrouped {
  passed_checks: CheckResult[];
  issues_requiring_correction: CheckResult[];
  items_requiring_officer_review: CheckResult[];
  checks_could_not_be_completed: CheckResult[];
}

export interface Finding {
  id: number;
  finding_code: string;
  application_id: number;
  category: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  description: string;
  expected_value?: string;
  observed_value?: string;
  supporting_document_id?: number;
  supporting_page_number?: number;
  source_snippet?: string;
  bounding_box?: string;
  evidence?: Record<string, any>;
  rule_code: string;
  rule_description: string;
  recommended_action: string;
  review_status: 'OPEN' | 'ACKNOWLEDGED' | 'RECTIFICATION_REQUESTED' | 'RESOLVED' | 'OVERRIDDEN';
  resolution_notes?: string;
  evidence_classification?: string;
  created_at: string;
  updated_at: string;
}

export interface ReviewerAction {
  id: number;
  application_id: number;
  finding_id?: number;
  action_type: string;
  justification_remarks: string;
  reviewer_name: string;
  created_at: string;
}

export interface AuditEvent {
  id: number;
  application_id?: number;
  event_type: string;
  details: Record<string, any>;
  actor: string;
  previous_hash: string;
  event_hash: string;
  created_at: string;
}

export interface AlertItem {
  id: number;
  application_id: number;
  finding_id?: number | null;
  scrutiny_run_id?: number | null;
  institution_name?: string;
  application_reference?: string;
  application_status?: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  status: string; // ACTIVE, ACKNOWLEDGED, RESOLVED
  created_at: string;
  acknowledged_by?: string | null;
  acknowledged_at?: string | null;
}

export interface ScrutinyRun {
  id: number;
  run_number: number;
  status: string;
  ruleset_version: string;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  warnings_count: number;
  execution_duration_ms: number;
  summary_notes?: string;
  created_at: string;
  completed_at: string;
  check_results: CheckResult[];
}

export interface Application {
  id: number;
  application_number: string;
  tracking_id?: string;
  institution_id: number;
  category: string;
  academic_year: string;
  status: string;
  declared_programme: string;
  declared_course: string;
  declared_intake: number;
  declared_land_acres: number;
  institution: Institution;
  documents_count: number;
  findings_count: number;
  final_decision?: string | null;
  decided_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationDetail extends Application {
  documents: DocumentItem[];
  findings: Finding[];
  reviewer_actions: ReviewerAction[];
  audit_events: AuditEvent[];
  scrutiny_runs: ScrutinyRun[];
  alerts: AlertItem[];
  baseline_record?: BaselineRecord;
  document_checklist: DocumentChecklistItem[];
  grouped_scrutiny_report?: ScrutinyReportGrouped;
  latest_scrutiny_run?: ScrutinyRun;
}

export interface UserInfo {
  id?: number | null;
  username: string;
  full_name: string;
  role: 'OFFICER' | 'APPROVER' | 'ADMIN' | 'APPLICANT';
  designation: string;
  institution_id?: string | null;
  email?: string | null;
}

export interface IntegrationServiceItem {
  id: string;
  name: string;
  category: string;
  mode: string;
  status: string;
  is_simulated: boolean;
  endpoint: string;
  external_target: string;
  protocol: string;
  last_checked: string;
  notes: string;
}

export interface DocumentDefinition {
  code: string;
  name: string;
  official_clause?: string;
  expiry_check_required?: boolean;
  required_fields?: string;
  condition?: string;
  purpose?: string;
  is_confirmed?: boolean;
}

export interface CategoryInfo {
  code: string;
  title: string;
  description?: string;
  academic_year?: string;
  official_source?: string;
  is_confirmed?: boolean;
  eligibility_conditions?: string[];
  mandatory_documents: (string | DocumentDefinition)[];
  conditional_documents?: (string | DocumentDefinition)[];
  optional_documents?: (string | DocumentDefinition)[];
}
