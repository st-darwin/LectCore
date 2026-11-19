
import { useState, useEffect } from 'react';
import AdminHeader from '../../Components/AdminHeader';
import {
  Megaphone,
  Calendar,
  BookOpen,
  Loader2,
  Layers,
  Clock,
  Pin,
  CheckCheck,
  Search,
  BellRing,
  ShieldAlert,
  Globe2,
  Building2,
  Info,
  X,
  AlertCircle
} from 'lucide-react';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query } from 'appwrite';

type AccessScope = 'institutional' | 'community';

type Priority = 'urgent' | 'high' | 'normal' | 'pinned';

interface Announcement {
  $id: string;
  lecturerId: string;
  title: string;
  content: string;
  courseId: string;
  courseCode?: string;
  courseTitle?: string;
  accessScope: AccessScope;
  $createdAt: string;
  priority?: Priority;
}

interface Course {
  $id: string;
  courseCode?: string;
  courseTitle?: string;
  accessScope?: string;
}

interface CourseFilter {
  id: string;
  code: string;
}

const StudentAnnouncement = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      setError('');

      const user = await account.get();
      if (!user) return;

      // 1. Get the student's enrolled courses
      const enrollmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId,
        [
          Query.equal('studentId', user.$id),
          Query.limit(500)
        ]
      );

      const courseIds = Array.from(
        new Set(
          enrollmentsRes.documents
            .map((doc: any) => doc.courseId)
            .filter((id: string) => Boolean(id))
        )
      );

      // 2. Fetch only enrolled-course announcements and admin broadcasts
      const announcementConditions = [
        Query.equal('courseId', 'all'),
        Query.equal('lecturerId', 'admin-system')
      ];

      if (courseIds.length > 0) {
        announcementConditions.push(
          Query.equal('courseId', courseIds)
        );
      }

      const announcementsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.announcementsId || 'announcements',
        [
          Query.or(announcementConditions),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      );

      // 3. Resolve course information
      const targetCourseIds = Array.from(
        new Set(
          announcementsRes.documents
            .map((doc: any) => doc.courseId)
            .filter((id: string) => id && id !== 'all')
        )
      );

      const courseMap = new Map<string, Course>();

      if (targetCourseIds.length > 0) {
        const coursesRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseId,
          [
            Query.equal('$id', targetCourseIds),
            Query.limit(500)
          ]
        );

        coursesRes.documents.forEach((course: any) => {
          courseMap.set(course.$id, {
            $id: course.$id,
            courseCode: course.courseCode,
            courseTitle: course.courseTitle,
            accessScope: course.accessScope
          });
        });
      }

      // 4. Format announcements
      const formattedAnnouncements = announcementsRes.documents.map(
        (doc: any) => {
          const isAdminBroadcast =
            doc.lecturerId === 'admin-system' ||
            doc.courseId === 'all';

          const courseInfo = courseMap.get(doc.courseId);

          const accessScope: AccessScope =
            doc.accessScope?.toLowerCase() === 'community' ||
            courseInfo?.accessScope?.toLowerCase() === 'community'
              ? 'community'
              : 'institutional';

          const normalizedPriority = String(
            doc.priority || 'normal'
          ).toLowerCase() as Priority;

          return {
            ...doc,
            courseCode: isAdminBroadcast
              ? 'SYS'
              : courseInfo?.courseCode || 'GEN',
            courseTitle: isAdminBroadcast
              ? 'System-Wide Broadcast'
              : courseInfo?.courseTitle || 'General Course',
            accessScope,
            priority: normalizedPriority
          };
        }
      );

      setAnnouncements(formattedAnnouncements as Announcement[]);
    } catch (err) {
      console.error('Failed to load announcements:', err);
      setError('Unable to load announcements. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // 5. Filter announcements
  const filteredAnnouncements = announcements.filter((item) => {
    const isAdminNotice =
      item.lecturerId === 'admin-system' ||
      item.courseId === 'all';

    let matchesFilter = true;

    if (selectedFilter === 'system') {
      matchesFilter = isAdminNotice;
    } else if (selectedFilter === 'institution') {
      matchesFilter =
        !isAdminNotice && item.accessScope === 'institutional';
    } else if (selectedFilter === 'community') {
      matchesFilter =
        !isAdminNotice && item.accessScope === 'community';
    } else if (selectedFilter !== 'all') {
      matchesFilter = item.courseId === selectedFilter;
    }

    const query = searchQuery.toLowerCase().trim();

    const matchesSearch =
      item.title?.toLowerCase().includes(query) ||
      item.content?.toLowerCase().includes(query) ||
      item.courseCode?.toLowerCase().includes(query) ||
      item.courseTitle?.toLowerCase().includes(query);

    return matchesFilter && matchesSearch;
  });

  // 6. Build course filters
  const enrolledCourseList: CourseFilter[] = Array.from(
    new Map(
      announcements
        .filter(
          (item) =>
            item.lecturerId !== 'admin-system' &&
            item.courseId !== 'all'
        )
        .map((item) => [
          item.courseId,
          {
            id: item.courseId,
            code: item.courseCode || 'GEN'
          }
        ])
    ).values()
  );

  const isAdminNotice = (item: Announcement) =>
    item.lecturerId === 'admin-system' || item.courseId === 'all';

  const hasSystemBroadcasts = announcements.some(isAdminNotice);

  const institutionCount = announcements.filter(
    (item) =>
      !isAdminNotice(item) &&
      item.accessScope === 'institutional'
  ).length;

  const communityCount = announcements.filter(
    (item) =>
      !isAdminNotice(item) &&
      item.accessScope === 'community'
  ).length;

  const systemCount = announcements.filter(isAdminNotice).length;

  const urgentCount = announcements.filter(
    (item) => item.priority === 'urgent'
  ).length;

  const getDate = (date: string) =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

  const getTime = (date: string) =>
    new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });

  const filterClass = (filter: string, activeColor = 'indigo') => {
    const activeStyles: Record<string, string> = {
      indigo: 'bg-[#f1edff] text-[#8064cb] border-[#e5dcff]',
      sky: 'bg-sky-50 text-sky-600 border-sky-100',
      purple: 'bg-purple-50 text-purple-600 border-purple-100'
    };

    return `shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
      selectedFilter === filter
        ? activeStyles[activeColor]
        : 'bg-white text-slate-500 border-transparent hover:bg-slate-50'
    }`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-[#9276d5]" />
          <p className="text-xs text-slate-400">
            Loading announcements...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-0 pb-16 space-y-6 text-slate-600 animate-in fade-in duration-300">

      <AdminHeader
        title="Announcements"
        description="Stay updated with announcements from your lecturers and the wider community."
        icon={<Megaphone size={20} />}
        badgeText="Student Portal"
      />

      {/* Search and urgent notice */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />

          <input
            type="text"
            placeholder="Search announcements..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-slate-100 text-xs text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#d8cbff] focus:ring-2 focus:ring-[#f1edff] transition-all"
          />

          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {urgentCount > 0 && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-rose-100 bg-gradient-to-r from-rose-50 to-orange-50 text-rose-600">
            <AlertCircle size={14} />
            <span className="text-xs font-medium">
              {urgentCount} urgent {urgentCount === 1 ? 'notice' : 'notices'}
            </span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white border border-slate-100 rounded-xl p-2">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">

          <button
            onClick={() => setSelectedFilter('all')}
            className={filterClass('all')}
          >
            <Layers size={13} />
            All Updates
            <span className="text-[10px] opacity-60">
              {announcements.length}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter('institution')}
            className={filterClass('institution')}
          >
            <Building2 size={13} />
            Institution
            <span className="text-[10px] opacity-60">
              {institutionCount}
            </span>
          </button>

          <button
            onClick={() => setSelectedFilter('community')}
            className={filterClass('community', 'sky')}
          >
            <Globe2 size={13} />
            Community
            <span className="text-[10px] opacity-60">
              {communityCount}
            </span>
          </button>

          {hasSystemBroadcasts && (
            <button
              onClick={() => setSelectedFilter('system')}
              className={filterClass('system', 'purple')}
            >
              <ShieldAlert size={13} />
              System
              <span className="text-[10px] opacity-60">
                {systemCount}
              </span>
            </button>
          )}

          {enrolledCourseList.map((course) => (
            <button
              key={course.id}
              onClick={() => setSelectedFilter(course.id)}
              className={filterClass(course.id)}
            >
              <BookOpen size={13} />
              {course.code}
            </button>
          ))}
        </div>
      </div>

      {/* Information */}
      <div className="flex items-center gap-2 px-1 text-[11px] text-slate-400">
        <Info size={13} className="text-[#9276d5] shrink-0" />
        <span>
          Course announcements are available only to students enrolled in the course.
        </span>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-rose-100 bg-rose-50/70">
          <div className="flex items-center gap-2 text-rose-600 text-xs">
            <AlertCircle size={15} />
            {error}
          </div>

          <button
            onClick={fetchAnnouncements}
            className="text-xs font-medium text-rose-600 hover:text-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Announcements */}
      <div className="space-y-3">
        {filteredAnnouncements.length > 0 ? (
          filteredAnnouncements.map((item) => {
            const adminNotice = isAdminNotice(item);
            const isCommunity =
              !adminNotice && item.accessScope === 'community';

            const isUrgent = item.priority === 'urgent';
            const isHigh = item.priority === 'high';
            const isPinned = item.priority === 'pinned';

            return (
              <article
                key={item.$id}
                className={`relative overflow-hidden bg-white border rounded-xl p-4 sm:p-5 transition-all duration-200 ${
                  isUrgent
                    ? 'border-rose-200 bg-gradient-to-br from-rose-50/70 via-white to-orange-50/50'
                    : isHigh
                    ? 'border-rose-100 bg-gradient-to-br from-rose-50/40 via-white to-orange-50/30'
                    : 'border-slate-100 hover:border-[#e5dcff]'
                }`}
              >
                {/* Priority indicator */}
                {(isUrgent || isHigh) && (
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-[3px] ${
                      isUrgent
                        ? 'bg-gradient-to-b from-rose-400 to-orange-300'
                        : 'bg-gradient-to-b from-rose-300 to-orange-200'
                    }`}
                  />
                )}

                {/* Top row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100/80">
                  <div className="flex items-center gap-2 flex-wrap">

                    {adminNotice ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-50 text-purple-600 text-[11px] font-medium border border-purple-100">
                        <ShieldAlert size={12} />
                        Admin Notice
                      </span>
                    ) : (
                      <>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#f1edff] text-[#8064cb] text-[11px] font-medium border border-[#e8e0ff]">
                          <BookOpen size={12} />
                          {item.courseCode}
                        </span>

                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border ${
                            isCommunity
                              ? 'bg-sky-50 text-sky-600 border-sky-100'
                              : 'bg-slate-50 text-slate-500 border-slate-100'
                          }`}
                        >
                          {isCommunity ? (
                            <Globe2 size={12} />
                          ) : (
                            <Building2 size={12} />
                          )}
                          {isCommunity ? 'Community' : 'Institution'}
                        </span>
                      </>
                    )}

                    <span className="text-[11px] text-slate-400">
                      {item.courseTitle}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Calendar size={12} />
                      {getDate(item.$createdAt)}
                    </span>

                    <span className="flex items-center gap-1.5">
                      <Clock size={12} />
                      {getTime(item.$createdAt)}
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="py-4 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="text-sm sm:text-[15px] font-semibold text-slate-800 leading-snug">
                      {item.title}
                    </h2>

                    <div className="flex items-center gap-2 shrink-0">
                      {isUrgent && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-rose-100 to-orange-100 border border-rose-200/80 text-[10px] font-semibold text-rose-600">
                          <AlertCircle size={11} />
                          Urgent
                        </span>
                      )}

                      {!isUrgent && isHigh && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-gradient-to-r from-rose-50 to-orange-50 border border-rose-100 text-[10px] font-semibold text-rose-500">
                          <AlertCircle size={11} />
                          High priority
                        </span>
                      )}

                      {isPinned && (
                        <Pin
                          size={14}
                          className="text-[#9276d5]"
                        />
                      )}
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-500 leading-relaxed whitespace-pre-wrap break-words">
                    {item.content}
                  </p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t border-slate-100/80">
                  <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-600">
                    <CheckCheck size={13} />
                    Verified Notice
                  </span>

                  <span className="inline-flex items-center gap-1.5 text-[11px] text-slate-400">
                    {adminNotice ? (
                      <ShieldAlert size={12} />
                    ) : (
                      <Pin size={12} />
                    )}
                    {adminNotice
                      ? 'System Broadcast'
                      : 'Official Announcement'}
                  </span>
                </div>
              </article>
            );
          })
        ) : (
          <div className="bg-white border border-slate-100 rounded-xl py-16 px-5 text-center">
            <div className="w-10 h-10 mx-auto rounded-xl bg-[#f7f4ff] border border-[#eee8ff] flex items-center justify-center text-[#9276d5] mb-3">
              <BellRing size={17} />
            </div>

            <h3 className="text-sm font-semibold text-slate-700">
              No announcements found
            </h3>

            <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
              There are currently no announcements matching your selected filter or search.
            </p>

            {(selectedFilter !== 'all' || searchQuery) && (
              <button
                onClick={() => {
                  setSelectedFilter('all');
                  setSearchQuery('');
                }}
                className="mt-4 text-xs font-medium text-[#8064cb] hover:text-[#6e52b8]"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentAnnouncement;
