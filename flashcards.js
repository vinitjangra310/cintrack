/* -------------------------------------------------------------
 * AuraStudy Flashcards module — 3D Flipping and Leitner Box System
 * ------------------------------------------------------------- */

import { stateManager } from './state.js';
import { createDeckItem, createToast } from './components.js';

class FlashcardSystem {
  constructor() {
    this.activeDeckId = '';
    this.currentCardsToReview = [];
    this.currentCardIdx = 0;

    // Cache elements
    this.decksContainer = document.getElementById('decks-list-container');
    this.studyEmptyState = document.getElementById('card-study-empty');
    this.studyActiveState = document.getElementById('card-study-active');
    this.studyCompletedState = document.getElementById('card-study-completed');

    // Active review card elements
    this.currentDeckTitleText = document.getElementById('study-deck-title-current');
    this.currentCardIndexText = document.getElementById('study-card-index');
    this.flashcardWidget = document.getElementById('interactive-flashcard');
    
    this.cardFrontText = document.getElementById('card-front-content');
    this.cardBackText = document.getElementById('card-back-content');
    
    this.preFlipControls = document.getElementById('study-controls-pre-flip');
    this.postFlipControls = document.getElementById('study-controls-post-flip');

    // Buttons
    this.btnOpenDeckModal = document.getElementById('btn-open-deck-creator');
    this.btnCloseDeckModal = document.getElementById('btn-close-deck-modal');
    this.btnCancelDeck = document.getElementById('btn-cancel-deck');
    this.btnSaveDeck = document.getElementById('btn-save-deck');
    
    this.btnOpenCardModal = document.getElementById('btn-open-card-modal');
    this.btnCloseCardModal = document.getElementById('btn-close-card-modal-x');
    this.btnCancelCard = document.getElementById('btn-cancel-card');
    this.btnSaveCard = document.getElementById('btn-save-card');

    this.btnRevealAnswer = document.getElementById('btn-reveal-answer');
    this.btnRestartDeck = document.getElementById('btn-restart-deck');

    // Modals
    this.deckModal = document.getElementById('modal-deck-creator');
    this.cardModal = document.getElementById('modal-card-creator');
    this.deckSelect = document.getElementById('card-deck-select');
    this.deckNameInput = document.getElementById('deck-name-input');
    
    this.cardFrontInput = document.getElementById('card-front-input');
    this.cardBackInput = document.getElementById('card-back-input');

    this.init();
  }

  init() {
    this.initEventListeners();
    this.renderSidebar();
  }

  initEventListeners() {
    // 3D Flip Card click logic
    if (this.flashcardWidget) {
      this.flashcardWidget.addEventListener('click', () => this.toggleFlip());
    }

    if (this.btnRevealAnswer) {
      this.btnRevealAnswer.addEventListener('click', () => this.revealAnswer());
    }

    if (this.btnRestartDeck) {
      this.btnRestartDeck.addEventListener('click', () => this.startDeckReview(this.activeDeckId));
    }

    // Modal Deck Triggers
    if (this.btnOpenDeckModal) this.btnOpenDeckModal.addEventListener('click', () => this.openModal(this.deckModal));
    if (this.btnCloseDeckModal) this.btnCloseDeckModal.addEventListener('click', () => this.closeModal(this.deckModal));
    if (this.btnCancelDeck) this.btnCancelDeck.addEventListener('click', () => this.closeModal(this.deckModal));
    if (this.btnSaveDeck) this.btnSaveDeck.addEventListener('click', () => this.handleSaveDeck());

    // Modal Card Triggers
    if (this.btnOpenCardModal) this.btnOpenCardModal.addEventListener('click', () => this.handleOpenCardModal());
    if (this.btnCloseCardModal) this.btnCloseCardModal.addEventListener('click', () => this.closeModal(this.cardModal));
    if (this.btnCancelCard) this.btnCancelCard.addEventListener('click', () => this.closeModal(this.cardModal));
    if (this.btnSaveCard) this.btnSaveCard.addEventListener('click', () => this.handleSaveCard());

    // Leitner Box Grade Clicks
    document.querySelectorAll('.btn-grade').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const grade = e.currentTarget.dataset.grade;
        this.handleCardGrading(grade);
      });
    });

    // Listen to changes in state
    stateManager.onChange(() => {
      this.renderSidebar();
      this.populateDecksSelectDropdown();
    });
  }

  renderSidebar() {
    if (!this.decksContainer) return;
    this.decksContainer.innerHTML = '';

    const decks = stateManager.state.flashcardDecks;
    
    if (decks.length === 0) {
      this.decksContainer.innerHTML = '<p class="empty-state-text">No decks created yet.</p>';
      return;
    }

    decks.forEach(deck => {
      const el = createDeckItem(deck, this.activeDeckId, (id) => this.startDeckReview(id));
      this.decksContainer.appendChild(el);
    });
  }

  populateDecksSelectDropdown() {
    if (!this.deckSelect) return;
    this.deckSelect.innerHTML = '';

    const decks = stateManager.state.flashcardDecks;
    decks.forEach(deck => {
      const opt = document.createElement('option');
      opt.value = deck.id;
      opt.textContent = deck.name;
      this.deckSelect.appendChild(opt);
    });
  }

  // --- REVIEW DECK LOGIC ---

  startDeckReview(deckId) {
    this.activeDeckId = deckId;
    const deck = stateManager.state.flashcardDecks.find(d => d.id === deckId);
    
    this.renderSidebar(); // update highlighted active class
    
    if (!deck || deck.cards.length === 0) {
      this.showEmptyState();
      createToast('info', 'Empty Deck', 'Add flashcards to this deck to start reviewing.');
      return;
    }

    // Filter cards using spaced repetition logic (prioritising boxes 1, 2, etc.)
    // For simplicity of study session flow, review all cards in the deck
    this.currentCardsToReview = [...deck.cards];
    this.currentCardIdx = 0;

    this.showActiveState();
    this.loadCard();
  }

  loadCard() {
    // Reset flip animations
    this.flashcardWidget.classList.remove('flipped');
    this.preFlipControls.classList.remove('hidden');
    this.postFlipControls.classList.add('hidden');

    const card = this.currentCardsToReview[this.currentCardIdx];
    const total = this.currentCardsToReview.length;

    const deck = stateManager.state.flashcardDecks.find(d => d.id === this.activeDeckId);
    this.currentDeckTitleText.textContent = deck.name;
    this.currentCardIndexText.textContent = `Card ${this.currentCardIdx + 1} of ${total} (Box ${card.box || 1})`;

    this.cardFrontText.textContent = card.front;
    this.cardBackText.textContent = card.back;
  }

  toggleFlip() {
    this.flashcardWidget.classList.toggle('flipped');
    
    // Auto adjust buttons state depending on orientation
    const isFlipped = this.flashcardWidget.classList.contains('flipped');
    if (isFlipped) {
      this.preFlipControls.classList.add('hidden');
      this.postFlipControls.classList.remove('hidden');
    } else {
      this.preFlipControls.classList.remove('hidden');
      this.postFlipControls.classList.add('hidden');
    }
  }

  revealAnswer() {
    if (!this.flashcardWidget.classList.contains('flipped')) {
      this.toggleFlip();
    }
  }

  handleCardGrading(grade) {
    const card = this.currentCardsToReview[this.currentCardIdx];
    const isCorrect = (grade === 'easy' || grade === 'hard');
    
    // Save to Leitner boxes state
    stateManager.gradeCard(this.activeDeckId, card.id, isCorrect);
    
    // Play quick feedback tones
    this.playTactileBeep(isCorrect);

    // Show toast for advance tracking
    if (grade === 'easy') {
      createToast('success', 'Nice Job!', `Card advanced to Leitner Box ${Math.min(5, (card.box || 1) + 1)}.`);
    } else if (grade === 'forgot') {
      createToast('warning', 'Card Reset', 'Demoted to Box 1 for closer review.');
    }

    // Move to next
    if (this.currentCardIdx < this.currentCardsToReview.length - 1) {
      this.currentCardIdx++;
      this.loadCard();
    } else {
      this.showCompletedState();
    }
  }

  // --- STATEMENTS SWITCHING ---

  showEmptyState() {
    this.studyEmptyState.classList.remove('hidden');
    this.studyActiveState.classList.add('hidden');
    this.studyCompletedState.classList.add('hidden');
  }

  showActiveState() {
    this.studyEmptyState.classList.add('hidden');
    this.studyActiveState.classList.remove('hidden');
    this.studyCompletedState.classList.add('hidden');
  }

  showCompletedState() {
    this.studyEmptyState.classList.add('hidden');
    this.studyActiveState.classList.add('hidden');
    this.studyCompletedState.classList.remove('hidden');
  }

  // --- MODAL UTILITIES ---

  openModal(modal) {
    modal.classList.add('active');
  }

  closeModal(modal) {
    modal.classList.remove('active');
  }

  handleOpenCardModal() {
    const decks = stateManager.state.flashcardDecks;
    if (decks.length === 0) {
      createToast('warning', 'No Decks Available', 'Create a deck first before adding cards.');
      return;
    }
    
    this.populateDecksSelectDropdown();
    
    // Pre-select active deck if one is viewed
    if (this.activeDeckId) {
      this.deckSelect.value = this.activeDeckId;
    }

    // Reset fields
    this.cardFrontInput.value = '';
    this.cardBackInput.value = '';
    
    this.openModal(this.cardModal);
  }

  handleSaveDeck() {
    const name = this.deckNameInput.value.trim();
    if (!name) {
      createToast('warning', 'Form Error', 'Please enter a deck name.');
      return;
    }

    const newDeck = stateManager.addDeck(name);
    this.closeModal(this.deckModal);
    this.deckNameInput.value = '';

    createToast('success', 'Deck Created', `"${name}" is ready for cards.`);
    this.startDeckReview(newDeck.id);
  }

  handleSaveCard() {
    const targetDeckId = this.deckSelect.value;
    const front = this.cardFrontInput.value.trim();
    const back = this.cardBackInput.value.trim();

    if (!targetDeckId || !front || !back) {
      createToast('warning', 'Form Error', 'Please select a deck and fill in both front and back sides.');
      return;
    }

    stateManager.addCard(targetDeckId, front, back);
    this.closeModal(this.cardModal);
    
    createToast('success', 'Flashcard Added', 'Saved successfully to deck.');
    
    // Auto-refresh deck review if we are viewing this deck
    if (this.activeDeckId === targetDeckId) {
      this.startDeckReview(targetDeckId);
    }
  }

  playTactileBeep(isSuccess) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      gain.gain.setValueAtTime(0.02, ctx.currentTime);

      if (isSuccess) {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
      } else {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.17);
      }
    } catch (e) {
      // Ignored
    }
  }
}

export const flashcardSystem = new FlashcardSystem();
export default flashcardSystem;
