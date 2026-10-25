import React, { useState, useEffect } from 'react';
import { Bell, CheckCircle2, AlertTriangle, ShieldAlert, Check, ArrowRight, ExternalLink } from 'lucide-react';
import { AlertItem } from '../types';
import { fetchAlerts, acknowledgeAlert } from '../services/api';

interface NotificationsViewProps {
  onSelectApplication: (id: number) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  onSelectApplication,
}) => {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAlerts = async () => {
    try {
      const data = await fetchAlerts();
      setAlerts(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const handleAcknowledge = async (id: number) => {
    try {
      await acknowledgeAlert(id);
      await loadAlerts();
    } catch (err: any) {
      alert(`Failed to acknowledge alert: ${err.message}`);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-800 flex items-center space-x-2">
            <Bell className="w-5 h-5 text-blue-700" />
            <span>Scrutiny Notifications & Operational Alerts</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time administrative alerts for deficiency notices, high-priority discrepancies, and applicant rectifications.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
            Active: {alerts.filter(a => a.status === 'ACTIVE').length} / Total: {alerts.length}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-slate-400 text-xs">Loading notifications...</div>
        ) : alerts.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 text-xs">
            No active operational alerts.
          </div>
        ) : (
          alerts.map((alert) => {
            const isAcknowledged = alert.status === 'ACKNOWLEDGED';
            const dateStr = new Date(alert.created_at).toLocaleDateString('en-IN', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });

            return (
              <div
                key={alert.id}
                className={`p-4 rounded-xl border transition-all text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                  isAcknowledged
                    ? 'bg-slate-50 border-slate-200 opacity-70'
                    : alert.severity === 'CRITICAL'
                    ? 'bg-rose-50/60 border-rose-200 shadow-sm'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {alert.severity === 'CRITICAL' ? (
                      <ShieldAlert className="w-4 h-4" />
                    ) : (
                      <AlertTriangle className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-800 text-sm">{alert.title}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        alert.severity === 'CRITICAL' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {alert.severity}
                      </span>
                      {isAcknowledged && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-200 text-slate-600 font-semibold">
                          Seen (Acknowledged)
                        </span>
                      )}
                    </div>
                    <p className="text-slate-600 mt-1 leading-relaxed">{alert.message}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-1.5">
                      <span>Received: {dateStr}</span>
                      {alert.application_id && (
                        <span>&bull; Application ID: #{alert.application_id}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center">
                  {alert.application_id && (
                    <button
                      onClick={() => onSelectApplication(alert.application_id!)}
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold transition-colors flex items-center space-x-1 text-xs"
                    >
                      <span>View Application</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {!isAcknowledged && (
                    <button
                      onClick={() => handleAcknowledge(alert.id)}
                      className="px-2.5 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-700 font-medium transition-colors flex items-center space-x-1 text-xs"
                      title="Mark as seen (does not resolve statutory finding)"
                    >
                      <Check className="w-3.5 h-3.5 text-slate-500" />
                      <span>Mark Seen</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
