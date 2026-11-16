'use client';

import React, { useState, useEffect } from 'react';
import AppShell from '@/components/AppShell';
import {
  ShieldCheck,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Hash,
  Clock,
  User,
  Activity,
  ChevronDown,
  ChevronUp,
  Loader2,
  X,
} from 'lucide-react';

interface AuditLogItem {
  id: string;
  timestamp: string;
  millisecondTimestamp: string;
  actorId?: string | null;
  actorRole?: string | null;
  actorName: string;
  actorEmail?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: any;
  previousHash: string;
  currentHash: string;
}

interface VerificationModalState {
  isOpen: boolean;
  isVerifying: boolean;
  result?: {
    isValid: boolean;
    totalBlocks: number;
    genesisHash: string | null;
    latestHash: string | null;
    invalidBlockIndex?: number;
    reason?: string;
    verifiedAt: string;
  };
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('ALL');
  const [entityFilter, setEntityFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Expandable details row
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Blockchain Verifier state
  const [verifyModal, setVerifyModal] = useState<VerificationModalState>({
    isOpen: false,
    isVerifying: false,
  });

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        search,
        action: actionFilter,
        entityType: entityFilter,
      });
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/audit-logs?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs);
        setTotalCount(data.pagination.total);
      }
    } catch (err) {
      console.error('Failed to load audit trail:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [page, actionFilter, entityFilter, startDate, endDate]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchLogs();
  };

  const handleVerifyBlockchain = async () => {
    setVerifyModal({ isOpen: true, isVerifying: true });

    try {
      const res = await fetch('/api/audit-logs/verify', { method: 'POST' });
      const data = await res.json();
      setVerifyModal({
        isOpen: true,
        isVerifying: false,
        result: data.verification,
      });
    } catch (err: any) {
      setVerifyModal({
        isOpen: true,
        isVerifying: false,
        result: {
          isValid: false,
          totalBlocks: 0,
          genesisHash: null,
          latestHash: null,
          reason: err.message || 'Verification failed',
          verifiedAt: new Date().toISOString(),
        },
      });
    }
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'LOGIN':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'LOGOUT':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      case 'LOGIN_FAILED':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'CREATE':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'UPDATE':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'DELETE':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'EXPORT':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'SETTINGS_CHANGE':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'RBAC_CHANGE':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <AppShell requiredModule="audit_logs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Immutable Blockchain Audit Trail
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                Trigger-Locked (PostgreSQL)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Cryptographic SHA-256 hash-chained ledger of every system event, mutation, export, and security action
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Verify Blockchain Integrity Button (Requirement 4.4) */}
            <button
              onClick={handleVerifyBlockchain}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-md shadow-purple-600/20 transition"
            >
              <ShieldCheck className="w-4 h-4 text-purple-200" />
              <span>Verify Blockchain Integrity</span>
            </button>

            <button
              onClick={fetchLogs}
              className="p-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 transition"
              title="Refresh Audit Trail"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-sm space-y-3">
          <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
            <div className="md:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Search Hash, Entity ID, or Actor
              </label>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Filter by SHA-256 hash or entity ID..."
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Action Type
              </label>
              <select
                value={actionFilter}
                onChange={(e) => {
                  setActionFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Actions</option>
                <option value="LOGIN">LOGIN</option>
                <option value="LOGOUT">LOGOUT</option>
                <option value="LOGIN_FAILED">LOGIN_FAILED</option>
                <option value="CREATE">CREATE</option>
                <option value="UPDATE">UPDATE</option>
                <option value="DELETE">DELETE</option>
                <option value="EXPORT">EXPORT</option>
                <option value="SETTINGS_CHANGE">SETTINGS_CHANGE</option>
                <option value="RBAC_CHANGE">RBAC_CHANGE</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Entity Type
              </label>
              <select
                value={entityFilter}
                onChange={(e) => {
                  setEntityFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              >
                <option value="ALL">All Entities</option>
                <option value="AUTH">AUTH</option>
                <option value="Teacher">Teacher</option>
                <option value="Student">Student</option>
                <option value="AttendanceRecord">AttendanceRecord</option>
                <option value="AttendanceScan">AttendanceScan</option>
                <option value="DepEdForm48">DepEdForm48</option>
                <option value="SchoolProfile">SchoolProfile</option>
                <option value="TurnstileSetting">TurnstileSetting</option>
                <option value="RolePermission">RolePermission</option>
                <option value="User">User</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                Date Range
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:border-blue-500"
              />
            </div>
          </form>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100/80 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Exact Timestamp (ms)</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Entity & Target</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Previous Hash</th>
                  <th className="py-3 px-4">Block SHA-256 Hash</th>
                  <th className="py-3 px-4 text-center">Diff</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      Loading immutable audit ledger...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-slate-400">
                      No audit log records match your filter criteria.
                    </td>
                  </tr>
                ) : (
                  logs.map((l) => (
                    <React.Fragment key={l.id}>
                      <tr className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-4 font-mono font-medium text-slate-800">
                          {l.millisecondTimestamp}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getActionBadge(
                              l.action
                            )}`}
                          >
                            {l.action}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-semibold text-slate-900">{l.entityType}</div>
                          {l.entityId && (
                            <div className="text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                              {l.entityId}
                            </div>
                          )}
                        </td>

                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900">{l.actorName}</div>
                          <div className="text-[10px] text-slate-400">{l.actorRole || 'SYSTEM'}</div>
                        </td>

                        <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                          <span
                            className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200"
                            title={l.previousHash}
                          >
                            {l.previousHash.substring(0, 10)}...{l.previousHash.substring(58)}
                          </span>
                        </td>

                        <td className="py-3 px-4 font-mono text-[10px] text-purple-700 font-bold">
                          <span
                            className="bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200"
                            title={l.currentHash}
                          >
                            {l.currentHash.substring(0, 10)}...{l.currentHash.substring(58)}
                          </span>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() =>
                              setExpandedLogId(expandedLogId === l.id ? null : l.id)
                            }
                            className="p-1 rounded-md text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
                            title="View JSON Diff Details"
                          >
                            {expandedLogId === l.id ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </td>
                      </tr>

                      {/* Expanded JSON Diff details row */}
                      {expandedLogId === l.id && (
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <td colSpan={7} className="p-4">
                            <div className="p-3 bg-slate-950 text-emerald-400 font-mono text-xs rounded-xl overflow-x-auto border border-slate-800 shadow-inner">
                              <div className="text-[10px] text-slate-400 mb-1 font-sans">
                                Block Payload Diff & State Metadata:
                              </div>
                              <pre>{JSON.stringify(l.details, null, 2)}</pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between p-4 border-t border-slate-100 text-xs text-slate-500">
            <div>
              Showing <span className="font-semibold">{logs.length}</span> of{' '}
              <span className="font-semibold">{totalCount}</span> total audit blocks
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <span className="font-medium text-slate-700">Page {page}</span>
              <button
                disabled={logs.length < 20}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1 rounded border border-slate-300 disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* BLOCKCHAIN INTEGRITY VERIFIER MODAL (Requirement 4.4) */}
      {verifyModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Cryptographic Ledger Integrity Verifier
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Sequential SHA-256 Hash Chain Recalculation
                  </p>
                </div>
              </div>

              <button
                onClick={() => setVerifyModal({ isOpen: false, isVerifying: false })}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {verifyModal.isVerifying ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <Loader2 className="w-10 h-10 animate-spin text-purple-600 mb-3" />
                <div className="text-sm font-bold text-slate-800">
                  Recalculating Block Hashes...
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Sequentially validating each SHA-256 hash from Genesis block to head...
                </p>
              </div>
            ) : verifyModal.result?.isValid ? (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-2">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-extrabold text-emerald-900">
                    BLOCKCHAIN LEDGER 100% VALID & UNTAMPERED
                  </h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    Every sequential cryptographic block hash was successfully recomputed and matches the stored SHA-256 digest perfectly.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                    <span className="text-slate-500 font-sans">Total Blocks Verified:</span>
                    <strong className="text-slate-900">{verifyModal.result.totalBlocks} Blocks</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">Genesis Block Hash:</span>
                    <span className="text-[11px] text-slate-800 break-all">
                      {verifyModal.result.genesisHash || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-sans">Latest Head Hash:</span>
                    <span className="text-[11px] text-purple-700 break-all font-bold">
                      {verifyModal.result.latestHash || 'N/A'}
                    </span>
                  </div>
                  <div className="pt-1 text-[10px] text-slate-400 font-sans text-right">
                    Verified: {verifyModal.result.verifiedAt.replace('T', ' ').replace('Z', '')}
                  </div>
                </div>

                <button
                  onClick={() => setVerifyModal({ isOpen: false, isVerifying: false })}
                  className="w-full py-2.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-sm transition"
                >
                  Done
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-center">
                  <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto mb-2">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-extrabold text-red-900">
                    CRYPTOGRAPHIC TAMPER DETECTED!
                  </h4>
                  <p className="text-xs text-red-700 mt-1">
                    {verifyModal.result?.reason}
                  </p>
                </div>

                <button
                  onClick={() => setVerifyModal({ isOpen: false, isVerifying: false })}
                  className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-sm transition"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </AppShell>
  );
}
