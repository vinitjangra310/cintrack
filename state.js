/* -------------------------------------------------------------
 * AuraStudy Central State Store — Handles local persistence
 * ------------------------------------------------------------- */

const STATE_KEY = 'aurastudy_state';

// 10 high-quality preloaded quiz questions as requested
const defaultQuiz = {
  id: 'q-webdev-101',
  title: 'Web Development Essentials',
  desc: 'Test your understanding of basic HTML, CSS, and JS.',
  questions: [
    {
      id: 'q1',
      question: 'What does HTML stand for?',
      options: [
        'Hyper Text Markup Language',
        'High Tech Markup Language',
        'Hyper Tabular Memory Layout',
        'Hyperlink Text Management Language'
      ],
      correctAnswer: 0
    },
    {
      id: 'q2',
      question: 'Which HTML element is used to define the most important or largest heading?',
      options: ['<heading>', '<h6>', '<h1>', '<head>'],
      correctAnswer: 2
    },
    {
      id: 'q3',
      question: 'What is the correct CSS syntax to make text bold?',
      options: [
        'font-style: bold;',
        'font-weight: bold;',
        'text-decoration: bold;',
        'text-weight: bold;'
      ],
      correctAnswer: 1
    },
    {
      id: 'q4',
      question: 'Which JavaScript keyword is used to declare a block-scoped variable that cannot be reassigned?',
      options: ['var', 'let', 'const', 'define'],
      correctAnswer: 2
    },
    {
      id: 'q5',
      question: 'What is the value of typeof null in JavaScript?',
      options: ['"null"', '"undefined"', '"object"', '"number"'],
      correctAnswer: 2
    },
    {
      id: 'q6',
      question: 'Which CSS display value sets up a grid structure layout?',
      options: ['display: flex;', 'display: grid;', 'display: block;', 'display: table;'],
      correctAnswer: 1
    },
    {
      id: 'q7',
      question: 'What is the main purpose of Array.prototype.map() in JavaScript?',
      options: [
        'It filters out elements that do not pass a test.',
        'It loops over an array to sum its values.',
        'It creates a new array populated with the results of calling a function on every element in the calling array.',
        'It sorts the array elements in place.'
      ],
      correctAnswer: 2
    },
    {
      id: 'q8',
      question: 'Which tag is used to link an external JavaScript script file in HTML?',
      options: ['<link>', '<script>', '<js>', '<href>'],
      correctAnswer: 1
    },
    {
      id: 'q9',
      question: 'What does CSS stand for?',
      options: [
        'Creative Style Sheets',
        'Computer Style Sheets',
        'Colorful Style Sheets',
        'Cascading Style Sheets'
      ],
      correctAnswer: 3
    },
    {
      id: 'qa',
      question: 'Which HTTP status code represents a "Not Found" error?',
      options: ['200 OK', '403 Forbidden', '404 Not Found', '500 Internal Server Error'],
      correctAnswer: 2
    }
  ],
  highScore: null
};

const defaultFlashcardDecks = [
  {
    id: 'deck-js-basics',
    name: 'JavaScript Concepts',
    cards: [
      {
        id: 'fc1',
        front: 'What is closure in JavaScript?',
        back: 'A closure is the combination of a function bundled together (enclosed) with references to its surrounding state (the lexical environment). It allows an inner function to access the scope of an outer function even after the outer function has returned.',
        box: 1 // Leitner system box (1 to 5)
      },
      {
        id: 'fc2',
        front: 'What is the difference between "==" and "==="?',
        back: '"==" checks for loose equality after performing type coercion, whereas "===" checks for strict equality without type coercion (both value and type must match).',
        box: 1
      },
      {
        id: 'fc3',
        front: 'Explain Event Delegation in JS.',
        back: 'Event delegation is a technique of using a single event listener on a parent element to manage events bubbling up from child elements, instead of attaching listeners to every single child.',
        box: 1
      }
    ]
  },
  {
    id: 'deck-css-grid',
    name: 'CSS Layouts',
    cards: [
      {
        id: 'fc4',
        front: 'What is the difference between Grid and Flexbox?',
        back: 'CSS Grid is two-dimensional (columns and rows), while Flexbox is one-dimensional (either a single row or a single column). Use Grid for layouts and Flexbox for alignment.',
        box: 1
      }
    ]
  }
];

const defaultTasks = [
  {
    id: 'task-1',
    title: 'Review Web Development Quiz questions',
    category: 'Web Dev',
    dueDate: new Date().toISOString().split('T')[0],
    priority: 'high',
    pomoEst: 2,
    pomoDone: 0,
    notes: 'Go through the preloaded 10 quiz questions in the Quiz tab and get 100%.',
    completed: false
  },
  {
    id: 'task-2',
    title: 'Study closure flashcards',
    category: 'JavaScript',
    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // tomorrow
    priority: 'medium',
    pomoEst: 1,
    pomoDone: 0,
    notes: 'Memorize explanations for lexical closures and event delegation.',
    completed: false
  }
];

const defaultState = {
  tasks: defaultTasks,
  quizzes: [defaultQuiz],
  flashcardDecks: defaultFlashcardDecks,
  reminders: [
    {
      id: 'rem-1',
      title: 'Daily Study Session',
      time: '18:00'
    }
  ],
  stats: {
    tasksCompletedCount: 0,
    pomosCompletedCount: 0,
    totalFocusMinutes: 0,
    quizAttempts: 0,
    quizTotalScores: 0 // to compute average accuracy
  },
  preferences: {
    theme: 'dark',
    pomoDurations: {
      focus: 25,
      shortBreak: 5,
      longBreak: 15,
      rounds: 4
    }
  },
  streak: 3,
  lastActiveDate: new Date().toISOString().split('T')[0],
  activityLog: [
    { id: 'act-1', text: 'Started study streak!', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]
};

class StateManager {
  constructor() {
    this.state = this.loadState();
    this.listeners = [];
  }

  loadState() {
    try {
      const data = localStorage.getItem(STATE_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Integrity check: if quizzes is empty, restore defaults
        if (!parsed.quizzes || parsed.quizzes.length === 0) {
          parsed.quizzes = [defaultQuiz];
        }
        this.checkStreak(parsed);
        return parsed;
      }
    } catch (e) {
      console.error('Could not load local storage state, using defaults', e);
    }
    return JSON.parse(JSON.stringify(defaultState));
  }

  saveState() {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(this.state));
      this.notifyListeners();
    } catch (e) {
      console.error('Could not save state to localStorage', e);
    }
  }

  checkStreak(state) {
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    
    if (state.lastActiveDate === today) {
      return; // Already active today, streak safe
    } else if (state.lastActiveDate === yesterday) {
      // Incremented streak
      state.streak += 1;
      state.lastActiveDate = today;
    } else {
      // Streak broken
      state.streak = 1;
      state.lastActiveDate = today;
    }
  }

  onChange(callback) {
    this.listeners.push(callback);
  }

  notifyListeners() {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }

  // --- ACTIONS ---
  
  // Tasks
  addTask(task) {
    const newTask = {
      id: 'task-' + Date.now(),
      pomoDone: 0,
      completed: false,
      notes: '',
      dueDate: new Date().toISOString().split('T')[0],
      ...task
    };
    this.state.tasks.push(newTask);
    this.addActivity(`Created task: "${newTask.title}"`);
    this.saveState();
    return newTask;
  }

  updateTask(id, updates) {
    const idx = this.state.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      const wasCompleted = this.state.tasks[idx].completed;
      this.state.tasks[idx] = { ...this.state.tasks[idx], ...updates };
      
      if (!wasCompleted && updates.completed) {
        this.state.stats.tasksCompletedCount++;
        this.addActivity(`Completed task: "${this.state.tasks[idx].title}"`);
      } else if (wasCompleted && updates.completed === false) {
        this.state.stats.tasksCompletedCount = Math.max(0, this.state.stats.tasksCompletedCount - 1);
      }
      
      this.saveState();
    }
  }

  deleteTask(id) {
    const idx = this.state.tasks.findIndex(t => t.id === id);
    if (idx !== -1) {
      const title = this.state.tasks[idx].title;
      this.state.tasks.splice(idx, 1);
      this.addActivity(`Deleted task: "${title}"`);
      this.saveState();
    }
  }

  // Reminders
  addReminder(title, time) {
    const newRem = {
      id: 'rem-' + Date.now(),
      title,
      time
    };
    this.state.reminders.push(newRem);
    this.saveState();
    return newRem;
  }

  deleteReminder(id) {
    this.state.reminders = this.state.reminders.filter(r => r.id !== id);
    this.saveState();
  }

  // Pomodoro Completed
  completePomodoro(minutes, taskId = null) {
    this.state.stats.pomosCompletedCount++;
    this.state.stats.totalFocusMinutes += minutes;
    
    if (taskId) {
      const task = this.state.tasks.find(t => t.id === taskId);
      if (task) {
        task.pomoDone = (task.pomoDone || 0) + 1;
        this.addActivity(`Completed focus round on task: "${task.title}"`);
      }
    } else {
      this.addActivity(`Completed a general focus round (${minutes} mins)`);
    }
    this.saveState();
  }

  // Quizzes
  addQuiz(quiz) {
    const newQuiz = {
      id: 'q-' + Date.now(),
      highScore: null,
      ...quiz
    };
    this.state.quizzes.push(newQuiz);
    this.addActivity(`Created quiz: "${newQuiz.title}"`);
    this.saveState();
    return newQuiz;
  }

  submitQuizScore(quizId, score, totalQuestions) {
    const quiz = this.state.quizzes.find(q => q.id === quizId);
    if (quiz) {
      const percent = Math.round((score / totalQuestions) * 100);
      if (quiz.highScore === null || percent > quiz.highScore) {
        quiz.highScore = percent;
      }
      this.state.stats.quizAttempts++;
      this.state.stats.quizTotalScores += percent;
      this.addActivity(`Finished quiz "${quiz.title}" with score ${score}/${totalQuestions} (${percent}%)`);
      this.saveState();
    }
  }

  // Flashcards Decks & Leitner Box
  addDeck(name) {
    const newDeck = {
      id: 'deck-' + Date.now(),
      name,
      cards: []
    };
    this.state.flashcardDecks.push(newDeck);
    this.addActivity(`Created deck: "${name}"`);
    this.saveState();
    return newDeck;
  }

  addCard(deckId, front, back) {
    const deck = this.state.flashcardDecks.find(d => d.id === deckId);
    if (deck) {
      const newCard = {
        id: 'fc-' + Date.now(),
        front,
        back,
        box: 1
      };
      deck.cards.push(newCard);
      this.saveState();
      return newCard;
    }
    return null;
  }

  gradeCard(deckId, cardId, isCorrect) {
    const deck = this.state.flashcardDecks.find(d => d.id === deckId);
    if (deck) {
      const card = deck.cards.find(c => c.id === cardId);
      if (card) {
        if (isCorrect) {
          // Leitner system: advance to next box, max 5
          card.box = Math.min(5, (card.box || 1) + 1);
        } else {
          // Demote to box 1 upon error
          card.box = 1;
        }
        this.saveState();
      }
    }
  }

  // General Activities
  addActivity(text) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.state.activityLog.unshift({
      id: 'act-' + Date.now(),
      text,
      time: timestamp
    });
    // keep last 15 activities
    if (this.state.activityLog.length > 15) {
      this.state.activityLog.pop();
    }
  }
}

export const stateManager = new StateManager();
window.stateManager = stateManager; // Expose for debugging
