/* -------------------------------------------------------------
 * AuraStudy UI Components — Programmatic HTML builders
 * ------------------------------------------------------------- */

/**
 * Creates a glassmorphic Task Card element.
 */
export function createTaskCard(task, handlers) {
  const card = document.createElement('div');
  card.className = `task-card glass ${task.completed ? 'completed' : ''}`;
  card.dataset.id = task.id;

  // Priority color formatting
  const priorityBadge = `<span class="badge badge-${task.priority}">${task.priority} Priority</span>`;
  
  // Format due date elegantly
  let dateText = 'No due date';
  if (task.dueDate) {
    const d = new Date(task.dueDate);
    dateText = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  card.innerHTML = `
    <div class="task-card-header">
      <div>
        <span class="task-category-lbl">${task.category || 'General'}</span>
        <h3 class="task-card-title">${escapeHTML(task.title)}</h3>
      </div>
      ${priorityBadge}
    </div>
    
    ${task.notes ? `<p class="task-card-notes">${escapeHTML(task.notes)}</p>` : ''}
    
    <div class="task-card-footer">
      <div class="task-pomo-estimator">
        <i class="fa-solid fa-hourglass-half"></i>
        <span>${task.pomoDone || 0} / ${task.pomoEst || 2} Pomos</span>
        <span class="text-muted" style="margin-left: 0.5rem;"><i class="fa-solid fa-calendar-day"></i> ${dateText}</span>
      </div>
      
      <div class="task-actions">
        <button class="btn-task-action action-complete" title="${task.completed ? 'Mark Pending' : 'Mark Completed'}">
          <i class="fa-solid ${task.completed ? 'fa-rotate-left' : 'fa-check'}"></i>
        </button>
        <button class="btn-task-action action-focus" title="Set Focus Timer Goal" ${task.completed ? 'disabled' : ''}>
          <i class="fa-solid fa-play"></i>
        </button>
        <button class="btn-task-action action-edit" title="Edit Task">
          <i class="fa-solid fa-pen"></i>
        </button>
        <button class="btn-task-action action-delete" title="Delete Task">
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `;

  // Attach event handlers
  card.querySelector('.action-complete').addEventListener('click', () => handlers.onToggle(task.id));
  card.querySelector('.action-delete').addEventListener('click', () => handlers.onDelete(task.id));
  card.querySelector('.action-edit').addEventListener('click', () => handlers.onEdit(task));
  
  const focusBtn = card.querySelector('.action-focus');
  if (focusBtn) {
    focusBtn.addEventListener('click', () => handlers.onFocus(task.id));
  }

  return card;
}

/**
 * Creates a Quiz Card widget for the landing view.
 */
export function createQuizCard(quiz, onStart) {
  const card = document.createElement('div');
  card.className = 'quiz-card glass';
  card.dataset.id = quiz.id;

  const scoreBadge = quiz.highScore !== null 
    ? `<span class="high-score-badge">Best Score: ${quiz.highScore}%</span>` 
    : `<span class="text-muted font-size-xs" style="font-size: 0.75rem;"><i class="fa-solid fa-bolt"></i> Never Attempted</span>`;

  card.innerHTML = `
    <div class="quiz-card-head">
      <h3>${escapeHTML(quiz.title)}</h3>
      <p class="text-secondary">${escapeHTML(quiz.desc || 'No description provided.')}</p>
    </div>
    
    <div class="quiz-card-actions">
      <div class="quiz-meta-info">
        <span><i class="fa-solid fa-list-ol"></i> ${quiz.questions.length} Questions</span>
      </div>
      ${scoreBadge}
    </div>
  `;

  card.addEventListener('click', () => onStart(quiz.id));
  return card;
}

/**
 * Creates an item in the flashcard sidebar list.
 */
export function createDeckItem(deck, activeDeckId, onSelect) {
  const btn = document.createElement('button');
  btn.className = `btn-deck-item ${deck.id === activeDeckId ? 'active' : ''}`;
  btn.innerHTML = `
    <span>${escapeHTML(deck.name)}</span>
    <span class="deck-card-count">${deck.cards.length}</span>
  `;
  btn.addEventListener('click', () => onSelect(deck.id));
  return btn;
}

/**
 * Pushes a custom toaster notification to the user.
 */
export function createToast(type, title, desc) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let iconClass = 'fa-circle-info';
  if (type === 'success') iconClass = 'fa-circle-check';
  if (type === 'warning') iconClass = 'fa-triangle-exclamation';
  if (type === 'danger') iconClass = 'fa-circle-exclamation';

  toast.innerHTML = `
    <div class="toast-icon">
      <i class="fa-solid ${iconClass}"></i>
    </div>
    <div class="toast-content">
      <div class="toast-title">${escapeHTML(title)}</div>
      ${desc ? `<div class="toast-desc">${escapeHTML(desc)}</div>` : ''}
    </div>
    <button class="toast-close">&times;</button>
  `;

  // Append toast
  container.appendChild(toast);

  const removeToast = () => {
    toast.classList.add('removing');
    toast.addEventListener('transitionend', () => {
      toast.remove();
    });
  };

  // Close trigger
  toast.querySelector('.toast-close').addEventListener('click', removeToast);

  // Auto-remove after 4 seconds
  setTimeout(() => {
    if (toast.parentNode) {
      removeToast();
    }
  }, 4500);
}

// Utility function to sanitise strings
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
