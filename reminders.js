/* -------------------------------------------------------------
 * AuraStudy Reminders Service — Handles alerts and alarms
 * ------------------------------------------------------------- */

import { stateManager } from './state.js';
import { createToast } from './components.js';

class RemindersService {
  constructor() {
    this.checkIntervalId = null;
    this.lastTriggeredTime = ''; // to avoid triggering multiple times in the same minute

    this.remListElement = document.getElementById('dashboard-reminder-list');
    this.addRemBtn = document.getElementById('btn-add-reminder');
    this.remTitleInput = document.getElementById('rem-title');
    this.remTimeInput = document.getElementById('rem-time');

    this.init();
  }

  init() {
    this.requestNotificationPermission();
    this.initEventListeners();
    this.render();

    // Start background ticking loop checking every 10 seconds
    this.checkIntervalId = setInterval(() => this.checkReminders(), 10000);
  }

  requestNotificationPermission() {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        // We will request when the user interacts, or proactively
        Notification.requestPermission();
      }
    }
  }

  initEventListeners() {
    if (this.addRemBtn) {
      this.addRemBtn.addEventListener('click', () => this.handleAddNewReminder());
    }
    
    // Listen for state changes to re-render
    stateManager.onChange(() => this.render());
  }

  handleAddNewReminder() {
    const title = this.remTitleInput.value.trim();
    const time = this.remTimeInput.value;

    if (!title || !time) {
      createToast('warning', 'Incomplete Form', 'Please enter both a title and time.');
      return;
    }

    stateManager.addReminder(title, time);
    createToast('success', 'Reminder Scheduled', `"${title}" has been set for ${time}.`);
    
    // Reset inputs
    this.remTitleInput.value = '';
    this.remTimeInput.value = '';
  }

  deleteReminder(id) {
    stateManager.deleteReminder(id);
    createToast('info', 'Reminder Removed', 'Scheduled study alert deleted.');
  }

  checkReminders() {
    const now = new Date();
    const currentHour = now.getHours().toString().padStart(2, '0');
    const currentMins = now.getMinutes().toString().padStart(2, '0');
    const currentTimeStr = `${currentHour}:${currentMins}`;

    // Prevent double triggers inside the same minute
    if (this.lastTriggeredTime === currentTimeStr) {
      return;
    }

    const matchedReminders = stateManager.state.reminders.filter(
      r => r.time === currentTimeStr
    );

    if (matchedReminders.length > 0) {
      this.lastTriggeredTime = currentTimeStr;
      
      matchedReminders.forEach(rem => {
        this.triggerAlert(rem);
      });
    }
  }

  triggerAlert(rem) {
    // Play synthesis sound
    this.playAlertSound();

    // Browser Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`AuraStudy: Time to Study!`, {
        body: rem.title,
        icon: 'https://cdn-icons-png.flaticon.com/512/3135/3135810.png' // Graduation icon placeholder
      });
    }

    // In-app Toast Banner
    createToast('danger', 'Study Session Alert', `Reminder: "${rem.title}" is scheduled now.`);
  }

  render() {
    if (!this.remListElement) return;

    this.remListElement.innerHTML = '';
    const reminders = stateManager.state.reminders;

    if (reminders.length === 0) {
      this.remListElement.innerHTML = '<li class="empty-state-text">No active alarms. Set one above!</li>';
      return;
    }

    // Sort chronologically by time
    const sorted = [...reminders].sort((a, b) => a.time.localeCompare(b.time));

    sorted.forEach(rem => {
      const li = document.createElement('li');
      li.className = 'reminder-item';
      li.innerHTML = `
        <div class="reminder-item-left">
          <i class="fa-solid fa-bell"></i>
          <div>
            <div class="reminder-title-txt">${this.escapeHTML(rem.title)}</div>
            <span class="reminder-time-txt">${rem.time}</span>
          </div>
        </div>
        <button class="btn-delete-reminder" data-id="${rem.id}" title="Remove alarm">
          <i class="fa-solid fa-trash-can"></i>
        </button>
      `;

      li.querySelector('.btn-delete-reminder').addEventListener('click', (e) => {
        const id = e.currentTarget.dataset.id;
        this.deleteReminder(id);
      });

      this.remListElement.appendChild(li);
    });
  }

  playAlertSound() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      // Upward triple chime
      osc.type = 'sine';
      
      const playBeep = (freq, time, dur) => {
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(0.08, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur - 0.02);
      };

      const now = ctx.currentTime;
      playBeep(523.25, now, 0.15); // C5
      playBeep(659.25, now + 0.2, 0.15); // E5
      playBeep(783.99, now + 0.4, 0.3); // G5
      
      osc.start();
      osc.stop(now + 0.8);
    } catch (e) {
      console.warn('Could not synthesize alarm sound', e);
    }
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

export const remindersService = new RemindersService();
export default remindersService;
