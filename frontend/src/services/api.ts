import {
  Application,
  ApplicationDetail,
  Finding,
  AlertItem,
  UserInfo,
  CategoryInfo,
  IntegrationServiceItem,
  AuditEvent
} from '../types';

const API_BASE = '/api';

let activeAuthHeaders: Record<string, string> = {
  'X-User-Role': 'OFFICER',
  'X-User-Id': 'officer1',
};

export function setSessionAuth(role: string, userId: string, institutionId?: string | null) {
  activeAuthHeaders = {
    'X-User-Role': role,
    'X-User-Id': userId,
  };
  if (institutionId) {
    activeAuthHeaders['X-Institution-Id'] = institutionId;
  }
}

export function getSessionAuth() {
  return activeAuthHeaders;
}

function getHeaders(customHeaders?: Record<string, string>): Record<string, string> {
  return {
    ...activeAuthHeaders,
    ...customHeaders,
  };
}

export async function fetchHealth() {
  const res = await fetch(`${API_BASE}/health`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Backend health check failed');
  return res.json();
}

export async function fetchApplications(): Promise<Application[]> {
  const res = await fetch(`${API_BASE}/applications`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch applications');
  return res.json();
}

export async function createApplication(data: {
  aicte_permanent_id: string;
  institution_name: string;
  category: string;
  academic_year: string;
  declared_programme: string;
  declared_course: string;
  declared_intake: number;
  declared_land_acres?: number;
}): Promise<Application> {
  const res = await fetch(`${API_BASE}/applications`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create application');
  }
  return res.json();
}

export async function fetchApplicationDetail(id: number): Promise<ApplicationDetail> {
  const res = await fetch(`${API_BASE}/applications/${id}`, { headers: getHeaders() });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch application #${id}`);
  }
  return res.json();
}

export async function uploadDocument(
  applicationId: number,
  category: string,
  file: File
) {
  const formData = new FormData();
  formData.append('document_category', category);
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/applications/${applicationId}/documents`, {
    method: 'POST',
    headers: getHeaders(),
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Document upload failed');
  }
  return res.json();
}

export async function recordReviewerAction(
  findingId: number,
  data: {
    action_type: string;
    justification_remarks: string;
    reviewer_name?: string;
  }
): Promise<Finding> {
  const res = await fetch(`${API_BASE}/findings/${findingId}/action`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to record reviewer action');
  }
  return res.json();
}

export async function issueDeficiencyNotice(
  applicationId: number,
  data: {
    finding_ids: number[];
    instructions: string;
    officer_name?: string;
  }
) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/deficiency-notice`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to issue deficiency notice');
  }
  return res.json();
}

export async function returnToReview(applicationId: number) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/return-to-review`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to return application to review');
  }
  return res.json();
}

export async function recordFinalDecision(
  applicationId: number,
  data: {
    decision: string;
    justification_remarks: string;
    officer_name?: string;
  }
) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/decision`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to record final decision');
  }
  return res.json();
}

export async function triggerVerification(applicationId: number) {
  const res = await fetch(`${API_BASE}/applications/${applicationId}/verify`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Verification execution failed');
  return res.json();
}

export async function fetchAlerts(): Promise<AlertItem[]> {
  const res = await fetch(`${API_BASE}/alerts`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch alerts');
  return res.json();
}

export async function acknowledgeAlert(id: number) {
  const res = await fetch(`${API_BASE}/alerts/${id}/acknowledge`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to acknowledge alert');
  return res.json();
}

export async function fetchCategories(): Promise<{ ruleset_version: string; categories: CategoryInfo[] }> {
  const res = await fetch(`${API_BASE}/rules/categories`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch regulatory categories');
  return res.json();
}

export async function fetchRules() {
  const res = await fetch(`${API_BASE}/rules`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch rules');
  return res.json();
}

export async function fetchUsers(): Promise<UserInfo[]> {
  const res = await fetch(`${API_BASE}/auth/users`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch users');
  return res.json();
}

export async function fetchAdminIntegrationStatus(): Promise<{ integrations: IntegrationServiceItem[] }> {
  const res = await fetch(`${API_BASE}/admin/integrations/status`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch integration statuses');
  return res.json();
}

export async function fetchAdminAuditHistory(): Promise<AuditEvent[]> {
  const res = await fetch(`${API_BASE}/admin/audit`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch admin audit history');
  return res.json();
}

export async function fetchAdminHealthEvaluation() {
  const res = await fetch(`${API_BASE}/admin/health-evaluation`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to fetch health evaluation report');
  return res.json();
}

export async function fetchAuditChainVerification() {
  const res = await fetch(`${API_BASE}/audit/verify-chain`, { headers: getHeaders() });
  if (!res.ok) throw new Error('Failed to verify audit hash chain');
  return res.json();
}

export async function updateAdminRules(rulesData: any) {
  const res = await fetch(`${API_BASE}/admin/rules`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(rulesData),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to update regulatory rules');
  }
  return res.json();
}

export async function runBenchmarkEvaluation() {
  const res = await fetch(`${API_BASE}/health/benchmark`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error('Failed to run benchmark evaluation');
  return res.json();
}
