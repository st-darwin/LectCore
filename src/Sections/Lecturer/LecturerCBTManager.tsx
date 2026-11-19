import React, { useState, useEffect, useMemo } from 'react';
import {
  FileQuestion,
  Plus,
  Trash2,
  Clock,
  Loader2,
  X,
  Send,
  HelpCircle,
  Users,
  Download,
  Search,
  Building2,
  Globe
} from 'lucide-react';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query, ID } from 'appwrite';
import AdminHeader from '../../Components/AdminHeader';

type AccessScope = 'institution' | 'community';

interface CBTTest {
  $id: string;
  title: string;
  courseId: string;
  courseCode: string;
  durationMinutes: number;
  totalQuestions: number;
  createdBy: string;
  testType: 'practice' | 'test';
  accessScope?: AccessScope;
  university?: string;
  $createdAt?: string;
}

interface Course {
  $id: string;
  courseCode: string;
  courseTitle: string;
  lecturerId: string;
  accessScope?: AccessScope;
  university?: string;
}

interface Question {
  $id?: string;
  testId: string;
  courseId: string;
  courseCode: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
  $createdAt?: string;
}

interface CBTResult {
  $id: string;
  studentId: string;
  testId: string;
  score: number;
  totalQuestions: number;
  percentage: number;
  submittedAt: string;
  timeSpentSeconds?: number;
  studentName?: string;
  matricNumber?: string;
  $createdAt?: string;
}

interface UserProfile {
  userId: string;
  university?: string;
  name?: string;
  campusId?: string;
}

const getTimestamp = (date?: string) => {
  if (!date) return 0;

  const timestamp = new Date(date).getTime();

  return Number.isNaN(timestamp) ? 0 : timestamp;
};

export default function LecturerCBTManager() {
  const [userId, setUserId] = useState('');
  const [university, setUniversity] = useState('');

  const [tests, setTests] = useState<CBTTest[]>([]);
  const [lecturerCourses, setLecturerCourses] = useState<Course[]>([]);

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [activeTab, setActiveTab] = useState<'test' | 'practice'>('test');
  const [activeScope, setActiveScope] = useState<AccessScope>('institution');

  // Modal States
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false);
  const [isResultsModalOpen, setIsResultsModalOpen] = useState(false);

  const [activeTest, setActiveTest] = useState<CBTTest | null>(null);
  const [testQuestions, setTestQuestions] = useState<Question[]>([]);
  const [testResults, setTestResults] = useState<CBTResult[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // Test Form States
  const [title, setTitle] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [testType, setTestType] = useState<'practice' | 'test'>('test');
  const [submittingTest, setSubmittingTest] = useState(false);

  // Question Form States
  const [questionText, setQuestionText] = useState('');
  const [optionA, setOptionA] = useState('');
  const [optionB, setOptionB] = useState('');
  const [optionC, setOptionC] = useState('');
  const [optionD, setOptionD] = useState('');
  const [correctAnswerIndex, setCorrectAnswerIndex] = useState(0);
  const [explanation, setExplanation] = useState('');
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  useEffect(() => {
    fetchLecturerData();
  }, []);

  // Fetch lecturer profile, courses and assessments
  const fetchLecturerData = async () => {
    try {
      setLoading(true);

      const user = await account.get();
      setUserId(user.$id);

      let lecturerUniversity = '';

      // Get lecturer university from users collection
      try {
        const profileRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId || 'users',
          [
            Query.equal('userId', user.$id),
            Query.limit(1)
          ]
        );

        const profile = profileRes.documents[0] as unknown as UserProfile | undefined;

        lecturerUniversity = profile?.university || '';
      } catch (profileErr) {
        console.warn('Could not load lecturer university:', profileErr);
      }

      setUniversity(lecturerUniversity);

      const [testsRes, coursesRes] = await Promise.all([
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.cbtTestId || 'cbt_tests',
          [
            Query.equal('createdBy', user.$id),
            Query.orderDesc('$createdAt'),
            Query.limit(100)
          ]
        ),

        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseId || 'courses',
          [
            Query.equal('lecturerId', user.$id),
            Query.limit(100)
          ]
        )
      ]);

      const loadedTests = testsRes.documents as unknown as CBTTest[];
      const loadedCourses = coursesRes.documents as unknown as Course[];

      setTests(
        [...loadedTests].sort(
          (a, b) => getTimestamp(b.$createdAt) - getTimestamp(a.$createdAt)
        )
      );

      setLecturerCourses(loadedCourses);

      if (loadedCourses.length > 0) {
        setSelectedCourseId(loadedCourses[0].$id);
      }
    } catch (err) {
      console.error('Failed to load lecturer data and courses:', err);
    } finally {
      setLoading(false);
    }
  };

  // Automatically get the scope from the selected course
  const getCourseScope = (course: Course): AccessScope => {
    return course.accessScope === 'community' ? 'community' : 'institution';
  };

  // Create CBT assessment
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetCourse = lecturerCourses.find(
      course => course.$id === selectedCourseId
    );

    if (!title.trim() || !targetCourse || !userId) {
      alert('Please complete all required fields and select a course.');
      return;
    }

    // The CBT inherits the selected course's access scope
    const courseScope = getCourseScope(targetCourse);

    try {
      setSubmittingTest(true);

      const payload = {
        title: title.trim(),
        courseId: targetCourse.$id,
        courseCode: targetCourse.courseCode,
        durationMinutes: Number(durationMinutes),
        totalQuestions: 0,
        createdBy: userId,
        testType,
        accessScope: courseScope,
        university: university || targetCourse.university || ''
      };

      const doc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.cbtTestId || 'cbt_tests',
        ID.unique(),
        payload
      );

      const newTest = doc as unknown as CBTTest;

      setTests(prev =>
        [newTest, ...prev].sort(
          (a, b) => getTimestamp(b.$createdAt) - getTimestamp(a.$createdAt)
        )
      );

      setTitle('');
      setDurationMinutes(30);
      setTestType('test');
      setSelectedCourseId(targetCourse.$id);
      setIsTestModalOpen(false);

    
    } catch (err) {
      console.error('Failed to create CBT test:', err);
      alert(
        'Could not create the assessment. Check that the CBT collection has the required attributes.'
      );
    } finally {
      setSubmittingTest(false);
    }
  };

  // Question Manager
  const openQuestionManager = async (test: CBTTest) => {
    setActiveTest(test);

    try {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.questionsId || 'questions',
        [
          Query.equal('testId', test.$id),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      );

      const questions = res.documents as unknown as Question[];

      setTestQuestions(
        [...questions].sort(
          (a, b) => getTimestamp(b.$createdAt) - getTimestamp(a.$createdAt)
        )
      );
    } catch (err) {
      console.error('Failed to load questions:', err);
      setTestQuestions([]);
    }

    setIsQuestionModalOpen(true);
  };

  // Results Manager
  const openResultsManager = async (test: CBTTest) => {
    setActiveTest(test);
    setIsResultsModalOpen(true);
    setLoadingResults(true);
    setTestResults([]);

    try {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.cbtResultId || 'cbt_results',
        [
          Query.equal('testId', test.$id),
          Query.orderDesc('$createdAt'),
          Query.limit(100)
        ]
      );

      const rawResults = res.documents;

      if (rawResults.length === 0) {
        setTestResults([]);
        return;
      }

      const studentIds = Array.from(
        new Set(
          rawResults
            .map((result: any) => result.studentId)
            .filter(Boolean)
        )
      );

      const userMap: Record<string, { name: string; campusId: string }> = {};

      if (studentIds.length > 0) {
        try {
          const usersRes = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId || 'users',
            [
              Query.equal('userId', studentIds),
              Query.limit(100)
            ]
          );

          usersRes.documents.forEach((user: any) => {
            userMap[user.userId] = {
              name: user.name || 'Unknown Student',
              campusId: user.campusId || 'MTU/24/XXXX'
            };
          });
        } catch (userErr) {
          console.warn('Could not fetch student profiles:', userErr);
        }
      }

      const resultsData: CBTResult[] = rawResults.map((doc: any) => {
        const studentInfo = userMap[doc.studentId];

        return {
          $id: doc.$id,
          studentId: doc.studentId,
          testId: doc.testId,
          score: doc.score,
          totalQuestions: doc.totalQuestions,
          percentage: doc.percentage,
          submittedAt: doc.submittedAt,
          timeSpentSeconds: doc.timeSpentSeconds || 0,
          studentName:
            studentInfo?.name || doc.studentName || 'Enrolled Student',
          matricNumber:
            studentInfo?.campusId || doc.matricNumber || 'MTU/24/XXXX',
          $createdAt: doc.$createdAt
        };
      });

      setTestResults(
        [...resultsData].sort((a, b) => {
          const dateA = getTimestamp(a.submittedAt || a.$createdAt);
          const dateB = getTimestamp(b.submittedAt || b.$createdAt);

          return dateB - dateA;
        })
      );
    } catch (err) {
      console.error('Failed to load test results:', err);
    } finally {
      setLoadingResults(false);
    }
  };

  // Add Question
  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activeTest || !questionText.trim()) return;

    try {
      setSubmittingQuestion(true);

      const optionsArray = [
        optionA.trim(),
        optionB.trim(),
        optionC.trim(),
        optionD.trim()
      ];

      const payload = {
        testId: activeTest.$id,
        courseId: activeTest.courseId,
        courseCode: activeTest.courseCode,
        questionText: questionText.trim(),
        options: optionsArray,
        correctAnswerIndex: Number(correctAnswerIndex),
        explanation: explanation.trim()
      };

      const doc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.questionsId || 'questions',
        ID.unique(),
        payload
      );

      const newQuestion = doc as unknown as Question;

      setTestQuestions(prev =>
        [newQuestion, ...prev].sort(
          (a, b) => getTimestamp(b.$createdAt) - getTimestamp(a.$createdAt)
        )
      );

      const newTotal = testQuestions.length + 1;

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.cbtTestId || 'cbt_tests',
        activeTest.$id,
        { totalQuestions: newTotal }
      );

      setTests(prev =>
        prev.map(test =>
          test.$id === activeTest.$id
            ? { ...test, totalQuestions: newTotal }
            : test
        )
      );

      setActiveTest(prev =>
        prev ? { ...prev, totalQuestions: newTotal } : prev
      );

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

  // Delete Question
  const handleDeleteQuestion = async (questionId: string) => {
    if (!activeTest) return;

    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.questionsId || 'questions',
        questionId
      );

      const updated = testQuestions.filter(
        question => question.$id !== questionId
      );

      setTestQuestions(updated);

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.cbtTestId || 'cbt_tests',
        activeTest.$id,
        { totalQuestions: updated.length }
      );

      setTests(prev =>
        prev.map(test =>
          test.$id === activeTest.$id
            ? { ...test, totalQuestions: updated.length }
            : test
        )
      );

      setActiveTest(prev =>
        prev ? { ...prev, totalQuestions: updated.length } : prev
      );
    } catch (err) {
      console.error('Failed to delete question:', err);
    }
  };

  // Broadcast Assessment
  const handleBroadcastTest = async (test: CBTTest) => {
    try {
      const courseObj = lecturerCourses.find(
        course =>
          course.courseCode === test.courseCode ||
          course.$id === test.courseId
      );

      const searchTargets = courseObj
        ? [test.courseId, test.courseCode, courseObj.$id]
        : [test.courseId, test.courseCode];

      const enrollmentsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId || 'enrollments',
        [
          Query.equal('courseId', searchTargets),
          Query.limit(100)
        ]
      );

      if (enrollmentsRes.documents.length === 0) {
        alert('Test saved, but no students are currently enrolled in this course.');
        return;
      }

      const notificationPromises = enrollmentsRes.documents.map(
        (enrollment: any) =>
          databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.notificationsId || 'notifications',
            ID.unique(),
            {
              userId: enrollment.studentId,
              title: `New CBT ${
                test.testType === 'practice' ? 'Practice' : 'Test'
              }: ${test.courseCode || 'Course'}`,
              message: `Your lecturer published a new assessment "${test.title}" (${test.durationMinutes} mins).`,
              type: 'CBT',
              relatedId: test.$id,
              isRead: false
            }
          )
      );

      await Promise.all(notificationPromises);

      alert(
        `Success! Assessment broadcasted to ${enrollmentsRes.documents.length} enrolled student(s).`
      );
    } catch (err) {
      console.error('Failed to broadcast CBT notification:', err);
      alert('Error broadcasting notifications to students.');
    }
  };

  // Export Results
  const exportResultsCSV = () => {
    if (testResults.length === 0) {
      alert('No results available to export.');
      return;
    }

    const escapeCSV = (value: unknown) =>
      `"${String(value ?? '').replace(/"/g, '""')}"`;

    const headers =
      'Student Name,Matric Number,Score,Total,Percentage (%),Submitted At\n';

    const rows = testResults.map(result =>
      [
        escapeCSV(result.studentName),
        escapeCSV(result.matricNumber),
        result.score,
        result.totalQuestions,
        `${result.percentage}%`,
        escapeCSV(
          result.submittedAt
            ? new Date(result.submittedAt).toLocaleString()
            : ''
        )
      ].join(',')
    );

    const blob = new Blob([headers, ...rows.map(row => `${row}\n`)], {
      type: 'text/csv;charset=utf-8;'
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `${activeTest?.courseCode || 'CBT'}_results.csv`;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  };

  // Scope + type + search filtering, newest first
  const filteredTests = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    return tests
      .filter(test => {
        const isPracticeTest = test.testType === 'practice';

        const matchesTab =
          activeTab === 'practice' ? isPracticeTest : !isPracticeTest;

        const matchesScope =
          activeScope === 'community'
            ? test.accessScope === 'community'
            : test.accessScope !== 'community' &&
              (!university ||
                test.university?.toLowerCase() === university.toLowerCase());

        const matchesSearch =
          !query ||
          test.title?.toLowerCase().includes(query) ||
          test.courseCode?.toLowerCase().includes(query);

        return matchesTab && matchesScope && matchesSearch;
      })
      .sort(
        (a, b) =>
          getTimestamp(b.$createdAt) - getTimestamp(a.$createdAt)
      );
  }, [tests, activeTab, activeScope, searchQuery, university]);

  const selectedCourse = lecturerCourses.find(
    course => course.$id === selectedCourseId
  );

  const selectedCourseScope = selectedCourse
    ? getCourseScope(selectedCourse)
    : null;

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-5 pb-16 px-4 sm:px-6">
        <AdminHeader
          title="CBT Test Manager"
          description="Create practice tests or formal exams and manage question banks."
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
        description="Create practice tests or formal exams and manage question banks."
        icon={<FileQuestion className="w-5 h-5 text-indigo-600" />}
        badgeText="Faculty CBT"
      />

      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100/70 shadow-2xs">
        <div className="text-xs font-semibold text-indigo-900">
          Your Courses:{' '}
          <span className="text-indigo-600 font-bold">
            {lecturerCourses.length}
          </span>{' '}
          | Total Assessments:{' '}
          <span className="text-indigo-600 font-bold">{tests.length}</span>
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
          <span>Create Assessment</span>
        </button>
      </div>

      {/* Access Scope Tabs */}
      <div className="flex items-center gap-1 bg-white p-2 rounded-2xl border border-slate-100 shadow-xs">
        <button
          onClick={() => setActiveScope('institution')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeScope === 'institution'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Building2 size={14} />
          My Institution
        </button>

        <button
          onClick={() => setActiveScope('community')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
            activeScope === 'community'
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-slate-500 hover:bg-slate-50'
          }`}
        >
          <Globe size={14} />
          Community
        </button>
      </div>

      {/* Assessment Type Tabs and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-3xl border border-slate-100 shadow-xs">
        <div className="flex items-center bg-slate-50 p-1 rounded-2xl w-full sm:w-auto border border-slate-100">
          <button
            onClick={() => setActiveTab('test')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'test'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Formal Tests
          </button>

          <button
            onClick={() => setActiveTab('practice')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'practice'
                ? 'bg-white text-indigo-700 shadow-xs'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Practice Mode
          </button>
        </div>

        <div className="relative w-full sm:w-72">
          <Search
            size={15}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search by title or course..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-all shadow-2xs"
          />
        </div>
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filteredTests.length === 0 ? (
          <div className="col-span-full text-center py-16 px-4 bg-indigo-50/20 rounded-3xl border border-dashed border-indigo-100 space-y-2">
            <HelpCircle size={28} className="mx-auto text-indigo-300" />

            <p className="text-xs font-semibold text-slate-700">
              No assessments found
            </p>

            <p className="text-[11px] text-slate-400">
              {searchQuery
                ? 'Try adjusting your search query or check other tabs.'
                : `No ${
                    activeTab === 'test' ? 'formal tests' : 'practice assessments'
                  } found in ${
                    activeScope === 'institution'
                      ? 'your institution'
                      : 'the community'
                  }.`}
            </p>
          </div>
        ) : (
          filteredTests.map(test => (
            <div
              key={test.$id}
              className="p-5 rounded-3xl bg-white border border-indigo-100 shadow-2xs space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase border border-indigo-200/60 truncate">
                      {test.courseCode || 'Course'}
                    </span>

                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border ${
                        test.testType === 'practice'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {test.testType || 'Test'}
                    </span>
                  </div>

                  <span className="flex items-center gap-1 text-[11px] font-medium text-slate-500 shrink-0">
                    <Clock size={13} className="text-indigo-400" />
                    {test.durationMinutes} mins
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 leading-snug">
                  {test.title}
                </h3>

                <p className="text-xs text-slate-500">
                  {test.totalQuestions} Questions configured
                </p>
              </div>

              <div className="pt-3 border-t border-indigo-50 flex items-center gap-1.5">
                <button
                  onClick={() => openQuestionManager(test)}
                  className="flex-1 px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100/70 text-indigo-700 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <FileQuestion size={13} />
                  <span>Questions</span>
                </button>

                <button
                  onClick={() => openResultsManager(test)}
                  className="flex-1 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1"
                >
                  <Users size={13} />
                  <span>Scores</span>
                </button>

                <button
                  onClick={() => handleBroadcastTest(test)}
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition-all cursor-pointer flex items-center justify-center gap-1 shadow-2xs"
                  title="Notify enrolled students"
                >
                  <Send size={13} />
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
              <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                Create CBT Assessment
              </h3>

              <button
                onClick={() => setIsTestModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-indigo-50 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateTest} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Assessment Title *
                </label>

                <input
                  type="text"
                  required
                  placeholder="e.g. Midterm Examination"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-indigo-50/20 border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Select Course *
                </label>

                <select
                  required
                  value={selectedCourseId}
                  onChange={e => setSelectedCourseId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-indigo-50/20 border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                >
                  {lecturerCourses.map(course => (
                    <option key={course.$id} value={course.$id}>
                      {course.courseCode} - {course.courseTitle}
                    </option>
                  ))}
                </select>
              </div>

              {/* Automatically detected course scope */}
              <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-3 space-y-1.5">
                <div className="flex items-center gap-2">
                  {selectedCourseScope === 'community' ? (
                    <Globe size={15} className="text-indigo-600" />
                  ) : (
                    <Building2 size={15} className="text-indigo-600" />
                  )}

                  <span className="text-[11px] font-semibold text-slate-700">
                    Automatic Access Scope
                  </span>
                </div>

                <p className="text-xs font-semibold text-indigo-700">
                  {selectedCourseScope === 'community'
                    ? 'Community'
                    : 'My Institution'}
                </p>

                <p className="text-[10px] text-slate-500">
                  This assessment will automatically inherit the access scope
                  configured for the selected course.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Duration (Minutes)
                  </label>

                  <input
                    type="number"
                    min={5}
                    max={180}
                    required
                    value={durationMinutes}
                    onChange={e => setDurationMinutes(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-indigo-50/20 border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Assessment Type
                  </label>

                  <select
                    value={testType}
                    onChange={e =>
                      setTestType(e.target.value as 'practice' | 'test')
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-indigo-50/20 border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="test">Strict Test Mode</option>
                    <option value="practice">Practice Mode</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsTestModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submittingTest || !selectedCourseId}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-60"
                >
                  {submittingTest && (
                    <Loader2 size={13} className="animate-spin" />
                  )}

                  <span>Save Assessment</span>
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
                Manage Questions: {activeTest.title} ({testQuestions.length})
              </h3>

              <button
                onClick={() => setIsQuestionModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-indigo-50 cursor-pointer shrink-0"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={handleAddQuestion}
              className="space-y-3.5 bg-indigo-50/30 p-4 rounded-2xl border border-indigo-100/70"
            >
              <h4 className="text-xs font-bold text-indigo-900">
                Add New Question
              </h4>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">
                  Question Prompt *
                </label>

                <textarea
                  required
                  rows={2}
                  placeholder="Enter question text..."
                  value={questionText}
                  onChange={e => setQuestionText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 resize-none shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Option A"
                  value={optionA}
                  onChange={e => setOptionA(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs shadow-2xs"
                />

                <input
                  type="text"
                  required
                  placeholder="Option B"
                  value={optionB}
                  onChange={e => setOptionB(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs shadow-2xs"
                />

                <input
                  type="text"
                  required
                  placeholder="Option C"
                  value={optionC}
                  onChange={e => setOptionC(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs shadow-2xs"
                />

                <input
                  type="text"
                  required
                  placeholder="Option D"
                  value={optionD}
                  onChange={e => setOptionD(e.target.value)}
                  className="px-3.5 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Correct Answer
                  </label>

                  <select
                    value={correctAnswerIndex}
                    onChange={e =>
                      setCorrectAnswerIndex(Number(e.target.value))
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs text-slate-700 shadow-2xs"
                  >
                    <option value={0}>Option A</option>
                    <option value={1}>Option B</option>
                    <option value={2}>Option C</option>
                    <option value={3}>Option D</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">
                    Explanation (Optional)
                  </label>

                  <input
                    type="text"
                    placeholder="Why is this correct?"
                    value={explanation}
                    onChange={e => setExplanation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-indigo-100 text-xs shadow-2xs"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  disabled={submittingQuestion}
                  className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-60"
                >
                  {submittingQuestion && (
                    <Loader2 size={13} className="animate-spin" />
                  )}

                  <Plus size={14} />
                  <span>Add Question</span>
                </button>
              </div>
            </form>

            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-bold text-slate-700">
                Existing Questions ({testQuestions.length})
              </h4>

              {testQuestions.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  No questions added to this assessment yet.
                </p>
              ) : (
                testQuestions.map((question, index) => {
                  const options = Array.isArray(question.options)
                    ? question.options
                    : [];

                  return (
                    <div
                      key={question.$id}
                      className="p-4 rounded-2xl bg-indigo-50/20 border border-indigo-100 flex items-start justify-between gap-3 shadow-2xs"
                    >
                      <div className="space-y-1.5 text-xs flex-1 min-w-0">
                        <p className="font-semibold text-slate-800 break-words">
                          Q{index + 1}: {question.questionText}
                        </p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-slate-500 text-[11px] pt-1">
                          {options.map((option: string, optionIndex: number) => (
                            <span
                              key={optionIndex}
                              className={`truncate ${
                                optionIndex === question.correctAnswerIndex
                                  ? 'text-emerald-700 font-bold'
                                  : ''
                              }`}
                            >
                              {String.fromCharCode(65 + optionIndex)}. {option}
                            </span>
                          ))}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          question.$id && handleDeleteQuestion(question.$id)
                        }
                        className="p-2 text-slate-400 hover:text-rose-600 transition-all cursor-pointer shrink-0"
                      >
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

      {/* Student Scores / Results Modal */}
      {isResultsModalOpen && activeTest && (
        <div className="fixed inset-0 z-50 bg-indigo-950/30 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl border border-indigo-100 w-full max-w-2xl max-h-[85vh] overflow-y-auto p-4 sm:p-6 space-y-5 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-indigo-50 pb-3 sticky top-0 bg-white z-10">
              <div className="space-y-0.5 min-w-0">
                <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider truncate pr-2">
                  Student Scores: {activeTest.title}
                </h3>

                <p className="text-[11px] text-slate-500">
                  {testResults.length} submission(s) recorded
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {testResults.length > 0 && (
                  <button
                    onClick={exportResultsCSV}
                    className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Download size={13} />
                    <span>Export CSV</span>
                  </button>
                )}

                <button
                  onClick={() => setIsResultsModalOpen(false)}
                  className="p-1.5 rounded-xl text-slate-400 hover:bg-indigo-50 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {loadingResults ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
              </div>
            ) : testResults.length === 0 ? (
              <div className="text-center py-16 space-y-2">
                <Users size={28} className="mx-auto text-indigo-300" />

                <p className="text-xs font-semibold text-slate-700">
                  No student submissions yet
                </p>

                <p className="text-[11px] text-slate-400">
                  Scores will appear here once students complete this assessment.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {testResults.map(result => (
                  <div
                    key={result.$id}
                    className="p-4 rounded-2xl bg-indigo-50/20 border border-indigo-100 flex items-center justify-between gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 text-xs min-w-0">
                      <p className="font-bold text-slate-900">
                        {result.studentName}
                      </p>

                      <p className="text-[11px] text-slate-500">
                        Matric:{' '}
                        <span className="font-semibold text-slate-700">
                          {result.matricNumber}
                        </span>{' '}
                        | Submitted:{' '}
                        {result.submittedAt
                          ? new Date(result.submittedAt).toLocaleDateString()
                          : 'Unknown'}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${
                          result.percentage >= 50
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-rose-50 text-rose-700 border-rose-100'
                        }`}
                      >
                        {result.score} / {result.totalQuestions} ({result.percentage}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}