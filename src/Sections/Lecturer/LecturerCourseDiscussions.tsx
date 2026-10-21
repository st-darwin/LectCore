import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseDiscussions, createDiscussionPost, deleteDiscussionPost, type DiscussionPost } from '../../services/discussionService';
import { account, databases, appwriteConfig } from '../../appwrite/Client';
import { MessageSquare, Plus, Trash2, Send, ArrowLeft, Loader2, UserCheck, Sparkles, ShieldCheck, X, MessageCircle } from 'lucide-react';

export default function LecturerCourseDiscussions() {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string>('');
  const [lecturerName, setLecturerName] = useState<string>('Instructor');
  const [courseCode, setCourseCode] = useState<string>('Course');
  const [posts, setPosts] = useState<DiscussionPost[]>([]);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Reply state
  const [replyingToId, setReplyingToId] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState<string>('');
  const [replySubmitting, setReplySubmitting] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchData();
    }
  }, [courseId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      setUserId(user.$id);
      setLecturerName(user.name || user.email?.split('@')[0] || 'Instructor');

      try {
        const courseDoc: any = await databases.getDocument(
          appwriteConfig.databaseId,
          appwriteConfig.courseId,
          courseId!
        );
        if (courseDoc?.courseCode) {
          setCourseCode(courseDoc.courseCode);
        }
      } catch (err) {
        console.warn("Could not load course meta info", err);
      }

      const data = await getCourseDiscussions(courseId!);
      setPosts(data as unknown as DiscussionPost[]);
    } catch (err) {
      console.error('Failed to load discussions data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim() || !courseId || !userId) return;

    setSubmitting(true);
    try {
      await createDiscussionPost({
        courseId,
        userId,
        authorName: lecturerName,
        role: 'lecturer',
        title,
        content,
      });
      setTitle('');
      setContent('');
      const data = await getCourseDiscussions(courseId);
      setPosts(data as unknown as DiscussionPost[]);
    } catch (err) {
      console.error('Failed to post lecturer announcement', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendReply = async (parentPost: DiscussionPost) => {
    if (!replyContent.trim() || !courseId || !userId) return;

    setReplySubmitting(true);
    try {
      await createDiscussionPost({
        courseId,
        userId,
        authorName: lecturerName,
        role: 'lecturer',
        title: `Re: ${parentPost.title}`,
        content: replyContent,
      });
      setReplyContent('');
      setReplyingToId(null);
      const data = await getCourseDiscussions(courseId);
      setPosts(data as unknown as DiscussionPost[]);
    } catch (err) {
      console.error('Failed to post reply', err);
    } finally {
      setReplySubmitting(false);
    }
  };

  const handleDelete = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this discussion thread?")) return;
    try {
      await deleteDiscussionPost(postId);
      const data = await getCourseDiscussions(courseId!);
      setPosts(data as unknown as DiscussionPost[]);
    } catch (err) {
      console.error('Failed to delete post', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-28 sm:py-36 bg-white/80 backdrop-blur-xl rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 shadow-2xs">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-7 h-7 sm:w-8 sm:h-8 text-indigo-600 animate-spin" />
          <p className="text-xs font-semibold text-slate-400 tracking-wide">Loading course discussions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-4 sm:space-y-6 pb-20 sm:pb-16 animate-in fade-in duration-300 px-3 sm:px-0">
      
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => navigate(-1)}
          className="group inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl sm:rounded-2xl bg-white hover:bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-600 shadow-2xs hover:shadow-xs transition-all cursor-pointer active:scale-95 shrink-0"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          <span className="hidden xs:inline">Back to Course</span>
          <span className="xs:hidden">Back</span>
        </button>

        <span className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-indigo-50 border border-indigo-100/80 text-[11px] sm:text-xs font-bold text-indigo-700 shadow-2xs truncate max-w-[180px] sm:max-w-none">
          {courseCode} • Faculty Q&A
        </span>
      </div>

      {/* Hero Header Banner */}
      <div className="relative overflow-hidden p-5 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-indigo-50/80 via-white to-sky-50/50 border border-indigo-100/80 shadow-lg shadow-indigo-100/20 space-y-2">
        <div className="absolute -right-16 -top-16 w-48 h-48 sm:w-64 sm:h-64 bg-indigo-200/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-48 h-48 sm:w-64 sm:h-64 bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3 sm:gap-4">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div className="min-w-0">
            <h1 className="text-base sm:text-2xl font-semibold tracking-tight text-slate-900 truncate">
              Course Q&A & Moderator Hub
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium line-clamp-1 sm:line-clamp-none">
              Respond to student questions, provide official announcements, and moderate discussions.
            </p>
          </div>
        </div>
      </div>

      {/* Post Official Announcement / Thread Card */}
      <div className="p-4 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-white/90 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-3 sm:space-y-4">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
            <Plus size={15} />
          </div>
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Start New Announcement or Topic</h2>
        </div>

        <form onSubmit={handleCreatePost} className="space-y-3 sm:space-y-4 pt-1">
          <input
            type="text"
            placeholder="Topic title (e.g., Midterm Exam Guidelines)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3.5 sm:px-4 py-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
            required
          />
          <textarea
            placeholder="Provide your official post or start a discussion thread for your students..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className="w-full px-3.5 sm:px-4 py-3 rounded-xl sm:rounded-2xl bg-slate-50 border border-slate-200/80 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
            required
          />
          <div className="flex justify-end pt-1">
            <button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto px-5 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl sm:rounded-2xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {submitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              <span>{submitting ? 'Publishing...' : 'Publish Official Post'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Discussion Threads List */}
      <div className="p-4 sm:p-8 rounded-[2rem] sm:rounded-[2.5rem] bg-white/90 backdrop-blur-xl border border-slate-100 shadow-2xs space-y-4 sm:space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center border border-indigo-100 shrink-0">
              <MessageSquare size={15} />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Student & Faculty Discussions</h2>
              <p className="text-[10px] sm:text-[11px] text-slate-400">All course threads and student inquiries</p>
            </div>
          </div>
          <span className="px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold border border-indigo-100 shrink-0">
            {posts.filter(p => !p.title.startsWith('Re:')).length} {posts.filter(p => !p.title.startsWith('Re:')).length === 1 ? 'Thread' : 'Threads'}
          </span>
        </div>

        {posts.filter(p => !p.title.startsWith('Re:')).length === 0 ? (
          <div className="text-center py-12 sm:py-16 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-2 px-4">
            <MessageSquare size={26} className="mx-auto text-slate-400 opacity-60" />
            <p className="text-xs font-bold text-slate-700">No Discussions Yet</p>
            <p className="text-[11px] text-slate-400 max-w-xs mx-auto leading-relaxed">
              Students have not started any discussion threads for this course yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const isReply = post.title.startsWith('Re:');
              if (isReply) return null;

              const replies = posts.filter(p => p.title === `Re: ${post.title}`);

              return (
                <div 
                  key={post.$id}
                  className="group p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/70 hover:border-indigo-300 hover:shadow-xs transition-all duration-200 space-y-3.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700">
                          {post.authorName || 'User'}
                        </span>
                        {post.role === 'lecturer' ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 flex items-center gap-1">
                            <UserCheck size={10} /> Lecturer (You)
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-50 text-sky-700">
                            Student
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">
                          {post.$createdAt ? new Date(post.$createdAt).toLocaleDateString() : 'Just now'}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition-colors break-words">
                        {post.title}
                      </h3>
                    </div>

                    {post.$id && (
                      <button
                        onClick={() => handleDelete(post.$id!)}
                        className="text-slate-400 hover:text-rose-600 transition-colors p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer shrink-0"
                        title="Delete thread (Moderator)"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed break-words bg-slate-50/50 p-3 sm:p-3.5 rounded-xl border border-slate-100">
                    {post.content}
                  </p>

                  {/* Render Nested Replies */}
                  {replies.length > 0 && (
                    <div className="pl-3 sm:pl-4 space-y-2.5 pt-1 border-l-2 border-indigo-200 my-2">
                      {replies.map((reply) => (
                        <div key={reply.$id} className="p-3 rounded-xl bg-indigo-50/20 border border-indigo-100/60 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white text-slate-700 border border-slate-200/60">
                                {reply.authorName || 'Instructor'}
                              </span>
                              {reply.role === 'lecturer' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 flex items-center gap-1">
                                  <UserCheck size={10} /> Lecturer (You)
                                </span>
                              )}
                              <span className="text-[10px] text-slate-400">
                                {reply.$createdAt ? new Date(reply.$createdAt).toLocaleDateString() : 'Just now'}
                              </span>
                            </div>

                            {reply.$id && (
                              <button
                                onClick={() => handleDelete(reply.$id!)}
                                className="text-slate-400 hover:text-rose-600 transition-colors p-1 rounded hover:bg-rose-50 cursor-pointer shrink-0"
                                title="Delete reply"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                          <p className="text-[11px] sm:text-xs text-slate-600 whitespace-pre-wrap leading-relaxed break-words">
                            {reply.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Reply Actions & Form */}
                  <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => {
                          if (replyingToId === post.$id) {
                            setReplyingToId(null);
                            setReplyContent('');
                          } else {
                            setReplyingToId(post.$id!);
                            setReplyContent('');
                          }
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 cursor-pointer bg-indigo-50/60 hover:bg-indigo-50 px-3 py-1.5 rounded-xl transition-all shrink-0"
                      >
                        {replyingToId === post.$id ? (
                          <>
                            <X size={13} />
                            <span>Cancel Answer</span>
                          </>
                        ) : (
                          <>
                            <MessageCircle size={13} />
                            <span>Answer as Lecturer ({replies.length})</span>
                          </>
                        )}
                      </button>

                      <span className="text-[10px] text-slate-400 hidden xs:flex items-center gap-1 font-medium">
                        <Sparkles size={11} className="text-indigo-500" /> Moderator Access
                      </span>
                    </div>

                    {/* Inline Answer Field */}
                    {replyingToId === post.$id && (
                      <div className="pt-2 space-y-2 animate-in fade-in duration-200">
                        <textarea
                          placeholder={`Write official instructor answer to "${post.title}"...`}
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          rows={2}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-indigo-50/30 border border-indigo-100 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSendReply(post)}
                            disabled={replySubmitting || !replyContent.trim()}
                            className="w-full xs:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-xs disabled:opacity-50 cursor-pointer active:scale-95"
                          >
                            {replySubmitting ? (
                              <Loader2 size={13} className="animate-spin" />
                            ) : (
                              <Send size={12} />
                            )}
                            <span>Post Official Answer</span>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}