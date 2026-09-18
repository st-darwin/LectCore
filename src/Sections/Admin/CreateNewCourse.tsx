import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  BookPlus, 
  BookOpen, 
  Loader2, 
  CheckCircle2,
  ShieldCheck,
  GraduationCap
} from 'lucide-react';
import { databases, account, appwriteConfig } from '../../appwrite/Client';
import AdminHeader from '../../Components/AdminHeader';

const CreateNewCourse: React.FC = () => {
  const navigate = useNavigate();

  // Form states matching your schema columns
  const [courseCode, setCourseCode] = useState<string>('');
  const [courseTitle, setCourseTitle] = useState<string>('');
  const [university, setUniversity] = useState<string>('Mountain Top University');
  const [department, setDepartment] = useState<string>('');
  const [level, setLevel] = useState<string>('100L');
  
  // Lecturer state management
  const [lecturerId, setLecturerId] = useState<string>('');
  const [lecturerName, setLecturerName] = useState<string>('');
  const [loadingUser, setLoadingUser] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // Available levels configuration
  const academicLevels = [
    { id: '100', label: '100 Level', desc: 'Freshman' },
    { id: '200', label: '200 Level', desc: 'Sophomore' },
    { id: '300', label: '300 Level', desc: 'Junior' },
    { id: '400', label: '400 Level', desc: 'Senior' },
    { id: '500', label: '500 Level', desc: 'Final Year / Engineering' },
  ];

  // Fetch current authenticated user profile on component mount
  useEffect(() => {
    const fetchCurrentLecturer = async () => {
      try {
        const user = await account.get();
        setLecturerId(user.$id);
        setLecturerName(user.name || user.email || 'Authenticated Lecturer');
      } catch (error) {
        console.error('Error fetching account session:', error);
        alert('You must be logged in as an administrator/lecturer to create a course.');
        navigate('/login');
      } finally {
        setLoadingUser(false);
      }
    };

    fetchCurrentLecturer();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!courseCode.trim() || !courseTitle.trim() || !university.trim() || !department.trim()) {
      alert('Please fill out all required fields.');
      return;
    }

    if (!lecturerId) {
      alert('Lecturer session ID is missing. Please try refreshing or logging back in.');
      return;
    }

    try {
      setSubmitting(true);

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        'unique()',
        {
          courseCode: courseCode.trim().toUpperCase(),
          courseTitle: courseTitle.trim(),
          university: university.trim(),
          lecturerId: lecturerId,
          department: department.trim(),
          level: level,
        }
      );

      navigate('/admin/courses');
    } catch (error) {
      console.error('Error creating course:', error);
      alert('Failed to create course. Please check your console for details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-16 pt-2">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/admin/courses')}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-xs cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Courses
        </button>
      </div>

      <AdminHeader 
        title="Create New Course"
        description="Add a new academic course to the system database."
        icon={<BookPlus className="w-6 h-6" />}
        badgeText="Course Manager"
      />

      {/* Form Card */}
      <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-2xl sm:rounded-3xl shadow-xl shadow-slate-950/5 overflow-hidden">
        <div className="p-5 sm:p-8 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl sm:rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shadow-xs shrink-0">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm sm:text-base">Course Information</h3>
              <p className="text-xs text-slate-400">Fill out all required details for this course</p>
            </div>
          </div>

          {/* Authenticated Badge / User Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{loadingUser ? 'Verifying session...' : `Creator: ${lecturerName}`}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-8 space-y-5 sm:space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            {/* Course Code */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Course Code <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                placeholder="e.g., CSC201"
                value={courseCode}
                onChange={(e) => setCourseCode(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs uppercase"
              />
            </div>

            {/* Department */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Department <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                placeholder="e.g., Computer Science"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
              />
            </div>
          </div>

          {/* Course Title */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
              Course Title <span className="text-rose-500">*</span>
            </label>
            <input 
              type="text"
              placeholder="e.g., Data Structures & Algorithms"
              value={courseTitle}
              onChange={(e) => setCourseTitle(e.target.value)}
              required
              className="w-full px-4 py-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
            />
          </div>

          {/* Modern Custom Academic Level Selector Grid */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Academic Level <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-indigo-600 font-medium inline-flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5" /> Select target tier
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {academicLevels.map((lvl) => {
                const isSelected = level === lvl.id;
                return (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setLevel(lvl.id)}
                    className={`flex flex-col items-center justify-center p-3 rounded-xl border text-left transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-indigo-50/80 border-indigo-500 text-indigo-900 shadow-sm ring-2 ring-indigo-500/20'
                        : 'bg-white border-slate-200/80 text-slate-600 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
                  >
                    <span className={`text-xs font-bold ${isSelected ? 'text-indigo-600' : 'text-slate-800'}`}>
                      {lvl.id}
                    </span>
                    <span className="text-[10px] text-slate-400 mt-0.5 font-normal truncate max-w-full">
                      {lvl.desc}
                    </span>
                    {isSelected && (
                      <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            {/* University */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                University <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                placeholder="e.g., Mountain Top University"
                value={university}
                onChange={(e) => setUniversity(e.target.value)}
                required
                className="w-full px-4 py-3.5 rounded-xl sm:rounded-2xl bg-white border border-slate-200/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
              />
            </div>

            {/* Auto-assigned Lecturer Info Display (Read-Only) */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                Lecturer Id  <span className="text-emerald-500 text-[10px] lowercase"></span>
              </label>
              <div className="w-full px-4 py-3.5 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-600 flex items-center justify-between  shadow-inner">
                <span className="truncate">{loadingUser ? 'Loading account ID...' : lecturerId || 'No active session'}</span>
                <span className="shrink-0 ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                  synced
                </span>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-5 sm:pt-6 border-t border-slate-100 flex flex-col-reverse sm:flex-row items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/admin/courses')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-all shadow-xs cursor-pointer text-center"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingUser}
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-all shadow-md shadow-indigo-600/20 inline-flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Creating Course...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Save Course
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

CreateNewCourse.displayName = 'CreateNewCourse';

export default CreateNewCourse;