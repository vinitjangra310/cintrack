/* -------------------------------------------------------------
 * AuraStudy Quiz Engine & Creator — Active Recall practice
 * ------------------------------------------------------------- */

import { stateManager } from './state.js';
import { createQuizCard, createToast } from './components.js';

class QuizEngine {
  constructor() {
    this.activeQuiz = null;
    this.currentQuestionIdx = 0;
    this.score = 0;
    this.selectedAnswerIdx = null;
    this.isAnswerLocked = false;

    // Cache elements
    this.landingView = document.getElementById('quiz-landing');
    this.takingView = document.getElementById('quiz-taking');
    this.resultsView = document.getElementById('quiz-results');
    this.creatorView = document.getElementById('quiz-creator');
    
    this.quizzesListContainer = document.getElementById('quizzes-list-container');
    
    // Quiz Taking UI elements
    this.quizTitle = document.getElementById('active-quiz-title');
    this.progressText = document.getElementById('quiz-progress-text');
    this.progressBar = document.getElementById('quiz-progress-fill');
    this.questionText = document.getElementById('quiz-question-text');
    this.optionsContainer = document.getElementById('quiz-options-container');
    this.nextBtn = document.getElementById('btn-next-question');
    this.quitBtn = document.getElementById('btn-quit-quiz');

    // Results UI elements
    this.resultsTitle = document.getElementById('quiz-results-title');
    this.scoreFraction = document.getElementById('quiz-score-fraction');
    this.scorePercent = document.getElementById('quiz-score-percent');
    this.resultsFeedback = document.getElementById('quiz-results-feedback');
    this.retryBtn = document.getElementById('btn-retry-quiz');
    this.backToHubBtn = document.getElementById('btn-back-to-hub');

    // Creator UI elements
    this.openCreatorBtn = document.getElementById('btn-open-quiz-creator');
    this.cancelCreatorBtn = document.getElementById('btn-cancel-quiz-creator');
    this.saveQuizBtn = document.getElementById('btn-save-new-quiz');
    this.addQuestionBtn = document.getElementById('btn-creator-add-question');
    this.creatorQuestionsList = document.getElementById('creator-questions-list');
    
    this.newQuizTitleInput = document.getElementById('new-quiz-title');
    this.newQuizDescInput = document.getElementById('new-quiz-desc');

    this.init();
  }

  init() {
    this.initEventListeners();
    this.renderHub();
  }

  initEventListeners() {
    if (this.openCreatorBtn) {
      this.openCreatorBtn.addEventListener('click', () => this.showCreator());
    }
    if (this.cancelCreatorBtn) {
      this.cancelCreatorBtn.addEventListener('click', () => this.showLanding());
    }
    if (this.addQuestionBtn) {
      this.addQuestionBtn.addEventListener('click', () => this.addNewQuestionBlockInCreator());
    }
    if (this.saveQuizBtn) {
      this.saveQuizBtn.addEventListener('click', () => this.handleSaveQuiz());
    }
    if (this.quitBtn) {
      this.quitBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to quit the quiz? Your progress will be lost.')) {
          this.showLanding();
        }
      });
    }
    if (this.nextBtn) {
      this.nextBtn.addEventListener('click', () => this.handleNextQuestion());
    }
    if (this.retryBtn) {
      this.retryBtn.addEventListener('click', () => this.startQuiz(this.activeQuiz.id));
    }
    if (this.backToHubBtn) {
      this.backToHubBtn.addEventListener('click', () => this.showLanding());
    }

    // Monitor global state adjustments
    stateManager.onChange(() => this.renderHub());
  }

  showLanding() {
    this.landingView.classList.remove('hidden');
    this.takingView.classList.add('hidden');
    this.resultsView.classList.add('hidden');
    this.creatorView.classList.add('hidden');
    this.activeQuiz = null;
  }

  showCreator() {
    this.landingView.classList.add('hidden');
    this.takingView.classList.add('hidden');
    this.resultsView.classList.add('hidden');
    this.creatorView.classList.remove('hidden');
    
    // Clear inputs
    this.newQuizTitleInput.value = '';
    this.newQuizDescInput.value = '';
    this.creatorQuestionsList.innerHTML = '';
    
    // Add first question builder block
    this.addNewQuestionBlockInCreator();
  }

  renderHub() {
    if (!this.quizzesListContainer) return;
    this.quizzesListContainer.innerHTML = '';

    stateManager.state.quizzes.forEach(quiz => {
      const card = createQuizCard(quiz, (id) => this.startQuiz(id));
      this.quizzesListContainer.appendChild(card);
    });
  }

  startQuiz(quizId) {
    const quiz = stateManager.state.quizzes.find(q => q.id === quizId);
    if (!quiz || quiz.questions.length === 0) {
      createToast('danger', 'Could Not Start Quiz', 'This quiz has no questions.');
      return;
    }

    this.activeQuiz = quiz;
    this.currentQuestionIdx = 0;
    this.score = 0;
    
    this.landingView.classList.add('hidden');
    this.resultsView.classList.add('hidden');
    this.creatorView.classList.add('hidden');
    this.takingView.classList.remove('hidden');

    this.loadQuestion();
  }

  loadQuestion() {
    this.isAnswerLocked = false;
    this.selectedAnswerIdx = null;
    this.nextBtn.classList.add('hidden');

    const question = this.activeQuiz.questions[this.currentQuestionIdx];
    const totalQ = this.activeQuiz.questions.length;

    // Head progress indicators
    this.quizTitle.textContent = this.activeQuiz.title;
    this.progressText.textContent = `Question ${this.currentQuestionIdx + 1} of ${totalQ}`;
    const percent = ((this.currentQuestionIdx + 1) / totalQ) * 100;
    this.progressBar.style.width = `${percent}%`;

    // Question
    this.questionText.textContent = question.question;

    // Renders multiple choices
    this.optionsContainer.innerHTML = '';
    question.options.forEach((opt, idx) => {
      const btn = document.createElement('button');
      btn.className = 'btn-option';
      btn.innerHTML = `
        <span>${escapeHTML(opt)}</span>
        <span class="option-marker"></span>
      `;
      btn.dataset.index = idx;
      
      btn.addEventListener('click', (e) => this.handleOptionSelection(idx, e.currentTarget));
      this.optionsContainer.appendChild(btn);
    });
  }

  handleOptionSelection(idx, optionElement) {
    if (this.isAnswerLocked) return;

    this.selectedAnswerIdx = idx;
    this.isAnswerLocked = true;

    const question = this.activeQuiz.questions[this.currentQuestionIdx];
    const correctIdx = question.correctAnswer;

    // Play tactile sound clicks
    this.playClickSound(idx === correctIdx);

    // Apply colors
    const optionButtons = this.optionsContainer.querySelectorAll('.btn-option');
    optionButtons.forEach((btn, bIdx) => {
      if (bIdx === correctIdx) {
        btn.classList.add('correct');
        btn.querySelector('.option-marker').innerHTML = '<i class="fa-solid fa-circle-check"></i>';
      } else if (bIdx === idx) {
        btn.classList.add('wrong');
        btn.querySelector('.option-marker').innerHTML = '<i class="fa-solid fa-circle-xmark"></i>';
      }
      btn.style.cursor = 'default';
    });

    if (idx === correctIdx) {
      this.score++;
    }

    this.nextBtn.classList.remove('hidden');
    
    // Change button text on last question
    if (this.currentQuestionIdx === this.activeQuiz.questions.length - 1) {
      this.nextBtn.innerHTML = 'Finish Quiz <i class="fa-solid fa-circle-check"></i>';
    } else {
      this.nextBtn.innerHTML = 'Next Question <i class="fa-solid fa-arrow-right"></i>';
    }
  }

  handleNextQuestion() {
    if (this.currentQuestionIdx < this.activeQuiz.questions.length - 1) {
      this.currentQuestionIdx++;
      this.loadQuestion();
    } else {
      this.finishQuiz();
    }
  }

  finishQuiz() {
    this.takingView.classList.add('hidden');
    this.resultsView.classList.remove('hidden');

    const totalQ = this.activeQuiz.questions.length;
    stateManager.submitQuizScore(this.activeQuiz.id, this.score, totalQ);

    const percent = Math.round((this.score / totalQ) * 100);
    this.scoreFraction.textContent = `${this.score} / ${totalQ}`;
    this.scorePercent.textContent = `${percent}%`;

    // High scores visual effects
    let iconHTML = '<i class="fa-solid fa-trophy"></i>';
    let feedback = 'Good effort! Read the materials again and try to beat your score.';
    
    if (percent === 100) {
      feedback = 'Outstanding! Perfect score. You fully mastered this content!';
      iconHTML = '<i class="fa-solid fa-crown" style="color: var(--accent-orange);"></i>';
    } else if (percent >= 80) {
      feedback = 'Excellent job! You have a great grasp of the study items.';
    } else if (percent >= 50) {
      feedback = 'Passed! Keep reviewing to reinforce these topics further.';
      iconHTML = '<i class="fa-solid fa-circle-check"></i>';
    } else {
      feedback = 'Keep working on it. Practice active recall repeatedly to retain info!';
      iconHTML = '<i class="fa-solid fa-circle-exclamation" style="color: var(--accent-red)"></i>';
    }

    document.getElementById('results-score-icon').innerHTML = iconHTML;
    this.resultsFeedback.textContent = feedback;
    
    // Dispatch event to update statistics counts in dashboard
    window.dispatchEvent(new CustomEvent('quiz-finished'));
  }

  // --- QUIZ CREATION BUILDER ---
  
  addNewQuestionBlockInCreator() {
    const qCount = this.creatorQuestionsList.querySelectorAll('.creator-question-block').length + 1;
    const block = document.createElement('div');
    block.className = 'creator-question-block';
    block.dataset.index = qCount - 1;

    block.innerHTML = `
      <button type="button" class="btn-remove-creator-q" title="Delete Question">
        <i class="fa-solid fa-trash-can"></i>
      </button>
      
      <div class="form-group" style="margin-bottom: 0.75rem;">
        <label>Question ${qCount}</label>
        <input type="text" class="input-field creator-q-text" placeholder="Enter your question here..." required>
      </div>
      
      <label class="form-group" style="font-size: 0.75rem; font-weight: 600; display: block; margin-bottom: 0.4rem; color: var(--text-secondary)">
        Enter options and select the correct answer radio button:
      </label>
      
      <div class="creator-options-grid">
        <div class="creator-opt-group">
          <input type="radio" name="correct-ans-${qCount}" value="0" class="creator-opt-radio" checked>
          <input type="text" class="input-field-compact creator-opt-input" placeholder="Option A" required style="width: 100%;">
        </div>
        <div class="creator-opt-group">
          <input type="radio" name="correct-ans-${qCount}" value="1" class="creator-opt-radio">
          <input type="text" class="input-field-compact creator-opt-input" placeholder="Option B" required style="width: 100%;">
        </div>
        <div class="creator-opt-group">
          <input type="radio" name="correct-ans-${qCount}" value="2" class="creator-opt-radio">
          <input type="text" class="input-field-compact creator-opt-input" placeholder="Option C" style="width: 100%;">
        </div>
        <div class="creator-opt-group">
          <input type="radio" name="correct-ans-${qCount}" value="3" class="creator-opt-radio">
          <input type="text" class="input-field-compact creator-opt-input" placeholder="Option D" style="width: 100%;">
        </div>
      </div>
    `;

    block.querySelector('.btn-remove-creator-q').addEventListener('click', () => {
      const count = this.creatorQuestionsList.querySelectorAll('.creator-question-block').length;
      if (count <= 1) {
        createToast('warning', 'Requirement Check', 'Quizzes must have at least 1 question.');
        return;
      }
      block.remove();
      this.reindexCreatorQuestions();
    });

    this.creatorQuestionsList.appendChild(block);
    
    // Auto-scroll builder body down
    const formBody = document.querySelector('.creator-form-body');
    if (formBody) {
      formBody.scrollTop = formBody.scrollHeight;
    }
  }

  reindexCreatorQuestions() {
    const blocks = this.creatorQuestionsList.querySelectorAll('.creator-question-block');
    blocks.forEach((block, idx) => {
      const num = idx + 1;
      block.dataset.index = idx;
      block.querySelector('label').textContent = `Question ${num}`;
      
      const radios = block.querySelectorAll('.creator-opt-radio');
      radios.forEach(radio => {
        radio.name = `correct-ans-${num}`;
      });
    });
  }

  handleSaveQuiz() {
    const title = this.newQuizTitleInput.value.trim();
    const desc = this.newQuizDescInput.value.trim();

    if (!title) {
      createToast('warning', 'Missing Details', 'Quiz needs a title.');
      return;
    }

    const qBlocks = this.creatorQuestionsList.querySelectorAll('.creator-question-block');
    if (qBlocks.length === 0) {
      createToast('warning', 'Missing Content', 'Quiz needs at least 1 question.');
      return;
    }

    const questions = [];
    let isValid = true;

    qBlocks.forEach((block) => {
      const qText = block.querySelector('.creator-q-text').value.trim();
      const optInputs = block.querySelectorAll('.creator-opt-input');
      const correctRadio = block.querySelector('.creator-opt-radio:checked');
      
      if (!qText) {
        isValid = false;
        return;
      }

      const options = [];
      optInputs.forEach(input => {
        const val = input.value.trim();
        if (val) options.push(val);
      });

      if (options.length < 2) {
        isValid = false;
        return;
      }

      const correctAnsVal = correctRadio ? parseInt(correctRadio.value) : 0;
      // ensure selected option index exists
      if (correctAnsVal >= options.length) {
        isValid = false;
        return;
      }

      questions.push({
        id: 'q-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
        question: qText,
        options,
        correctAnswer: correctAnsVal
      });
    });

    if (!isValid) {
      createToast('warning', 'Form Error', 'Please check that all question fields and at least two option values are filled.');
      return;
    }

    stateManager.addQuiz({
      title,
      desc,
      questions
    });

    createToast('success', 'Quiz Created Successfully', `"${title}" has been saved to your Hub.`);
    this.showLanding();
  }

  // --- AUDIO FEEDBACK EFFECTS ---
  playClickSound(isCorrect) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0.04, ctx.currentTime);

      if (isCorrect) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
        osc.frequency.setValueAtTime(880.00, ctx.currentTime + 0.08); // A5
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(220, ctx.currentTime); // A3
        osc.frequency.setValueAtTime(146.83, ctx.currentTime + 0.08); // D3
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {
      console.warn('Audio check failed', e);
    }
  }
}

// Helper to escape HTML tags
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

export const quizEngine = new QuizEngine();
export default quizEngine;
