import React, { useState } from 'react';
import { History, ShieldCheck, CheckCircle, AlertTriangle, Hash, ArrowDown } from 'lucide-react';
import { AuditEvent } from '../types';
import { fetchAuditChainVerification } from '../services/api';

interface AuditTimelineProps {
  auditEvents: AuditEvent[];
}

export const AuditTimeline: React.FC<AuditTimelineProps> = ({ auditEvents }) => {
  const [chainStatus, setChainStatus] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerifyChain = async () => {
    setIsVerifying(true);
    try {
      const res = await fetchAuditChainVerification();
      setChainStatus(res);
    } catch (err: any) {
      setChainStatus({ status: 'ERROR', message: err.message });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hash-Chain Verification Card */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-800">
              Tamper-Evident SHA-256 Audit Chain
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Every file ingestion, rule check, and reviewer decision is linked via cryptographic hash chaining.
          </p>
        </div>

        <button
          onClick={handleVerifyChain}
          disabled={isVerifying}
          className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 py-2 rounded-lg shadow-sm transition-all flex items-center space-x-2 shrink-0 active:scale-95 disabled:opacity-50"
        >
          <Hash className="w-3.5 h-3.5" />
          <span>{isVerifying ? 'Checking Hashes...' : 'Verify Chain Integrity'}</span>
        </button>
      </div>

      {chainStatus && (
        <div
          className={`p-4 rounded-xl border text-xs flex items-center gap-3 animate-in fade-in duration-200 ${
            chainStatus.status === 'VALID'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          {chainStatus.status === 'VALID' ? (
            <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          )}
          <div>
            <span className="font-bold">
              {chainStatus.status === 'VALID' ? 'Audit Chain Verification Successful' : 'Chain Integrity Warning'}
            </span>
            <p className="mt-0.5 text-[11px] text-slate-600">
              {chainStatus.message} Verified {chainStatus.total_events} events.
            </p>
          </div>
        </div>
      )}

      {/* Chronological Timeline */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h4 className="text-sm font-bold text-slate-800 mb-6 flex items-center gap-2">
          <History className="w-4 h-4 text-slate-500" />
          <span>Chronological Audit Event Log ({auditEvents.length})</span>
        </h4>

        {auditEvents.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No audit records logged yet for this application.
          </div>
        ) : (
          <div className="relative border-l-2 border-blue-200 ml-4 space-y-6 pb-2">
            {auditEvents.map((event, index) => (
              <div key={event.id} className="relative pl-6">
                {/* Node marker */}
                <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow-sm flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-white"></div>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 hover:border-slate-300 transition-colors">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {event.event_type}
                      </span>
                      <span className="text-[11px] text-slate-500 font-medium">
                        by <span className="font-semibold text-slate-700">{event.actor}</span>
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(event.created_at).toLocaleString()}
                    </span>
                  </div>

                  {/* Details */}
                  <div className="text-xs text-slate-600 font-mono bg-white p-2.5 rounded border border-slate-200/60 overflow-x-auto text-[11px]">
                    <pre className="whitespace-pre-wrap">{JSON.stringify(event.details, null, 2)}</pre>
                  </div>

                  {/* Hash Proof Block */}
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between text-[10px] font-mono text-slate-400 gap-1">
                    <span title={`Previous Block Hash: ${event.previous_hash}`}>
                      Prev: {event.previous_hash.substring(0, 16)}...
                    </span>
                    <span className="text-blue-600 font-bold" title={`Current Event SHA-256: ${event.event_hash}`}>
                      Hash: {event.event_hash.substring(0, 16)}...
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
