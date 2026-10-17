import React, { useState, useEffect } from 'react';
import { 
  Timer, 
  Play, 
  Pause, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  Flame, 
  BookOpen, 
  Loader2,
  Calendar,
  Sparkles
} from 'lucide-react';
import { databases, appwriteConfig, account } from '../../appwrite/Client';
import { ID, Query } from 'appwrite';
import AdminHeader from '../../Components/AdminHeader';

export interface StudySession {
  $id: string;
  userId: string;
  durationMinutes: number;
  sessionType: string;
  notes?: string;
  $createdAt: string;
}

type Mode = 'focus' | 'shortBreak' | 'longBreak';

const FOCUS_TIME = 25 * 60;
const SHORT_BREAK = 5 * 60;
const LONG_BREAK = 15 * 60;

export default function PomodoroTimer() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [mode, setMode] = useState<Mode>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(FOCUS_TIME);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [sessionNotes, setSessionNotes] = useState<string>('');
  
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(true);

  useEffect(() => {
    initUserAndSessions();
  }, []);

  // Timer Countdown Effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isRunning && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && isRunning) {
      setIsRunning(false);
      handleCompleteSession();
    }
    return () => clearInterval(timer);
  }, [isRunning, timeLeft]);

  const initUserAndSessions = async () => {
    try {
      setLoadingHistory(true);
      const user = await account.get();
      if (!user?.$id) return;
      setCurrentUserId(user.$id);

      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.studySessionsId,
        [Query.equal('userId', user.$id), Query.orderDesc('$createdAt'), Query.limit(10)]
      ).catch(() => ({ documents: [] }));

      setSessions(res.documents as unknown as StudySession[]);
    } catch (err) {
      console.error('Failed to initialize study session tracker:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSwitchMode = (newMode: Mode) => {
    setIsRunning(false);
    setMode(newMode);
    if (newMode === 'focus') setTimeLeft(FOCUS_TIME);
    if (newMode === 'shortBreak') setTimeLeft(SHORT_BREAK);
    if (newMode === 'longBreak') setTimeLeft(LONG_BREAK);
  };

  const handleToggleTimer = () => {
    setIsRunning(!isRunning);
  };

  const handleResetTimer = () => {
    setIsRunning(false);
    if (mode === 'focus') setTimeLeft(FOCUS_TIME);
    if (mode === 'shortBreak') setTimeLeft(SHORT_BREAK);
    if (mode === 'longBreak') setTimeLeft(LONG_BREAK);
  };

  const handleCompleteSession = async () => {
    if (!currentUserId || mode !== 'focus') return;

    try {
      const duration = 25; // standard focus length
      const doc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.studySessionsId,
        ID.unique(),
        {
          userId: currentUserId,
          durationMinutes: duration,
          sessionType: 'Focus Session',
          notes: sessionNotes.trim() || 'Focused study block',
        }
      );

      setSessions(prev => [doc as unknown as StudySession, ...prev]);
      setSessionNotes('');
      alert('Focus session completed and logged successfully! Take a well-deserved break.');
    } catch (err) {
      console.error('Failed to log completed study session:', err);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const totalFocusMinutesToday = sessions.reduce((acc, curr) => {
    const isToday = new Date(curr.$createdAt).toDateString() === new Date().toDateString();
    return isToday ? acc + curr.durationMinutes : acc;
  }, 0);

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-6 pb-20 pt-2 text-slate-500">
      <AdminHeader 
        title="Pomodoro Focus Timer"
        description="Boost productivity using structured 25-minute focus intervals and session logging."
        icon={<Timer className="w-5 h-5 text-indigo-400" />}
        badgeText="Productivity Suite"
      />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-3xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.01)] flex items-center justify-between transition-all hover:bg-white/80">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Focus Time Today</p>
            <h3 className="text-xl font-bold text-slate-700">{totalFocusMinutesToday} <span className="text-xs font-medium text-slate-400">mins</span></h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-indigo-50/60 text-indigo-500 flex items-center justify-center">
            <Flame className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-3xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.01)] flex items-center justify-between transition-all hover:bg-white/80">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Recorded Sessions</p>
            <h3 className="text-xl font-bold text-slate-700">{sessions.length}</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-emerald-50/60 text-emerald-500 flex items-center justify-center">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Main Timer Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Timer Box */}
        <div className="lg:col-span-7 bg-white/60 backdrop-blur-md border border-slate-100 rounded-[2.5rem] p-6 sm:p-10 shadow-[0_4px_20px_rgb(0,0,0,0.01)] flex flex-col items-center justify-center space-y-6 text-center">
          {/* Mode Switcher Tabs */}
          <div className="flex items-center gap-1 p-1 bg-slate-100/60 rounded-2xl w-full max-w-sm border border-slate-200/40">
            <button
              onClick={() => handleSwitchMode('focus')}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${mode === 'focus' ? 'bg-white text-indigo-600 shadow-2xs border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Focus (25m)
            </button>
            <button
              onClick={() => handleSwitchMode('shortBreak')}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${mode === 'shortBreak' ? 'bg-white text-emerald-600 shadow-2xs border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Short (5m)
            </button>
            <button
              onClick={() => handleSwitchMode('longBreak')}
              className={`flex-1 py-2 rounded-xl text-xs font-medium transition cursor-pointer ${mode === 'longBreak' ? 'bg-white text-sky-600 shadow-2xs border border-slate-200/50' : 'text-slate-400 hover:text-slate-600'}`}
            >
              Long (15m)
            </button>
          </div>

          {/* Time Display Circle */}
          <div className="w-60 h-60 sm:w-68 sm:h-68 rounded-full border-4 border-slate-100/80 bg-gradient-to-b from-white to-slate-50/50 flex flex-col items-center justify-center shadow-xs relative">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 bg-indigo-50/50 px-3 py-1 rounded-full border border-indigo-100/60 mb-2">
              {mode === 'focus' ? 'Deep Focus' : 'Rest Period'}
            </span>
            <h2 className="text-4xl sm:text-5xl font-light text-slate-700 tracking-tight font-mono">
              {formatTime(timeLeft)}
            </h2>
            <p className="text-[11px] text-slate-400 mt-2 font-normal">
              {isRunning ? 'Running...' : 'Ready'}
            </p>
          </div>

          {/* Optional Session Goal Note Input */}
          <div className="w-full max-w-sm space-y-1.5 text-left">
            <label className="text-[11px] font-medium text-slate-500">What are you working on?</label>
            <input
              type="text"
              placeholder="e.g., Reading Chapter 3 Notes"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="w-full bg-white/80 border border-slate-200/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:border-indigo-300 transition-all shadow-2xs"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 w-full max-w-sm justify-center">
            <button
              onClick={handleToggleTimer}
              className={`flex-1 py-3 rounded-xl text-xs font-medium shadow-sm transition cursor-pointer flex items-center justify-center gap-2 ${
                isRunning 
                  ? 'bg-amber-100/80 hover:bg-amber-200/80 text-amber-700' 
                  : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-indigo-500/20'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              <span>{isRunning ? 'Pause' : 'Start Focus'}</span>
            </button>
            <button
              onClick={handleResetTimer}
              className="p-3 rounded-xl bg-white/80 hover:bg-slate-100 border border-slate-200/60 text-slate-500 transition cursor-pointer shadow-2xs"
              title="Reset Timer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Study History / Logs Sidebar */}
        <div className="lg:col-span-5 bg-white/60 backdrop-blur-md border border-slate-100 rounded-[2.5rem] p-6 shadow-[0_4px_20px_rgb(0,0,0,0.01)] space-y-4 flex flex-col">
          <div className="flex items-center justify-between border-b border-slate-100/80 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-indigo-400" />
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Recent Study Logs</h4>
            </div>
            <span className="text-[10px] font-semibold text-indigo-500 bg-indigo-50/60 px-2 py-0.5 rounded-full border border-indigo-100/50">{sessions.length} recorded</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[420px] space-y-2 pr-1">
            {loadingHistory ? (
              <div className="py-20 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-20 space-y-2">
                <BookOpen className="w-8 h-8 text-slate-300 mx-auto stroke-1" />
                <p className="text-xs font-semibold text-slate-600">No sessions logged yet</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">Complete a focus session to start tracking your daily progress.</p>
              </div>
            ) : (
              sessions.map((session) => (
                <div key={session.$id} className="p-3.5 rounded-2xl bg-white/70 border border-slate-100/80 space-y-1 hover:border-indigo-100 transition-all shadow-2xs">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 bg-indigo-50/60 px-2 py-0.5 rounded-lg border border-indigo-100/60">
                      <Sparkles className="w-2.5 h-2.5" /> {session.durationMinutes} mins focus
                    </span>
                    <span className="text-[10px] text-slate-400 font-normal flex items-center gap-1">
                      <Calendar className="w-2.5 h-2.5" /> {new Date(session.$createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-slate-700">{session.notes || 'Focused study block'}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}