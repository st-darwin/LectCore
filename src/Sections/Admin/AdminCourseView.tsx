import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Filter, 
  MoreVertical, 
  Layers, 
  FileText, 
  Calendar, 
  Loader2, 
  AlertCircle, 
  Edit3, 
  Trash2, 
  ChevronDown,
  TrendingUp,
  CheckCircle2,
  Eye
} from 'lucide-react';
import { Query } from 'appwrite';
import { databases, appwriteConfig } from '../../appwrite/Client';
import AdminHeader from '../../Components/AdminHeader';

interface CourseDocument {
  $id: string;
  courseTitle: string;
  courseCode: string;
  university: string;
  lecturerId: string;
  department: string;
  level: string;
  $createdAt: string;
  materialsCount?: number;
}

const AdminCourseView: React.FC = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseDocument[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  
  // State for row action dropdowns
  const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!(event.target as HTMLElement).closest('.dropdown-container')) {
        setOpenDropdownId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      // Fetch courses and course materials concurrently
      const [coursesResponse, materialsResponse] = await Promise.all([
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseId,
          [Query.orderDesc('$createdAt')]
        ),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseMaterialsId,
          [Query.limit(1000)]
        )
      ]);

      // Count materials per courseId
      const materialCounts: Record<string, number> = {};
      materialsResponse.documents.forEach((mat: any) => {
        const cId = mat.courseId;
        if (cId) {
          materialCounts[cId] = (materialCounts[cId] || 0) + 1;
        }
      });

      const mappedCourses: CourseDocument[] = coursesResponse.documents.map((doc: any) => ({
        $id: doc.$id,
        courseTitle: doc.courseTitle || '',
        courseCode: doc.courseCode || '',
        university: doc.university || '',
        lecturerId: doc.lecturerId || '',
        department: doc.department || 'General',
        level: doc.level || '100L',
        $createdAt: doc.$createdAt,
        materialsCount: materialCounts[doc.$id] || 0,
      }));

      setCourses(mappedCourses);
    } catch (error) {
      console.error('Error fetching courses from Appwrite:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!window.confirm('Are you sure you want to delete this course? All associated materials might be affected.')) {
      return;
    }

    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.courseId,
        courseId
      );
      setCourses(prev => prev.filter(c => c.$id !== courseId));
      setOpenDropdownId(null);
    } catch (error) {
      console.error('Error deleting course:', error);
      alert('Failed to delete course. Please try again.');
    }
  };

  const handleEditCourse = (courseId: string) => {
    navigate(`/admin/courses/edit/${courseId}`);
  };

  const handleViewMaterials = (courseId: string) => {
    navigate(`/admin/courses/${courseId}/materials`);
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = course.courseTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.courseCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          course.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDept = departmentFilter === 'all' || course.department.toLowerCase() === departmentFilter.toLowerCase();
    return matchesSearch && matchesDept;
  });

  const departments = Array.from(new Set(courses.map(c => c.department))).filter(Boolean);
  const totalCourses = courses.length;
  const currentMonthCourses = courses.filter(c => new Date(c.$createdAt).getMonth() === new Date().getMonth()).length;

  return (
    <div className="space-y-6 pb-12">
      <AdminHeader 
        title="Course Management"
        description="Monitor curriculum catalogs, departmental allocations, academic levels, and active modules."
        ctaText="Create New Course"
        ctaIcon={<Plus className="w-4 h-4" />}
        ctaUrl="/admin/courses/new"
        icon={<BookOpen className="w-6 h-6" />}
        badgeText="Curriculum Center"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-lg shadow-slate-950/5 flex items-center justify-between group hover:border-indigo-300 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Courses</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCourses}</h3>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 mt-2 bg-emerald-50/80 px-2.5 py-0.5 rounded-full border border-emerald-100/50">
              <TrendingUp className="w-3 h-3" /> Active Catalog
            </span>
          </div>
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner border border-indigo-100/60 group-hover:scale-105 transition-transform">
            <BookOpen className="w-5 h-5" />
          </div>
        </div>

        <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-lg shadow-slate-950/5 flex items-center justify-between group hover:border-emerald-300 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Added This Month</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{currentMonthCourses}</h3>
            <span className="text-xs font-medium text-slate-500 mt-2 block">
              New curriculum entries
            </span>
          </div>
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shadow-inner border border-emerald-100/60 group-hover:scale-105 transition-transform">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-lg shadow-slate-950/5 flex items-center justify-between group hover:border-blue-300 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Departments</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{departments.length}</h3>
            <span className="text-xs font-medium text-slate-500 mt-2 block">
              Offering active programs
            </span>
          </div>
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-inner border border-blue-100/60 group-hover:scale-105 transition-transform">
            <FileText className="w-5 h-5" />
          </div>
        </div>

        <div className="relative overflow-hidden bg-white/90 backdrop-blur-xl border border-slate-200/80 p-5 rounded-3xl shadow-lg shadow-slate-950/5 flex items-center justify-between group hover:border-purple-300 hover:shadow-xl transition-all duration-300">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="relative z-10">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Database Sync</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">Live</h3>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-600 mt-2 bg-purple-50/80 px-2.5 py-0.5 rounded-full border border-purple-100/50">
              <CheckCircle2 className="w-3 h-3" /> Synced
            </span>
          </div>
          <div className="relative z-10 w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shadow-inner border border-purple-100/60 group-hover:scale-105 transition-transform">
            <Calendar className="w-5 h-5" />
          </div>
        </div>
      </div>

      <div className="bg-white/95 backdrop-blur-2xl border border-slate-200/80 rounded-3xl shadow-xl shadow-slate-950/5 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-50/40">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by title, code, department..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-slate-200/80 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all shadow-xs"
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <div className="relative w-full sm:w-48">
              <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none text-slate-400">
                <Filter className="w-4 h-4" />
              </div>
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full appearance-none bg-white border border-slate-200/80 text-slate-700 text-sm rounded-2xl pl-10 pr-10 py-3 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 shadow-xs transition-all font-medium cursor-pointer"
              >
                <option value="all">All Departments</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>
        </div>

        <div className="min-h-[300px] p-4 sm:p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-sm font-medium">Loading course catalog from Appwrite...</p>
            </div>
          ) : filteredCourses.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <AlertCircle className="w-8 h-8 text-slate-300 mb-3" />
              <p className="text-sm font-medium">No courses found matching your criteria.</p>
            </div>
          ) : (
            <>
              {/* MOBILE VIEW: Card Layout (< md) */}
              <div className="grid grid-cols-1 gap-3.5 md:hidden">
                {filteredCourses.map((course) => (
                  <div 
                    key={course.$id} 
                    className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm space-y-3 relative hover:border-indigo-200 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex-shrink-0">
                          {course.courseTitle ? course.courseTitle.charAt(0) : 'C'}
                        </div>
                        <div>
                          <h4 className="font-semibold text-slate-900 text-sm leading-snug">
                            {course.courseTitle || 'Untitled Course'}
                          </h4>
                          <span className="text-[11px] text-slate-400 block">
                            Created: {course.$createdAt ? new Date(course.$createdAt).toLocaleDateString() : 'N/A'}
                          </span>
                        </div>
                      </div>

                      {/* Dropdown Action for Mobile */}
                      <div className="relative dropdown-container flex-shrink-0">
                        <button 
                          onClick={() => setOpenDropdownId(openDropdownId === course.$id ? null : course.$id)}
                          className="w-8 h-8 rounded-xl bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center transition-all cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openDropdownId === course.$id && (
                          <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-white border border-slate-200/80 shadow-xl shadow-slate-950/10 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">    
                            <button  
                              onClick={() => {
                                setOpenDropdownId(null);
                                handleViewMaterials(course.$id);
                              }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
                            >
                              <Eye className="w-3.5 h-3.5" /> View Materials
                            </button>
                            <button  
                              onClick={() => {
                                setOpenDropdownId(null);
                                handleEditCourse(course.$id);
                              }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                            >
                              <Edit3 className="w-3.5 h-3.5" /> Edit Course
                            </button>
                            <button
                              onClick={() => {
                                setOpenDropdownId(null);
                                handleDeleteCourse(course.$id);
                              }}
                              className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5" /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Code</span>
                        <span className="font-semibold text-indigo-600 mt-0.5 inline-block bg-indigo-50/80 px-2 py-0.5 rounded-lg border border-indigo-100/50">
                          {course.courseCode || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-bold tracking-wider">Level</span>
                        <span className="font-semibold text-slate-700 mt-0.5 inline-block bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200/80">
                          {course.level}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider block">Department</span>
                        <span className="font-medium text-slate-700">{course.department}</span>
                      </div>
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold bg-blue-50/80 text-blue-700 border border-blue-100 shadow-xs">
                          <FileText className="w-3.5 h-3.5" />
                          {course.materialsCount ?? 0} files
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* DESKTOP VIEW: Traditional Table Layout (md+) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
                      <th className="py-4 px-6">Course Title</th>
                      <th className="py-4 px-6">Course Code</th>
                      <th className="py-4 px-6">Department</th>
                      <th className="py-4 px-6">Level</th>
                      <th className="py-4 px-6">Materials Uploaded</th>
                      <th className="py-4 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm">
                    {filteredCourses.map((course) => (
                      <tr key={course.$id} className="hover:bg-slate-50/60 transition-colors group">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3.5">
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-500/20 flex-shrink-0">
                              {course.courseTitle ? course.courseTitle.charAt(0) : 'C'}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 block leading-tight">{course.courseTitle || 'Untitled Course'}</span>
                              <span className="text-xs text-slate-400 block mt-0.5">Created: {course.$createdAt ? new Date(course.$createdAt).toLocaleDateString() : 'N/A'}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-6">
                          <span className="font-semibold text-indigo-600 block text-xs bg-indigo-50/80 px-2.5 py-1 rounded-xl w-fit border border-indigo-100/50 shadow-xs">
                            {course.courseCode || 'N/A'}
                          </span>
                        </td>

                        <td className="py-4 px-6 text-slate-700 text-xs font-medium">
                          {course.department}
                        </td>

                        <td className="py-4 px-6">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/80">
                            {course.level}
                          </span>
                        </td>

                        <td className="py-4 px-6">
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-semibold bg-blue-50/80 text-blue-700 border border-blue-100 shadow-xs">
                            <FileText className="w-3.5 h-3.5" />
                            {course.materialsCount ?? 0} files
                          </span>
                        </td>

                        <td className="py-4 px-6 text-right relative">
                          <div className="inline-block text-left dropdown-container">
                            <button 
                              onClick={() => setOpenDropdownId(openDropdownId === course.$id ? null : course.$id)}
                              className="w-9 h-9 rounded-2xl bg-slate-100/80 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 flex items-center justify-center transition-all ml-auto shadow-xs cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            {openDropdownId === course.$id && (
                              <div className="absolute right-0 mt-2 w-40 rounded-2xl bg-white border border-slate-200/80 shadow-xl shadow-slate-950/10 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">    
                                <button  
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    handleViewMaterials(course.$id);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors text-left"
                                >
                                  <Eye className="w-3.5 h-3.5" /> View Materials
                                </button>
                                <button  
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    handleEditCourse(course.$id);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 transition-colors text-left"
                                >
                                  <Edit3 className="w-3.5 h-3.5" /> Edit Course
                                </button>
                                <button
                                  onClick={() => {
                                    setOpenDropdownId(null);
                                    handleDeleteCourse(course.$id);
                                  }}
                                  className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors text-left"
                                >
                                  <Trash2 className="w-3.5 h-3.5" /> Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50/40 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-medium">
          <span>Showing <strong>{filteredCourses.length}</strong> of <strong>{totalCourses}</strong> total courses</span>
          <div className="flex items-center gap-2">
            <button className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-xs disabled:opacity-50" disabled>
              Previous
            </button>
            <button className="px-3.5 py-2 rounded-xl bg-white border border-slate-200/80 font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-xs">
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

AdminCourseView.displayName = 'AdminCourseView';

export default AdminCourseView;