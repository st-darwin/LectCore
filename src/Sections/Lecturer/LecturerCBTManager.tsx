import React, { useState, useEffect } from 'react';
import { 
  FileQuestion, 
  Plus, 
  Trash2, 
  Clock, 
  Loader2, 
  X, 
  Send,
  HelpCircle
} from 'lucide-react';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query, ID } from 'appwrite';
import AdminHeader from '../../Components/AdminHeader';

interface CBTTest {
  $id: string;
  title: string;
  courseId: string; // Course Code (e.g., CSC 201)
  durationMinutes: number;
  totalQuestions: number;
  createdBy: string;
  courseCode: string;
}

interface Course {
  $id: string;
  courseCode: string;
  courseTitle: string;
  lecturerId: string;
}

interface Question {
  $id?: string;
  courseId: string;
  courseCode: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

export default function LecturerCBTManager() {
  const [userId, setUserId] = useState<string>('');
  const [tests, setTests] = useState<CBTTest[]>([]);
  const [lecturerCourses, setLecturerCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modal States
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [activeTest, setActiveTest] = useState<CBTTest | null>(null);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);

  // Test Form States
  const [title, setTitle] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState(''); // Stores course $id
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [submittingTest, setSubmittingTest] = useState(false);

  // Question Form States
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState<number>(0);
  const [explanation, setExplanation] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  useEffect(() => {
    fetchLecturerData();
  }, []);

  const fetchLecturerData = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      setUserId(user.$id);

      const testsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.cbtTestId || 'cbt_tests',
        [Query.equal('createdBy', user.$id)]
      );
      setTests(testsRes.documents as unknown as CBTTest[]);

      const coursesRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.courseId || 'courses',
        [Query.equal('lecturerId', user.$id)]
      );
      setLecturerCourses(coursesRes.documents as unknown as Course[]);
      
      if (coursesRes.documents.length > 0) {
        setSelectedCourseId(coursesRes.documents[0].$id);
      }
    } catch (err) {
      console.error('Failed to load lecturer data & courses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCourse = lecturerCourses.find(c => c.$id === selectedCourseId);
    if (!title.trim() || !targetCourse || !userId) return;

    try {
      setSubmittingTest(true);
      const payload = {
        title: title.trim(),
        courseId: targetCourse.$id, // Store code for display & query
        courseCode: targetCourse.courseCode,
        durationMinutes: Number(durationMinutes),
        totalQuestions: 0,
        createdBy: userId,
      };

      const doc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.cbtTestId || 'cbt_tests',
        ID.unique(),
        payload
      );

      setTests(prev => [doc as unknown as CBTTest, ...prev]);
      setTitle('');
      setDurationMinutes(30);
      setIsTestModalOpen(false);
    } catch (err) {
      console.error('Failed to create CBT test:', err);
    } finally {
      setSubmittingTest(false);
    }
  };

  const openQuestionManager = async (test: CBTTest) => {
    setActiveTest(test);
    try {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.questionsId || 'questions',
        [Query.equal('courseId', test.courseId)]
      );
      setTestQuestions(res.documents as unknown as Question[]);
    } catch (err) {
      console.error('Failed to load questions:', err);
    }
    setIsQuestionModalOpen(true);
  };

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTest || !questionText.trim()) return;

    try {
      setSubmittingQuestion(true);
      const optionsArray = [optionA.trim(), optionB.trim(), optionC.trim(), optionD.trim()];

      const payload = {
        courseId: activeTest.courseId,
        courseCode: activeTest.courseCode,
        questionText: questionText.trim(),
        options: optionsArray,
        correctAnswerIndex: Number(correctAnswerIndex),
        explanation: explanation.trim(),
      };

      const doc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.questionsId || 'questions',
        ID.unique(),
        payload
      );

      setTestQuestions(prev => [...prev, doc as unknown as Question]);

      const newTotal = testQuestions.length + 1;
      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.cbtTestId || 'cbt_tests',
        activeTest.$id,
        { totalQuestions: newTotal }
      );

      setTests(prev => prev.map(t => t.$id === activeTest.$id ? { ...t, totalQuestions: newTotal } : t));

      setQuestionText('');
      setOptionA('');
      setOptionB('');
      setOptionC('');
      setOptionD('');
      setExplanation('');
      setCorrectAnswerIndex(0);
    } catch (err) {
      console.error('Failed to add question:', err);
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!activeTest) return;
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.questionsId || 'questions',
        questionId
      );
      const updated = testQuestions.filter(q => q.$id !== questionId);
      setTestQuestions(updated);

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.cbtTestId || 'cbt_tests',
        activeTest.$id,
        { totalQuestions: updated.length }
      );
      setTests(prev => prev.map(t => t.$id === activeTest.$id ? { ...t, totalQuestions: updated.length } : t));
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  // Fixed Broadcast Function: Searches enrollments by courseCode OR course $id
  const handleBroadcastTest = async (test: CBTTest) => {
    try {
      // 1. Find the course document to get both its $id and courseCode
      const courseObj = lecturerCourses.find(c => c.courseCode === test.courseId);
      
      const searchTargets = courseObj ? [test.courseId, courseObj.$id] : [test.courseId];

      // 2. Query enrollments by courseId (matching either courseCode or course document $id)
      const enrollmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId || 'enrollments',
        [Query.equal('courseId', searchTargets)]
      );

      if (enrollmentsRes.documents.length === 0) {
        alert(`Test saved, but no students are currently enrolled in ${test.courseId}.`);
        return;
      }

      // 3. Dispatch notifications to all enrolled students
      const notificationPromises = enrollmentsRes.documents.map((enrollment: any) => 
        databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.notificationsId || 'notifications',
          ID.unique(),
          {
            userId: enrollment.studentId,
            title: `New CBT Practice: ${test.courseId}`,
            message: `Your lecturer published a new CBT practice test "${test.title}" (${test.durationMinutes} mins).`,
            type: 'CBT',
            relatedId: test.$id,
            isRead: false,
          }
        )
      );

      await Promise.all(notificationPromises);
      alert(`Success! CBT test broadcasted to ${enrollmentsRes.documents.length} enrolled student(s).`);
    } catch (err) {
      console.error('Failed to broadcast CBT notification:', err);
      alert('Error broadcasting notifications to students.');
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 pb-16 px-4 sm:px-6">
        <AdminHeader 
          title="CBT Test Manager"
          description="Create practice tests for your courses and manage question banks."
          icon={<FileQuestion className="w-5 h-5 text-indigo-600" />}
          badgeText="Faculty CBT"
        />
        <div className="flex items-center justify-center py-32 bg-white rounded-3xl border border-indigo-50 shadow-2xs">
          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20 px-3 sm:px-6 animate-in fade-in duration-300">
      
      <AdminHeader 
        title="CBT Test Manager"
        description="Create practice tests for your courses and manage question banks."
        icon={<FileQuestion className="w-5 h-5 text-indigo-600" />}
        badgeText="Faculty CBT"
      />

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100/70 shadow-2xs">
        <div className="text-xs font-semibold text-indigo-900">
          Your Courses: <span className="text-indigo-600 font-bold">{lecturerCourses.length}</span> | Total Tests: <span className="text-indigo-600 font-bold">{tests.length}</span>
        </div>
        <button
          onClick={() => {
            if (lecturerCourses.length === 0) {
              alert('You must create a course first before creating a CBT test.');
              return;
            }
            setIsTestModalOpen(true);
          }}
          className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Plus size={15} />
          <span>Create New Test</span>
        </button>
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tests.length === 0 ? (
          <div className="col-span-full text-center py-16 px-4 bg-indigo-50/20 rounded-3xl border border-dashed border-indigo-100 space-y-2">
            <HelpCircle size={28} className="mx-auto text-indigo-300" />
            <p className="text-xs font-semibold text-slate-700">No CBT tests created yet</p>
            <p className="text-[11px] text-slate-400">Click "Create New Test" to set up an assessment for your courses.</p>
          </div>
        ) : (
          tests.map((test) => (
            <div key={test.$id} className="p-5 rounded-3xl bg-white border border-indigo-100 shadow-2xs space-y-4 flex flex-col justify-between">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase border border-indigo-200/60 truncate">
                    {test.courseCode}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 shrink-0">
                    <Clock size={13} className="text-indigo-400" />
                    {test.durationMinutes} mins
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{test.title}</h3>
                <p className="text-xs text-slate-500">{test.totalQuestions} Questions configured</p>
              </div>

              <div className="pt-3 border-t border-indigo-50 flex items-center gap-2">
                <button
                  onClick={() => openQuestionManager(test)}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-indigo-50 hover:bg-indigo-100/70 text-indigo-700 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <FileQuestion size={14} />
                  <span>Questions</span>
                </button>
                <button
                  onClick={() => handleBroadcastTest(test)}
                  className="flex-1 px-3 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
                  title="Notify enrolled students"
                >
                  <Send size={13} />
                  <span>Broadcast</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Test Modal */}
      {isTestModalOpen && (
        <div className="fixed inset-0 z-50 bg-indigo-950/30 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-indigo-100 w-full max-w-md p-5 sm:p-6 space-y-4 shadow-xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
              <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Create CBT Test</h3>
              <button onClick={() => setIsTestModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-indigo-50 cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreateTest} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Test Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Practice Quiz"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-indigo-50/20 border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Select Course *</label>
                <select
                  required
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-indigo-50/20 border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  {lecturerCourses.map((course) => (
                    <option key={course.$id} value={course.$id}>
                      {course.courseCode} - {course.courseTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Duration (Minutes)</label>
                <input
                  type="number"
                  min={5}
                  max={180}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-indigo-50/20 border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button type="button" onClick={() => setIsTestModalOpen(false)} className="px-4 py-2 text-xs font-medium text-slate-500 cursor-pointer">Cancel</button>
                <button type="submit" disabled={submittingTest} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs">
                  {submittingTest && <Loader2 size={13} className="animate-spin" />}
                  <span>Save Test</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Manager Modal */}
      {isQuestionModalOpen && activeTest && (
        <div className="fixed inset-0 z-50 bg-indigo-950/30 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl border border-indigo-100 w-full max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-indigo-50 pb-3 sticky top-0 bg-white z-10">
              <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider truncate pr-2">
                Manage Questions: {activeTest.courseId} ({testQuestions.length})
              </h3>
              <button onClick={() => setIsQuestionModalOpen(false)} className="p-1.5 rounded-xl text-slate-400 hover:bg-indigo-50 cursor-pointer shrink-0">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddQuestion} className="space-y-3.5 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/70">
              <h4 className="text-xs font-bold text-indigo-900">Add New Question</h4>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Question Prompt *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Enter question text..."
                  value={questionText}
                  onChange={(e) => setQuestionText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 resize-none shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input type="text" required placeholder="Option A" value={optionA} onChange={(e) => setOptionA(e.target.value)} className="px-3.5 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs shadow-2xs" />
                <input type="text" required placeholder="Option B" value={optionB} onChange={(e) => setOptionB(e.target.value)} className="px-3.5 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs shadow-2xs" />
                <input type="text" required placeholder="Option C" value={optionC} onChange={(e) => setOptionC(e.target.value)} className="px-3.5 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs shadow-2xs" />
                <input type="text" required placeholder="Option D" value={optionD} onChange={(e) => setOptionD(e.target.value)} className="px-3.5 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs shadow-2xs" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Correct Answer</label>
                  <select
                    value={correctAnswerIndex}
                    onChange={(e) => setCorrectAnswerIndex(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs text-slate-700 shadow-2xs"
                  >
                    <option value={0}>Option A</option>
                    <option value={1}>Option B</option>
                    <option value={2}>Option C</option>
                    <option value={3}>Option D</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Explanation (Optional)</label>
                  <input type="text" placeholder="Why is this correct?" value={explanation} onChange={(e) => setExplanation(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs shadow-2xs" />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button type="submit" disabled={submittingQuestion} className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer">
                  {submittingQuestion && <Loader2 size={13} className="animate-spin" />}
                  <Plus size={14} />
                  <span>Add Question</span>
                </button>
              </div>
            </form>

            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-bold text-slate-700">Existing Questions</h4>
              {testQuestions.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No questions added to this course yet.</p>
              ) : (
                testQuestions.map((q, idx) => {
                  const opts = Array.isArray(q.options) ? q.options : [];
                  return (
                    <div key={q.$id} className="p-4 rounded-2xl bg-indigo-50/20 border border-indigo-100 flex items-start justify-between gap-3 shadow-2xs">
                      <div className="space-y-1.5 text-xs flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 break-words">Q{idx + 1}: {q.questionText}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-500 text-[11px] pt-1">
                          {opts.map((opt: string, i: number) => (
                            <span key={i} className={`truncate ${i === q.correctAnswerIndex ? 'text-emerald-700 font-bold' : ''}`}>
                              {String.fromCharCode(65 + i)}. {opt}
                            </span>
                          ))}
                        </div>
                      </div>
                      <button onClick={() => q.$id && handleDeleteQuestion(q.$id)} className="p-2 text-slate-400 hover:text-rose-600 transition-all cursor-pointer shrink-0">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}