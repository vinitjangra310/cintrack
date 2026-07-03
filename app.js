/* -------------------------------------------------------------
 * AuraStudy Application Controller — Coordinates all modules
 * ------------------------------------------------------------- */

import { stateManager } from './state.js';
import { createTaskCard, createToast } from './components.js';
import { pomodoroTimer } from './pomodoro.js';
import { remindersService } from './reminders.js';
import { quizEngine } from './quiz.js';
import { flashcardSystem } from './flashcards.js';

class AppController {
  constructor() {
    this.currentView = 'dashboard';
    this.taskFilter = 'all';
    this.taskSortBy = 'dueDate';
    this.editingTaskId = null;

    // Cache elements
    this.sidebarNavItems = document.querySelectorAll('.nav-menu .nav-item');
    this.views = document.querySelectorAll('.app-view');
    this.pageTitle = document.getElementById('page-title');
    this.pageSubtitle = document.getElementById('page-subtitle');
    
    // Streak & Top bar info
    this.streakCounter = document.getElementById('streak-counter');
    this.totalFocusTodayText = document.getElementById('total-focus-today');
    
    // Theme toggle
    this.themeToggleBtn = document.getElementById('theme-toggle');

    // Task Modal
    this.taskModal = document.getElementById('modal-task-creator');
    this.btnOpenTaskModal = document.getElementById('btn-open-task-modal');
    this.btnCloseTaskModal = document.getElementById('btn-close-task-modal');
    this.btnCancelTask = document.getElementById('btn-cancel-task');
    this.btnSaveTask = document.getElementById('btn-save-task');
    this.taskForm = document.getElementById('task-form');

    // Task list container & filters
    this.tasksContainer = document.getElementById('tasks-container');
    this.filterButtons = document.querySelectorAll('.btn-filter');
    this.sortSelect = document.getElementById('task-sort');

    // Dashboard widgets
    this.statTasksCompleted = document.getElementById('stat-tasks-completed');
    this.statPomosCompleted = document.getElementById('stat-pomos-completed');
    this.statQuizAccuracy = document.getElementById('stat-quiz-accuracy');
    this.dashboardRecentActivity = document.getElementById('dashboard-recent-activity');
    this.dashboardCurrentGoal = document.getElementById('dashboard-current-goal');

    this.init();
  }

  init() {
    this.initTheme();
    this.initEventListeners();
    this.renderAll();

    // Listen for custom events to refresh dashboard
    window.addEventListener('pomo-updated', () => this.renderDashboard());
    window.addEventListener('quiz-finished', () => this.renderDashboard());
  }

  initTheme() {
    const isLight = stateManager.state.preferences.theme === 'light';
    document.body.classList.toggle('light-theme', isLight);
    
    const themeText = this.themeToggleBtn.querySelector('.theme-text');
    if (themeText) themeText.textContent = isLight ? 'Light Mode' : 'Dark Mode';
  }

  initEventListeners() {
    // Navigation / Routing
    this.sidebarNavItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = e.currentTarget.dataset.view;
        this.switchView(view);
      });
    });

    // Theme Toggle
    if (this.themeToggleBtn) {
      this.themeToggleBtn.addEventListener('click', () => this.toggleTheme());
    }

    // Modal Task Creator
    if (this.btnOpenTaskModal) {
      this.btnOpenTaskModal.addEventListener('click', () => this.openTaskModal());
    }
    if (this.btnCloseTaskModal) {
      this.btnCloseTaskModal.addEventListener('click', () => this.closeTaskModal());
    }
    if (this.btnCancelTask) {
      this.btnCancelTask.addEventListener('click', () => this.closeTaskModal());
    }
    if (this.btnSaveTask) {
      this.btnSaveTask.addEventListener('click', () => this.handleSaveTask());
    }

    // Task Filters
    this.filterButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.filterButtons.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        this.taskFilter = e.target.dataset.filter;
        this.renderTasks();
      });
    });

    // Task Sorting
    if (this.sortSelect) {
      this.sortSelect.addEventListener('change', (e) => {
        this.taskSortBy = e.target.value;
        this.renderTasks();
      });
    }

    // Monitor global state changes
    stateManager.onChange(() => {
      this.renderAll();
    });
  }

  toggleTheme() {
    const isLight = !document.body.classList.contains('light-theme');
    document.body.classList.toggle('light-theme', isLight);

    const themeText = this.themeToggleBtn.querySelector('.theme-text');
    if (themeText) themeText.textContent = isLight ? 'Light Mode' : 'Dark Mode';

    stateManager.state.preferences.theme = isLight ? 'light' : 'dark';
    stateManager.saveState();
  }

  switchView(viewName) {
    this.currentView = viewName;
    
    // View element visibility
    this.views.forEach(v => {
      v.classList.toggle('active', v.id === `view-${viewName}`);
    });

    // Nav active highlights
    this.sidebarNavItems.forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewName);
    });

    // Header Title updates
    const titleConfig = {
      dashboard: { title: 'Welcome Back, Scholar', subtitle: 'Let\'s build academic consistency today.' },
      tasks: { title: 'Study Tasks', subtitle: 'Keep track of assignments, reading topics, and projects.' },
      pomodoro: { title: 'Deep Focus Hub', subtitle: 'Mute distractions and work in intervals.' },
      quizzes: { title: 'Active Recall', subtitle: 'Self-assess with tailored mock quizzes.' },
      flashcards: { title: 'Flashcards & Memory', subtitle: 'Reinforce vocabulary and formulas through Leitner reviews.' }
    };

    const config = titleConfig[viewName] || titleConfig.dashboard;
    this.pageTitle.textContent = config.title;
    this.pageSubtitle.textContent = config.subtitle;

    // Refresh contents
    this.renderAll();
  }

  // --- RENDERS MAIN ENGINE ---

  renderAll() {
    this.renderTopBar();
    this.renderDashboard();
    this.renderTasks();
  }

  renderTopBar() {
    const streak = stateManager.state.streak || 0;
    this.streakCounter.textContent = `${streak} Day Streak`;

    const focusMinutes = stateManager.state.stats.totalFocusMinutes || 0;
    this.totalFocusTodayText.textContent = `${focusMinutes}m Focused`;
  }

  renderDashboard() {
    const stats = stateManager.state.stats;
    
    // Set widget numbers
    this.statTasksCompleted.textContent = stats.tasksCompletedCount || 0;
    this.statPomosCompleted.textContent = stats.pomosCompletedCount || 0;
    
    let accuracy = 0;
    if (stats.quizAttempts > 0) {
      accuracy = Math.round(stats.quizTotalScores / stats.quizAttempts);
    }
    this.statQuizAccuracy.textContent = `${accuracy}%`;

    // Render Recent Activities list
    if (this.dashboardRecentActivity) {
      this.dashboardRecentActivity.innerHTML = '';
      const logs = stateManager.state.activityLog || [];
      
      if (logs.length === 0) {
        this.dashboardRecentActivity.innerHTML = '<li class="empty-state-text">No activity logged.</li>';
      } else {
        logs.forEach(log => {
          const li = document.createElement('li');
          li.className = 'activity-item';
          li.innerHTML = `
            <i class="fa-solid fa-clock-rotate-left"></i>
            <span class="text-secondary" style="font-size:0.8rem; min-width:40px;">${log.time}</span>
            <span>${log.text}</span>
          `;
          this.dashboardRecentActivity.appendChild(li);
        });
      }
    }

    // Render "Current Study Goal" card
    if (this.dashboardCurrentGoal) {
      // Find first incomplete task
      const firstPending = stateManager.state.tasks.find(t => !t.completed);
      
      if (!firstPending) {
        this.dashboardCurrentGoal.innerHTML = `
          <p class="empty-state-text">All study tasks are completed! Enjoy your break.</p>
        `;
      } else {
        this.dashboardCurrentGoal.innerHTML = `
          <div class="goal-active-layout">
            <div class="goal-info">
              <div class="goal-icon-badge">
                <i class="fa-solid fa-book-open"></i>
              </div>
              <div class="goal-details">
                <h4>${this.escapeHTML(firstPending.title)}</h4>
                <div class="goal-meta">
                  <span>Category: ${firstPending.category || 'General'}</span>
                  <span>Est. Pomos: ${firstPending.pomoEst}</span>
                </div>
              </div>
            </div>
            
            <div class="goal-pomo-status">
              <button class="btn btn-primary btn-sm" id="btn-dashboard-focus-goal" data-id="${firstPending.id}">
                <i class="fa-solid fa-play"></i> Start Focus
              </button>
            </div>
          </div>
        `;

        const focusGoalBtn = document.getElementById('btn-dashboard-focus-goal');
        if (focusGoalBtn) {
          focusGoalBtn.addEventListener('click', (e) => {
            const taskId = e.currentTarget.dataset.id;
            this.anchorTaskToPomodoro(taskId);
          });
        }
      }
    }
  }

  renderTasks() {
    if (!this.tasksContainer) return;
    this.tasksContainer.innerHTML = '';

    let tasks = [...stateManager.state.tasks];

    // Filter
    if (this.taskFilter === 'pending') {
      tasks = tasks.filter(t => !t.completed);
    } else if (this.taskFilter === 'completed') {
      tasks = tasks.filter(t => t.completed);
    }

    // Sort
    tasks.sort((a, b) => {
      if (this.taskSortBy === 'dueDate') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return a.dueDate.localeCompare(b.dueDate);
      } else if (this.taskSortBy === 'priority') {
        const order = { high: 1, medium: 2, low: 3 };
        return order[a.priority] - order[b.priority];
      } else if (this.taskSortBy === 'title') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    if (tasks.length === 0) {
      this.tasksContainer.innerHTML = `
        <div class="glass span-col-2" style="padding: 3rem; text-align: center; color: var(--text-muted);">
          <i class="fa-solid fa-list-check" style="font-size: 3rem; margin-bottom:1rem;"></i>
          <p>No study tasks found matching the filter.</p>
        </div>
      `;
      return;
    }

    tasks.forEach(task => {
      const card = createTaskCard(task, {
        onToggle: (id) => stateManager.updateTask(id, { completed: !task.completed }),
        onDelete: (id) => stateManager.deleteTask(id),
        onEdit: (t) => this.openTaskModal(t),
        onFocus: (id) => this.anchorTaskToPomodoro(id)
      });
      this.tasksContainer.appendChild(card);
    });
  }

  // --- POMODORO ANCHORING TASK ---
  
  anchorTaskToPomodoro(taskId) {
    this.switchView('pomodoro');
    
    // Access selector dropdown in Pomodoro class and bind it
    const selector = document.getElementById('timer-task-select');
    if (selector) {
      selector.value = taskId;
      pomodoroTimer.selectedTaskId = taskId;
      pomodoroTimer.updateStats(); // updates titles
      createToast('info', 'Task Anchored', 'Selected task is bound to the focus clock.');
    }
  }

  // --- TASK MODAL HANDLERS ---

  openTaskModal(taskToEdit = null) {
    const modalTitle = document.getElementById('modal-task-title-action');
    
    if (taskToEdit) {
      this.editingTaskId = taskToEdit.id;
      modalTitle.textContent = 'Edit Study Task';
      
      document.getElementById('task-title').value = taskToEdit.title;
      document.getElementById('task-category').value = taskToEdit.category || '';
      document.getElementById('task-due').value = taskToEdit.dueDate || '';
      document.getElementById('task-priority').value = taskToEdit.priority || 'medium';
      document.getElementById('task-pomo-est').value = taskToEdit.pomoEst || 2;
      document.getElementById('task-notes').value = taskToEdit.notes || '';
    } else {
      this.editingTaskId = null;
      modalTitle.textContent = 'Add New Task';
      this.taskForm.reset();
      
      // Default to today's date
      document.getElementById('task-due').value = new Date().toISOString().split('T')[0];
    }

    this.taskModal.classList.add('active');
  }

  closeTaskModal() {
    this.taskModal.classList.remove('active');
    this.taskForm.reset();
    this.editingTaskId = null;
  }

  handleSaveTask() {
    const title = document.getElementById('task-title').value.trim();
    const category = document.getElementById('task-category').value.trim();
    const dueDate = document.getElementById('task-due').value;
    const priority = document.getElementById('task-priority').value;
    const pomoEst = parseInt(document.getElementById('task-pomo-est').value) || 2;
    const notes = document.getElementById('task-notes').value.trim();

    if (!title) {
      createToast('warning', 'Form Incomplete', 'Task title is required.');
      return;
    }

    const taskData = {
      title,
      category,
      dueDate,
      priority,
      pomoEst,
      notes
    };

    if (this.editingTaskId) {
      stateManager.updateTask(this.editingTaskId, taskData);
      createToast('success', 'Task Updated', 'Study milestone has been modified.');
    } else {
      stateManager.addTask(taskData);
      createToast('success', 'Task Added', 'New target created on your dashboard.');
    }

    this.closeTaskModal();
  }

  escapeHTML(str) {
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
}

export const app = new AppController();
window.app = app; // Expose for page element callbacks
