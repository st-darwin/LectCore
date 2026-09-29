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
  FileText
} from 'lucide-react';
import { client, databases, account, storage, appwriteConfig } from '../../appwrite/Client';
import { Query, ID } from 'appwrite';
import AdminHeader from '../../Components/AdminHeader';

export interface Thread {
  $id: string;
  participantIds: string[];
  type?: string;
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
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const [activeThreadMenuId, setActiveThreadMenuId] = useState<string | null>(null);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
   
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

  // Helper function to reliably scroll to the very bottom
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

      if (response.events.some(e => e.includes(`.collections.${appwriteConfig.threadsId}.documents.delete`))) {
        const deletedThread = response.payload as unknown as Thread;
        setThreads(prev => prev.filter(t => t.$id !== deletedThread.$id));
        if (activeThreadRef.current?.$id === deletedThread.$id) {
          setActiveThread(null);
          setMessages([]);
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
          if (index === -1) return prev;
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
        } else {
          try {
            await databases.updateDocument(
              appwriteConfig.databaseId,
              appwriteConfig.userCollectionId,
              currentUserId,
              { lastSeen: new Date().toISOString() }
            );
          } catch (innerErr) {}
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
          lastMessageAt: new Date().toISOString(),
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

    // Scroll directly to the bottom right when sending a message
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

    // Ensure scroll position snaps/smooths down after optimistic render update
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
      
      // Scroll down once more when message is confirmed and saved successfully
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

  const handleDeleteThread = async (e: React.MouseEvent, threadId: string) => {
    e.stopPropagation();
    setActiveThreadMenuId(null);

    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.threadsId,
        threadId
      );
      setThreads(prev => prev.filter(t => t.$id !== threadId));
      if (activeThread?.$id === threadId) {
        setActiveThread(null);
        setMessages([]);
      }
    } catch (error) {
      console.error('Failed to delete thread:', error);
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

  const getPeerDetails = (participantIds: string[] = []) => {
    const peerAuthId = participantIds.find(id => id !== currentUserId);
    const peerUser = allUsers.find(u => (u.userId === peerAuthId || u.$id === peerAuthId));
    return peerUser || { name: 'Unknown User', role: 'student', email: '', avatarUrl: '', lastSeen: '' };
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

  const filteredLecturers = allUsers.filter(u => 
    u.role === 'lecturer' && 
    u.userId !== currentUserId &&
    u.$id !== currentUserId &&
    u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredStudents = allUsers.filter(u => 
    (u.role === 'student' || !u.role) && 
    u.userId !== currentUserId &&
    u.$id !== currentUserId &&
    u.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-4 pb-12 pt-2 text-slate-600">
      <AdminHeader 
        title="Academic Messaging"
        description="Connect and collaborate seamlessly with lecturers and peers in real-time."
        icon={<MessageSquare className="w-5 h-5 text-indigo-500" />}
        badgeText="Secure Chat"
      />

      <div className="w-full bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-16rem)] min-h-[600px]">
         
        {/* Sidebar */}
        <div className={`lg:col-span-4 border-r border-slate-100 flex flex-col h-full bg-slate-50/30 overflow-hidden ${activeThread ? 'hidden lg:flex' : 'flex'}`}>
            
          <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-white/80 shrink-0">
            <div className="grid grid-cols-3 gap-1 flex-1">
              {(['chats', 'lecturers', 'students'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-medium tracking-wide transition-all cursor-pointer text-center capitalize truncate ${
                    sidebarTab === tab 
                      ? 'bg-indigo-500 text-white shadow-xs font-semibold' 
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

          {sidebarTab !== 'chats' && (
            <div className="p-3 border-b border-slate-100 bg-white/40 shrink-0">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Search ${sidebarTab}...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-100/60 border border-slate-200/60 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto divide-y divide-slate-50 min-h-0">
            {sidebarTab === 'chats' ? (
              isLoadingThreads ? (
                <div className="py-24 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                  <p className="text-xs text-slate-400 font-medium">Loading conversations...</p>
                </div>
              ) : threads.length === 0 ? (
                <div className="py-24 px-6 text-center space-y-2">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto stroke-1" />
                  <p className="text-xs font-medium text-slate-700">No chats yet</p>
                  <p className="text-[11px] text-slate-400">Select Lecturers or Students above to start messaging.</p>
                </div>
              ) : (
                threads.map((thread) => {
                  const isSelected = activeThread?.$id === thread.$id;
                  const peer = getPeerDetails(thread.participantIds);
                  const presence = formatPresence(peer.lastSeen);
                  const unreadCount = unreadCounts[thread.$id] || 0;

                  return (
                    <div
                      key={thread.$id}
                      onClick={() => setActiveThread(thread)}
                      className={`w-full p-3.5 text-left transition-all flex items-start gap-3 cursor-pointer relative group ${
                        isSelected ? 'bg-indigo-50/60 border-l-2 border-indigo-500' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-indigo-50/80 border border-indigo-100/60 flex items-center justify-center relative">
                          {peer.avatarUrl ? (
                            <img src={peer.avatarUrl} alt={peer.name} className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-indigo-400" />
                          )}
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${
                          presence.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-medium text-slate-800 truncate">{peer.name}</h4>
                          <div className="flex items-center gap-1.5">
                            {renderRoleBadge(peer.role)}
                            
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
                                <div className="absolute right-0 top-6 w-32 bg-white border border-slate-100 rounded-xl shadow-md py-1 z-20">
                                  <button
                                    onClick={(e) => handleDeleteThread(e, thread.$id)}
                                    className="w-full px-3 py-1.5 text-left text-xs font-medium text-rose-500 hover:bg-rose-50 flex items-center gap-2"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Delete
                                  </button>
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
                (sidebarTab === 'lecturers' ? filteredLecturers : filteredStudents).map((userObj) => (
                  <button
                    key={userObj.$id}
                    onClick={() => handleSelectUser(userObj)}
                    className="w-full p-3 text-left transition-all hover:bg-indigo-50/30 flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-8 h-8 rounded-xl overflow-hidden bg-slate-100 border border-slate-200/50 flex items-center justify-center shrink-0">
                        {userObj.avatarUrl ? (
                          <img src={userObj.avatarUrl} alt={userObj.name} className="w-full h-full object-cover" />
                        ) : (
                          userObj.role === 'lecturer' ? <GraduationCap className="w-3.5 h-3.5 text-indigo-500" /> : <User className="w-3.5 h-3.5 text-slate-500" />
                        )}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs font-medium text-slate-800 truncate group-hover:text-indigo-500 transition-colors">{userObj.name}</h4>
                          {renderRoleBadge(userObj.role)}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">{userObj.email || userObj.campusId || userObj.role}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 group-hover:bg-indigo-500 group-hover:text-white transition-all shrink-0">
                      Chat
                    </span>
                  </button>
                ))
              )
            )}
          </div>
        </div>

        {/* Chat Window Panel */}
        <div className={`lg:col-span-8 flex flex-col h-full bg-white overflow-hidden ${!activeThread ? 'hidden lg:flex' : 'flex'}`}>
          {activeThread ? (
            <>
              <div className="p-3.5 border-b border-slate-100 flex items-center justify-between bg-white/90 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveThread(null)}
                    className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-8 h-8 rounded-xl overflow-hidden bg-indigo-50 border border-indigo-100 flex items-center justify-center">
                    {getPeerDetails(activeThread.participantIds).avatarUrl ? (
                      <img src={getPeerDetails(activeThread.participantIds).avatarUrl} alt="Peer" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-4 h-4 text-indigo-500" />
                    )}
                  </div>
                  <div className="space-y-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-medium text-slate-800">
                        {getPeerDetails(activeThread.participantIds).name}
                      </h3>
                      {renderRoleBadge(getPeerDetails(activeThread.participantIds).role)}
                    </div>
                    {(() => {
                      const peer = getPeerDetails(activeThread.participantIds);
                      const presence = formatPresence(peer.lastSeen);
                      return (
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${presence.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                          {presence.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              {/* Message List Container */}
              <div 
                ref={messagesContainerRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-slate-50/20 min-h-0 relative"
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
                    <p className="text-[11px] text-slate-400">Send a message to begin chatting securely.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUserId;
                    const repliedMsg = messages.find(m => m.$id === msg.replyToId);
                    const isImage = msg.fileUrl && /\.(jpg|jpeg|png|gif|webp)$/i.test(msg.fileUrl);

                    return (
                      <div 
                        key={msg.$id} 
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-0.5 relative group`}
                      >
                        <div className={`flex items-center gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                          <div 
                            className={`max-w-[80%] sm:max-w-[70%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed shadow-2xs relative space-y-1.5 ${
                              isMe 
                                ? 'bg-indigo-500 text-white rounded-br-xs font-normal' 
                                : 'bg-white text-slate-700 border border-slate-100 rounded-bl-xs'
                            }`}
                          >
                            {/* Replied Message Banner */}
                            {repliedMsg && (
                              <div className={`px-2.5 py-1 rounded-xl text-[11px] border-l-2 flex flex-col gap-0.5 ${
                                isMe 
                                  ? 'bg-indigo-600/40 border-white text-white/90' 
                                  : 'bg-slate-50 border-indigo-400 text-slate-600'
                              }`}>
                                <span className={`font-medium text-[10px] ${isMe ? 'text-white' : 'text-indigo-500'}`}>
                                  {repliedMsg.senderId === currentUserId ? 'You' : getPeerDetails(activeThread.participantIds).name}
                                </span>
                                <p className="truncate opacity-90">{repliedMsg.messageText || 'Attachment'}</p>
                              </div>
                            )}

                            {/* File Attachment Render */}
                            {msg.fileUrl && (
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

                            {msg.messageText && <p>{msg.messageText}</p>}
                          </div>

                          {/* Message Actions Menu */}
                          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setActiveMessageMenuId(activeMessageMenuId === msg.$id ? null : msg.$id)}
                              className="p-1 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-slate-600 shadow-2xs cursor-pointer"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeMessageMenuId === msg.$id && (
                              <div className={`absolute ${isMe ? 'right-0' : 'left-0'} top-7 w-28 bg-white border border-slate-100 rounded-xl shadow-md py-1 z-20`}>
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

                {/* Floating Scroll to Bottom Button */}
                {!isAtBottom && (
                  <div className="sticky bottom-4 float-right clear-both mr-2 z-20">
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

              {/* Reply Preview Banner */}
              {replyingTo && (
                <div className="px-4 py-2 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-xs shrink-0">
                  <div className="flex items-center gap-2.5 truncate text-slate-600 border-l-2 border-indigo-500 pl-2.5 py-0.5">
                    <div className="flex flex-col truncate">
                      <span className="font-medium text-[10px] text-indigo-500">
                        Replying to {replyingTo.senderId === currentUserId ? 'yourself' : getPeerDetails(activeThread.participantIds).name}
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

              {/* Selected File Preview Banner */}
              {selectedFile && (
                <div className="px-4 py-2 bg-indigo-50/50 border-t border-indigo-100/60 flex items-center justify-between text-xs shrink-0">
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

              {/* Input Form */}
              <form onSubmit={handleSendMessage} className="p-3 border-t border-slate-100 bg-white flex items-center gap-2 shrink-0">
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
                  className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:bg-indigo-50 hover:text-indigo-500 transition-all cursor-pointer shrink-0"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-50 border border-slate-200/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-400 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={(!newMessageText.trim() && !selectedFile) || isSending}
                  className="bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 text-white px-3 py-3 rounded-full text-xs font-medium transition-all duration-200 flex items-center justify-center shadow-2xs cursor-pointer shrink-0"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-2.5 bg-slate-50/10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-500 flex items-center justify-center">
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
    </div>
  );
}