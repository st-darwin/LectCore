import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Megaphone, 
  ClipboardList, 
  FileText, 
  UploadCloud, 
  Clock, 
  Loader2,
  BookOpen,
  Filter
} from 'lucide-react';
import { client, databases, account, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';
import AdminHeader from '../../Components/AdminHeader';

export interface ActivityLogItem {
  id: string;
  type: 'announcement' | 'assignment' | 'material' | 'submission';
  title: string;
  description: string;
  timestamp: string;
  courseCode?: string;
  meta?: string;
}

export default function Log() {
  const [logs, setLogs] = useState<ActivityLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'announcement' | 'assignment' | 'material' | 'submission'>('all');

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let isMounted = true;

    const fetchActivityFeed = async () => {
      setIsLoading(true);
      try {
        const user = await account.get();
        if (!user?.$id || !isMounted) return;
        const studentId = user.$id;

        // 1. get all courses enrolled by the student based on the student id
        const enrollmentsRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.enrollmentsId,
          [Query.equal('studentId', studentId)]
        );

        const courseIds = enrollmentsRes.documents.map((doc: any) => doc.courseId);

        if (courseIds.length === 0) {
          if (isMounted) setIsLoading(false);
          return;
        }

        // Fetch course details map for course codes (e.g. CSC201)
        const coursesRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseId,
          [Query.equal('$id', courseIds)]
        );
        const courseMap = new Map(coursesRes.documents.map((c: any) => [c.$id, c.courseCode]));

        // 2. Fetch recent feeds concurrently
        const [announcementsRes, assignmentsRes, materialsRes, submissionsRes] = await Promise.all([
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.announcementsId, [
            Query.equal('courseId', courseIds),
            Query.orderDesc('$createdAt'),
            Query.limit(10)
          ]),
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.assignmentId, [
            Query.equal('courseId', courseIds),
            Query.orderDesc('$createdAt'),
            Query.limit(10)
          ]),
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.courseMaterialsId, [
            Query.equal('courseId', courseIds),
            Query.orderDesc('$createdAt'),
            Query.limit(10)
          ]),
          databases.listDocuments(appwriteConfig.databaseId, appwriteConfig.submissionsId, [
            Query.equal('studentId', studentId),
            Query.orderDesc('$createdAt'),
            Query.limit(10)
          ]),
        ]);

        // 3. Normalize data into standard log feed format
        const feedItems: ActivityLogItem[] = [
          ...announcementsRes.documents.map((doc: any) => ({
            id: doc.$id,
            type: 'announcement' as const,
            title: doc.title,
            description: doc.content,
            timestamp: doc.$createdAt,
            courseCode: courseMap.get(doc.courseId) || 'General',
            meta: `Priority: ${doc.priority || 'Normal'}`,
          })),
          ...assignmentsRes.documents.map((doc: any) => ({
            id: doc.$id,
            type: 'assignment' as const,
            title: doc.title,
            description: doc.description,
            timestamp: doc.$createdAt,
            courseCode: courseMap.get(doc.courseId) || 'Course',
            meta: `Due: ${new Date(doc.dueDate).toLocaleDateString()} (${doc.totalMarks} Marks)`,
          })),
          ...materialsRes.documents.map((doc: any) => ({
            id: doc.$id,
            type: 'material' as const,
            title: doc.title,
            description: 'New course material uploaded.',
            timestamp: doc.$createdAt,
            courseCode: courseMap.get(doc.courseId) || 'Course',
          })),
          ...submissionsRes.documents.map((doc: any) => ({
            id: doc.$id,
            type: 'submission' as const,
            title: 'Assignment Submitted',
            description: doc.submissionText,
            timestamp: doc.$createdAt,
            meta: doc.grade !== undefined && doc.grade !== null ? `Graded: ${doc.grade}` : 'Pending review',
          })),
        ];

        // Sort globally by newest timestamp first
        feedItems.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

        if (isMounted) {
          setLogs(feedItems);
          setIsLoading(false);
        }

        // 4. Set up Appwrite Realtime Subscriptions using config IDs
        const channels = [
          `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.announcementsId}.documents`,
          `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.assignmentId}.documents`,
          `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.courseMaterialsId}.documents`,
          `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.submissionsId}.documents`,
        ];

        unsubscribe = client.subscribe(channels, (response) => {
          const payload: any = response.payload;
          const eventType = response.events;

          if (eventType.some(e => e.includes('.create'))) {
            let newItem: ActivityLogItem | null = null;

            if (payload.collectionId === appwriteConfig.announcementsId && courseIds.includes(payload.courseId)) {
              newItem = {
                id: payload.$id,
                type: 'announcement',
                title: payload.title,
                description: payload.content,
                timestamp: payload.$createdAt,
                courseCode: courseMap.get(payload.courseId) || 'General',
              };
            } else if (payload.collectionId === appwriteConfig.assignmentId && courseIds.includes(payload.courseId)) {
              newItem = {
                id: payload.$id,
                type: 'assignment',
                title: payload.title,
                description: payload.description,
                timestamp: payload.$createdAt,
                courseCode: courseMap.get(payload.courseId) || 'Course',
              };
            } else if (payload.collectionId === appwriteConfig.courseMaterialsId && courseIds.includes(payload.courseId)) {
              newItem = {
                id: payload.$id,
                type: 'material',
                title: payload.title,
                description: 'New course material uploaded.',
                timestamp: payload.$createdAt,
                courseCode: courseMap.get(payload.courseId) || 'Course',
              };
            } else if (payload.collectionId === appwriteConfig.submissionsId && payload.studentId === studentId) {
              newItem = {
                id: payload.$id,
                type: 'submission',
                title: 'Assignment Submitted',
                description: payload.submissionText,
                timestamp: payload.$createdAt,
                meta: 'Pending review',
              };
            }

            if (newItem) {
              setLogs(prev => [newItem!, ...prev]);
            }
          }
        });

      } catch (error) {
        console.error('Failed to load real-time activity log:', error);
        if (isMounted) setIsLoading(false);
      }
    };

    fetchActivityFeed();

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Helper to categorize log timestamps into Today, Yesterday, or Older
  const getDateCategory = (timestamp: string): 'Today' | 'Yesterday' | 'Older' => {
    const date = new Date(timestamp);
    const today = new Date();
    
    const dDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    const diffTime = dToday.getTime() - dDate.getTime();
    const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    return 'Older';
  };

  const getLogIcon = (type: ActivityLogItem['type']) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="w-4 h-4 text-violet-500" />;
      case 'assignment':
        return <ClipboardList className="w-4 h-4 text-amber-500" />;
      case 'material':
        return <FileText className="w-4 h-4 text-indigo-500" />;
      case 'submission':
        return <UploadCloud className="w-4 h-4 text-emerald-500" />;
    }
  };

  const getLogBadgeStyle = (type: ActivityLogItem['type']) => {
    switch (type) {
      case 'announcement':
        return 'bg-violet-50/60 text-violet-600 border-violet-100';
      case 'assignment':
        return 'bg-amber-50/60 text-amber-600 border-amber-100';
      case 'material':
        return 'bg-indigo-50/60 text-indigo-600 border-indigo-100';
      case 'submission':
        return 'bg-emerald-50/60 text-emerald-600 border-emerald-100';
    }
  };

  const filteredLogs = filter === 'all' ? logs : logs.filter(l => l.type === filter);

  // Group filtered logs by Today, Yesterday, and Older
  const groupedLogs = {
    Today: filteredLogs.filter(log => getDateCategory(log.timestamp) === 'Today'),
    Yesterday: filteredLogs.filter(log => getDateCategory(log.timestamp) === 'Yesterday'),
    Older: filteredLogs.filter(log => getDateCategory(log.timestamp) === 'Older'),
  };

  const renderLogItem = (log: ActivityLogItem) => (
    <div 
      key={log.id} 
      className="p-4 sm:p-5 hover:bg-slate-50/50 transition-all duration-200 flex flex-col sm:flex-row sm:items-start justify-between gap-4 group"
    >
      <div className="flex items-start gap-3.5">
        <div className={`p-2.5 rounded-2xl border shrink-0 mt-0.5 transition-colors shadow-2xs ${getLogBadgeStyle(log.type)}`}>
          {getLogIcon(log.type)}
        </div>

        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {log.courseCode && (
              <span className="px-2 py-0.5 rounded-md bg-slate-100/80 text-slate-600 text-[10px] font-mono font-medium border border-slate-200/60">
                {log.courseCode}
              </span>
            )}
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider border ${getLogBadgeStyle(log.type)}`}>
              {log.type}
            </span>
            <h3 className="text-xs sm:text-sm font-semibold text-slate-800 tracking-tight">{log.title}</h3>
          </div>

          <p className="text-xs text-slate-500 leading-relaxed font-normal">{log.description}</p>

          {log.meta && (
            <div className="pt-0.5">
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-indigo-600 bg-indigo-50/50 px-2.5 py-1 rounded-lg border border-indigo-100/60">
                {log.meta}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium self-end sm:self-start shrink-0 pt-0.5">
        <Clock className="w-3.5 h-3.5 text-slate-300" />
        <span>
          {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} &bull; {new Date(log.timestamp).toLocaleDateString()}
        </span>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-16 pt-2 text-slate-600">
      {/* Custom Header Integration */}
      <AdminHeader 
        title="Real-Time Academic Feed"
        description="Live activity stream of course announcements, upcoming assignments, and submissions."
        icon={<Activity className="w-6 h-6 text-indigo-500 animate-pulse" />}
        badgeText="Live Telemetry"
      />

      {/* Main Container */}
      <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 rounded-3xl shadow-xs overflow-hidden">
        {/* Filter Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/30">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-500" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">Filter Activity Stream</h3>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {(['all', 'announcement', 'assignment', 'material', 'submission'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium capitalize transition-all duration-200 cursor-pointer ${
                  filter === f 
                    ? 'bg-indigo-600 text-white shadow-xs shadow-indigo-200' 
                    : 'bg-white text-slate-500 hover:bg-indigo-50/50 hover:text-indigo-600 border border-slate-200/60'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Feed Stream Content */}
        <div>
          {isLoading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
              <p className="text-xs font-medium text-slate-400">Establishing secure real-time stream...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-20 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-slate-300 mx-auto stroke-1" />
              <p className="text-xs font-semibold text-slate-700">No Activity Logs Found</p>
              <p className="text-[11px] text-slate-400">There are no recent updates matching your selected filter criteria.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100/60">
              {(['Today', 'Yesterday', 'Older'] as const).map((section) => {
                const items = groupedLogs[section];
                if (items.length === 0) return null;

                return (
                  <div key={section}>
                    <div className="bg-slate-50/60 px-4 sm:px-6 py-2 border-y border-slate-100/80">
                      <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{section}</h4>
                    </div>
                    <div className="divide-y divide-slate-100/60">
                      {items.map(renderLogItem)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
