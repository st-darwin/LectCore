import { useState, useEffect } from 'react';
import { 
  FileQuestion, 
  Clock, 
  Loader2, 
  ArrowLeft, 
  Play, 
  Award,
} from 'lucide-react';
import Header from '../../Components/Header';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query, ID } from 'appwrite';

interface CBTTest {
  $id: string;
  title: string;
  courseId: string;
  durationMinutes: number;
  totalQuestions: number;
  courseCode : string;
}

interface Question {
  $id: string;
  courseId: string;
  questionText: string;
  options: string[]; // Native array matching Appwrite schema
  correctAnswerIndex: number;
  explanation?: string;
}

export default function StudentCBT() {
  const [tests, setTests] = useState<CBTTest[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Exam State
  const [activeTest, setActiveTest] = useState<CBTTest | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [examSubmitting, setExamSubmitting] = useState<boolean>(false);

  // Result Modal State
  const [examResult, setExamResult] = useState<{ score: number; total: number; percentage: number } | null>(null);

  useEffect(() => {
    fetchStudentCBTTests();
  }, []);

  // Countdown timer effect
  useEffect(() => {
    if (!activeTest || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam(); // Auto submit when time expires
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTest, timeLeft]);

  const fetchStudentCBTTests = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      if (!user) return;

      // 1. Get student enrollments
      const enrollRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId || 'enrollments',
        [Query.equal('studentId', user.$id)]
      );

      const enrolledCourseIds = enrollRes.documents.map((e: any) => e.courseId);
      if (enrolledCourseIds.length === 0) {
        setTests([]);
        setLoading(false);
        return;
      }

      // 2. Fetch CBT tests matching enrolled courses (checking both code and course document IDs)
      const testsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.cbtTestId || 'cbt_tests',
        [Query.equal('courseId', enrolledCourseIds)]
      );

      setTests(testsRes.documents as unknown as CBTTest[]);
    } catch (err) {
      console.error('Failed to load student CBT tests:', err);
    } finally {
      setLoading(false);
    }
  };

  const startExam = async (test: CBTTest) => {
    try {
      setLoading(true);

      // Fetch course details to check both courseCode and document $id
      let searchValues = [test.courseId];
      try {
        const courseRes = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseId || 'courses',
          [Query.equal('courseCode', test.courseId)]
        );
        if (courseRes.documents.length > 0) {
          searchValues.push(courseRes.documents[0].$id);
        }
      } catch (e) {
        // Fallback gracefully if course lookup fails
      }

      // Query questions using both possible representations of the course ID
      const qRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.questionsId || 'questions',
        [Query.equal('courseId', searchValues)]
      );

      if (qRes.documents.length === 0) {
        alert('This test has no questions uploaded yet for this course.');
        setLoading(false);
        return;
      }

      setQuestions(qRes.documents as unknown as Question[]);
      setActiveTest(test);
      setTimeLeft(test.durationMinutes * 60);
      setCurrentIndex(0);
      setSelectedAnswers({});
    } catch (err) {
      console.error('Failed to load exam questions:', err);
      alert('Error loading test questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionIndex }));
  };

  const handleSubmitExam = async () => {
    if (!activeTest) return;

    try {
      setExamSubmitting(true);
      let score = 0;
      questions.forEach(q => {
        if (selectedAnswers[q.$id] === q.correctAnswerIndex) {
          score += 1;
        }
      });

      const total = questions.length;
      const percentage = Number(((score / total) * 100).toFixed(1));

      // Save result to Appwrite
      const user = await account.get();
      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.cbtResultId || 'cbt_results',
        ID.unique(),
        {
          studentId: user.$id,
          courseId: activeTest.$id,
          score,
          totalQuestions: total,
          percentage,
          submittedAt: new Date().toISOString(),
          timeSpentSeconds : 10 ,
        }
      );

      setExamResult({ score, total, percentage });
    } catch (err) {
      console.error('Failed to submit exam:', err);
    } finally {
      setExamSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // If student is taking an active test
  if (activeTest && !examResult) {
    const currentQ = questions[currentIndex];
    const options = Array.isArray(currentQ?.options) ? currentQ.options : [];

    return (
      <div className="max-w-3xl mx-auto space-y-6 pb-20 px-4 sm:px-6 animate-in fade-in duration-300">
        {/* Exam Header */}
        <div className="bg-white p-5 rounded-3xl border border-indigo-100 shadow-2xs flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              {activeTest.courseCode}
            </span>
            <h2 className="text-sm font-bold text-slate-900 mt-1">{activeTest.title}</h2>
          </div>
          <div className={`px-4 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-bold shrink-0 ${timeLeft < 300 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-indigo-50 text-indigo-700 border border-indigo-100'}`}>
            <Clock size={15} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white p-5 sm:p-8 rounded-3xl border border-indigo-100 shadow-2xs space-y-6">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 border-b border-indigo-50 pb-3">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span>Progress: {Math.round(((currentIndex + 1) / questions.length) * 100)}%</span>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">{currentQ.questionText}</h3>
            <div className="space-y-2.5 pt-2">
              {options.map((opt: string, idx: number) => {
                const isSelected = selectedAnswers[currentQ.$id] === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectOption(currentQ.$id, idx)}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm font-medium transition-all cursor-pointer flex items-center gap-3 ${
                      isSelected 
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-semibold' 
                        : 'bg-indigo-50/20 hover:bg-indigo-50/60 text-slate-700 border-indigo-100'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 ${isSelected ? 'bg-white text-indigo-600' : 'bg-indigo-100 text-indigo-800'}`}>
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <span className="break-words">{opt}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-indigo-50 gap-2">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => prev - 1)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-indigo-50 disabled:opacity-40 cursor-pointer"
            >
              Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer"
              >
                Next
              </button>
            ) : (
              <button
                disabled={examSubmitting}
                onClick={handleSubmitExam}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                {examSubmitting && <Loader2 size={13} className="animate-spin" />}
                <span>Submit Exam</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Result View Modal / Screen
  if (examResult) {
    return (
      <div className="max-w-md mx-auto py-12 px-4 animate-in zoom-in-95 duration-200">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-indigo-100 shadow-xl space-y-6 text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Award size={32} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-slate-900">Test Completed!</h3>
            <p className="text-xs text-slate-500">Your score has been logged to your academic record.</p>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Correct Answers</span>
              <span className="font-bold text-slate-900">{examResult.score} / {examResult.total}</span>
            </div>
            <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
              <span>Percentage Score</span>
              <span className={`font-bold ${examResult.percentage >= 50 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {examResult.percentage}%
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveTest(null);
              setExamResult(null);
              fetchStudentCBTTests();
            }}
            className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md cursor-pointer transition-all"
          >
            Back to CBT Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Default CBT Tests Listing
  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 px-4 sm:px-6 animate-in fade-in duration-300">
      <div className="space-y-4">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-indigo-50/80 backdrop-blur-xl border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer shadow-2xs text-xs font-semibold"
        >
          <ArrowLeft size={15} />
          <span>Back</span>
        </button>

        <Header
          title="CBT Practice Portal"
          description="Take timed computer-based tests for your enrolled courses to prepare for exams."
          icon={<FileQuestion size={20} />}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-indigo-50/30 rounded-3xl border border-indigo-100/60">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : tests.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-indigo-100 space-y-2 shadow-2xs">
          <FileQuestion size={28} className="mx-auto text-indigo-300" />
          <p className="text-xs font-semibold text-slate-700">No CBT tests available right now</p>
          <p className="text-[11px] text-slate-400">Tests published by your lecturers for your enrolled courses will appear here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {tests.map(test => (
            <div key={test.$id} className="p-5 rounded-3xl bg-white border border-indigo-100 shadow-2xs space-y-3 flex flex-col justify-between">
              <div className="space-y-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-indigo-100 text-indigo-800 uppercase border border-indigo-200/60 inline-block">
                  {test.courseCode}
                </span>
                <h3 className="text-sm font-bold text-slate-900 leading-snug">{test.title}</h3>
                <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                  <span className="flex items-center gap-1">
                    <Clock size={13} className="text-indigo-400" />
                    {test.durationMinutes} minutes
                  </span>
                  <span>•</span>
                  <span>{test.totalQuestions} Questions</span>
                </div>
              </div>

              <div className="pt-3 border-t border-indigo-50 flex justify-end">
                <button
                  onClick={() => startExam(test)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all"
                >
                  <Play size={13} />
                  <span>Start Test</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}