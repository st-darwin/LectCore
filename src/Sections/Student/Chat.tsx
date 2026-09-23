import React, { useState, useEffect, useRef } from 'react';
import { 
  MessageSquare, 
  Send, 
  Search, 
  User, 
  Clock, 
  Loader2, 
  CheckCheck, 
  ArrowLeft,
  Users,
  GraduationCap,
  Sparkles,
  RotateCw,
  ShieldCheck
} from 'lucide-react';
import { client, databases, account, appwriteConfig } from '../../appwrite/Client';
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
  $createdAt: string;
}

export interface AppUser {
  $id: string;
  userId: string;
  name: string;
  email: string;
  role: 'student' | 'lecturer' | 'admin';
  campusId: string;
  lastSeen?: string;
}

export default function Chat() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
   
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
   
  const [sidebarTab, setSidebarTab] = useState<'chats' | 'lecturers' | 'students'>('chats');
  const [searchQuery, setSearchQuery] = useState('');

  const [isLoadingThreads, setIsLoadingThreads] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
   
  const messagesEndRef = useRef<HTMLDivElement>(null);
   
  const activeThreadRef = useRef<Thread | null>(null);
  useEffect(() => {
    activeThreadRef.current = activeThread;
  }, [activeThread]);

  // 1. Initialize user, threads, directory users, and unread metrics
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

      // Strict security filter to ensure other users' chats never leak in
      let fetchedThreads = (threadsRes.documents as unknown as Thread[]).filter(
        t => t.participantIds && t.participantIds.includes(user.$id)
      );

      setThreads(fetchedThreads);
      setAllUsers(usersRes.documents as unknown as AppUser[]);

      const counts: Record<string, number> = {};
      unreadRes.documents.forEach((doc: any) => {
        if (doc.senderId !== user.$id) {
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
    let isMounted = true;
    initChatData();
    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Real-time subscription for messages & user presence updates
  useEffect(() => {
    if (!currentUserId) return;

    let isMounted = true;
    const msgChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.messagesId}.documents`;
    const userChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.userCollectionId}.documents`;
    const threadChannel = `databases.${appwriteConfig.databaseId}.collections.${appwriteConfig.threadsId}.documents`;

    const unsubscribe = client.subscribe([msgChannel, userChannel, threadChannel], (response) => {
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

      const payload = response.payload as unknown as Message;
      if (response.events.some(e => e.includes('.create'))) {
        if (activeThreadRef.current && payload.threadId === activeThreadRef.current.$id) {
          setMessages(prev => {
            if (prev.some(m => m.$id === payload.$id)) return prev;
            return [...prev, payload];
          });
        }

        if (payload.senderId !== currentUserId && (!activeThreadRef.current || activeThreadRef.current.$id !== payload.threadId)) {
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
            lastMessage: payload.messageText, 
            lastMessageAt: payload.$createdAt 
          };
          const filtered = prev.filter(t => t.$id !== payload.threadId);
          return [updatedThread, ...filtered];
        });
      }
    });

    // Immediate presence heartbeat on mount, followed by 30s interval
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
          } catch (innerErr) {
            // Ignore if doc doesn't exist under auth id directly
          }
        }
      } catch (err) {
        // Silent fail for background heartbeat sync
      }
    };

    updatePresence();
    const heartbeatInterval = setInterval(updatePresence, 30000);

    return () => {
      isMounted = false;
      unsubscribe();
      clearInterval(heartbeatInterval);
    };
  }, [currentUserId]);

  // 3. Fetch messages & mark unread messages as read when opening a thread
  useEffect(() => {
    if (!activeThread || !currentUserId) return;

    let isMounted = true;

    const fetchAndMarkRead = async () => {
      setIsLoadingMessages(true);
      try {
        const response = await databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.messagesId,
          [
            Query.equal('threadId', activeThread.$id),
            Query.orderAsc('$createdAt'),
            Query.limit(50)
          ]
        );

        if (isMounted) {
          setMessages(response.documents as unknown as Message[]);
          setIsLoadingMessages(false);

          setUnreadCounts(prev => ({ ...prev, [activeThread.$id]: 0 }));

          const unreadMsgs = response.documents.filter(
            (m: any) => !m.isRead && m.senderId !== currentUserId
          );
           
          await Promise.all(
            unreadMsgs.map((m: any) =>
              databases.updateDocument(
                appwriteConfig.databaseId,
                appwriteConfig.messagesId,
                m.$id,
                { isRead: true }
              )
            )
          );
        }
      } catch (error) {
        console.error('Failed to fetch messages:', error);
        if (isMounted) setIsLoadingMessages(false);
      }
    };

    fetchAndMarkRead();

    return () => {
      isMounted = false;
    };
  }, [activeThread, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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
    if (!newMessageText.trim() || !activeThread || !currentUserId || isSending) return;

    const textToSend = newMessageText.trim();
    setNewMessageText('');
    setIsSending(true);

    const tempMessageId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      $id: tempMessageId,
      threadId: activeThread.$id,
      senderId: currentUserId,
      messageText: textToSend,
      isRead: false,
      $createdAt: new Date().toISOString()
    };

    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const createdMsg = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.messagesId,
        ID.unique(),
        {
          threadId: activeThread.$id,
          senderId: currentUserId,
          messageText: textToSend,
          isRead: false,
        }
      );

      await databases.updateDocument(
        appwriteConfig.databaseId,
        appwriteConfig.threadsId,
        activeThread.$id,
        {
          lastMessage: textToSend,
          lastMessageAt: new Date().toISOString(),
        }
      );

      setMessages(prev => prev.map(m => m.$id === tempMessageId ? (createdMsg as unknown as Message) : m));
    } catch (error) {
      console.error('Failed to send message:', error);
      setMessages(prev => prev.filter(m => m.$id !== tempMessageId));
      setNewMessageText(textToSend);
    } finally {
      setIsSending(false);
    }
  };

  const getPeerDetails = (participantIds: string[] = []) => {
    const peerAuthId = participantIds.find(id => id !== currentUserId);
    const peerUser = allUsers.find(u => (u.userId === peerAuthId || u.$id === peerAuthId));
    return peerUser || { name: 'Unknown User', role: 'student', email: '', lastSeen: '' };
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/60 shrink-0">
          <GraduationCap className="w-3 h-3" />
          Lecturer
        </span>
      );
    } else if (normalizedRole === 'admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
          <ShieldCheck className="w-3 h-3" />
          Admin
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200/60 shrink-0">
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
    <div className="w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 space-y-4 pb-12 pt-2 text-slate-600">
      <AdminHeader 
        title="Academic Messaging"
        description="Connect and collaborate directly with lecturers and fellow coursemates in real time."
        icon={<MessageSquare className="w-5 h-5 text-indigo-600" />}
        badgeText="Secure Chat"
      />

      <div className="w-full bg-white border border-slate-200/70 rounded-3xl shadow-xs overflow-hidden grid grid-cols-1 lg:grid-cols-12 h-[calc(100vh-16rem)] min-h-[600px]">
         
        {/* Sidebar */}
        <div className={`lg:col-span-4 border-r border-slate-100 flex flex-col h-full bg-slate-50/40 overflow-hidden ${activeThread ? 'hidden lg:flex' : 'flex'}`}>
           
          <div className="p-3 border-b border-slate-100 flex items-center gap-1.5 bg-white/60 shrink-0">
            <div className="grid grid-cols-3 gap-1.5 flex-1">
              {(['chats', 'lecturers', 'students'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSidebarTab(tab)}
                  className={`py-2 px-2 rounded-xl text-[11px] font-medium tracking-wide transition-all cursor-pointer text-center capitalize truncate ${
                    sidebarTab === tab 
                      ? 'bg-indigo-600 text-white shadow-xs font-semibold' 
                      : 'text-slate-500 hover:bg-slate-100/80 hover:text-slate-800'
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
              className="p-2.5 rounded-xl bg-slate-100/80 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 transition-all cursor-pointer shrink-0 disabled:opacity-50"
            >
              <RotateCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-indigo-600' : ''}`} />
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
                  className="w-full bg-slate-100/60 border border-slate-200/60 rounded-2xl pl-9 pr-3.5 py-2 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100/50 min-h-0">
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
                  <p className="text-[11px] text-slate-400">Select Lecturers or Students above to message someone.</p>
                </div>
              ) : (
                threads.map((thread) => {
                  const isSelected = activeThread?.$id === thread.$id;
                  const peer = getPeerDetails(thread.participantIds);
                  const presence = formatPresence(peer.lastSeen);
                  const unreadCount = unreadCounts[thread.$id] || 0;

                  return (
                    <button
                      key={thread.$id}
                      onClick={() => setActiveThread(thread)}
                      className={`w-full p-4 text-left transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected ? 'bg-indigo-50/60 border-l-3 border-indigo-600' : 'hover:bg-slate-100/50'
                      }`}
                    >
                      <div className="relative shrink-0">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-100/80 text-indigo-600 flex items-center justify-center font-medium text-xs">
                          <User className="w-4 h-4" />
                        </div>
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                          presence.status === 'online' ? 'bg-emerald-500' : 'bg-slate-300'
                        }`} />
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-xs font-semibold text-slate-800 truncate">{peer.name}</h4>
                          {renderRoleBadge(peer.role)}
                        </div>
                        <div className="flex items-center justify-between">
                          <p className={`text-xs truncate font-normal ${unreadCount > 0 ? 'font-semibold text-slate-900' : 'text-slate-500'}`}>
                            {thread.lastMessage || 'Started a conversation'}
                          </p>
                          {unreadCount > 0 && (
                            <span className="ml-2 bg-indigo-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full shrink-0 min-w-4 text-center">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })
              )
            ) : (
              (sidebarTab === 'lecturers' ? filteredLecturers : filteredStudents).length === 0 ? (
                <div className="py-20 text-center px-4 space-y-1">
                  <Users className="w-7 h-7 text-slate-300 mx-auto stroke-1" />
                  <p className="text-xs font-medium text-slate-700">No {sidebarTab} found</p>
                </div>
              ) : (
                (sidebarTab === 'lecturers' ? filteredLecturers : filteredStudents).map((userObj) => (
                  <button
                    key={userObj.$id}
                    onClick={() => handleSelectUser(userObj)}
                    className="w-full p-3.5 text-left transition-all hover:bg-indigo-50/40 flex items-center justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
                        {userObj.role === 'lecturer' ? <GraduationCap className="w-4 h-4 text-indigo-600" /> : <User className="w-4 h-4 text-slate-600" />}
                      </div>
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">{userObj.name}</h4>
                          {renderRoleBadge(userObj.role)}
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{userObj.email || userObj.campusId || userObj.role}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-medium px-2.5 py-1 rounded-xl bg-slate-100 text-slate-600 group-hover:bg-indigo-600 group-hover:text-white transition-all shrink-0">
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
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white/90 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveThread(null)}
                    className="lg:hidden p-2 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="w-9 h-9 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-medium text-xs shadow-xs">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-semibold text-slate-800">
                        {getPeerDetails(activeThread.participantIds).name}
                      </h3>
                      {renderRoleBadge(getPeerDetails(activeThread.participantIds).role)}
                    </div>
                    {(() => {
                      const peer = getPeerDetails(activeThread.participantIds);
                      const presence = formatPresence(peer.lastSeen);
                      return (
                        <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${presence.status === 'online' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
                          {presence.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-slate-50/25 min-h-0">
                {isLoadingMessages ? (
                  <div className="h-full flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
                    <p className="text-xs text-slate-400">Loading messages...</p>
                  </div>
                ) : messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-2 py-20">
                    <Sparkles className="w-8 h-8 text-indigo-300 stroke-1" />
                    <p className="text-xs font-semibold text-slate-700">Start the conversation</p>
                    <p className="text-[11px] text-slate-400">Send a message to begin chatting securely.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isMe = msg.senderId === currentUserId;

                    return (
                      <div 
                        key={msg.$id} 
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-200`}
                      >
                        <div 
                          className={`max-w-[80%] sm:max-w-[70%] px-4 py-3 rounded-2xl text-xs leading-relaxed shadow-xs ${
                            isMe 
                              ? 'bg-indigo-600 text-white rounded-br-xs font-normal' 
                              : 'bg-white text-slate-700 border border-slate-200/80 rounded-bl-xs'
                          }`}
                        >
                          {msg.messageText}
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 px-1 font-medium">
                          <Clock className="w-3 h-3 text-slate-300" />
                          <span>{new Date(msg.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && <CheckCheck className={`w-3.5 h-3.5 ml-0.5 ${msg.isRead ? 'text-indigo-600' : 'text-slate-400'}`} />}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-3 sm:p-4 border-t border-slate-100 bg-white flex items-center gap-2.5 shrink-0">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-100/70 border border-slate-200/80 rounded-2xl px-4 py-3 text-xs text-slate-700 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500 focus:bg-white transition-all"
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim() || isSending}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white px-5 py-3 rounded-2xl text-xs font-semibold transition-all duration-200 flex items-center justify-center shadow-xs cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-3 bg-slate-50/10">
              <div className="w-14 h-14 rounded-3xl bg-indigo-50 text-indigo-500 flex items-center justify-center shadow-xs">
                <MessageSquare className="w-6 h-6 stroke-1" />
              </div>
              <h3 className="text-xs font-semibold text-slate-800">No chat selected</h3>
              <p className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                Choose an existing chat from the sidebar or pick someone from the Lecturers/Students list to start talking.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}