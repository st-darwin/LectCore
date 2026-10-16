import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  User, 
  Loader2, 
  CheckCheck, 
  ArrowLeft,
  Users,
  GraduationCap,
  Sparkles,
  RotateCw,
  ShieldCheck,
  MoreVertical,
  Trash2,
  Reply,
  X,
  Paperclip,
  FileText,
  Plus,
  Briefcase,
  Check,
  Mic,
  UserPlus,
  LogOut,
  Play,
  Pause,
  Square
} from 'lucide-react';
import { client, databases, account, storage, appwriteConfig } from '../../appwrite/Client';
import { Query, ID } from 'appwrite';
import AdminHeader from '../../Components/AdminHeader';

export interface Thread {
  $id: string;
  participantIds: string[];
  type?: string;          // 'direct' | 'group'
  name?: string;          // Group name if type === 'group'
  courseCode?: string;    // Course code if type === 'group'
  adminId?: string;       // Admin user ID for groups
  hiddenForIds?: string[];// Users who cleared/deleted this thread view for themselves
  lastMessage?: string;
  lastMessageAt?: string;
}

export interface Message {
  $id: string;
  threadId: string;
  senderId: string;
  messageText: string;
  isRead: boolean;
  replyToId?: string;
  fileUrl?: string;
  $createdAt: string;
}

export interface AppUser {
  $id: string;
  userId: string;
  name: string;
  email: string;
  role: 'student' | 'lecturer' | 'admin';
  campusId: string;
  avatarUrl?: string;
  lastSeen?: string;
}

// Super Responsive Custom Voice Note Player Component
function VoiceMessagePlayer({ fileUrl, isMe }: { fileUrl: string; isMe: boolean }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const onTimeUpdate = () => {
    if (!audioRef.current) return;
    const current = audioRef.current.currentTime;
    const total = audioRef.current.duration || 0;
    setDuration(total);
    setProgress(total > 0 ? (current / total) * 100 : 0);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="flex items-center gap-2.5 sm:gap-3 py-1 w-full sm:w-[220px] max-w-full">
      <audio 
        ref={audioRef} 
        src={fileUrl} 
        onTimeUpdate={onTimeUpdate}
        onEnded={() => { setIsPlaying(false); setProgress(0); }}
        className="hidden" 
      />
      <button
        type="button"
        onClick={togglePlay}
        className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 transition-all cursor-pointer shadow-2xs ${
          isMe 
            ? 'bg-white text-indigo-600 hover:bg-slate-100' 
            : 'bg-indigo-500 text-white hover:bg-indigo-600'
        }`}
      >
        {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
      </button>

      <div className="flex-1 space-y-1 min-w-[120px]">
        <div className="h-1.5 w-full bg-black/10 rounded-full overflow-hidden relative">
          <div 
            className={`h-full transition-all duration-100 ${isMe ? 'bg-white' : 'bg-indigo-500'}`} 
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex items-center justify-between text-[10px] opacity-80 font-medium">
          <span>{isPlaying ? formatTime(audioRef.current?.currentTime || 0) : 'Voice Note'}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
   
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
   
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'lecturers' | 'students'>('chats');
  const [sidebarSearchQuery, setSidebarSearchQuery] = useState('');
  const [directorySearchQuery, setDirectorySearchQuery] = useState('');

  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [activeThreadMenuId, setActiveThreadMenuId] = useState<string | null>(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Group Modals State & Member Search
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [groupCourseCodeInput, setGroupCourseCodeInput] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);
  const [createGroupSearchQuery, setCreateGroupSearchQuery] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  // Add Member to Group Modal & Member Search
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedUsersToAdd, setSelectedUsersToAdd] = useState<string[]>([]);
  const [addMemberSearchQuery, setAddMemberSearchQuery] = useState('');
  const [isAddingMembers, setIsAddingMembers] = useState(false);

  // Voice Note Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const isCancelledRef = useRef(false);
  const timerIntervalRef = useRef<any>(null);
   
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadBelowCount, setUnreadBelowCount] = useState(0);
   
  const activeThreadRef = useRef<Thread | null>(null);
  useEffect(() => {
    activeThreadRef.current = activeThread;
  }, [activeThread]);

  const isAtBottomRef = useRef(isAtBottom);
  useEffect(() => {
    isAtBottomRef.current = isAtBottom;
  }, [isAtBottom]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  const initChatData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setIsRefreshing(true);
    } else {
      setIsLoadingThreads(true);
    }

    try {
      const user = await account.get();
      if (!user?.$id) return;
      setCurrentUserId(user.$id);

      const [threadsRes, usersRes, unreadRes] = await Promise.all([
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.threadsId,
          [Query.contains('participantIds', user.$id), Query.orderDesc('lastMessageAt')]
        ).catch(() => databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.threadsId,
          [Query.orderDesc('lastMessageAt')]
        )),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.limit(100)]
        ),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.messagesId,
          [Query.equal('isRead', false), Query.limit(100)]
        )
      ]);

      let fetchedThreads = (threadsRes.documents as unknown as Thread[]).filter(
        t => t.participantIds && t.participantIds.includes(user.$id)
      );

      setThreads(fetchedThreads);
      setAllUsers(usersRes.documents as unknown as AppUser[]);

      const counts: Record<string, number> = {};
      unreadRes.documents.forEach((doc: any) => {
        if (doc.senderId !== user.$id) {
          if (activeThreadRef.current?.$id === doc.threadId) return;
          counts[doc.threadId] = (counts[doc.threadId] || 0) + 1;
        }
      });
      setUnreadCounts(counts);
    } catch (error) {
      console.error('Failed to initialize chat data:', error);
    } finally {
      setIsLoadingThreads(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (!currentUserId) return;

    const syncInterval = setInterval(async () => {
      try {
        const [threadsRes, unreadRes] = await Promise.all([
          databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.threadsId,
            [Query.contains('participantIds', currentUserId), Query.orderDesc('lastMessageAt')]
          ).catch(() => null),
          databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.messagesId,
            [Query.equal('isRead', false), Query.limit(100)]
          ).catch(() => null)
        ]);

        if (threadsRes) {
          let fetchedThreads = (threadsRes.documents as unknown as Thread[]).filter(
            t => t.participantIds && t.participantIds.includes(currentUserId)
          );
          setThreads(fetchedThreads);
        }

        if (unreadRes) {
          const counts: Record<string, number> = {};
          unreadRes.documents.forEach((doc: any) => {
            if (doc.senderId !== currentUserId) {
              if (activeThreadRef.current?.$id === doc.threadId) return;
              counts[doc.threadId] = (counts[doc.threadId] || 0) + 1;
            }
          });
          setUnreadCounts(counts);
        }

        if (activeThreadRef.current) {
          const msgRes = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.messagesId,
            [
              Query.equal('threadId', activeThreadRef.current.$id),
              Query.orderAsc('$createdAt'),
              Query.limit(50)
            ]
          ).catch(() => null);

          if (msgRes) {
            const fetchedMsgs = msgRes.documents as unknown as Message[];
            const unreadIncoming = fetchedMsgs.filter(
              m => m.senderId !== currentUserId && !m.isRead
            );

            const updatedIds = new Set<string>();

            if (unreadIncoming.length > 0) {
              await Promise.all(
                unreadIncoming.map(async (message) => {
                  try {
                    await databases.updateDocument(
                      appwriteConfig.databaseId,
                      appwriteConfig.messagesId,
                      message.$id,
                      { isRead: true }
                    );
                    updatedIds.add(message.$id);
                  } catch (error) {
                    console.error(`Failed to mark message ${message.$id} as read:`, error);
                  }
                })
              );
            }

            const normalizedMsgs = fetchedMsgs.map(message =>
              updatedIds.has(message.$id)
                ? { ...message, isRead: true }
                : message
            );

            setMessages(prev => {
              const existingIds = new Set(prev.map(m => m.$id));
              const trulyNewMsgs = normalizedMsgs.filter(m => !existingIds.has(m.$id));

              if (trulyNewMsgs.length > 0) {
                const incomingNewUnread = trulyNewMsgs.filter(
                  m => m.senderId !== currentUserId && !m.isRead
                );
                if (incomingNewUnread.length > 0 && !isAtBottomRef.current) {
                  setUnreadBelowCount(c => c + incomingNewUnread.length);
                }
              }

              const localReadIds = new Set(
                prev.filter(m => m.isRead).map(m => m.$id)
              );

              return normalizedMsgs.map(message =>
                localReadIds.has(message.$id) && message.senderId !== currentUserId
                  ? { ...message, isRead: true }
                  : message
              );
            });
          }
        }
      } catch (err) {}
    }, 2000);

    return () => clearInterval(syncInterval);
  }, [currentUserId]);

  useEffect(() => {
    initChatData();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;
    
    if (
      !appwriteConfig.databaseId || 
      !appwriteConfig.messagesId || 
      !appwriteConfig.threadsId || 
      !appwriteConfig.userCollectionId
    ) {
      return;
    }

    let isMounted = true;
    const msgChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesId}.documents`;
    const userChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.userCollectionId}.documents`;
    const threadChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.threadsId}.documents`;

    const unsubscribe = client.subscribe([msgChannel, userChannel, threadChannel], async (response) => {
      if (!isMounted) return;

      if (response.events.some(e => e.includes(`.collections.${appwriteConfig.userCollectionId}.documents`))) {
        const updatedUser = response.payload as unknown as AppUser;
        setAllUsers(prev => prev.map(u => (u.$id === updatedUser.$id || u.userId === updatedUser.userId) ? updatedUser : u));
        return;
      }

      if (response.events.some(e => e.includes(`.collections.${appwriteConfig.threadsId}.documents.create`))) {
        const newThread = response.payload as unknown as Thread;
        if (newThread.participantIds?.includes(currentUserId)) {
          setThreads(prev => {
            if (prev.some(t => t.$id === newThread.$id)) return prev;
            return [newThread, ...prev];
          });
        }
        return;
      }

      if (response.events.some(e => e.includes(`.collections.${appwriteConfig.threadsId}.documents.update`))) {
        const updatedThread = response.payload as unknown as Thread;
        if (updatedThread.participantIds?.includes(currentUserId)) {
          setThreads(prev => {
            const index = prev.findIndex(t => t.$id === updatedThread.$id);
            if (index !== -1) {
              const copy = [...prev];
              copy[index] = updatedThread;
              return copy;
            }
            return [updatedThread, ...prev];
          });
          if (activeThreadRef.current?.$id === updatedThread.$id) {
            setActiveThread(updatedThread);
          }
        } else {
          setThreads(prev => prev.filter(t => t.$id !== updatedThread.$id));
          if (activeThreadRef.current?.$id === updatedThread.$id) {
            setActiveThread(null);
            setMessages([]);
          }
        }
        return;
      }

      const payload = response.payload as unknown as Message;
      if (response.events.some(e => e.includes('.create'))) {
        const isOpenThread = activeThreadRef.current && payload.threadId === activeThreadRef.current.$id;

        if (isOpenThread) {
          setMessages(prev => {
            if (prev.some(m => m.$id === payload.$id || (m.$id.startsWith('temp-') && m.senderId === payload.senderId))) {
              return prev.map(m => (m.$id.startsWith('temp-') && m.senderId === payload.senderId) ? payload : m);
            }
            return [...prev, payload];
          });

          if (payload.senderId !== currentUserId && !isAtBottomRef.current) {
            setUnreadBelowCount(c => c + 1);
          }

          if (payload.senderId !== currentUserId && !payload.isRead) {
            try {
              await databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.messagesId,
                payload.$id,
                { isRead: true }
              );

              setMessages(prev =>
                prev.map(message =>
                  message.$id === payload.$id
                    ? { ...message, isRead: true }
                    : message
                )
              );
            } catch (err) {
              console.error(`Failed to mark incoming message ${payload.$id} as read:`, err);
            }
          }
        }

        if (isOpenThread) {
          setUnreadCounts(prev => ({ ...prev, [payload.threadId]: 0 }));
        } else if (payload.senderId !== currentUserId) {
          setUnreadCounts(prev => ({
            ...prev,
            [payload.threadId]: (prev[payload.threadId] || 0) + 1
          }));
        }

        setThreads(prev => {
          const index = prev.findIndex(t => t.$id === payload.threadId);
          if (index === -1) {
            initChatData();
            return prev;
          }
          const updatedThread = { 
            ...prev[index], 
            lastMessage: payload.messageText || 'Attachment', 
            lastMessageAt: payload.$createdAt 
          };
          const filtered = prev.filter(t => t.$id !== payload.threadId);
          return [updatedThread, ...filtered];
        });
      }

      if (response.events.some(e => e.includes('.delete'))) {
        setMessages(prev => prev.filter(m => m.$id !== payload.$id));
      }
    });

    const updatePresence = async () => {
      try {
        const userDocs = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.userCollectionId,
          [Query.equal('userId', currentUserId), Query.limit(1)]
        );
        if (userDocs.documents.length > 0) {
          await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            userDocs.documents[0].$id,
            { lastSeen: new Date().toISOString() }
          );
        }
      } catch (err) {}
    };

    updatePresence();
    const heartbeatInterval = setInterval(updatePresence, 30000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(heartbeatInterval);
    };
  }, [currentUserId]);

  useEffect(() => {
    if (!activeThread || !currentUserId) return;

    let isMounted = true;
    const threadId = activeThread.$id;

    setUnreadBelowCount(0);
    setIsAtBottom(true);
    setUnreadCounts(prev => ({ ...prev, [threadId]: 0 }));
    setIsLoadingMessages(true);

    const fetchAndMarkRead = async () => {
      try {
        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.messagesId,
          [
            Query.equal('threadId', threadId),
            Query.orderAsc('$createdAt'),
            Query.limit(50)
          ]
        );

        if (!isMounted) return;

        const fetchedMessages = response.documents as unknown as Message[];
        const unreadIncoming = fetchedMessages.filter(
          message => message.senderId !== currentUserId && !message.isRead
        );

        const successfullyReadIds = new Set<string>();

        if (unreadIncoming.length > 0) {
          await Promise.all(
            unreadIncoming.map(async (message) => {
              try {
                await databases.updateDocument(
                  appwriteConfig.databaseId,
                  appwriteConfig.messagesId,
                  message.$id,
                  { isRead: true }
                );
                successfullyReadIds.add(message.$id);
              } catch (error) {
                console.error(`Failed to mark message ${message.$id} as read:`, error);
              }
            })
          );
        }

        if (!isMounted) return;

        const normalizedMessages = fetchedMessages.map(message =>
          successfullyReadIds.has(message.$id)
            ? { ...message, isRead: true }
            : message
        );

        setMessages(normalizedMessages);
        setIsLoadingMessages(false);

        requestAnimationFrame(() => {
          scrollToBottom('auto');
        });
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        if (isMounted) {
          setIsLoadingMessages(false);
        }
      }
    };

    fetchAndMarkRead();

    return () => {
      isMounted = false;
    };
  }, [activeThread, currentUserId]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceToBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    const bottomReached = distanceToBottom < 80;
    
    setIsAtBottom(bottomReached);
    if (bottomReached) {
      setUnreadBelowCount(0);
    }
  };

  const handleSelectUser = async (targetUser: AppUser) => {
    const targetAuthId = targetUser.userId || targetUser.$id;
    if (!currentUserId || targetAuthId === currentUserId) return;

    const existing = threads.find(t => 
      t.type !== 'group' &&
      t.participantIds?.includes(currentUserId) && 
      t.participantIds?.includes(targetAuthId) &&
      t.participantIds?.length === 2
    );

    if (existing) {
      setActiveThread(existing);
      setSidebarTab('chats');
      return;
    }

    try {
      const newThreadDoc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.threadsId,
        ID.unique(),
        {
          participantIds: [currentUserId, targetAuthId],
          type: 'direct',
          lastMessage: 'Started a conversation',
          lastMessageAt: new Date().toISOString()
        }
      );

      const createdThread = newThreadDoc as unknown as Thread;
      setThreads(prev => [createdThread, ...prev]);
      setActiveThread(createdThread);
      setSidebarTab('chats');
    } catch (error) {
      console.error('Failed to create chat thread:', error);
    }
  };

  const handleCreateProjectGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupNameInput.trim() || !currentUserId || isCreatingGroup) return;

    setIsCreatingGroup(true);
    try {
      const allMembers = Array.from(new Set([currentUserId, ...selectedGroupMemberIds]));

      const newGroupDoc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.threadsId,
        ID.unique(),
        {
          participantIds: allMembers,
          type: 'group',
          name: groupNameInput.trim(),
          courseCode: groupCourseCodeInput.trim().toUpperCase() || 'PROJECT',
          adminId: currentUserId,
          lastMessage: 'Group created',
          lastMessageAt: new Date().toISOString(),
        }
      );

      const createdThread = newGroupDoc as unknown as Thread;
      setThreads(prev => [createdThread, ...prev]);
      setActiveThread(createdThread);
      setSidebarTab('chats');

      setIsGroupModalOpen(false);
      setGroupNameInput('');
      setGroupCourseCodeInput('');
      setSelectedGroupMemberIds([]);
      setCreateGroupSearchQuery('');
    } catch (error) {
      console.error('Failed to create project group:', error);
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleAddMembersToGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThread || activeThread.type !== 'group' || selectedUsersToAdd.length === 0 || isAddingMembers) return;

    setIsAddingMembers(true);
    try {
      const updatedParticipants = Array.from(new Set([...activeThread.participantIds, ...selectedUsersToAdd]));

      const updatedDoc = await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.threadsId,
        activeThread.$id,
        {
          participantIds: updatedParticipants
        }
      );

      const updatedThread = updatedDoc as unknown as Thread;
      setActiveThread(updatedThread);
      setThreads(prev => prev.map(t => t.$id === updatedThread.$id ? updatedThread : t));

      setIsAddMemberModalOpen(false);
      setSelectedUsersToAdd([]);
      setAddMemberSearchQuery('');
    } catch (error) {
      console.error('Failed to add members to group:', error);
    } finally {
      setIsAddingMembers(false);
    }
  };

  const handleExitGroup = async (e: React.MouseEvent, thread: Thread) => {
    e.stopPropagation();
    setActiveThreadMenuId(null);
    if (!currentUserId || thread.type !== 'group') return;

    try {
      const updatedParticipants = thread.participantIds.filter(id => id !== currentUserId);

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.threadsId,
        thread.$id,
        {
          participantIds: updatedParticipants
        }
      );

      setThreads(prev => prev.filter(t => t.$id !== thread.$id));
      if (activeThread?.$id === thread.$id) {
        setActiveThread(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to exit group:', error);
    }
  };

  const startRecording = async () => {
    try {
      audioChunksRef.current = [];
      isCancelledRef.current = false;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (isCancelledRef.current) return;

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, { type: 'audio/webm' });
        await sendVoiceNoteMessage(audioFile);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied or not supported:', err);
      alert('Could not access microphone. Please check your browser permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isCancelledRef.current = false;
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      isCancelledRef.current = true;
      audioChunksRef.current = [];

      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }

      setIsRecording(false);
      clearInterval(timerIntervalRef.current);
    }
  };

  const sendVoiceNoteMessage = async (audioFile: File) => {
    if (!activeThread || !currentUserId || isSending) return;

    setIsSending(true);
    setUnreadBelowCount(0);
    setIsAtBottom(true);
    scrollToBottom('smooth');

    const tempMessageId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      $id: tempMessageId,
      threadId: activeThread.$id,
      senderId: currentUserId,
      messageText: 'Voice Note',
      isRead: false,
      fileUrl: URL.createObjectURL(audioFile),
      $createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMessage]);

    setTimeout(() => {
      scrollToBottom('smooth');
    }, 50);

    try {
      const uploadedFile = await storage.createFile(
        appwriteConfig.storageId,
        ID.unique(),
        audioFile
      );
      const fileView = storage.getFileView(appwriteConfig.storageId, uploadedFile.$id);
      const uploadedFileUrl = fileView.toString();

      const createdMsg = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.messagesId,
        ID.unique(),
        {
          threadId: activeThread.$id,
          senderId: currentUserId,
          messageText: 'Voice Note',
          fileUrl: uploadedFileUrl,
          isRead: false,
        }
      );

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.threadsId,
        activeThread.$id,
        {
          lastMessage: 'Voice Note',
          lastMessageAt: new Date().toISOString(),
        }
      );

      setMessages(prev => prev.map(m => m.$id === tempMessageId ? (createdMsg as unknown as Message) : m));
      
      setTimeout(() => {
        scrollToBottom('smooth');
      }, 50);
    } catch (error) {
      console.error('Failed to send voice note:', error);
      setMessages(prev => prev.filter(m => m.$id !== tempMessageId));
    } finally {
      setIsSending(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!newMessageText.trim() && !selectedFile) || !activeThread || !currentUserId || isSending) return;

    const textToSend = newMessageText.trim();
    const fileToSend = selectedFile;
    const replyTargetId = replyingTo?.$id;
    
    setNewMessageText('');
    setSelectedFile(null);
    setReplyingTo(null);
    setIsSending(true);
    setUnreadBelowCount(0);
    setIsAtBottom(true);

    scrollToBottom('smooth');

    const tempMessageId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      $id: tempMessageId,
      threadId: activeThread.$id,
      senderId: currentUserId,
      messageText: textToSend || (fileToSend ? `Sent an attachment: ${fileToSend.name}` : ''),
      isRead: false,
      replyToId: replyTargetId,
      fileUrl: fileToSend ? URL.createObjectURL(fileToSend) : undefined,
      $createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMessage]);

    setTimeout(() => {
      scrollToBottom('smooth');
    }, 50);

    try {
      let uploadedFileUrl = '';

      if (fileToSend) {
        const uploadedFile = await storage.createFile(
          appwriteConfig.storageId,
          ID.unique(),
          fileToSend
        );
        const fileView = storage.getFileView(appwriteConfig.storageId, uploadedFile.$id);
        uploadedFileUrl = fileView.toString();
      }

      const payload: any = {
        threadId: activeThread.$id,
        senderId: currentUserId,
        messageText: textToSend,
        isRead: false,
      };

      if (replyTargetId) payload.replyToId = replyTargetId;
      if (uploadedFileUrl) payload.fileUrl = uploadedFileUrl;

      const createdMsg = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.messagesId,
        ID.unique(),
        payload
      );

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.threadsId,
        activeThread.$id,
        {
          lastMessage: textToSend || 'Sent an attachment',
          lastMessageAt: new Date().toISOString(),
        }
      );

      setMessages(prev => prev.map(m => m.$id === tempMessageId ? (createdMsg as unknown as Message) : m));
      
      setTimeout(() => {
        scrollToBottom('smooth');
      }, 50);

    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(m => m.$id !== tempMessageId));
      setNewMessageText(textToSend);
      setSelectedFile(fileToSend);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteMessage = async (messageId: string) => {
    setActiveMessageMenuId(null);
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.messagesId,
        messageId
      );
      setMessages(prev => prev.filter(m => m.$id !== messageId));
    } catch (error) {
      console.error('Failed to delete message:', error);
    }
  };

  const getPeerDetails = (thread: Thread) => {
    if (thread.type === 'group') {
      return { 
        name: thread.name || 'Study Group', 
        role: 'group' as const, 
        email: thread.courseCode || 'Project', 
        avatarUrl: '',
        lastSeen: ''
      };
    }
    const peerAuthId = thread.participantIds?.find(id => id !== currentUserId);
    const peerUser = allUsers.find(u => (u.userId === peerAuthId || u.$id === peerAuthId));
    return peerUser || { name: 'Unknown User', role: 'student' as const, email: '', avatarUrl: '', lastSeen: '' };
  };

  const formatPresence = (lastSeenString?: string) => {
    if (!lastSeenString) return { status: 'offline', label: 'Offline' };
     
    const diffMs = new Date().getTime() - new Date(lastSeenString).getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 2) {
      return { status: 'online', label: 'Online' };
    } else if (diffMins < 60) {
      return { status: 'away', label: `Active ${diffMins}m ago` };
    } else if (diffHours < 24) {
      return { status: 'away', label: `Active ${diffHours}h ago` };
    } else {
      return { status: 'offline', label: 'Offline' };
    }
  };

  const renderRoleBadge = (role?: string) => {
    const normalizedRole = role?.toLowerCase() || 'student';
    if (normalizedRole === 'lecturer') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-50 text-purple-600 border border-purple-100 shrink-0">
          <GraduationCap className="w-3 h-3" />
          Lecturer
        </span>
      );
    } else if (normalizedRole === 'group') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
          <Briefcase className="w-3 h-3" />
          Group
        </span>
      );
    } else if (normalizedRole === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
          <ShieldCheck className="w-3 h-3" />
          Admin
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
          <User className="w-3 h-3" />
          Student
        </span>
      );
    }
  };

  const filteredThreads = threads.filter(thread => {
    const details = getPeerDetails(thread);
    return details.name.toLowerCase().includes(sidebarSearchQuery.toLowerCase()) ||
      (thread.courseCode && thread.courseCode.toLowerCase().includes(sidebarSearchQuery.toLowerCase()));
  });

  const filteredLecturers = allUsers.filter(u => 
    u.role === 'lecturer' && 
    u.userId !== currentUserId &&
    u.$id !== currentUserId &&
    u.name?.toLowerCase().includes(directorySearchQuery.toLowerCase())
  );

  const filteredStudents = allUsers.filter(u => 
    (u.role === 'student' || !u.role) && 
    u.userId !== currentUserId &&
    u.$id !== currentUserId &&
    u.name?.toLowerCase().includes(directorySearchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 space-y-3 pb-10 pt-1 text-slate-600">
      <AdminHeader 
        title="Academic Messaging"
        description="Connect and collaborate seamlessly with lecturers, peers, and project groups in real-time."
        icon={<MessageSquare className="w-5 h-5 text-indigo-500" />}
        badgeText="Secure Chat"
      />

      <div className="w-full bg-white border border-slate-100 rounded-2xl sm:rounded-3xl shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-13rem)] sm:h-[calc(100vh-15rem)] min-h-[520px]">
         
        {/* Sidebar */}
        <div className={`lg:col-span-4 border-r border-slate-100 flex flex-col h-full bg-slate-50/20 overflow-hidden ${activeThread ? 'hidden lg:flex' : 'flex'}`}>
            
          <div className="p-2.5 sm:p-3 border-b border-slate-100 flex items-center gap-2 bg-white/90 backdrop-blur-md shrink-0">
            <div className="grid grid-cols-3 gap-1 flex-1">
              {(['chats', 'lecturers', 'students'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className={`py-1.5 px-1 sm:px-2 rounded-xl text-[10px] sm:text-[11px] font-medium tracking-wide transition-all cursor-pointer text-center capitalize truncate ${
                    sidebarTab === tab 
                      ? 'bg-indigo-500 text-white shadow-2xs font-semibold' 
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
            <button
              onClick={() => initChatData(true)}
              disabled={isRefreshing}
              title="Refresh chats and directory"
              className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-500' : ''}`} />
            </button>
          </div>

          <div className="p-2.5 sm:p-3 border-b border-slate-100 bg-white/40 shrink-0 space-y-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={sidebarTab === 'chats' ? "Search conversations..." : `Search ${sidebarTab}...`}
                value={sidebarTab === 'chats' ? sidebarSearchQuery : directorySearchQuery}
                onChange={(e) => {
                  if (sidebarTab === 'chats') setSidebarSearchQuery(e.target.value);
                  else setDirectorySearchQuery(e.target.value);
                }}
                className="w-full bg-slate-100/60 border border-slate-200/60 rounded-xl pl-9 pr-3.5 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-2xs"
              />
            </div>

            {sidebarTab === 'chats' && (
              <button
                onClick={() => setIsGroupModalOpen(true)}
                className="w-full py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-semibold flex items-center justify-center gap-2 transition cursor-pointer border border-indigo-100/60 shadow-2xs"
              >
                <Plus className="w-4 h-4" />
                <span>Create Project Group</span>
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 min-h-0">
            {sidebarTab === 'chats' ? (
              isLoadingThreads ? (
                <div className="py-24 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  <p className="text-xs text-slate-400 font-medium">Loading conversations...</p>
                </div>
              ) : filteredThreads.length === 0 ? (
                <div className="py-20 px-4 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto stroke-1" />
                  <p className="text-xs font-medium text-slate-700">No chats or groups found</p>
                  <p className="text-[11px] text-slate-400">Create a group or select a peer to start messaging.</p>
                </div>
              ) : (
                filteredThreads.map((thread) => {
                  const isSelected = activeThread?.$id === thread.$id;
                  const details = getPeerDetails(thread);
                  const presence = formatPresence(details.lastSeen);
                  const unreadCount = unreadCounts[thread.$id] || 0;

                  return (
                    <div
                      key={thread.$id}
                      onClick={() => setActiveThread(thread)}
                      className={`w-full p-3 text-left transition-all flex items-start gap-3 cursor-pointer relative group ${
                        isSelected ? 'bg-indigo-50/65 border-l-2 border-indigo-500' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-2xl overflow-hidden bg-indigo-50/80 border border-indigo-100/60 flex items-center justify-center relative shadow-2xs">
                          {details.avatarUrl ? (
                            <img src={details.avatarUrl} alt={details.name} className="w-full h-full object-cover" />
                          ) : thread.type === 'group' ? (
                            <Briefcase className="w-4 h-4 text-indigo-500" />
                          ) : (
                            <User className="w-4 h-4 text-indigo-400" />
                          )}
                        </div>
                        {thread.type !== 'group' && (
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                            presence.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                          }`} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-medium text-slate-800 truncate">{details.name}</h4>
                          <div className="flex items-center gap-1.5">
                            {renderRoleBadge(details.role)}
                            
                            <div className="relative">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveThreadMenuId(activeThreadMenuId === thread.$id ? null : thread.$id);
                                }}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-all"
                              >
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>

                              {activeThreadMenuId === thread.$id && (
                                <div className="absolute right-0 top-6 w-36 bg-white border border-slate-100 rounded-2xl shadow-md py-1 z-20">
                                  {thread.type === 'group' ? (
                                    <button
                                      onClick={(e) => handleExitGroup(e, thread)}
                                      className="w-full px-3 py-1.5 text-left text-xs font-medium text-rose-500 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                                    >
                                      <LogOut className="w-3.5 h-3.5" />
                                      Exit Group
                                    </button>
                                  ) : null}
                                </div>
                              )}
                            </div>

                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs truncate font-normal ${unreadCount > 0 ? 'font-medium text-slate-800' : 'text-slate-400'}`}>
                            {thread.lastMessage || 'Started a conversation'}
                          </p>
                          {unreadCount > 0 && (
                            <span className="ml-2 bg-indigo-500 text-white text-[10px] font-semibold px-1.5 py-0.2 rounded-full shrink-0 min-w-4 text-center">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              (sidebarTab === 'lecturers' ? filteredLecturers : filteredStudents).length === 0 ? (
                <div className="py-20 text-center px-4 space-y-1">
                  <Users className="w-7 h-7 text-slate-300 mx-auto stroke-1" />
                  <p className="text-xs font-medium text-slate-600">No {sidebarTab} found</p>
                </div>
              ) : (
                (sidebarTab === 'lecturers' ? filteredLecturers : filteredStudents).map((userObj) => {
                  const presence = formatPresence(userObj.lastSeen);
                  return (
                    <button
                      key={userObj.$id}
                      onClick={() => handleSelectUser(userObj)}
                      className="w-full p-3 text-left transition-all hover:bg-indigo-50/30 flex items-center justify-between gap-3 cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="relative shrink-0">
                          <div className="w-8 h-8 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200/50 flex items-center justify-center shadow-2xs">
                            {userObj.avatarUrl ? (
                              <img src={userObj.avatarUrl} alt={userObj.name} className="w-full h-full object-cover" />
                            ) : (
                              userObj.role === 'lecturer' ? <GraduationCap className="w-3.5 h-3.5 text-indigo-500" /> : <User className="w-3.5 h-3.5 text-slate-500" />
                            )}
                          </div>
                          <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white ${
                            presence.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                          }`} />
                        </div>
                        <div className="min-w-0 space-y-0.5">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-medium text-slate-800 truncate group-hover:text-indigo-500 transition-colors">{userObj.name}</h4>
                            {renderRoleBadge(userObj.role)}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{presence.label}</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-medium px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-indigo-500 group-hover:text-white transition-all shrink-0">
                        Chat
                      </span>
                    </button>
                  );
                })
              )
            )}
          </div>
        </div>

        {/* Chat Window Panel */}
        <div className={`lg:col-span-8 flex flex-col h-full bg-white overflow-hidden ${!activeThread ? 'hidden lg:flex' : 'flex'}`}>
          {activeThread ? (
            <>
              <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-white/95 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <button 
                    onClick={() => setActiveThread(null)}
                    className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-2xl overflow-hidden bg-indigo-50 border border-indigo-100 flex items-center justify-center shadow-2xs">
                      {activeThread.type === 'group' ? (
                        <Briefcase className="w-4 h-4 text-indigo-500" />
                      ) : getPeerDetails(activeThread).avatarUrl ? (
                        <img src={getPeerDetails(activeThread).avatarUrl} alt="Peer" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-indigo-500" />
                      )}
                    </div>
                    {activeThread.type !== 'group' && (() => {
                      const peer = getPeerDetails(activeThread);
                      const presence = formatPresence(peer.lastSeen);
                      return <span className={`absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-white ${presence.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`} />;
                    })()}
                  </div>
                  <div className="space-y-0 min-w-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <h3 className="text-xs font-medium text-slate-800 truncate">
                        {getPeerDetails(activeThread).name}
                      </h3>
                      {renderRoleBadge(getPeerDetails(activeThread).role)}
                    </div>
                    {activeThread.type === 'group' ? (
                      <span className="text-[10px] text-slate-400 font-medium truncate block">
                        {activeThread.participantIds.length} members • {activeThread.courseCode}
                      </span>
                    ) : (() => {
                      const peer = getPeerDetails(activeThread);
                      const presence = formatPresence(peer.lastSeen);
                      return (
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5 truncate">
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${presence.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                          {presence.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {activeThread.type === 'group' && activeThread.adminId === currentUserId && (
                    <button
                      onClick={() => setIsAddMemberModalOpen(true)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-[11px] font-semibold transition cursor-pointer border border-indigo-100 shadow-2xs"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Add Members</span>
                    </button>
                  )}
                  {activeThread.type === 'group' && (
                    <button
                      onClick={(e) => handleExitGroup(e, activeThread)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 text-[11px] font-semibold transition cursor-pointer border border-rose-100 shadow-2xs"
                      title="Exit Group"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Exit</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Message List Container */}
              <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 bg-slate-50/10 min-h-0 relative"
              >
                {isLoadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    <p className="text-xs text-slate-400">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-20">
                    <Sparkles className="w-7 h-7 text-indigo-300 stroke-1" />
                    <p className="text-xs font-medium text-slate-700">Start the conversation</p>
                    <p className="text-[11px] text-slate-400">Send a message or voice note to begin collaborating securely.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUserId;
                    const repliedMsg = messages.find(m => m.$id === msg.replyToId);
                    const isImage = msg.fileUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileUrl);
                    const isVoiceNote = msg.messageText === 'Voice Note' || (msg.fileUrl && (msg.fileUrl.includes('.webm') || msg.fileUrl.includes('.ogg') || msg.fileUrl.includes('audio')));
                    const senderUser = allUsers.find(u => u.userId === msg.senderId || u.$id === msg.senderId);

                    return (
                      <div 
                        key={msg.$id} 
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-0.5 relative group`}
                      >
                        {!isMe && activeThread.type === 'group' && senderUser && (
                          <span className="text-[10px] font-semibold text-indigo-600 px-1">
                            {senderUser.name}
                          </span>
                        )}

                        <div className={`flex items-center gap-1.5 sm:gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div 
                            className={`max-w-[85%] sm:max-w-[70%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs relative space-y-1.5 ${
                              isMe 
                                ? 'bg-indigo-500 text-white rounded-br-xs font-normal' 
                                : 'bg-white text-slate-700 border border-slate-100 rounded-bl-xs'
                            }`}
                          >
                            {repliedMsg && (
                              <div className={`px-2.5 py-1 rounded-xl text-[11px] border-l-2 flex flex-col gap-0.5 ${
                                isMe 
                                  ? 'bg-indigo-600/40 border-white text-white/90' 
                                  : 'bg-slate-50 border-indigo-400 text-slate-600'
                              }`}>
                                <span className={`font-medium text-[10px] ${isMe ? 'text-white' : 'text-indigo-500'}`}>
                                  {repliedMsg.senderId === currentUserId ? 'You' : (senderUser?.name || 'User')}
                                </span>
                                <p className="truncate opacity-90">{repliedMsg.messageText || 'Attachment'}</p>
                              </div>
                            )}

                            {isVoiceNote && msg.fileUrl ? (
                              <VoiceMessagePlayer fileUrl={msg.fileUrl} isMe={isMe} />
                            ) : msg.fileUrl && (
                              <div className="rounded-xl overflow-hidden">
                                {isImage ? (
                                  <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                                    <img src={msg.fileUrl} alt="attachment" className="max-h-44 rounded-xl object-cover w-full hover:opacity-95 transition-opacity" />
                                  </a>
                                ) : (
                                  <a 
                                    href={msg.fileUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer" 
                                    className={`flex items-center gap-2 p-2 rounded-xl transition-all ${isMe ? 'bg-indigo-600 text-white hover:bg-indigo-600/80' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'}`}
                                  >
                                    <FileText className="w-4 h-4 shrink-0" />
                                    <span className="truncate text-[11px] font-medium underline">View Attachment</span>
                                  </a>
                                )}
                              </div>
                            )}

                            {!isVoiceNote && msg.messageText && <p className="break-words">{msg.messageText}</p>}
                          </div>

                          <div className="relative opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setActiveMessageMenuId(activeMessageMenuId === msg.$id ? null : msg.$id)}
                              className="p-1 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-slate-600 shadow-2xs cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeMessageMenuId === msg.$id && (
                              <div className={`absolute ${isMe ? 'right-0' : 'left-0'} top-7 w-28 bg-white border border-slate-100 rounded-2xl shadow-md py-1 z-20`}>
                                <button
                                  onClick={() => {
                                    setReplyingTo(msg);
                                    setActiveMessageMenuId(null);
                                  }}
                                  className="w-full px-3 py-1.5 text-left text-xs font-medium text-slate-600 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Reply className="w-3 h-3 text-indigo-500" />
                                  Reply
                                </button>
                                <button
                                  onClick={() => handleDeleteMessage(msg.$id)}
                                  className="w-full px-3 py-1.5 text-left text-xs font-medium text-rose-500 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1 font-medium">
                          <span>{new Date(msg.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && <CheckCheck className={`w-3.5 h-3.5 ml-0.5 ${msg.isRead ? 'text-indigo-500' : 'text-slate-300'}`} />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />

                {!isAtBottom && (
                  <div className="sticky bottom-3 float-right clear-both mr-2 z-20">
                    <button
                      onClick={() => {
                        scrollToBottom('smooth');
                        setUnreadBelowCount(0);
                        setIsAtBottom(true);
                      }}
                      className="relative p-2.5 rounded-full bg-indigo-500 text-white shadow-md hover:bg-indigo-600 transition-all cursor-pointer flex items-center justify-center"
                      title="Scroll to bottom"
                    >
                      <ArrowLeft className="w-3.5 h-3.5 rotate-[-90deg]" />
                      {unreadBelowCount > 0 && (
                        <span className="absolute -top-1 -right-1 bg-emerald-500 text-white text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center border-2 border-white">
                          {unreadBelowCount}
                        </span>
                      )}
                    </button>
                  </div>
                )}
              </div>

              {replyingTo && (
                <div className="px-3 sm:px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2.5 truncate text-slate-600 border-l-2 border-indigo-500 pl-2.5 py-0.5">
                    <div className="flex flex-col truncate">
                      <span className="font-medium text-[10px] text-indigo-500">
                        Replying to message
                      </span>
                      <span className="truncate text-slate-400 text-[10px]">{replyingTo.messageText || 'Attachment'}</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setReplyingTo(null)}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer transition-all"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {selectedFile && (
                <div className="px-3 sm:px-4 py-2 bg-indigo-50/50 border-t border-indigo-100/60 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2 truncate text-indigo-900">
                    <Paperclip className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span className="truncate font-medium text-[11px]">{selectedFile.name}</span>
                  </div>
                  <button 
                    onClick={() => setSelectedFile(null)}
                    className="p-1 rounded-lg text-indigo-400 hover:text-indigo-600 hover:bg-indigo-100/50 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Super-Responsive Recording Bar UI */}
              {isRecording && (
                <div className="px-3 sm:px-4 py-2.5 bg-rose-500 text-white border-t border-rose-600 flex items-center justify-between gap-2 sm:gap-3 text-xs shrink-0 shadow-md">
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
                    <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                      <span className="font-semibold tabular-nums shrink-0 tracking-wider">
                        {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, '0')}
                      </span>
                      <div className="flex items-center gap-0.5 h-4 flex-1 max-w-[120px] sm:max-w-[160px] overflow-hidden opacity-90">
                        {[...Array(12)].map((_, i) => (
                          <span 
                            key={i} 
                            className="w-1 bg-white rounded-full animate-pulse"
                            style={{ 
                              height: `${Math.max(25, Math.sin(i + recordingTime * 3) * 100)}%`,
                              animationDelay: `${i * 0.08}s` 
                            }} 
                          />
                        ))}
                      </div>
                      <span className="text-[10px] sm:text-[11px] opacity-90 truncate font-medium hidden xs:inline">Recording...</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={cancelRecording}
                      className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-white/20 text-white hover:bg-white/30 font-medium transition cursor-pointer border border-white/20 text-[10px] sm:text-[11px]"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={stopRecording}
                      className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-white text-rose-600 font-bold hover:bg-slate-100 transition cursor-pointer flex items-center gap-1 shadow-xs text-[10px] sm:text-[11px]"
                    >
                      <Square className="w-3 h-3 fill-current" />
                      <span>Send</span>
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 border-t border-slate-100 bg-white flex items-center gap-1.5 sm:gap-2 shrink-0">
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={(e) => e.target.files?.[0] && setSelectedFile(e.target.files[0])} 
                  className="hidden" 
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  title="Attach file"
                  className="p-2 sm:p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500 transition-all cursor-pointer shrink-0 shadow-2xs"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  title={isRecording ? "Stop recording" : "Record voice note"}
                  className={`p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer shrink-0 shadow-2xs ${
                    isRecording ? 'bg-rose-500 text-white animate-bounce' : 'bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500'
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-50 border border-slate-200/60 rounded-xl px-3 sm:px-3.5 py-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all shadow-2xs min-w-0"
                />
                <button
                  type="submit"
                  disabled={(!newMessageText.trim() && !selectedFile) || isSending}
                  className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white p-2.5 sm:px-3.5 sm:py-3 rounded-full text-xs font-medium transition-all duration-200 flex items-center justify-center shadow-2xs cursor-pointer shrink-0"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 sm:p-8 space-y-2.5 bg-slate-50/10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-2xs">
                <MessageSquare className="w-5 h-5 stroke-1" />
              </div>
              <h3 className="text-xs font-medium text-slate-700">No chat selected</h3>
              <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                Choose an active conversation from the sidebar or pick a user from the directory to start talking.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Create Project / Study Group Modal */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
                  <Briefcase className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Create Project Group</h3>
                  <p className="text-[10px] text-slate-400">You will be designated as group admin</p>
                </div>
              </div>
              <button 
                onClick={() => setIsGroupModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProjectGroup} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Group Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CSC 201 Project Team"
                  value={groupNameInput}
                  onChange={(e) => setGroupNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Course Code</label>
                <input
                  type="text"
                  placeholder="e.g. CSC 201"
                  value={groupCourseCodeInput}
                  onChange={(e) => setGroupCourseCodeInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white uppercase shadow-2xs"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Add Initial Members ({selectedGroupMemberIds.length} selected)</label>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={createGroupSearchQuery}
                    onChange={(e) => setCreateGroupSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white shadow-2xs"
                  />
                </div>
                <div className="border border-slate-200 rounded-2xl max-h-40 sm:max-h-44 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                  {allUsers.filter(u => u.userId !== currentUserId && u.$id !== currentUserId && u.name.toLowerCase().includes(createGroupSearchQuery.toLowerCase())).length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No matching members found.</div>
                  ) : (
                    allUsers
                      .filter(u => u.userId !== currentUserId && u.$id !== currentUserId && u.name.toLowerCase().includes(createGroupSearchQuery.toLowerCase()))
                      .map(user => {
                        const targetId = user.userId || user.$id;
                        const isSelected = selectedGroupMemberIds.includes(targetId);
                        return (
                          <div 
                            key={user.$id}
                            onClick={() => {
                              setSelectedGroupMemberIds(prev => 
                                isSelected ? prev.filter(id => id !== targetId) : [...prev, targetId]
                              );
                            }}
                            className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/80' : 'hover:bg-white'}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center shadow-2xs">
                                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-3.5 h-3.5 text-slate-500" />}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-800">{user.name}</p>
                                <p className="text-[10px] text-slate-400 capitalize">{user.role || 'Student'}</p>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-lg border flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white'}`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsGroupModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!groupNameInput.trim() || isCreatingGroup}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-2xs"
                >
                  {isCreatingGroup && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Group</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {isAddMemberModalOpen && activeThread && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-2xs">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800">Add Members</h3>
                  <p className="text-[10px] text-slate-400">Select users to include in this group</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddMemberModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMembersToGroup} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto flex-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Select Users ({selectedUsersToAdd.length} selected)</label>
                </div>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search users..."
                    value={addMemberSearchQuery}
                    onChange={(e) => setAddMemberSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-500 focus:bg-white shadow-2xs"
                  />
                </div>
                <div className="border border-slate-200 rounded-2xl max-h-48 overflow-y-auto divide-y divide-slate-100 bg-slate-50/50">
                  {allUsers.filter(u => {
                    const id = u.userId || u.$id;
                    const notInGroup = !activeThread.participantIds.includes(id);
                    const matchesSearch = u.name.toLowerCase().includes(addMemberSearchQuery.toLowerCase());
                    return notInGroup && matchesSearch;
                  }).length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-400">No matching users available to add.</div>
                  ) : (
                    allUsers
                      .filter(u => {
                        const id = u.userId || u.$id;
                        const notInGroup = !activeThread.participantIds.includes(id);
                        const matchesSearch = u.name.toLowerCase().includes(addMemberSearchQuery.toLowerCase());
                        return notInGroup && matchesSearch;
                      })
                      .map(user => {
                        const targetId = user.userId || user.$id;
                        const isSelected = selectedUsersToAdd.includes(targetId);
                        return (
                          <div 
                            key={user.$id}
                            onClick={() => {
                              setSelectedUsersToAdd(prev => 
                                isSelected ? prev.filter(id => id !== targetId) : [...prev, targetId]
                              );
                            }}
                            className={`p-2.5 flex items-center justify-between cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50/80' : 'hover:bg-white'}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-xl bg-slate-200 overflow-hidden flex items-center justify-center shadow-2xs">
                                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <User className="w-3.5 h-3.5 text-slate-500" />}
                              </div>
                              <div>
                                <p className="text-xs font-medium text-slate-800">{user.name}</p>
                                <p className="text-[10px] text-slate-400 capitalize">{user.role || 'Student'}</p>
                              </div>
                            </div>
                            <div className={`w-4 h-4 rounded-lg border flex items-center justify-center ${isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'border-slate-300 bg-white'}`}>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddMemberModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedUsersToAdd.length === 0 || isAddingMembers}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-2xs"
                >
                  {isAddingMembers && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Add Selected Members</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}