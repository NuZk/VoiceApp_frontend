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
