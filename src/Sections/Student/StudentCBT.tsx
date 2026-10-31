import { useState, useEffect } from 'react';
import { 
  FileQuestion, 
  Clock, 
  Loader2, 
  ArrowLeft, 
  Play, 
  Award, 
  CheckCircle2, 
  XCircle, 
  BookOpen, 
  RotateCcw,
  Check,
  Search
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
  courseCode: string;
  testType: string;
  allowPractice: boolean;
}

interface Question {
  $id: string;
  testId: string;
  courseId: string;
  courseCode: string;
  questionText: string;
  options: string[];
  correctAnswerIndex: number;
  explanation?: string;
}

export default function StudentCBT() {
  const [tests, setTests] = useState<CBTTest[]>([]);
  const [completedTestIds, setCompletedTestIds] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'test' | 'practice'>('test');

  // Active Exam State
  const [activeTest, setActiveTest] = useState<CBTTest | null>(null);
  const [examMode, setExamMode] = useState<'practice' | 'test'>('test');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [examSubmitting, setExamSubmitting] = useState<boolean>(false);

  // Result & Review State
  const [examResult, setExamResult] = useState<{ score: number; total: number; percentage: number } | null>(null);
  const [showReview, setShowReview] = useState<boolean>(false);

  useEffect(() => {
    fetchStudentCBTData();
  }, []);

  // Countdown timer effect (Only runs in Test mode)
  useEffect(() => {
    if (!activeTest || examMode === 'practice' || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmitExam();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [activeTest, timeLeft, examMode]);

  const fetchStudentCBTData = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      if (!user) return;

      // 1. Fetch Student Enrollments
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

      // 2. Fetch Available Tests for Enrolled Courses
      const testsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.cbtTestId || 'cbt_tests',
        [Query.equal('courseId', enrolledCourseIds)]
      );

      const fetchedTests = testsRes.documents as unknown as CBTTest[];
      setTests(fetchedTests);

      // 3. Fetch Student's Previous Submissions to check specific test completions
      const resultsRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.cbtResultId || 'cbt_results',
        [Query.equal('studentId', user.$id)]
      );

      // Map submitted test IDs strictly using testId attribute
      const submittedTestIds = resultsRes.documents
        .filter((r: any) => r.testId)
        .map((r: any) => r.testId);

      setCompletedTestIds(submittedTestIds);
    } catch (err) {
      console.error('Failed to load student CBT data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInitiateExam = (test: CBTTest) => {
    const isPracticeTest = test.testType === 'practice' || test.allowPractice;
    const mode = isPracticeTest ? 'practice' : 'test';
    setExamMode(mode);
    startExam(test);
  };

  const startExam = async (test: CBTTest) => {
    try {
      setLoading(true);

      const qRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.questionsId || 'questions',
        [Query.equal('testId', test.$id)]
      );

      if (qRes.documents.length === 0) {
        alert('This assessment has no questions uploaded yet.');
        setLoading(false);
        return;
      }

      setQuestions(qRes.documents as unknown as Question[]);
      setActiveTest(test);
      setTimeLeft(test.durationMinutes * 60);
      setCurrentIndex(0);
      setSelectedAnswers({});
      setExamResult(null);
      setShowReview(false);
    } catch (err) {
      console.error('Failed to load exam questions:', err);
      alert('Error loading assessment questions. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (questionId: string, optionIndex: number) => {
    // Practice Mode: Lock question once answered
    if (examMode === 'practice' && selectedAnswers[questionId] !== undefined) {
      return;
    }
    // Test Mode: Allow changing selected answers freely before submission
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

      // Save score officially to cbt_results schema if in Test mode
      if (examMode === 'test') {
        const user = await account.get();
        await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.cbtResultId || 'cbt_results',
          ID.unique(),
          {
            studentId: user.$id,
            testId: activeTest.$id,
            courseId: activeTest.courseId,
            score,
            totalQuestions: total,
            percentage,
            submittedAt: new Date().toISOString(),
            timeSpentSeconds: (activeTest.durationMinutes * 60) - timeLeft,
          }
        );
        // Mark this specific test as completed locally
        setCompletedTestIds(prev => [...prev, activeTest.$id]);
      }

      setExamResult({ score, total, percentage });
    } catch (err) {
      console.error('Failed to submit exam:', err);
      alert('Failed to submit exam. Please ensure your network connection is stable.');
    } finally {
      setExamSubmitting(false);
    }
  };

  const handleRedoExam = () => {
    if (!activeTest) return;
    startExam(activeTest);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Filter tests based on active tab and search query
  const filteredTests = tests.filter(test => {
    const isPracticeTest = test.testType === 'practice' || test.allowPractice;
    const matchesTab = activeTab === 'practice' ? isPracticeTest : !isPracticeTest;
    
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      test.title?.toLowerCase().includes(query) ||
      test.courseCode?.toLowerCase().includes(query);

    return matchesTab && matchesSearch;
  });

  // Active Exam View
  if (activeTest && !examResult) {
    const currentQ = questions[currentIndex];
    const options = Array.isArray(currentQ?.options) ? currentQ.options : [];

    return (
      <div className="max-w-3xl mx-auto space-y-5 pb-20 px-3 sm:px-6 animate-in fade-in duration-300">
        {/* Exam Header */}
        <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100">
                {activeTest.courseCode}
              </span>
              <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-xl border ${examMode === 'practice' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                {examMode === 'practice' ? 'Practice Mode' : 'Test Mode'}
              </span>
            </div>
            <h2 className="text-sm font-bold text-slate-900 leading-snug">{activeTest.title}</h2>
          </div>
          {examMode === 'test' && (
            <div className={`self-start sm:self-auto px-3.5 py-2 rounded-2xl flex items-center gap-1.5 text-xs font-bold shrink-0 ${timeLeft < 300 ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-indigo-50/80 text-indigo-700 border border-indigo-100'}`}>
              <Clock size={15} />
              <span>{formatTime(timeLeft)}</span>
            </div>
          )}
        </div>

        {/* Question Card */}
        <div className="bg-white p-5 sm:p-8 rounded-3xl border border-slate-100 shadow-xs space-y-6">
          <div className="flex items-center justify-between text-xs font-medium text-slate-400 border-b border-slate-100 pb-3">
            <span>Question {currentIndex + 1} of {questions.length}</span>
            <span className="font-semibold text-slate-600">{Math.round(((currentIndex + 1) / questions.length) * 100)}% Completed</span>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-relaxed">{currentQ.questionText}</h3>
            <div className="space-y-2.5 pt-1">
              {options.map((opt: string, idx: number) => {
                const isSelected = selectedAnswers[currentQ.$id] === idx;
                const isCorrect = idx === currentQ.correctAnswerIndex;
                const isAnswered = selectedAnswers[currentQ.$id] !== undefined;
                
                let btnStyle = isSelected 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs font-semibold' 
                  : 'bg-slate-50/80 hover:bg-slate-100 text-slate-700 border-slate-200/80';

                // PRACTICE MODE ONLY: Show instant feedback
                if (examMode === 'practice' && isAnswered) {
                  if (isCorrect) {
                    btnStyle = 'bg-emerald-600 text-white border-emerald-600 font-semibold shadow-xs';
                  } else if (isSelected && !isCorrect) {
                    btnStyle = 'bg-rose-600 text-white border-rose-600 font-semibold shadow-xs';
                  } else {
                    btnStyle = 'bg-slate-50 text-slate-400 border-slate-100 opacity-50';
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={examMode === 'practice' && isAnswered}
                    onClick={() => handleSelectOption(currentQ.$id, idx)}
                    className={`w-full text-left p-3.5 sm:p-4 rounded-2xl border text-xs sm:text-sm font-medium transition-all flex items-center justify-between gap-3 ${btnStyle} ${examMode === 'practice' && isAnswered ? 'cursor-default' : 'cursor-pointer active:scale-[0.99]'}`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className={`w-6 h-6 rounded-xl flex items-center justify-center text-xs font-bold shrink-0 ${isSelected || (examMode === 'practice' && isAnswered && isCorrect) ? 'bg-white/20 text-white' : 'bg-slate-200/70 text-slate-700'}`}>
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span className="break-words leading-normal">{opt}</span>
                    </div>
                    {examMode === 'practice' && isAnswered && isCorrect && (
                      <CheckCircle2 size={16} className="text-white shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Explanation box in Practice Mode Only */}
            {examMode === 'practice' && selectedAnswers[currentQ.$id] !== undefined && currentQ.explanation && (
              <div className="mt-4 p-4 rounded-2xl bg-indigo-50/60 border border-indigo-100 text-xs text-indigo-900 space-y-1 animate-in fade-in">
                <span className="font-bold block text-indigo-700">Explanation:</span>
                <p className="leading-relaxed">{currentQ.explanation}</p>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 gap-2">
            <button
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex(prev => prev - 1)}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-30 cursor-pointer transition-all"
            >
              Previous
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => setCurrentIndex(prev => prev + 1)}
                className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer transition-all active:scale-95"
              >
                Next
              </button>
            ) : (
              <button
                disabled={examSubmitting}
                onClick={handleSubmitExam}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1.5 transition-all active:scale-95"
              >
                {examSubmitting && <Loader2 size={13} className="animate-spin" />}
                <span>Submit {examMode === 'practice' ? 'Practice' : 'Exam'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Result & Review View
  if (examResult) {
    return (
      <div className="max-w-3xl mx-auto py-6 px-3 sm:px-6 animate-in zoom-in-95 duration-200">
        {!showReview ? (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-100 shadow-sm space-y-6 text-center max-w-md mx-auto">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shadow-xs">
              <Award size={30} />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {examMode === 'practice' ? 'Practice Completed!' : 'Test Completed!'}
              </h3>
              <p className="text-xs text-slate-500">
                {examMode === 'test' ? 'Your score has been logged to your academic record.' : 'Great job practicing! Review your answers or try again.'}
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
              <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                <span>Correct Answers</span>
                <span className="font-bold text-slate-900">{examResult.score} / {examResult.total}</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 font-medium">
                <span>Percentage Score</span>
                <span className={`font-bold px-2 py-0.5 rounded-md ${examResult.percentage >= 50 ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                  {examResult.percentage}%
                </span>
              </div>
            </div>

            <div className="space-y-2.5">
              <button
                onClick={() => setShowReview(true)}
                className="w-full py-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold cursor-pointer transition-all flex items-center justify-center gap-2 border border-indigo-100/60"
              >
                <BookOpen size={15} />
                <span>Review Questions & Answers</span>
              </button>

              {examMode === 'practice' && (
                <button
                  onClick={handleRedoExam}
                  className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer transition-all flex items-center justify-center gap-2"
                >
                  <RotateCcw size={15} />
                  <span>Redo Practice</span>
                </button>
              )}

              <button
                onClick={() => {
                  setActiveTest(null);
                  setExamResult(null);
                  fetchStudentCBTData();
                }}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs cursor-pointer transition-all"
              >
                Back to CBT Dashboard
              </button>
            </div>
          </div>
        ) : (
          /* Detailed Answer Review Screen */
          <div className="space-y-5">
            <div className="bg-white p-4 sm:p-5 rounded-3xl border border-slate-100 shadow-xs flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100">
                  {activeTest?.courseCode}
                </span>
                <h3 className="text-sm font-bold text-slate-900 mt-1">Answer Review</h3>
              </div>
              <button
                onClick={() => setShowReview(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-all"
              >
                Back to Summary
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, qIdx) => {
                const studentAnswer = selectedAnswers[q.$id];
                const isCorrect = studentAnswer === q.correctAnswerIndex;
                const opts = Array.isArray(q.options) ? q.options : [];

                return (
                  <div key={q.$id} className="bg-white p-5 sm:p-6 rounded-3xl border border-slate-100 shadow-xs space-y-4">
                    <div className="flex items-start justify-between gap-3 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center text-xs font-bold shrink-0">
                          {qIdx + 1}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-snug">{q.questionText}</h4>
                      </div>
                      <div className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 shrink-0 ${isCorrect ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-rose-50 text-rose-700 border border-rose-100'}`}>
                        {isCorrect ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                        <span>{isCorrect ? 'Correct' : 'Incorrect'}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {opts.map((opt, oIdx) => {
                        const isStudentChoice = studentAnswer === oIdx;
                        const isRightAnswer = oIdx === q.correctAnswerIndex;

                        let style = 'bg-slate-50/50 text-slate-600 border-slate-100';
                        if (isRightAnswer) {
                          style = 'bg-emerald-50/80 text-emerald-900 border-emerald-200 font-semibold';
                        } else if (isStudentChoice && !isCorrect) {
                          style = 'bg-rose-50/80 text-rose-900 border-rose-200 font-semibold';
                        }

                        return (
                          <div key={oIdx} className={`p-3 rounded-2xl border text-xs flex items-center justify-between gap-2 ${style}`}>
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold shrink-0">{String.fromCharCode(65 + oIdx)}.</span>
                              <span className="truncate">{opt}</span>
                            </div>
                            {isRightAnswer && <span className="text-[10px] font-bold text-emerald-700 uppercase shrink-0">Correct</span>}
                            {isStudentChoice && !isRightAnswer && <span className="text-[10px] font-bold text-rose-700 uppercase shrink-0">Your Answer</span>}
                          </div>
                        );
                      })}
                    </div>

                    {q.explanation && (
                      <div className="p-3.5 rounded-2xl bg-indigo-50/50 border border-indigo-100/60 text-xs text-indigo-950 space-y-1">
                        <span className="font-bold text-indigo-700 block">Explanation:</span>
                        <p className="leading-relaxed">{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  // Default CBT Tests Listing
  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-20 px-3 sm:px-6 animate-in fade-in duration-300">
      <div className="space-y-3">
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-white border border-slate-200/80 text-slate-600 hover:bg-slate-50 transition-all cursor-pointer shadow-xs text-xs font-semibold"
        >
          <ArrowLeft size={14} />
          <span>Back</span>
        </button>

        <Header
          title="CBT Practice Portal"
          description="Take timed assessments or practice at your own pace."
          icon={<FileQuestion size={20} />}
        />
      </div>

      {/* Tabs and Search Bar Container */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-3xl border border-slate-100 shadow-xs">
        {/* Active Tabs */}
        <div className="flex items-center bg-slate-50 p-1 rounded-2xl w-full sm:w-auto border border-slate-100">
          <button
            onClick={() => setActiveTab('test')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'test' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Formal Tests
          </button>
          <button
            onClick={() => setActiveTab('practice')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${activeTab === 'practice' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Practice Mode
          </button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-72">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by title or course..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 transition-all shadow-2xs"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24 bg-white rounded-3xl border border-slate-100 shadow-xs">
          <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />
        </div>
      ) : filteredTests.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white rounded-3xl border border-slate-100 space-y-2 shadow-xs">
          <FileQuestion size={28} className="mx-auto text-indigo-300" />
          <p className="text-xs font-semibold text-slate-700">No assessments found</p>
          <p className="text-[11px] text-slate-400">
            {searchQuery ? 'Try adjusting your search query or check other tabs.' : `No ${activeTab === 'test' ? 'formal tests' : 'practice assessments'} available right now.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredTests.map(test => {
            const isPractice = test.testType === 'practice' || test.allowPractice;
            const isCompleted = !isPractice && completedTestIds.includes(test.$id);

            return (
              <div key={test.$id} className="p-5 rounded-3xl bg-white border border-slate-100 shadow-xs space-y-4 flex flex-col justify-between transition-all hover:border-slate-200">
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="px-2.5 py-1 rounded-xl text-[10px] font-bold bg-indigo-50 text-indigo-700 uppercase border border-indigo-100/80 truncate">
                      {test.courseCode}
                    </span>
                    <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold uppercase border ${isPractice ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>
                      {test.testType || (test.allowPractice ? 'practice' : 'test')}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug">{test.title}</h3>
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5 font-medium">
                    <span className="flex items-center gap-1">
                      <Clock size={13} className="text-indigo-400" />
                      {test.durationMinutes} mins
                    </span>
                    <span>•</span>
                    <span>{test.totalQuestions} Questions</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center gap-2">
                  {isCompleted ? (
                    <button
                      disabled
                      className="w-full py-2.5 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-100 text-xs font-bold flex items-center justify-center gap-1.5 cursor-not-allowed opacity-90"
                    >
                      <Check size={14} />
                      <span>Done</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleInitiateExam(test)}
                      className="w-full py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-95"
                    >
                      <Play size={13} />
                      <span>Start Assessment</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}