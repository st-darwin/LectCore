import { useCallback, useEffect, useState } from "react";
import { useLoaderData, useNavigate } from "react-router-dom";
import {
  BookOpen,
  FileText,
  ArrowRight,
  ChevronRight,
  Bell,
  Award,
  Calendar,
  CheckCircle2,
  Plus,
  MessageSquare,
  ShieldCheck,
  GraduationCap,
  Layers2,
  RefreshCw,
  Clock3,
  FolderOpen,
} from "lucide-react";
import { databases, appwriteConfig, account } from "../../appwrite/Client";
import { Query } from "appwrite";

interface Course {
  $id: string;
  courseCode: string;
  courseTitle: string;
  department: string;
  level: string;
}

interface Announcement {
  $id: string;
  title: string;
  content: string;
  priority: string;
  $createdAt: string;
}

interface DashboardUser {
  $id: string;
  name: string | null;
  email: string;
}

export const Loader = async () => {
  try {
    const user = await account.get();

    if (!user) {
      throw new Error("No authenticated user found.");
    }

    return user;
  } catch (error) {
    console.error("Community Tutor authentication error:", error);
    throw error;
  }
};

const ComTutorDashboard = () => {
  const user = useLoaderData() as DashboardUser;
  const navigate = useNavigate();

  const [courses, setCourses] = useState<Course[]>([]);
  const [coursesCount, setCoursesCount] = useState(0);
  const [materialsCount, setMaterialsCount] = useState(0);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState("");

  const tutorName = user?.name?.trim() || "Community Tutor";

  const fetchDashboardData = useCallback(async () => {
    if (!user?.$id) return;

    try {
      setLoading(true);
      setError(null);

      const [
        coursesResponse,
        materialsResponse,
        announcementsResponse,
      ] = await Promise.all([
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseId,
          [
            Query.equal("lecturerId", user.$id),
            Query.limit(6),
          ]
        ),

        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseMaterialsId,
          [
            Query.equal("uploadedBy", user.$id),
            Query.limit(1),
          ]
        ),

        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.announcementsId,
          [
            Query.equal("lecturerId", user.$id),
            Query.orderDesc("$createdAt"),
            Query.limit(4),
          ]
        ),
      ]);

      setCourses(coursesResponse.documents as unknown as Course[]);
      setCoursesCount(coursesResponse.total);
      setMaterialsCount(materialsResponse.total);
      setAnnouncements(announcementsResponse.documents as unknown as Announcement[]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
      setError("Unable to load dashboard data. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [user?.$id]);

  useEffect(() => {
    const updateDate = () => {
      setCurrentDate(
        new Date().toLocaleDateString(undefined, {
          weekday: "long",
          month: "short",
          day: "numeric",
          year: "numeric",
        })
      );
    };

    updateDate();
    fetchDashboardData();

    const timer = setInterval(updateDate, 60000);

    return () => clearInterval(timer);
  }, [fetchDashboardData]);

  const navigateTo = (path: string) => {
    navigate(path);
  };

  const stats = [
    {
      label: "Assigned Courses",
      value: coursesCount,
      icon: BookOpen,
      description: "Active community courses",
    },
    {
      label: "Learning Materials",
      value: materialsCount,
      icon: FileText,
      description: "Uploaded resources",
    },
    {
      label: "Tutor Status",
      value: "Verified",
      icon: Award,
      description: "Community scope",
    },
    {
      label: "System Status",
      value: "Online",
      icon: ShieldCheck,
      description: "Services operational",
    },
  ];

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getPriorityStyle = (priority: string) => {
    if (priority?.toLowerCase() === "urgent") {
      return "border-rose-200/70 bg-rose-50/80 text-rose-600";
    }

    if (priority?.toLowerCase() === "high") {
      return "border-amber-200/70 bg-amber-50/80 text-amber-600";
    }

    return "border-indigo-100 bg-indigo-50/80 text-indigo-600";
  };

  const SectionHeader = ({
    icon: Icon,
    title,
    action,
    onAction,
  }: {
    icon: React.ElementType;
    title: string;
    action?: string;
    onAction?: () => void;
  }) => (
    <div className="mb-5 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
          <Icon size={15} />
        </div>

        <h2 className="truncate text-xs font-semibold uppercase tracking-wider text-slate-700">
          {title}
        </h2>
      </div>

      {action && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="inline-flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-600"
        >
          {action}
          <ArrowRight size={13} />
        </button>
      )}
    </div>
  );

  return (
    <div className="relative min-h-screen w-full bg-[#fbfbfc] px-3.5 py-5 sm:px-6 sm:py-8 lg:px-8 text-slate-800 antialiased selection:bg-indigo-50 selection:text-indigo-900">
      {/* Background ambient light glow matching AdminHeader */}
      <div className="pointer-events-none absolute -top-10 left-1/4 h-80 w-80 rounded-full bg-indigo-500/5 blur-3xl" />

      <div className="relative mx-auto w-full max-w-7xl space-y-6">

        {/* Polished Responsive Header */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-200/60 bg-white/90 p-5 shadow-2xs backdrop-blur-xl sm:p-7 lg:px-8">
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-indigo-500/5 blur-3xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0 max-w-2xl space-y-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1 text-[11px] font-medium text-indigo-600">
                  <Calendar size={12} className="shrink-0 text-indigo-600" />
                  <span className="truncate">{currentDate || "Workspace"}</span>
                </span>

                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200/70 bg-emerald-50/80 px-3 py-1 text-[11px] font-medium text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Community Tutor
                </span>
              </div>

              <div className="space-y-1.5">
                <h1 className="break-words text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                  Hello,{" "}
                  <span className="text-indigo-950 ">{tutorName} 👋</span>
                </h1>

                <p className="text-xs leading-relaxed text-slate-500 sm:text-sm">
                  Organize community courses, upload learning materials, and share timely updates from a calm, focused workspace.
                </p>
              </div>
            </div>

            <div className="flex w-full flex-col gap-2.5 sm:flex-row sm:items-center lg:w-auto lg:shrink-0">
              <button
                type="button"
                onClick={() => navigateTo("/community_tutor/announcements")}
                className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-indigo-200/80 bg-indigo-50/60 px-4 py-2.5 text-xs font-semibold text-indigo-700 transition hover:border-indigo-300 hover:bg-indigo-50 active:scale-[0.97] sm:w-auto"
              >
                <MessageSquare size={14} className="shrink-0 text-indigo-600" />
                <span>Broadcast Update</span>
              </button>

              <button
                type="button"
                onClick={() => navigateTo("/community_tutor/courses")}
                className="inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-[0.97] sm:w-auto"
              >
                <GraduationCap size={15} className="shrink-0" />
                <span>Manage Courses</span>
              </button>
            </div>
          </div>
        </section>

        {/* Error State */}
        {error && (
          <div className="flex flex-col gap-3 rounded-2xl border border-rose-200/70 bg-rose-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs font-medium text-rose-600">{error}</p>

            <button
              type="button"
              onClick={fetchDashboardData}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 self-start rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-600 transition hover:bg-rose-50 sm:self-auto"
            >
              <RefreshCw size={12} />
              Try again
            </button>
          </div>
        )}

        {/* Stats Row */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
          {stats.map((stat) => {
            const Icon = stat.icon;

            return (
              <div
                key={stat.label}
                className="min-w-0 rounded-2xl border border-slate-200/70 bg-white/90 p-4 shadow-[0_1px_3px_rgba(0,0,0,0.02)] backdrop-blur-xl transition hover:border-indigo-200 hover:shadow-xs sm:p-5"
              >
                <div className="mb-3.5 flex h-8 w-8 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-600">
                  <Icon size={15} />
                </div>

                <p className="truncate text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  {stat.label}
                </p>

                <p className="mt-1 truncate text-xl font-semibold text-slate-900 sm:text-2xl">
                  {loading ? (
                    <span className="inline-block h-6 w-12 animate-pulse rounded-md bg-indigo-50" />
                  ) : (
                    stat.value
                  )}
                </p>

                <p className="mt-1 hidden text-[11px] text-slate-400 sm:block">
                  {stat.description}
                </p>
              </div>
            );
          })}
        </section>

        {/* Main Content Grid */}
        <section className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-3 lg:gap-6">

          {/* Left / Main Column */}
          <div className="min-w-0 space-y-5 lg:col-span-2 lg:space-y-6">

            {/* Assigned Courses */}
            <div className="min-w-0 rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] backdrop-blur-xl sm:p-6">
              <SectionHeader
                icon={BookOpen}
                title="Assigned Courses"
                action="View all"
                onAction={() => navigateTo("/community_tutor/courses")}
              />

              {loading ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {[1, 2, 3, 4].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50/40 p-4"
                    >
                      <div className="h-5 w-20 rounded-lg bg-indigo-50" />
                      <div className="mt-4 h-4 w-3/4 rounded bg-slate-100" />
                      <div className="mt-2 h-3 w-1/2 rounded bg-slate-100" />
                      <div className="mt-6 h-7 rounded-lg bg-indigo-50/50" />
                    </div>
                  ))}
                </div>
              ) : courses.length > 0 ? (
                <div className="grid min-w-0 grid-cols-1 gap-3.5 sm:grid-cols-2">
                  {courses.map((course) => (
                    <button
                      key={course.$id}
                      type="button"
                      onClick={() =>
                        navigateTo(`/community_tutor/courses/${course.$id}`)
                      }
                      className="group min-w-0 cursor-pointer rounded-2xl border border-slate-200/70 bg-slate-50/40 p-4 text-left transition hover:border-indigo-200 hover:bg-white hover:shadow-xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="max-w-[65%] truncate rounded-full border border-indigo-100 bg-indigo-50/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                          {course.courseCode}
                        </span>

                        <span className="shrink-0 text-[11px] font-medium text-slate-400">
                          {course.level} Level
                        </span>
                      </div>

                      <h3 className="mt-3.5 line-clamp-2 min-h-10 text-sm font-semibold leading-5 text-slate-800 transition group-hover:text-indigo-600">
                        {course.courseTitle}
                      </h3>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {course.department}
                      </p>

                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 transition group-hover:text-indigo-600">
                          <FolderOpen size={13} className="text-indigo-600" />
                          Open Course
                        </span>

                        <ArrowRight
                          size={14}
                          className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600"
                        />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-48 flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-200/80 bg-indigo-50/20 px-5 text-center">
                  <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-indigo-500/10 via-indigo-500/5 to-transparent text-indigo-600 shadow-xs">
                    <div className="absolute inset-0 rounded-2xl bg-white/40 backdrop-blur-xs" />
                    <div className="relative z-10">
                      <Layers2 size={18} />
                    </div>
                  </div>

                  <h3 className="mt-3 text-xs font-semibold text-slate-700">
                    No courses assigned yet
                  </h3>

                  <p className="mt-1 max-w-xs text-xs text-slate-400">
                    Courses linked to your community tutor profile will appear here.
                  </p>
                </div>
              )}
            </div>

            {/* Recent Broadcasts */}
            <div className="min-w-0 rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] backdrop-blur-xl sm:p-6">
              <SectionHeader
                icon={MessageSquare}
                title="Recent Broadcasts"
                action="Manage all"
                onAction={() => navigateTo("/community_tutor/announcements")}
              />

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="animate-pulse rounded-2xl border border-slate-100 bg-slate-50/40 p-4"
                    >
                      <div className="h-4 w-20 rounded bg-indigo-50" />
                      <div className="mt-3 h-4 w-2/3 rounded bg-slate-100" />
                      <div className="mt-2 h-3 w-full rounded bg-slate-100" />
                    </div>
                  ))}
                </div>
              ) : announcements.length > 0 ? (
                <div className="space-y-2.5">
                  {announcements.map((announcement) => (
                    <button
                      key={announcement.$id}
                      type="button"
                      onClick={() => navigateTo("/community_tutor/announcements")}
                      className="flex w-full min-w-0 cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/30 p-3.5 text-left transition hover:border-indigo-200 hover:bg-white sm:p-4"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex flex-wrap items-center gap-2">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${getPriorityStyle(
                              announcement.priority
                            )}`}
                          >
                            {announcement.priority || "Normal"}
                          </span>

                          <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                            <Clock3 size={11} />
                            {formatDate(announcement.$createdAt)}
                          </span>
                        </div>

                        <h3 className="truncate text-xs font-semibold text-slate-800 sm:text-sm transition group-hover:text-indigo-600">
                          {announcement.title}
                        </h3>

                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                          {announcement.content}
                        </p>
                      </div>

                      <ChevronRight
                        size={16}
                        className="shrink-0 text-slate-400"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex min-h-36 flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-200/80 bg-indigo-50/20 px-4 text-center">
                  <MessageSquare size={19} className="text-indigo-400" />

                  <p className="mt-2.5 text-xs font-semibold text-slate-700">
                    No broadcasts yet
                  </p>

                  <p className="mt-1 text-xs text-slate-400">
                    Updates you publish will show up here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar Column */}
          <div className="min-w-0 space-y-5 lg:space-y-6">

            {/* Quick Actions */}
            <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] backdrop-blur-xl sm:p-6">
              <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-700">
                Quick Actions
              </h2>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => navigateTo("/community_tutor/announcements")}
                  className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/30 p-3 text-left transition hover:border-indigo-200 hover:bg-white"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-white text-indigo-600 shadow-2xs transition group-hover:bg-indigo-50">
                      <Plus size={14} />
                    </span>

                    <span className="truncate text-xs font-semibold text-slate-700">
                      Post Announcement
                    </span>
                  </span>

                  <ArrowRight
                    size={14}
                    className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600"
                  />
                </button>

                <button
                  type="button"
                  onClick={() => navigateTo("/community_tutor/courses")}
                  className="group flex w-full cursor-pointer items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/30 p-3 text-left transition hover:border-indigo-200 hover:bg-white"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-indigo-100 bg-white text-indigo-600 shadow-2xs transition group-hover:bg-indigo-50">
                      <BookOpen size={14} />
                    </span>

                    <span className="truncate text-xs font-semibold text-slate-700">
                      Browse Courses
                    </span>
                  </span>

                  <ArrowRight
                    size={14}
                    className="shrink-0 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-indigo-600"
                  />
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 p-3.5">
                <div className="mb-1 flex items-center gap-1.5">
                  <Layers2 size={13} className="text-indigo-600" />
                  <h3 className="text-xs font-semibold text-slate-700">
                    Workspace Tip
                  </h3>
                </div>

                <p className="text-[11px] leading-5 text-slate-500">
                  Keep learning materials attached to their matching course so learners can find them effortlessly.
                </p>
              </div>
            </div>

            {/* Tutor Checklist */}
            <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.02)] backdrop-blur-xl sm:p-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Tutor Checklist
                </h2>

                <Bell size={14} className="text-slate-400" />
              </div>

              <div className="space-y-2.5">
                <div className="flex items-start gap-2.5 rounded-xl border border-slate-200/60 bg-slate-50/30 p-3">
                  <CheckCircle2
                    size={15}
                    className="mt-0.5 shrink-0 text-indigo-600"
                  />

                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-slate-700">
                      Course Details
                    </h3>
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                      Keep course titles and levels accurate.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-slate-200/60 bg-slate-50/30 p-3">
                  <CheckCircle2
                    size={15}
                    className="mt-0.5 shrink-0 text-indigo-600"
                  />

                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-slate-700">
                      Learning Resources
                    </h3>
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                      {materialsCount} resources linked to your workspace.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 rounded-xl border border-slate-200/60 bg-slate-50/30 p-3">
                  <CheckCircle2
                    size={15}
                    className="mt-0.5 shrink-0 text-indigo-600"
                  />

                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-slate-700">
                      Community Updates
                    </h3>
                    <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                      Share timely notes with your learners.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Indigo Notice Card */}
            <div className="relative overflow-hidden rounded-3xl border border-indigo-500/30 bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 p-5 text-white shadow-sm shadow-indigo-600/20">
              <div className="pointer-events-none absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10 blur-xl" />

              <div className="relative">
                <div className="mb-3 flex items-center justify-between">
                  <span className="rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-white">
                    Community Scope
                  </span>

                  <Bell size={14} className="text-indigo-200" />
                </div>

                <h3 className="text-sm font-semibold">
                  Stay Connected
                </h3>

                <p className="mt-1.5 text-xs leading-5 text-indigo-100">
                  Manage courses, share notes, and keep community learners aligned from one clean hub.
                </p>

                <div className="mt-4 flex items-center gap-1.5 border-t border-white/15 pt-3 text-[11px] font-medium text-indigo-100">
                  <ShieldCheck size={13} />
                  LectCore Community Portal
                </div>
              </div>
            </div>

          </div>
        </section>
      </div>
    </div>
  );
};

export default ComTutorDashboard;