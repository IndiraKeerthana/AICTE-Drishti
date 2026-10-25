import React, { useState, useEffect } from 'react';
import { Sidebar, NavView } from './components/Sidebar';
import { Header } from './components/Header';
import { DashboardOverview } from './components/DashboardOverview';
import { ApplicationDetails } from './components/ApplicationDetails';
import { ApplicationIntake } from './components/ApplicationIntake';
import { RequestTypesDocumentation } from './components/RequestTypesDocumentation';
import { SystemAdminView } from './components/SystemAdminView';
import { Application, ApplicationDetail, UserInfo, AlertItem } from './types';
import {
  fetchApplications,
  fetchApplicationDetail,
  fetchAlerts,
  acknowledgeAlert,
  fetchUsers,
  setSessionAuth,
  issueDeficiencyNotice,
  returnToReview,
  recordFinalDecision
} from './services/api';

const DEFAULT_USERS: UserInfo[] = [
  {
    username: 'officer1',
    full_name: 'Dr. V. Sharma',
    role: 'OFFICER',
    designation: 'AICTE Scrutiny Officer',
    institution_id: null,
    email: 'v.sharma@aicte-india.org'
  },
  {
    username: 'approver1',
    full_name: 'Prof. R. K. Verma',
    role: 'APPROVER',
    designation: 'Competent Authority / Regional Officer',
    institution_id: null,
    email: 'rk.verma@aicte-india.org'
  },
  {
    username: 'admin1',
    full_name: 'AICTE System Administrator',
    role: 'ADMIN',
    designation: 'Portal & Regulatory Administrator',
    institution_id: null,
    email: 'admin@aicte-india.org'
  }
];

export function App() {
  const [currentView, setCurrentView] = useState<NavView>('dashboard');
  const [currentUser, setCurrentUser] = useState<UserInfo>(DEFAULT_USERS[0]);
  const [availableUsers, setAvailableUsers] = useState<UserInfo[]>(DEFAULT_USERS);
  const [applications, setApplications] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null);
  const [selectedAppDetail, setSelectedAppDetail] = useState<ApplicationDetail | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Load available users from backend
  useEffect(() => {
    fetchUsers()
      .then((users) => {
        if (users && users.length > 0) {
          const filtered = users.filter(u => u.role !== 'APPLICANT');
          if (filtered.length > 0) {
            setAvailableUsers(filtered);
            setCurrentUser(filtered[0]);
          } else {
            setAvailableUsers(users);
          }
        }
      })
      .catch(() => {});
  }, []);

  // Set session auth whenever currentUser changes
  useEffect(() => {
    setSessionAuth(currentUser.role, currentUser.username, currentUser.institution_id);
    loadApplications();
    loadAlerts();
  }, [currentUser]);

  // Load applications list
  const loadApplications = async () => {
    try {
      const data = await fetchApplications();
      setApplications(data);
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoading(false);
    }
  };

  // Load alerts
  const loadAlerts = async () => {
    try {
      const data = await fetchAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load alerts:', err);
    }
  };

  useEffect(() => {
    loadApplications();
    loadAlerts();
  }, []);

  // Load detailed application if selected
  const loadDetail = async (id: number) => {
    try {
      const detail = await fetchApplicationDetail(id);
      setSelectedAppDetail(detail);
    } catch (err) {
      console.error(err);
      setSelectedAppDetail(null);
    }
  };

  useEffect(() => {
    if (selectedAppId) {
      loadDetail(selectedAppId);
    } else {
      setSelectedAppDetail(null);
    }
  }, [selectedAppId]);

  // Handle Switch User / Role
  const handleSwitchUser = (user: UserInfo) => {
    setCurrentUser(user);
    setSelectedAppId(null);
  };

  // Handle Issue Deficiency Notice
  const handleIssueDeficiencyNotice = async (findingIds: number[], instructions: string) => {
    if (!selectedAppId) return;
    await issueDeficiencyNotice(selectedAppId, {
      finding_ids: findingIds,
      instructions,
      officer_name: currentUser.full_name,
    });
    await loadDetail(selectedAppId);
    await loadApplications();
    await loadAlerts();
  };

  // Handle Return to Review
  const handleReturnToReview = async () => {
    if (!selectedAppId) return;
    await returnToReview(selectedAppId);
    await loadDetail(selectedAppId);
    await loadApplications();
    await loadAlerts();
  };

  // Handle Record Final Decision
  const handleRecordFinalDecision = async (decision: string, remarks: string) => {
    if (!selectedAppId) return;
    await recordFinalDecision(selectedAppId, {
      decision,
      justification_remarks: remarks,
      officer_name: currentUser.full_name,
    });
    await loadDetail(selectedAppId);
    await loadApplications();
    await loadAlerts();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-100 text-slate-800">
      {/* Primary 4-item Sidebar Navigation */}
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view);
          setSelectedAppId(null);
        }}
        currentUser={currentUser}
      />

      {/* Main Officer Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header
          pageTitle={
            selectedAppDetail
              ? `Application Scrutiny — ${selectedAppDetail.application_number}`
              : currentView === 'dashboard'
              ? 'Officer Scrutiny Dashboard'
              : currentView === 'applications'
              ? 'Approval Applications Queue'
              : currentView === 'intake'
              ? 'Application Intake & Registration'
              : currentView === 'request_types'
              ? 'Request Types & Statutory Documentation'
              : 'Administration & System Settings'
          }
          currentUser={currentUser}
          availableUsers={availableUsers}
          onSwitchUser={handleSwitchUser}
        />

        <main className="flex-1 overflow-y-auto p-6">
          {selectedAppDetail ? (
            <ApplicationDetails
              application={selectedAppDetail}
              currentUser={currentUser}
              onBack={() => setSelectedAppId(null)}
              onRefresh={async () => {
                if (selectedAppId) {
                  await loadDetail(selectedAppId);
                  await loadApplications();
                }
              }}
              onIssueDeficiencyNotice={handleIssueDeficiencyNotice}
              onReturnToReview={handleReturnToReview}
              onRecordFinalDecision={handleRecordFinalDecision}
            />
          ) : currentView === 'dashboard' ? (
            <DashboardOverview
              applications={applications}
              alerts={alerts}
              onSelectApplication={(id) => setSelectedAppId(id)}
              onAcknowledgeAlert={async (alertId) => {
                try {
                  await acknowledgeAlert(alertId);
                  await loadAlerts();
                } catch (err) {
                  console.error('Failed to acknowledge alert:', err);
                }
              }}
              onNavigateToApplications={() => setCurrentView('applications')}
              isQueueView={false}
            />
          ) : currentView === 'applications' ? (
            <DashboardOverview
              applications={applications}
              alerts={alerts}
              onSelectApplication={(id) => setSelectedAppId(id)}
              isQueueView={true}
            />
          ) : currentView === 'intake' ? (
            <ApplicationIntake
              onApplicationCreated={async (newId) => {
                await loadApplications();
                setSelectedAppId(newId);
              }}
              onNavigateToApplications={async () => {
                await loadApplications();
                setCurrentView('applications');
              }}
            />
          ) : currentView === 'request_types' ? (
            <RequestTypesDocumentation />
          ) : (
            <SystemAdminView />
          )}
        </main>
      </div>
    </div>
  );
}
