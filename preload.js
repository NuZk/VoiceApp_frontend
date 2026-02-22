const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script for secure IPC communication between main and renderer process
 * This exposes a limited, secure API to the web page
 */

// Expose Electron APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  
  // Settings persistence
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),
  getAllSettings: () => ipcRenderer.invoke('settings:getAll'),
  
  // Settings window
  openSettings: () => ipcRenderer.send('settings:open'),
  closeSettings: () => ipcRenderer.send('settings:close'),
  
  // Audio devices
  getAudioDevices: () => ipcRenderer.invoke('audio:getDevices'),
  
  // Hotkey management
  updateHotkey: (hotkey) => ipcRenderer.invoke('hotkey:update', hotkey),
  
  // Microphone selection
  updateMicrophone: (deviceId) => ipcRenderer.invoke('microphone:update', deviceId),
  
  // Listen for microphone change events
  onMicrophoneChanged: (callback) => {
    ipcRenderer.on('microphone:changed', (event, deviceId) => callback(deviceId));
  },
  
  // Logging
  log: (level, message) => ipcRenderer.send('log', level, message),
});

/**
 * Global Hotkey Handler
 * Exposes the toggle mute hotkey listener to the renderer
 */
contextBridge.exposeInMainWorld('electronHotkeys', {
  /**
   * Register a handler for the global mute toggle hotkey
   * @param {Function} handler - Callback function to execute when hotkey is pressed
   */
  onToggleMute: (handler) => {
    ipcRenderer.on('hotkey:toggle-mute', () => {
      if (typeof handler === 'function') {
        handler();
      }
    });
  },
  
  /**
   * Remove the toggle mute listener
   * @param {Function} handler - The handler to remove
   */
  removeToggleMuteListener: (handler) => {
    ipcRenderer.removeListener('hotkey:toggle-mute', handler);
  }
});

// Expose platform info
contextBridge.exposeInMainWorld('platform', {
  isWindows: process.platform === 'win32',
  isMac: process.platform === 'darwin',
  isLinux: process.platform === 'linux',
  platform: process.platform
});

// Persist display name on the main app page
const DISPLAY_NAME_KEY = 'displayName';
const DISPLAY_NAME_SELECTOR = '#display-name-input';

async function applyDisplayName(input) {
  try {
    const savedName = await ipcRenderer.invoke('settings:get', DISPLAY_NAME_KEY);
    if (typeof savedName === 'string' && savedName.length > 0) {
      hydrateDisplayName(input, savedName);
    }
  } catch (error) {
    logError('Failed to load display name', error);
  }
}

function setNativeInputValue(input, value) {
  const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
  if (descriptor && typeof descriptor.set === 'function') {
    descriptor.set.call(input, value);
  } else {
    input.value = value;
  }
}

function hydrateDisplayName(input, value) {
  setNativeInputValue(input, value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

function logError(message, error) {
  ipcRenderer.send('log', 'error', `${message}: ${error?.message || error}`);
}

function attachDisplayNamePersistence(input) {
  if (!input || input.dataset.displayNameBound === 'true') {
    return;
  }

  input.dataset.displayNameBound = 'true';
  applyDisplayName(input);

  let saveTimer = null;

  const saveDisplayName = async () => {
    try {
      await ipcRenderer.invoke('settings:set', DISPLAY_NAME_KEY, input.value || '');
    } catch (error) {
      logError('Failed to save display name', error);
    }
  };

  input.addEventListener('input', () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
    }

    saveTimer = setTimeout(() => {
      saveDisplayName();
    }, 300);
  });

  input.addEventListener('blur', () => {
    if (saveTimer) {
      clearTimeout(saveTimer);
      saveTimer = null;
    }

    saveDisplayName();
  });
}

function initDisplayNamePersistence() {
  const tryAttach = () => {
    const input = document.querySelector(DISPLAY_NAME_SELECTOR);
    if (input) {
      attachDisplayNamePersistence(input);
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryAttach);
  } else {
    tryAttach();
  }

  const startObserver = () => {
    if (!document || !document.documentElement) {
      setTimeout(startObserver, 200);
      return;
    }

    const observer = new MutationObserver(() => {
      tryAttach();
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
  };

  startObserver();
}

initDisplayNamePersistence();
