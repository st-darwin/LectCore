import React, { useState, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  MapPin, 
  Loader2, 
  Download, 
  X 
} from 'lucide-react';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { Query, ID } from 'appwrite';
import AdminHeader from '../../Components/AdminHeader';

interface TimetableItem {
  $id: string;
  userId: string;
  title: string;
  type: 'lecture' | 'study';
  courseCode?: string;
  venue?: string;
  dayOfWeek: string;
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function StudentTimetable() {
  const [userId, setUserId] = useState<string>('');
  const [items, setItems] = useState<TimetableItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedDay, setSelectedDay] = useState<string>('Monday');

  // Form & Edit Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TimetableItem | null>(null);
  
  const [title, setTitle] = useState('');
  const [type, setType] = useState<'lecture' | 'study'>('study');
  const [courseCode, setCourseCode] = useState('');
  const [venue, setVenue] = useState('');
  const [dayOfWeek, setDayOfWeek] = useState('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [submitting, setSubmitting] = useState(false);

  // Tracks notified sessions to avoid duplicate triggers
  const notifiedSessions = useRef<Set<string>>(new Set());

  useEffect(() => {
    fetchTimetable();
  }, []);

  // Background ticker for 10-minute warning notifications
  useEffect(() => {
    if (items.length === 0 || !userId) return;

    const interval = setInterval(async () => {
      const now = new Date();
      const currentDayIndex = now.getDay();
      const dayMap: Record<number, string> = {
        1: 'Monday',
        2: 'Tuesday',
        3: 'Wednesday',
        4: 'Thursday',
        5: 'Friday',
        6: 'Saturday',
        0: 'Sunday'
      };
      const todayString = dayMap[currentDayIndex];
      const currentHours = now.getHours();
      const currentMinutes = now.getMinutes();
      const totalCurrentMins = currentHours * 60 + currentMinutes;

      for (const item of items) {
        if (item.dayOfWeek !== todayString) continue;

        const [startH, startM] = item.startTime.split(':').map(Number);
        const totalStartMins = startH * 60 + startM;
        const diffMins = totalStartMins - totalCurrentMins;

        if (diffMins === 10) {
          const notificationKey = `${item.$id}-${now.toDateString()}`;
          if (!notifiedSessions.current.has(notificationKey)) {
            notifiedSessions.current.add(notificationKey);
            try {
              await databases.createDocument(
                appwriteConfig.databaseId,
                appwriteConfig.notificationsId,
                ID.unique(),
                {
                  userId: userId,
                  title: `Upcoming ${item.type === 'lecture' ? 'Lecture' : 'Study Session'}`,
                  message: `"${item.title}" starts in 10 minutes at ${item.venue || 'designated venue'}.`,
                  type: 'TIMETABLE',
                  relatedId: item.$id,
                  isRead: false,
                }
              );
            } catch (err) {
              console.error('Failed to dispatch timetable alert:', err);
            }
          }
        }
      }
    }, 30000);

    return () => clearInterval(interval);
  }, [items, userId]);

  const fetchTimetable = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      setUserId(user.$id);

      // Fetch all timetable items created independently by this user
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.timetableId,
        [Query.equal('userId', user.$id)]
      );

      setItems(res.documents as unknown as TimetableItem[]);
    } catch (err) {
      console.error('Failed to load timetable:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingItem(null);
    setTitle('');
    setType('study');
    setCourseCode('');
    setVenue('');
    setDayOfWeek(selectedDay);
    setStartTime('09:00');
    setEndTime('10:00');
    setIsModalOpen(true);
  };

  const openEditModal = (item: TimetableItem) => {
    setEditingItem(item);
    setTitle(item.title);
    setType(item.type || 'study');
    setCourseCode(item.courseCode || '');
    setVenue(item.venue || '');
    setDayOfWeek(item.dayOfWeek);
    setStartTime(item.startTime);
    setEndTime(item.endTime);
    setIsModalOpen(true);
  };

  const handleSaveSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !userId) return;

    try {
      setSubmitting(true);
      const payload = {
        userId,
        title: title.trim(),
        type,
        courseCode: courseCode.trim().toUpperCase(),
        venue: venue.trim(),
        dayOfWeek,
        startTime,
        endTime,
      };

      if (editingItem) {
        const updatedDoc = await databases.updateDocument(
          appwriteConfig.databaseId,
          appwriteConfig.timetableId,
          editingItem.$id,
          payload
        );

        setItems(prev => prev.map(i => i.$id === editingItem.$id ? (updatedDoc as unknown as TimetableItem) : i));
      } else {
        const createdDoc = await databases.createDocument(
          appwriteConfig.databaseId,
          appwriteConfig.timetableId,
          ID.unique(),
          payload
        );

        setItems(prev => [...prev, createdDoc as unknown as TimetableItem]);
      }

      setIsModalOpen(false);
    } catch (err) {
      console.error('Failed to save timetable slot:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.timetableId,
        id
      );
      setItems(prev => prev.filter(i => i.$id !== id));
    } catch (err) {
      console.error('Failed to delete timetable item:', err);
    }
  };

  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Academic Timetable & Study Schedule</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 40px; color: #1e293b; background: #ffffff; }
            h1 { font-size: 22px; margin-bottom: 4px; color: #312e81; }
            p.sub { font-size: 11px; color: #64748b; margin-bottom: 24px; }
            .day-section { margin-bottom: 24px; page-break-inside: avoid; }
            .day-title { font-size: 13px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; color: #4f46e5; border-bottom: 2px solid #e0e7ff; padding-bottom: 6px; margin-bottom: 10px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { text-align: left; padding: 8px 10px; font-size: 11px; border-bottom: 1px solid #f1f5f9; }
            th { color: #4338ca; font-weight: 600; background: #eef2ff; }
            .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: bold; text-transform: uppercase; }
            .badge-lecture { background: #e0e7ff; color: #3730a3; }
            .badge-study { background: #eef2ff; color: #4338ca; }
          </style>
        </head>
        <body>
          <h1>Academic Schedule</h1>
          <p class="sub">Generated via LectCore • ${new Date().toLocaleDateString()}</p>

          ${DAYS.map(day => {
            const daySlots = items.filter(i => i.dayOfWeek === day).sort((a, b) => a.startTime.localeCompare(b.startTime));
            if (daySlots.length === 0) return '';

            return `
              <div class="day-section">
                <div class="day-title">${day}</div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 18%">Time</th>
                      <th style="width: 15%">Type</th>
                      <th style="width: 15%">Course</th>
                      <th style="width: 32%">Title</th>
                      <th style="width: 20%">Venue</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${daySlots.map(s => `
                      <tr>
                        <td><strong>${s.startTime} – ${s.endTime}</strong></td>
                        <td><span class="badge ${s.type === 'lecture' ? 'badge-lecture' : 'badge-study'}">${s.type}</span></td>
                        <td>${s.courseCode || '—'}</td>
                        <td>${s.title}</td>
                        <td>${s.venue || '—'}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            `;
          }).join('')}

          <script>
            window.onload = function() { window.print(); window.close(); }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const filteredItems = items
    .filter(i => i.dayOfWeek === selectedDay)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-3 sm:px-0 space-y-5 pb-16">
        <AdminHeader 
          title="Timetable & Study Planner"
          description="Create and manage your lectures and personal study blocks with automated notifications."
          icon={<CalendarIcon className="w-5 h-5 text-indigo-600" />}
          badgeText="Schedule"
        />
        <div className="flex items-center justify-center py-32 bg-white rounded-3xl border border-indigo-50 shadow-2xs">
          <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5 pb-16 px-3 sm:px-0 animate-in fade-in duration-300">
      
      {/* AdminHeader integration */}
      <AdminHeader 
        title="Timetable & Study Planner"
        description="Create and manage your lectures and personal study blocks with automated notifications."
        icon={<CalendarIcon className="w-5 h-5 text-indigo-600" />}
        badgeText="Schedule"
      />

      {/* Secondary Quick Action Bar for PDF Export & Add Session */}
      <div className="flex items-center justify-between gap-3 bg-indigo-50/50 p-4 rounded-3xl border border-indigo-100/70 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-white hover:bg-indigo-50/40 text-indigo-700 border border-indigo-200/60 rounded-2xl text-xs font-semibold transition-all shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
            title="Export schedule as PDF"
          >
            <Download size={14} className="text-indigo-600" />
            <span>Export PDF</span>
          </button>
        </div>

        <button
          onClick={openCreateModal}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-xs font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
        >
          <Plus size={15} />
          <span>Add Session</span>
        </button>
      </div>

      {/* Minimal Day Switcher Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {DAYS.map((day) => (
          <button
            key={day}
            onClick={() => setSelectedDay(day)}
            className={`px-4 py-2 rounded-2xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
              selectedDay === day
                ? 'bg-indigo-600 text-white shadow-2xs font-semibold'
                : 'bg-white hover:bg-indigo-50/40 text-slate-600 border border-indigo-100/60'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Schedule Items List */}
      <div className="p-5 sm:p-7 rounded-3xl bg-white border border-indigo-100/60 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
          <h2 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">{selectedDay} Schedule</h2>
          <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50/80 px-3 py-1 rounded-full border border-indigo-100/60">
            {filteredItems.length} {filteredItems.length === 1 ? 'Item' : 'Items'}
          </span>
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-14 bg-indigo-50/20 rounded-2xl border border-dashed border-indigo-100 space-y-1.5">
            <Clock size={24} className="mx-auto text-indigo-300" />
            <p className="text-xs font-semibold text-slate-700">No sessions scheduled for {selectedDay}</p>
            <p className="text-[11px] text-slate-400">Click "Add Session" to set up your timetable entry.</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredItems.map((item) => (
              <div
                key={item.$id}
                className="group p-4 rounded-2xl bg-indigo-50/20 hover:bg-indigo-50/40 border border-indigo-100/50 transition-all flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                      item.type === 'lecture'
                        ? 'bg-indigo-100 text-indigo-700 border-indigo-200/80'
                        : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}>
                      {item.type}
                    </span>
                    {item.courseCode && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-white text-indigo-800 border border-indigo-100">
                        {item.courseCode}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xs sm:text-sm font-semibold text-slate-800 truncate">{item.title}</h3>

                  <div className="flex items-center gap-3.5 text-[11px] text-slate-500 font-normal flex-wrap">
                    <span className="flex items-center gap-1">
                      <Clock size={12} className="text-indigo-400" />
                      {item.startTime} – {item.endTime}
                    </span>
                    {item.venue && (
                      <span className="flex items-center gap-1">
                        <MapPin size={12} className="text-indigo-400" />
                        {item.venue}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => openEditModal(item)}
                    className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-100/50 transition-all cursor-pointer"
                    title="Edit session"
                  >
                    <Edit3 size={14} />
                  </button>

                  <button
                    onClick={() => handleDelete(item.$id)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all cursor-pointer"
                    title="Delete session"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Unified Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-indigo-950/20 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-indigo-100 w-full max-w-md overflow-hidden shadow-xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-indigo-50 pb-3">
              <h3 className="text-xs font-bold text-indigo-900 uppercase tracking-wider">
                {editingItem ? 'Edit Timetable Entry' : 'Add Timetable Entry'}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="p-1.5 rounded-xl text-slate-400 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer transition-all"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveSlot} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Session Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType('study')}
                    className={`py-2 rounded-xl text-xs font-medium border cursor-pointer transition-all ${
                      type === 'study'
                        ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-2xs'
                        : 'bg-indigo-50/40 text-indigo-900 border-indigo-100/80 hover:bg-indigo-50'
                    }`}
                  >
                    Study Slot
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('lecture')}
                    className={`py-2 rounded-xl text-xs font-medium border cursor-pointer transition-all ${
                      type === 'lecture'
                        ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-2xs'
                        : 'bg-indigo-50/40 text-indigo-900 border-indigo-100/80 hover:bg-indigo-50'
                    }`}
                  >
                    Lecture Class
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Title / Topic *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSC 201 Lecture or Revision"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-indigo-50/20 border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Course Code</label>
                  <input
                    type="text"
                    placeholder="e.g. CSC 201"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-indigo-50/20 border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white uppercase transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Venue</label>
                  <input
                    type="text"
                    placeholder="e.g. Hall A or Library"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-indigo-50/20 border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-600">Day of Week</label>
                <select
                  value={dayOfWeek}
                  onChange={(e) => setDayOfWeek(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-indigo-50/20 border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                >
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">Start Time</label>
                  <input
                    type="time"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-indigo-50/20 border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-600">End Time</label>
                  <input
                    type="time"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-indigo-50/20 border border-indigo-100 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-indigo-50/50 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
                >
                  {submitting && <Loader2 size={13} className="animate-spin" />}
                  <span>{editingItem ? 'Update Entry' : 'Save Entry'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}