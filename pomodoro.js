/* -------------------------------------------------------------
 * AuraStudy Pomodoro Timer — Clock cycles and Audio Synthesizer
 * ------------------------------------------------------------- */

import { stateManager } from './state.js';
import { createToast } from './components.js';

class PomodoroTimer {
  constructor() {
    this.timerId = null;
    this.status = 'idle'; // 'idle', 'running', 'paused'
    this.currentMode = 'focus'; // 'focus', 'shortBreak', 'longBreak'
    this.durationSeconds = 0;
    this.secondsRemaining = 0;
    
    this.roundsCompleted = 0;
    this.selectedTaskId = '';

    // Cache DOM
    this.timeDisplay = document.getElementById('timer-time');
    this.phaseLabel = document.getElementById('timer-phase-label');
    this.progressRing = document.getElementById('timer-ring-progress');
    this.toggleBtn = document.getElementById('btn-timer-toggle');
    this.resetBtn = document.getElementById('btn-timer-reset');
    this.skipBtn = document.getElementById('btn-timer-skip');
    this.taskSelect = document.getElementById('timer-task-select');
    
    this.cfgFocus = document.getElementById('cfg-focus');
    this.cfgShort = document.getElementById('cfg-short');
    this.cfgLong = document.getElementById('cfg-long');
    this.cfgRounds = document.getElementById('cfg-rounds');
    this.saveCfgBtn = document.getElementById('btn-save-timer-config');
    
    this.totalPomosBadge = document.getElementById('pomo-total-today');
    this.totalMinutesBadge = document.getElementById('pomo-minutes-today');
    this.dotTracker = document.getElementById('pomo-dot-tracker');

    // Circumference = 2 * Math.PI * 90 = 565.486
    this.circumference = 565.486;
    if (this.progressRing) {
      this.progressRing.style.strokeDasharray = `${this.circumference} ${this.circumference}`;
      this.progressRing.style.strokeDashoffset = this.circumference;
    }

    this.initEventListeners();
    this.applySettings();
  }

  initEventListeners() {
    if (this.toggleBtn) this.toggleBtn.addEventListener('click', () => this.toggle());
    if (this.resetBtn) this.resetBtn.addEventListener('click', () => this.reset());
    if (this.skipBtn) this.skipBtn.addEventListener('click', () => this.skip());
    
    if (this.saveCfgBtn) {
      this.saveCfgBtn.addEventListener('click', () => {
        this.saveSettings();
        createToast('success', 'Timer updated', 'New durations are now active.');
      });
    }

    // Task selector
    if (this.taskSelect) {
      this.taskSelect.addEventListener('change', (e) => {
        this.selectedTaskId = e.target.value;
      });
    }

    // Phase buttons
    document.querySelectorAll('.btn-mode').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const mode = e.target.dataset.mode;
        this.setMode(mode);
      });
    });
  }

  applySettings() {
    const prefs = stateManager.state.preferences.pomoDurations;
    if (this.cfgFocus) this.cfgFocus.value = prefs.focus;
    if (this.cfgShort) this.cfgShort.value = prefs.shortBreak;
    if (this.cfgLong) this.cfgLong.value = prefs.longBreak;
    if (this.cfgRounds) this.cfgRounds.value = prefs.rounds;

    this.setMode(this.currentMode);
    this.updateStats();
  }

  saveSettings() {
    const focusVal = parseInt(this.cfgFocus.value) || 25;
    const shortVal = parseInt(this.cfgShort.value) || 5;
    const longVal = parseInt(this.cfgLong.value) || 15;
    const roundsVal = parseInt(this.cfgRounds.value) || 4;

    stateManager.state.preferences.pomoDurations = {
      focus: focusVal,
      shortBreak: shortVal,
      longBreak: longVal,
      rounds: roundsVal
    };
    stateManager.saveState();
    
    this.setMode(this.currentMode);
  }

  updateStats() {
    const stats = stateManager.state.stats;
    if (this.totalPomosBadge) this.totalPomosBadge.textContent = stats.pomosCompletedCount;
    if (this.totalMinutesBadge) this.totalMinutesBadge.textContent = `${stats.totalFocusMinutes}m`;
    
    // Update Dots Tracker
    if (this.dotTracker) {
      this.dotTracker.innerHTML = '';
      const limit = stateManager.state.preferences.pomoDurations.rounds;
      const count = this.roundsCompleted % limit;
      
      for (let i = 0; i < limit; i++) {
        const dot = document.createElement('div');
        dot.className = `pomo-dot ${i < count ? 'completed' : ''}`;
        this.dotTracker.appendChild(dot);
      }
    }

    // Refresh Task Dropdown
    if (this.taskSelect) {
      const currentSelection = this.selectedTaskId;
      this.taskSelect.innerHTML = '<option value="">-- General Focus --</option>';
      stateManager.state.tasks.forEach(task => {
        if (!task.completed) {
          const opt = document.createElement('option');
          opt.value = task.id;
          opt.textContent = `${task.title} (${task.pomoDone || 0}/${task.pomoEst} pomos)`;
          if (task.id === currentSelection) opt.selected = true;
          this.taskSelect.appendChild(opt);
        }
      });
    }
  }

  setMode(mode) {
    this.stop();
    this.currentMode = mode;
    
    const prefs = stateManager.state.preferences.pomoDurations;
    let mins = 25;
    let label = 'Stay Focused';
    let ringColor = 'var(--accent-red)';

    if (mode === 'focus') {
      mins = prefs.focus;
      label = 'Stay Focused';
      ringColor = 'var(--accent-red)';
    } else if (mode === 'shortBreak') {
      mins = prefs.shortBreak;
      label = 'Short Break';
      ringColor = 'var(--accent-blue)';
    } else if (mode === 'longBreak') {
      mins = prefs.longBreak;
      label = 'Long Break';
      ringColor = 'var(--accent-green)';
    }

    this.durationSeconds = mins * 60;
    this.secondsRemaining = this.durationSeconds;
    
    if (this.phaseLabel) {
      this.phaseLabel.textContent = label;
      this.phaseLabel.style.color = ringColor;
    }
    
    if (this.progressRing) {
      this.progressRing.style.stroke = ringColor;
    }

    // Highlight active phase button
    document.querySelectorAll('.btn-mode').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.mode === mode);
    });

    this.updateDisplay();
  }

  toggle() {
    if (this.status === 'running') {
      this.pause();
    } else {
      this.start();
    }
  }

  start() {
    if (this.status === 'idle' || this.status === 'paused') {
      this.status = 'running';
      this.toggleBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
      this.toggleBtn.title = 'Pause';
      this.playSynthSound('start');

      this.timerId = setInterval(() => {
        this.secondsRemaining--;
        this.updateDisplay();
        
        if (this.secondsRemaining <= 0) {
          this.sessionFinished();
        }
      }, 1000);
    }
  }

  pause() {
    if (this.status === 'running') {
      this.status = 'paused';
      this.toggleBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      this.toggleBtn.title = 'Start';
      this.playSynthSound('pause');
      clearInterval(this.timerId);
    }
  }

  stop() {
    this.status = 'idle';
    if (this.toggleBtn) {
      this.toggleBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
      this.toggleBtn.title = 'Start';
    }
    clearInterval(this.timerId);
  }

  reset() {
    this.stop();
    this.secondsRemaining = this.durationSeconds;
    this.updateDisplay();
  }

  skip() {
    this.stop();
    // Switch to alternate state
    if (this.currentMode === 'focus') {
      const limit = stateManager.state.preferences.pomoDurations.rounds;
      this.roundsCompleted++;
      if (this.roundsCompleted % limit === 0) {
        this.setMode('longBreak');
      } else {
        this.setMode('shortBreak');
      }
    } else {
      this.setMode('focus');
    }
    this.updateStats();
  }

  updateDisplay() {
    const mins = Math.floor(this.secondsRemaining / 60);
    const secs = this.secondsRemaining % 60;
    const displayStr = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    
    if (this.timeDisplay) {
      this.timeDisplay.textContent = displayStr;
    }
    
    // Update Browser Document Title for user visual tracking
    document.title = `(${displayStr}) AuraStudy Focus`;

    // Ring visual update
    if (this.progressRing) {
      const percent = this.secondsRemaining / this.durationSeconds;
      const offset = this.circumference * percent;
      this.progressRing.style.strokeDashoffset = offset;
    }
  }

  sessionFinished() {
    this.stop();
    this.playSynthSound('alarm');

    if (this.currentMode === 'focus') {
      const mins = stateManager.state.preferences.pomoDurations.focus;
      stateManager.completePomodoro(mins, this.selectedTaskId);
      
      this.roundsCompleted++;
      const limit = stateManager.state.preferences.pomoDurations.rounds;
      
      createToast('success', 'Focus Session Done!', `You focused successfully for ${mins} minutes.`);

      // Prompt next phase
      if (this.roundsCompleted % limit === 0) {
        this.setMode('longBreak');
      } else {
        this.setMode('shortBreak');
      }
    } else {
      createToast('info', 'Break Finished', 'Time to start focusing again.');
      this.setMode('focus');
    }

    this.updateStats();
    
    // Dispatch custom event to trigger dashboard summaries update
    window.dispatchEvent(new CustomEvent('pomo-updated'));
  }

  /**
   * Web Audio API Synthesizer - Generates beeps locally without files
   */
  playSynthSound(type) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, ctx.currentTime); // A4
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'pause') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(330, ctx.currentTime); // E4
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
        osc.start();
        osc.stop(ctx.currentTime + 0.15);
      } else if (type === 'alarm') {
        // High pitch double beep
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0, ctx.currentTime + 0.15);
        
        // Second beep
        osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.2); // E5
        gain.gain.setValueAtTime(0.1, ctx.currentTime + 0.2);
        gain.gain.setValueAtTime(0.1, ctx.currentTime + 0.45);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.55);
      }
    } catch (e) {
      console.warn('Web Audio synthesis failed or blocked by autoplay policy', e);
    }
  }
}

export const pomodoroTimer = new PomodoroTimer();
