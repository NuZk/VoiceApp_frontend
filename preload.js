const { contextBridge, ipcRenderer } = require('electron');

/**
 * Preload script for secure IPC communication between main and renderer process
 * This exposes a limited, secure API to the web page
 */

// Expose Electron APIs to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // App info
  getAppVersion: () => ipcRenderer.invoke('app:getVersion'),
  checkForUpdates: () => ipcRenderer.invoke('app:checkForUpdates'),
  
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

  // Deep links
  onDeepLinkJoinCode: (callback) => {
    if (typeof callback !== 'function') {
      return () => {};
    }

    let lastDeliveredCode = null;

    const deliverCode = (code) => {
      if (typeof code !== 'string' || !code) {
        return;
      }

      if (code === lastDeliveredCode) {
        return;
      }

      lastDeliveredCode = code;
      callback(code);
    };

    const listener = (event, joinCode) => {
      deliverCode(joinCode);
    };

    ipcRenderer.on('deep-link:join-code', listener);
    ipcRenderer.invoke('deep-link:consume-pending-join-code').then(deliverCode).catch(() => {});

    return () => {
      ipcRenderer.removeListener('deep-link:join-code', listener);
    };
  },
  
  // Listen for microphone change events
  onMicrophoneChanged: (callback) => {
    ipcRenderer.on('microphone:changed', (event, deviceId) => callback(deviceId));
  },
  
  // Error handling
  getErrorDetails: () => ipcRenderer.invoke('error:getDetails'),
  retryBackendConnection: () => ipcRenderer.invoke('error:retry'),
  
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


