import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FileText, Loader2, ArrowLeft, CheckCircle2, Award, Sparkles, ShieldAlert } from 'lucide-react';
import Header from '../../Components/Header';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query, ID } from 'appwrite';
import {type Question } from '../../services/geminiQuiz';

interface QuizDocument {
  $id: string;
  courseId: string;
  title: string;
  description: string;
  questions: string;
  createdBy: string;
}

const StudentQuizView = () => {
  const { quizId } = useParams<{ quizId: string }>();
  const navigate = useNavigate();

  const [quiz, setQuiz] = useState<QuizDocument | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAuthorized, setIsAuthorized] = useState<boolean>(false);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [selectedAnswers, setSelectedAnswers] = useState<{ [key: number]: string }>({});
  const [submittedResult, setSubmittedResult] = useState<{ score: number; total: number } | null>(null);

  useEffect(() => {
    if (quizId) {
      verifyAndFetchQuiz();
    }
  }, [quizId]);

  const verifyAndFetchQuiz = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      if (!user) return;

      // 1. Fetch the quiz details
      const quizRes = await databases.getDocument(
        appwriteConfig.databaseId,
        appwriteConfig.quizzesId,
        quizId!
      );
      const quizData = quizRes as unknown as QuizDocument;

      // 2. Check if the student is enrolled in this course via 'enrollments' collection
      const enrollmentRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.enrollmentsId,
        [
          Query.equal('studentId', user.$id),
          Query.equal('courseId', quizData.courseId)
        ]
      );

      if (enrollmentRes.documents.length === 0) {
        setIsAuthorized(false);
        setLoading(false);
        return;
      }

      setIsAuthorized(true);
      setQuiz(quizData);
      setQuestions(JSON.parse(quizData.questions));
    } catch (err) {
      console.error('Error verifying access to quiz:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOptionSelect = (questionIndex: number, option: string) => {
    if (submittedResult) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: option,
    }));
  };

  const handleSubmitQuiz = async () => {
    if (!quiz) return;
    try {
      setSubmitting(true);
      const user = await account.get();
      if (!user) return;

      let calculatedScore = 0;
      questions.forEach((q, idx) => {
        if (selectedAnswers[idx] === q.correctAnswer) {
          calculatedScore += 1;
        }
      });

      await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.quizAttemptsId,
        ID.unique(),
        {
          quizId: quiz.$id,
          studentId: user.$id,
          score: calculatedScore,
          totalMarks: questions.length,
          studentAnswers: JSON.stringify(selectedAnswers),
          submittedAt: new Date().toISOString(),
        }
      );

      setSubmittedResult({ score: calculatedScore, total: questions.length });
    } catch (err) {
      console.error('Failed to submit quiz attempt:', err);
      alert('Error submitting quiz.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-16 px-4 sm:px-0 animate-in fade-in duration-300 max-w-3xl mx-auto">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2.5 rounded-2xl bg-indigo-50/80 backdrop-blur-xl border border-indigo-100 text-indigo-600 hover:bg-indigo-100 transition-all cursor-pointer shadow-2xs"
        >
          <ArrowLeft size={18} />
        </button>
        <Header
          title="Interactive Assessment"
          description="Answer questions and receive AI-backed instant grading."
          icon={<FileText size={20} />}
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 bg-indigo-50/30 rounded-3xl border border-indigo-100">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
        </div>
      ) : !isAuthorized ? (
        <div className="bg-rose-50/90 p-8 rounded-3xl border border-rose-200 text-center space-y-3">
          <ShieldAlert className="w-10 h-10 text-rose-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-900">Access Denied</h3>
          <p className="text-xs text-slate-600">You are not officially enrolled in this course, so you cannot access its quizzes.</p>
          <button
            onClick={() => navigate(-1)}
            className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
          >
            Go Back
          </button>
        </div>
      ) : quiz ? (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-indigo-50/90 via-white to-indigo-50/40 backdrop-blur-xl p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-2">
            <span className="px-2.5 py-1 rounded-lg bg-indigo-100 text-indigo-800 text-[10px] font-bold border border-indigo-200/60 inline-block">
              Course: {quiz.courseId}
            </span>
            <h2 className="text-base font-bold text-slate-900">{quiz.title}</h2>
            <p className="text-xs text-slate-600">{quiz.description || 'Complete all questions and submit.'}</p>
          </div>

          {submittedResult && (
            <div className="bg-emerald-50/90 backdrop-blur-xl p-6 rounded-3xl border border-emerald-200 shadow-lg space-y-3 text-center animate-in zoom-in-95 duration-200">
              <div className="mx-auto w-12 h-12 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Award size={24} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900">Quiz Completed!</h3>
                <p className="text-xs text-emerald-800 font-medium">
                  You scored <strong className="text-emerald-900 text-sm">{submittedResult.score}</strong> out of <strong className="text-emerald-900 text-sm">{submittedResult.total}</strong> marks.
                </p>
              </div>
              <button
                onClick={() => navigate(-1)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold shadow-md shadow-indigo-100 cursor-pointer"
              >
                Return to Course
              </button>
            </div>
          )}

          <div className="space-y-4">
            {questions.map((q, qIndex) => (
              <div key={qIndex} className="bg-white/90 backdrop-blur-xl p-6 rounded-3xl border border-indigo-100 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-900 leading-relaxed">
                  <span className="text-indigo-600 mr-1.5">Q{qIndex + 1}.</span> {q.question}
                </h4>

                <div className="grid grid-cols-1 gap-2">
                  {q.options.map((option, optIndex) => {
                    const isSelected = selectedAnswers[qIndex] === option;
                    const isCorrect = submittedResult && option === q.correctAnswer;
                    const isWrongSelection = submittedResult && isSelected && option !== q.correctAnswer;

                    let optionStyle = "bg-indigo-50/40 border-indigo-100 text-slate-700 hover:bg-indigo-50";
                    if (isSelected && !submittedResult) {
                      optionStyle = "bg-indigo-600 border-indigo-600 text-white font-semibold";
                    }
                    if (isCorrect) {
                      optionStyle = "bg-emerald-100 border-emerald-300 text-emerald-900 font-bold";
                    } else if (isWrongSelection) {
                      optionStyle = "bg-rose-100 border-rose-300 text-rose-900 font-bold";
                    }

                    return (
                      <button
                        key={optIndex}
                        type="button"
                        onClick={() => handleOptionSelect(qIndex, option)}
                        disabled={!!submittedResult}
                        className={`w-full text-left px-4 py-3 rounded-2xl border text-xs transition-all cursor-pointer flex items-center justify-between ${optionStyle}`}
                      >
                        <span>{option}</span>
                        {submittedResult && option === q.correctAnswer && (
                          <CheckCircle2 size={15} className="text-emerald-700 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {submittedResult && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 italic">
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>

          {!submittedResult && (
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleSubmitQuiz}
                disabled={submitting || Object.keys(selectedAnswers).length === 0}
                className="px-8 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                <Sparkles size={16} />
                <span>Submit Quiz & View Score</span>
              </button>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};

export default StudentQuizView;