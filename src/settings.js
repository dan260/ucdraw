'use strict';

const SETTINGS_KEY = 'ucdraw.settings.v1';
const LAYOUTS = ['horizontal', 'vertical'];
const SYSTEM_STYLES = ['box', 'none'];
const USECASE_COLOR_MODES = ['vary', 'uniform'];

const UC_SETTINGS = { layout: 'horizontal', systems: 'box', useCaseColors: 'vary' };

function readSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed.layout && LAYOUTS.includes(parsed.layout)) {
      UC_SETTINGS.layout = parsed.layout;
    }
    if (parsed.systems && SYSTEM_STYLES.includes(parsed.systems)) {
      UC_SETTINGS.systems = parsed.systems;
    }
    if (parsed.useCaseColors && USECASE_COLOR_MODES.includes(parsed.useCaseColors)) {
      UC_SETTINGS.useCaseColors = parsed.useCaseColors;
    }
  } catch { /* localStorage unavailable */ }
}

function saveSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(UC_SETTINGS));
  } catch { /* localStorage unavailable */ }
}

function setSetting(key, value) {
  const allowed =
    key === 'layout' ? LAYOUTS
    : key === 'systems' ? SYSTEM_STYLES
    : key === 'useCaseColors' ? USECASE_COLOR_MODES
    : [];
  if (!allowed.includes(value)) return;
  UC_SETTINGS[key] = value;
  saveSettings();
}

readSettings();
