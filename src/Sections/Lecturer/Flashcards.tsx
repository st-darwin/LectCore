import { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Plus, 
  Layers, 
  Trash2, 
  ArrowLeft, 
  Loader2, 
  ChevronLeft, 
  ChevronRight, 
  RotateCw, 
  X,
  HelpCircle,
  Users
} from 'lucide-react';
import { databases, appwriteConfig, account } from '../../appwrite/Client';
import { ID, Query } from 'appwrite';
import AdminHeader from '../../Components/AdminHeader';

export interface Deck {
  $id: string;
  courseId: string;
  title: string;
  description?: string;
  createdBy: string;
  $createdAt: string;
}

export interface Flashcard {
  $id: string;
  deckId: string;
  question: string;
  answer: string;
  $createdAt: string;
}

export interface Course {
  $id: string;
  courseCode: string;
  courseTitle: string;
}

export default function Flashcards() {
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [decks, setDecks] = useState<Deck[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeDeck, setActiveDeck] = useState<Deck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  
  const [loadingDecks, setLoadingDecks] = useState(true);
  const [loadingCards, setLoadingCards] = useState(false);

  // Study Mode State
  const [isStudying, setIsStudying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // Modal States
  const [isCreateDeckModalOpen, setIsCreateDeckModalOpen] = useState(false);
  const [newDeckTitle, setNewDeckTitle] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [isCreatingDeck, setIsCreatingDeck] = useState(false);

  // Add Card Form State
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [isAddingCard, setIsAddingCard] = useState(false);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    try {
      setLoadingDecks(true);
      const user = await account.get();
      if (!user?.$id) return;
      setCurrentUserId(user.$id);

      // 1. Fetch all courses and student enrollments in parallel
      const [coursesRes, userDocRes] = await Promise.all([
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.courseId
        ).catch(() => ({ documents: [] })),
        databases.listDocuments(
          appwriteConfig.databaseId,
          appwriteConfig.enrollmentsId || 'enrollments',
          [Query.equal('studentId', user.$id)]
        ).catch(() => ({ documents: [] }))
      ]);

      const allCourses = coursesRes.documents as unknown as Course[];
      const userEnrollments = userDocRes.documents;

      let validCourseIds: string[] = [];

      // 2. Filter courses for students based on enrollment
      if (userEnrollments.length > 0) {
        const enrolledCourseIds = new Set(userEnrollments.map((e: any) => e.courseId));
        const filteredCourses = allCourses.filter(c => enrolledCourseIds.has(c.$id));
        setCourses(filteredCourses);
        validCourseIds = filteredCourses.map(c => c.$id);
        if (filteredCourses.length > 0) {
          setSelectedCourseId(filteredCourses[0].$id);
        }
      } else {
        // Fallback for lecturers/admins (see all courses)
        setCourses(allCourses);
        validCourseIds = allCourses.map(c => c.$id);
        if (allCourses.length > 0) {
          setSelectedCourseId(allCourses[0].$id);
        }
      }

      // 3. Fetch all community/course-wide decks for the user's enrolled courses
      const deckQueries = [Query.orderDesc('$createdAt')];
      if (userEnrollments.length > 0 && validCourseIds.length > 0) {
        deckQueries.push(Query.equal('courseId', validCourseIds));
      }

      const decksRes = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.flashcardDecksId,
        deckQueries
      ).catch(() => ({ documents: [] }));

      setDecks(decksRes.documents as unknown as Deck[]);

    } catch (err) {
      console.error('Failed to load flashcard data:', err);
    } finally {
      setLoadingDecks(false);
    }
  };

  const handleSelectDeck = async (deck: Deck) => {
    setActiveDeck(deck);
    setIsStudying(false);
    setLoadingCards(true);
    try {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.flashcardsId,
        [Query.equal('deckId', deck.$id), Query.orderAsc('$createdAt')]
      );
      setCards(res.documents as unknown as Flashcard[]);
    } catch (err) {
      console.error('Failed to fetch cards for deck:', err);
    } finally {
      setLoadingCards(false);
    }
  };

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckTitle.trim() || !selectedCourseId || !currentUserId || isCreatingDeck) return;

    setIsCreatingDeck(true);
    try {
      const newDeckDoc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.flashcardDecksId,
        ID.unique(),
        {
          courseId: selectedCourseId,
          title: newDeckTitle.trim(),
          description: newDeckDesc.trim(),
          createdBy: currentUserId,
        }
      );

      const created = newDeckDoc as unknown as Deck;
      setDecks(prev => [created, ...prev]);
      setIsCreateDeckModalOpen(false);
      setNewDeckTitle('');
      setNewDeckDesc('');
      handleSelectDeck(created);
    } catch (err) {
      console.error('Failed to create deck:', err);
    } finally {
      setIsCreatingDeck(false);
    }
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeck || !newQuestion.trim() || !newAnswer.trim() || isAddingCard) return;

    // Optional guard: restrict card adding to deck creator if desired, or let anyone in the course contribute
    setIsAddingCard(true);
    try {
      const cardDoc = await databases.createDocument(
        appwriteConfig.databaseId,
        appwriteConfig.flashcardsId,
        ID.unique(),
        {
          deckId: activeDeck.$id,
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
        }
      );

      setCards(prev => [...prev, cardDoc as unknown as Flashcard]);
      setNewQuestion('');
      setNewAnswer('');
    } catch (err) {
      console.error('Failed to add card:', err);
    } finally {
      setIsAddingCard(false);
    }
  };

  const handleDeleteCard = async (cardId: string) => {
    try {
      await databases.deleteDocument(
        appwriteConfig.databaseId,
        appwriteConfig.flashcardsId,
        cardId
      );
      setCards(prev => prev.filter(c => c.$id !== cardId));
    } catch (err) {
      console.error('Failed to delete card:', err);
    }
  };

  const handleDeleteDeck = async (deckId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this deck and all its flashcards?')) return;

    try {
      const res = await databases.listDocuments(
        appwriteConfig.databaseId,
        appwriteConfig.flashcardsId,
        [Query.equal('deckId', deckId)]
      );
      await Promise.all(
        res.documents.map(card => 
          databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.flashcardsId, card.$id)
        )
      );

      await databases.deleteDocument(appwriteConfig.databaseId, appwriteConfig.flashcardDecksId, deckId);
      setDecks(prev => prev.filter(d => d.$id !== deckId));
      if (activeDeck?.$id === deckId) {
        setActiveDeck(null);
        setCards([]);
      }
    } catch (err) {
      console.error('Failed to delete deck:', err);
    }
  };

  const getCourseCode = (courseId: string) => {
    const match = courses.find(c => c.$id === courseId);
    return match ? match.courseCode : 'GEN';
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 space-y-6 pb-20 pt-2 text-slate-500">
      <AdminHeader 
        title="Study Flashcards"
        description="Master course concepts using shared community revision decks and active recall."
        icon={<Layers className="w-5 h-5 text-indigo-400" />}
        badgeText="Active Recall"
      />

      {activeDeck ? (
        <div className="space-y-4">
          {/* Deck View Navigation & Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.01)]">
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <button
                onClick={() => { setActiveDeck(null); setIsStudying(false); }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-2xl bg-white/80 border border-slate-200/60 text-slate-600 hover:bg-slate-50 text-xs font-medium transition cursor-pointer shrink-0 shadow-2xs"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50/60 text-indigo-600 border border-indigo-100/60 shrink-0">
                  {getCourseCode(activeDeck.courseId)}
                </span>
                <h3 className="text-xs sm:text-sm font-semibold text-slate-700 truncate">{activeDeck.title}</h3>
              </div>
            </div>
            {cards.length > 0 && (
              <button
                onClick={() => { setIsStudying(true); setCurrentIndex(0); setIsFlipped(false); }}
                className="w-full sm:w-auto px-4 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium shadow-sm transition cursor-pointer text-center"
              >
                Study Deck ({cards.length})
              </button>
            )}
          </div>

          {isStudying ? (
            /* Immersive Study / Flip Mode */
            <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-[2.5rem] p-6 sm:p-12 shadow-[0_4px_20px_rgb(0,0,0,0.01)] flex flex-col items-center justify-center min-h-[380px] sm:min-h-[420px] max-w-2xl mx-auto relative space-y-6">
              <div className="w-full flex items-center justify-between text-xs text-slate-400 font-medium">
                <span>Card {currentIndex + 1} of {cards.length}</span>
                <button 
                  onClick={() => { setIsStudying(false); setIsFlipped(false); }}
                  className="hover:text-slate-600 flex items-center gap-1 cursor-pointer"
                >
                  <X className="w-4 h-4" /> Exit Study
                </button>
              </div>

              {/* Flip Card */}
              <div 
                onClick={() => setIsFlipped(!isFlipped)}
                className="w-full h-60 sm:h-72 bg-gradient-to-br from-white to-slate-50/60 border border-slate-200/60 rounded-3xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer shadow-xs hover:border-indigo-200 transition-all select-none relative group"
              >
                <span className="absolute top-4 left-4 text-[10px] font-semibold uppercase tracking-wider text-indigo-500 bg-indigo-50/50 px-2.5 py-1 rounded-full border border-indigo-100/60">
                  {isFlipped ? 'Answer (Back)' : 'Question (Front)'}
                </span>
                
                <p className="text-sm sm:text-base font-medium text-slate-700 max-w-lg leading-relaxed mt-4 px-2">
                  {isFlipped ? cards[currentIndex]?.answer : cards[currentIndex]?.question}
                </p>

                <span className="absolute bottom-4 text-[11px] text-slate-400 group-hover:text-indigo-600 transition-colors flex items-center gap-1">
                  <RotateCw className="w-3 h-3" /> Click card to flip
                </span>
              </div>

              {/* Controls */}
              <div className="flex items-center gap-4">
                <button
                  disabled={currentIndex === 0}
                  onClick={() => { setCurrentIndex(prev => prev - 1); setIsFlipped(false); }}
                  className="p-3 rounded-2xl bg-white/80 border border-slate-200/60 text-slate-600 hover:bg-slate-100 disabled:opacity-40 transition cursor-pointer shadow-2xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-semibold text-slate-600">
                  {currentIndex + 1} / {cards.length}
                </span>
                <button
                  disabled={currentIndex === cards.length - 1}
                  onClick={() => { setCurrentIndex(prev => prev + 1); setIsFlipped(false); }}
                  className="p-3 rounded-2xl bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-40 transition cursor-pointer shadow-2xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            /* Deck Management & Card List */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Add Card Form */}
              <div className="lg:col-span-5 bg-white/60 backdrop-blur-md border border-slate-100 rounded-3xl p-5 sm:p-6 shadow-[0_2px_10px_rgb(0,0,0,0.01)] space-y-4 h-fit">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Add New Flashcard</h4>
                  {activeDeck.createdBy !== currentUserId && (
                    <span className="text-[10px] text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full font-medium">Community Deck</span>
                  )}
                </div>
                <form onSubmit={handleAddCard} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500">Question / Term *</label>
                    <textarea
                      rows={2}
                      required
                      placeholder="e.g., What is normalization in databases?"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      className="w-full bg-white/80 border border-slate-200/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:border-indigo-300 resize-none shadow-2xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-slate-500">Answer / Definition *</label>
                    <textarea
                      rows={3}
                      required
                      placeholder="e.g., The process of structuring a relational database..."
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      className="w-full bg-white/80 border border-slate-200/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 placeholder-slate-300 focus:outline-none focus:border-indigo-300 resize-none shadow-2xs"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isAddingCard}
                    className="w-full py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    {isAddingCard && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <Plus className="w-4 h-4" /> Add Flashcard
                  </button>
                </form>
              </div>

              {/* Cards List */}
              <div className="lg:col-span-7 space-y-3">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cards in Deck ({cards.length})</h4>
                </div>

                {loadingCards ? (
                  <div className="py-20 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                  </div>
                ) : cards.length === 0 ? (
                  <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-3xl p-12 text-center space-y-2">
                    <HelpCircle className="w-8 h-8 text-slate-300 mx-auto stroke-1" />
                    <p className="text-xs font-semibold text-slate-600">No flashcards added yet</p>
                    <p className="text-[11px] text-slate-400">Use the form to add your first question and answer pair.</p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                    {cards.map((card, idx) => (
                      <div key={card.$id} className="bg-white/70 backdrop-blur-md border border-slate-100 rounded-2xl p-4 shadow-2xs flex items-start justify-between gap-3 group">
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <span className="text-[10px] font-semibold text-indigo-500">Card #{idx + 1}</span>
                          <p className="text-xs font-semibold text-slate-700 break-words">Q: {card.question}</p>
                          <p className="text-xs text-slate-600 bg-white/80 p-2.5 rounded-xl border border-slate-100/80 break-words">A: {card.answer}</p>
                        </div>
                        {activeDeck.createdBy === currentUserId && (
                          <button
                            onClick={() => handleDeleteCard(card.$id)}
                            className="p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition cursor-pointer shrink-0"
                            title="Delete Card"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Decks Grid Overview */
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/60 backdrop-blur-md p-4 rounded-3xl border border-slate-100 shadow-[0_2px_10px_rgb(0,0,0,0.01)]">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-indigo-400" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Community & Course Decks</h3>
            </div>
            <button
              onClick={() => setIsCreateDeckModalOpen(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-2xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium shadow-sm transition cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Deck
            </button>
          </div>

          {loadingDecks ? (
            <div className="py-24 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
            </div>
          ) : decks.length === 0 ? (
            <div className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-[2.5rem] p-16 text-center space-y-3">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto stroke-1" />
              <h4 className="text-xs font-bold text-slate-700">No Flashcard Decks Available</h4>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">Create a study deck for your enrolled courses or wait for peers to share theirs.</p>
              <button
                onClick={() => setIsCreateDeckModalOpen(true)}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50/80 text-indigo-600 hover:bg-indigo-100/80 text-xs font-medium transition cursor-pointer border border-indigo-100/80"
              >
                <Plus className="w-4 h-4" /> Create First Deck
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {decks.map(deck => {
                const isOwner = deck.createdBy === currentUserId;
                return (
                  <div
                    key={deck.$id}
                    onClick={() => handleSelectDeck(deck)}
                    className="bg-white/60 backdrop-blur-md border border-slate-100 rounded-3xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.01)] hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer flex flex-col justify-between space-y-4 group"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50/60 text-indigo-600 border border-indigo-100/60">
                          {getCourseCode(deck.courseId)}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${isOwner ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-500'}`}>
                            {isOwner ? 'Your Deck' : 'Community'}
                          </span>
                          {isOwner && (
                            <button
                              onClick={(e) => handleDeleteDeck(deck.$id, e)}
                              className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition"
                              title="Delete Deck"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <h4 className="text-xs sm:text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">
                        {deck.title}
                      </h4>
                      {deck.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2">{deck.description}</p>
                      )}
                    </div>
                    <div className="pt-3 border-t border-slate-100/80 flex items-center justify-between text-[10px] font-medium text-slate-400">
                      <span>Created {new Date(deck.$createdAt).toLocaleDateString()}</span>
                      <span className="text-indigo-500 font-semibold group-hover:underline">Study Deck →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Create Deck Modal */}
      {isCreateDeckModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/20 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700">Create Revision Deck</h3>
              <button onClick={() => setIsCreateDeckModalOpen(false)} className="p-1 rounded-lg text-slate-400 hover:bg-slate-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateDeck} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Deck Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Algorithms & Complexity"
                  value={newDeckTitle}
                  onChange={(e) => setNewDeckTitle(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-300"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Course *</label>
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-300 font-medium"
                >
                  {courses.map(course => (
                    <option key={course.$id} value={course.$id}>
                      {course.courseCode} - {course.courseTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-600">Description</label>
                <textarea
                  rows={2}
                  placeholder="Short description of topics covered..."
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200/60 rounded-xl px-3.5 py-2.5 text-xs text-slate-700 focus:outline-none focus:border-indigo-300 resize-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateDeckModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-500 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newDeckTitle.trim() || isCreatingDeck}
                  className="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 cursor-pointer flex items-center gap-2 shadow-2xs"
                >
                  {isCreatingDeck && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Create Deck</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}