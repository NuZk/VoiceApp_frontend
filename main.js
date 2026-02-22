const { app, BrowserWindow, session, ipcMain, globalShortcut, Menu } = require('electron');
const path = require('path');
const Store = require('electron-store');
const log = require('electron-log');
const { autoUpdater } = require('electron-updater');
require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});

/**
 * VoiceApp Desktop Client
 * Production-ready Electron wrapper for Laravel + Vue + LiveKit voice app
 */

// ================================================================================
// CONFIGURATION
// ================================================================================

const isDev = process.env.NODE_ENV === 'development';
const backendUrl = process.env.BACKEND_URL || 'https://voiceapp.nuzk-server.com';
const openDevTools = process.env.OPEN_DEVTOOLS === 'true';
const autoUpdateEnabled = process.env.AUTO_UPDATE_ENABLED === 'true';
const hotkeyToggleMute = process.env.HOTKEY_TOGGLE_MUTE || 'CommandOrControl+Shift+M';

// ================================================================================
// LOGGING
// ================================================================================

// Configure logging
log.transports.file.level = process.env.LOG_LEVEL || 'info';
log.transports.console.level = isDev ? 'debug' : 'warn';

log.info('=== VoiceApp Desktop Starting ===');
log.info(`Environment: ${isDev ? 'Development' : 'Production'}`);
log.info(`Backend URL: ${backendUrl}`);
log.info(`App Version: ${app.getVersion()}`);

// ================================================================================
// PERSISTENT STORAGE
// ================================================================================

const store = new Store({
  defaults: {
    windowBounds: { width: 1200, height: 800 },
    displayName: '',
    lastRoom: '',
    micMuted: false,
    volume: 100,
    noiseGateEnabled: true,
    noiseGateThreshold: -50
  }
});

log.debug('Settings loaded from store');

// ================================================================================
// SECURITY & PERMISSIONS
// ================================================================================

// Handle insecure origins for WebRTC in development
if (isDev && backendUrl.startsWith('http://')) {
  app.commandLine.appendSwitch('unsafely-treat-insecure-origin-as-secure', backendUrl);
  log.warn('Treating insecure origin as secure (development only)');
}

// Set up permissions before app is ready
app.whenReady().then(() => {
  // Media permissions (microphone/camera)
  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    return permission === 'media';
  });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = permission === 'media';
    log.debug(`Permission request: ${permission} -> ${allowed ? 'granted' : 'denied'}`);
    callback(allowed);
  });

  // Content Security Policy (production)
  if (!isDev) {
    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; " +
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
            "style-src 'self' 'unsafe-inline'; " +
            "img-src 'self' data: https:; " +
            "connect-src 'self' wss: https:; " +
            "media-src 'self' blob:; "
          ]
        }
      });
    });
  }
});

// ================================================================================
// AUTO-UPDATER
// ================================================================================

if (autoUpdateEnabled && !isDev) {
  autoUpdater.logger = log;
  autoUpdater.checkForUpdatesAndNotify();

  autoUpdater.on('update-available', () => {
    log.info('Update available. Downloading...');
  });

  autoUpdater.on('update-downloaded', () => {
    log.info('Update downloaded. Will install on quit.');
  });

  // Check for updates every hour
  setInterval(() => {
    autoUpdater.checkForUpdatesAndNotify();
  }, 60 * 60 * 1000);
}

// ================================================================================
// WINDOW MANAGEMENT
// ================================================================================

let mainWindow = null;
let settingsWindow = null;

function createWindow() {
  const bounds = store.get('windowBounds');

  mainWindow = new BrowserWindow({
    width: bounds.width,
    height: bounds.height,
    minWidth: 800,
    minHeight: 600,
    title: 'VoiceApp',
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: !isDev,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false // Show only when ready to prevent flashing
  });

  // Save window bounds on resize/move
  mainWindow.on('resize', () => {
    if (!mainWindow.isMaximized()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  });

  mainWindow.on('moved', () => {
    if (!mainWindow.isMaximized()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
  });

  // Show window when ready to prevent flashing
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    log.debug('Main window shown');
  });

  // Load backend URL
  mainWindow.loadURL(backendUrl).catch(err => {
    log.error('Failed to load URL:', err);
    // Show error dialog or fallback page
  });

  // Development tools
  if (openDevTools && isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle navigation (prevent external navigation)
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(backendUrl)) {
      event.preventDefault();
      log.warn(`Navigation blocked: ${url}`);
    }
  });

  // Handle new window requests (open in default browser)
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    require('electron').shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
}

function createSettingsWindow() {
  // Don't create multiple settings windows
  if (settingsWindow) {
    settingsWindow.focus();
    return settingsWindow;
  }

  settingsWindow = new BrowserWindow({
    width: 650,
    height: 700,
    minWidth: 600,
    minHeight: 600,
    title: 'Settings - VoiceApp',
    backgroundColor: '#1a1a1a',
    resizable: true,
    minimizable: true,
    maximizable: false,
    parent: mainWindow,
    modal: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false
  });

  settingsWindow.loadFile('settings.html');

  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
    log.debug('Settings window shown');
  });

  settingsWindow.on('closed', () => {
    settingsWindow = null;
    log.debug('Settings window closed');
  });

  // Open DevTools in development
  if (isDev && openDevTools) {
    settingsWindow.webContents.openDevTools();
  }

  return settingsWindow;
}

// ================================================================================
// GLOBAL HOTKEYS
// ================================================================================

let currentHotkey = null;

function registerGlobalHotkeys() {
  try {
    // Get hotkey from settings or use default
    const savedHotkey = store.get('hotkey');
    currentHotkey = savedHotkey || hotkeyToggleMute;

    // Toggle Mute Hotkey
    const registered = globalShortcut.register(currentHotkey, () => {
      if (mainWindow && mainWindow.webContents) {
        log.debug('Global hotkey triggered: toggle-mute');
        mainWindow.webContents.send('hotkey:toggle-mute');
      }
    });

    if (registered) {
      log.info(`Global hotkey registered: ${currentHotkey}`);
    } else {
      log.error(`Failed to register hotkey: ${currentHotkey}`);
    }
  } catch (error) {
    log.error('Error registering global hotkeys:', error);
  }
}

function updateGlobalHotkey(newHotkey) {
  try {
    // Unregister old hotkey
    if (currentHotkey) {
      globalShortcut.unregister(currentHotkey);
      log.debug(`Unregistered old hotkey: ${currentHotkey}`);
    }

    // Register new hotkey
    const registered = globalShortcut.register(newHotkey, () => {
      if (mainWindow && mainWindow.webContents) {
        log.debug('Global hotkey triggered: toggle-mute');
        mainWindow.webContents.send('hotkey:toggle-mute');
      }
    });

    if (registered) {
      currentHotkey = newHotkey;
      log.info(`Global hotkey updated: ${newHotkey}`);
      return true;
    } else {
      log.error(`Failed to register new hotkey: ${newHotkey}`);
      // Try to re-register the old one
      if (currentHotkey) {
        globalShortcut.register(currentHotkey, () => {
          if (mainWindow && mainWindow.webContents) {
            mainWindow.webContents.send('hotkey:toggle-mute');
          }
        });
      }
      return false;
    }
  } catch (error) {
    log.error('Error updating global hotkey:', error);
    return false;
  }
}

function unregisterGlobalHotkeys() {
  globalShortcut.unregisterAll();
  log.debug('All global hotkeys unregistered');
}

// ================================================================================
// IPC HANDLERS
// ================================================================================

// App info
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

// Window controls
ipcMain.on('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.on('window:close', () => {
  if (mainWindow) mainWindow.close();
});

// Settings persistence
ipcMain.handle('settings:get', (event, key) => {
  return store.get(key);
});

ipcMain.handle('settings:set', (event, key, value) => {
  store.set(key, value);
  log.debug(`Setting saved: ${key}`);
  return true;
});

ipcMain.handle('settings:getAll', () => {
  return store.store;
});

// Logging from renderer
ipcMain.on('log', (event, level, message) => {
  log[level] ? log[level](`[Renderer] ${message}`) : log.info(`[Renderer] ${message}`);
});

// Settings window
ipcMain.on('settings:open', () => {
  createSettingsWindow();
});

ipcMain.on('settings:close', () => {
  if (settingsWindow) {
    settingsWindow.close();
  }
});

// Audio devices
ipcMain.handle('audio:getDevices', async () => {
  try {
    // Enumerate audio input devices
    // Note: We can't directly enumerate from main process, so we return a placeholder
    // The renderer will actually enumerate devices using navigator.mediaDevices
    // But we can provide a way to save/load the selected device
    log.debug('Audio devices requested');
    
    // Return empty array - actual enumeration happens in renderer
    // This is just a placeholder for the API structure
    return [];
  } catch (error) {
    log.error('Failed to get audio devices:', error);
    return [];
  }
});

// Hotkey management
ipcMain.handle('hotkey:update', async (event, newHotkey) => {
  try {
    log.info(`Updating hotkey to: ${newHotkey}`);
    const success = updateGlobalHotkey(newHotkey);
    
    if (success) {
      store.set('hotkey', newHotkey);
      return { success: true };
    } else {
      return { success: false, error: 'Failed to register hotkey' };
    }
  } catch (error) {
    log.error('Error updating hotkey:', error);
    return { success: false, error: error.message };
  }
});

// Microphone selection
ipcMain.handle('microphone:update', async (event, deviceLabel) => {
  try {
    // deviceLabel is the microphone name/label (persistent identifier)
    // Empty string means use system default
    log.info(`Microphone updated: ${deviceLabel || 'default'}`);
    store.set('selectedMicrophone', deviceLabel);
    
    // Notify main window of microphone change
    if (mainWindow && mainWindow.webContents) {
      mainWindow.webContents.send('microphone:changed', deviceLabel);
    }
    
    return { success: true };
  } catch (error) {
    log.error('Error updating microphone:', error);
    return { success: false, error: error.message };
  }
});

// ================================================================================
// APPLICATION LIFECYCLE
// ================================================================================

app.whenReady().then(() => {
  createWindow();
  registerGlobalHotkeys();
  createApplicationMenu();
  log.info('Application ready');
});

app.on('window-all-closed', () => {
  unregisterGlobalHotkeys();
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
    registerGlobalHotkeys();
  }
});

app.on('will-quit', () => {
  unregisterGlobalHotkeys();
});

// ================================================================================
// APPLICATION MENU
// ================================================================================

function createApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Settings',
          accelerator: 'CmdOrCtrl+,',
          click: () => {
            createSettingsWindow();
          }
        },
        { type: 'separator' },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.reload();
          }
        },
        { type: 'separator' },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin'
          ? [
              { type: 'separator' },
              { role: 'front' },
              { type: 'separator' },
              { role: 'window' }
            ]
          : [{ role: 'close' }])
      ]
    }
  ];

  if (isDev) {
    template.push({
      label: 'Developer',
      submenu: [
        { role: 'toggleDevTools' },
        { type: 'separator' },
        {
          label: 'Clear Settings',
          click: () => {
            store.clear();
            log.info('Settings cleared');
            if (mainWindow) mainWindow.reload();
          }
        }
      ]
    });
  }

  template.push({
    label: 'Help',
    submenu: [
      {
        label: 'About',
        click: () => {
          log.info(`VoiceApp v${app.getVersion()}`);
        }
      }
    ]
  });

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ================================================================================
// ERROR HANDLING
// ================================================================================

process.on('uncaughtException', (error) => {
  log.error('Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  log.error('Unhandled rejection:', error);
});