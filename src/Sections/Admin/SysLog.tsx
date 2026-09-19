import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  ShieldAlert, 
  Database, 
  Clock, 
  Search, 
  RefreshCw, 
  Loader2, 
  ArrowLeft, 
  Layers, 
  Terminal, 
  Server,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { databases, appwriteConfig } from '../../appwrite/Client';
import AdminHeader from '../../Components/AdminHeader';

interface SystemLogItem {
  $id: string;
  $createdAt: string;
  collectionName?: string;
  actionType: string;
  documentId?: string;
  details: string;
  status: 'success' | 'warning' | 'error';
}

const SysLog: React.FC = () => {
  const [logs, setLogs] = useState<SystemLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [error, setError] = useState<string>('');

  // Fetch real system analytics from Appwrite collections
  const fetchSystemLogs = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch documents across primary appwrite collections to build a true activity stream
      const [assignmentsRes, announcementsRes, coursesRes, enrollmentsRes] = await Promise.all([
        databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.assignmentId || 'assignments').catch(() => ({ documents: [] })),
        databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.announcementsId || 'announcements').catch(() => ({ documents: [] })),
        databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.courseId).catch(() => ({ documents: [] })),
        databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.enrollmentsId || 'enrollments').catch(() => ({ documents: [] }))
      ]);

      let compiledLogs: SystemLogItem[] = [];

      // Map assignments to logs
      assignmentsRes.documents.forEach((doc: any) => {
        compiledLogs.push({
          $id: `assignment-${doc.$id}`,
          $createdAt: doc.$createdAt || new Date().toISOString(),
          collectionName: 'Assignments',
          actionType: 'DOCUMENT_CREATE',
          documentId: doc.$id,
          details: `Assignment published: "${doc.title || 'Untitled'}"`,
          status: 'success'
        });
      });

      // Map announcements to logs
      announcementsRes.documents.forEach((doc: any) => {
        compiledLogs.push({
          $id: `announcement-${doc.$id}`,
          $createdAt: doc.$createdAt || new Date().toISOString(),
          collectionName: 'Announcements',
          actionType: 'BROADCAST_SENT',
          documentId: doc.$id,
          details: `Broadcast posted: "${doc.title || 'General Notice'}"`,
          status: doc.courseId === 'all' || doc.lecturerId === 'admin-system' ? 'warning' : 'success'
        });
      });

      // Map courses to logs
      coursesRes.documents.forEach((doc: any) => {
        compiledLogs.push({
          $id: `course-${doc.$id}`,
          $createdAt: doc.$createdAt || new Date().toISOString(),
          collectionName: 'Courses',
          actionType: 'MODULE_SYNC',
          documentId: doc.$id,
          details: `Course module registered: [${doc.courseCode || 'GEN'}] ${doc.courseTitle || doc.title || ''}`,
          status: 'success'
        });
      });

      // Map enrollments to logs
      enrollmentsRes.documents.forEach((doc: any) => {
        compiledLogs.push({
          $id: `enrollment-${doc.$id}`,
          $createdAt: doc.$createdAt || new Date().toISOString(),
          collectionName: 'Enrollments',
          actionType: 'STUDENT_ENROLL',
          documentId: doc.$id,
          details: `Student relationship synchronized for course ID: ${doc.courseId || 'N/A'}`,
          status: 'success'
        });
      });

      // Sort logs by newest date descending
      compiledLogs.sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());

      setLogs(compiledLogs);
    } catch (err: any) {
      console.error('Failed to fetch system activity logs:', err);
      setError(err.message || 'Unable to pull live system metrics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSystemLogs();
  }, []);

  // Filter logic
  const filteredLogs = logs.filter((item) => {
    const matchesSearch = 
      item.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.collectionName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.actionType.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Analytics Metrics Calculations
  const totalEvents = logs.length;
  const successEvents = logs.filter(l => l.status === 'success').length;
  const systemBroadcastsCount = logs.filter(l => l.collectionName === 'Announcements').length;
  const activeCollectionsCount = new Set(logs.map(l => l.collectionName)).size;
  const successRate = totalEvents > 0 ? Math.round((successEvents / totalEvents) * 100) : 100;

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-16 pt-2 text-slate-600">
      {/* Header & Navigation */}
      <div className="flex flex-col gap-3">
        <Link 
          to="/admin" 
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-800 transition-colors w-fit"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <AdminHeader 
            title="System Analytics & Activity Logs"
            description="Real-time audit trail of database transactions, document mutations, and server broadcasts."
            icon={<Activity className="w-6 h-6" />}
            badgeText="Live telemetry"
          />
          <button
            onClick={fetchSystemLogs}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-all shadow-xs cursor-pointer disabled:opacity-50 w-full sm:w-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-indigo-600' : 'text-slate-400'}`} />
            <span>Sync Telemetry</span>
          </button>
        </div>
      </div>

      {/* Analytics Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Recorded Events</span>
            <Terminal className="w-4 h-4 text-indigo-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{totalEvents}</h3>
          <div className="text-[11px] text-emerald-600 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3" /> Live database connection active
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">System Health Score</span>
            <Zap className="w-4 h-4 text-emerald-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{successRate}%</h3>
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full transition-all duration-500" style={{ width: `${successRate}%` }} />
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Active Collections</span>
            <Database className="w-4 h-4 text-sky-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{activeCollectionsCount}</h3>
          <p className="text-[11px] text-slate-400">Appwrite synchronized schemas</p>
        </div>

        <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Broadcast Activity</span>
            <Server className="w-4 h-4 text-purple-500" />
          </div>
          <h3 className="text-2xl font-bold text-slate-900">{systemBroadcastsCount}</h3>
          <p className="text-[11px] text-slate-400">Announcements logged</p>
        </div>
      </div>

      {/* Error Banner if any */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center gap-2.5 shadow-xs">
          <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search & Filter Toolbar */}
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search logs by action, message, collection..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['all', 'success', 'warning'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all capitalize whitespace-nowrap cursor-pointer ${
                statusFilter === status
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/60'
              }`}
            >
              {status} logs
            </button>
          ))}
        </div>
      </div>

      {/* Log Feed Table / List */}
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/80 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-800">Live Telemetry Feed</h3>
          </div>
          <span className="text-xs text-slate-400">Showing {filteredLogs.length} events</span>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
            <p className="text-xs text-slate-400">Analyzing database records...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Info className="w-8 h-8 text-slate-300 mx-auto" />
            <p className="text-xs font-bold text-slate-700">No Log Entries Found</p>
            <p className="text-[11px] text-slate-400">No database telemetry matches your selected filter criteria.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredLogs.map((item) => (
              <div key={item.$id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-3.5">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    item.status === 'warning' 
                      ? 'bg-amber-50 border-amber-100 text-amber-600' 
                      : 'bg-emerald-50 border-emerald-100 text-emerald-600'
                  }`}>
                    {item.status === 'warning' ? <AlertTriangle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {item.collectionName}
                      </span>
                      <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                        {item.actionType}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-800 font-medium">{item.details}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-[11px] text-slate-400 self-end sm:self-center shrink-0">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{new Date(item.$createdAt).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

SysLog.displayName = 'SysLog';

export default SysLog;