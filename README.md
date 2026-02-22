# VoiceApp Desktop - Setup & Configuration Guide

## Overview

This is the production-ready Electron desktop client for VoiceApp, a Laravel + Vue + LiveKit voice application. This client provides a native desktop experience with global hotkeys, persistent settings, and auto-updates.

## Features

- **Environment-based Configuration**: Separate configs for development and production
- **Global Hotkeys**: Toggle mute even when window is not focused
- **Persistent Settings**: User preferences saved locally
- **Auto-Updates**: Automatic update checks in production
- **Secure IPC**: Context-isolated communication between main and renderer
- **Proper Logging**: File and console logging with configurable levels
- **Window Management**: Save/restore window size and position
- **Application Menu**: Full menu with keyboard shortcuts

## Installation

### Prerequisites

- Node.js 18+ and npm
- Git

### Initial Setup

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd VoiceApp_frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment:
   ```bash
   # Copy the example environment file
   cp .env.example .env
   
   # Edit .env with your settings
   # Update BACKEND_URL to point to your backend
   ```

## Configuration

### Environment Files

- **`.env`** - Your local development configuration (not committed to git)
- **`.env.example`** - Template for environment variables
- **`.env.production`** - Production configuration example

### Environment Variables

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `NODE_ENV` | Environment mode | `development` | `development` or `production` |
| `BACKEND_URL` | Backend server URL | `https://voiceapp.nuzk-server.com` | `http://192.168.76.102:9000` |
| `OPEN_DEVTOOLS` | Auto-open DevTools | `false` | `true` or `false` |
| `AUTO_UPDATE_ENABLED` | Enable auto-updates | `false` | `true` or `false` |
| `HOTKEY_TOGGLE_MUTE` | Global mute hotkey | `CommandOrControl+Shift+M` | Any valid Electron accelerator |
| `LOG_LEVEL` | Logging level | `info` | `debug`, `info`, `warn`, `error` |

### Configuration Examples

**Development (.env):**
```env
NODE_ENV=development
BACKEND_URL=http://192.168.76.102:9000
OPEN_DEVTOOLS=true
AUTO_UPDATE_ENABLED=false
HOTKEY_TOGGLE_MUTE=CommandOrControl+Shift+M
LOG_LEVEL=debug
```

**Production (.env.production):**
```env
NODE_ENV=production
BACKEND_URL=https://voiceapp.nuzk-server.com
OPEN_DEVTOOLS=false
AUTO_UPDATE_ENABLED=true
HOTKEY_TOGGLE_MUTE=CommandOrControl+Shift+M
LOG_LEVEL=warn
```

## Running the Application

### Development Mode

```bash
npm run dev
```

This will:
- Use development environment variables
- Enable DevTools
- Disable web security for local testing
- Use detailed logging

### Production Mode

```bash
npm run prod
```

This will:
- Use production environment variables
- Enable security features
- Enable auto-updates
- Use warning-level logging

### Quick Start

```bash
npm start
```

Uses the current `.env` configuration.

## Building for Distribution

### Build for All Platforms

```bash
npm run build
```

### Build for Specific Platform

```bash
# Windows
npm run build:win

# macOS
npm run build:mac

# Linux
npm run build:linux
```

Build output will be in the `dist/` directory.

### Build Configuration

The build is configured in `package.json` under the `build` section. You can customize:

- App icons (add `icon.ico`, `icon.icns`, `icon.png`)
- Installer options
- Target platforms
- Code signing (for distribution)

## Global Hotkeys

### Toggle Mute Hotkey

Default: `Ctrl+Shift+M` (Windows/Linux) or `Cmd+Shift+M` (macOS)

The global mute hotkey works even when the application is not focused. It sends an IPC message to the renderer process, which the Vue app can listen for.

**Frontend Integration:**

The Vue app should listen for the hotkey like this:

```javascript
// In your Vue component or composable
if (window.electronHotkeys) {
  window.electronHotkeys.onToggleMute(() => {
    // Only toggle if connected (not peeking or disconnected)
    if (connectionState.value === 'connected') {
      toggleMute();
    }
  });
}
```

## Persistent Settings

Settings are automatically persisted using `electron-store`. The following settings are saved:

- **Window bounds** (position and size)
- **Display name**
- **Last room**
- **Mic muted state**
- **Volume level**
- **Noise gate settings**

### Accessing Settings from Renderer

```javascript
// Get a setting
const displayName = await window.electronAPI.getSetting('displayName');

// Set a setting
await window.electronAPI.setSetting('displayName', 'John Doe');

// Get all settings
const allSettings = await window.electronAPI.getAllSettings();
```

## Logging

Logs are written to:
- **Windows**: `%USERPROFILE%\AppData\Roaming\VoiceApp\logs\`
- **macOS**: `~/Library/Logs/VoiceApp/`
- **Linux**: `~/.config/VoiceApp/logs/`

Log files rotate automatically and old logs are cleaned up.

### Log from Renderer Process

```javascript
window.electronAPI.log('info', 'User joined room');
window.electronAPI.log('error', 'Connection failed');
```

## Auto-Updates

When `AUTO_UPDATE_ENABLED=true` in production:

1. App checks for updates on startup
2. Checks again every hour
3. Downloads updates in background
4. Prompts user to restart when update is ready

Updates are distributed via GitHub Releases (default) or a custom update server.

## Window Controls

The app provides custom window controls via IPC:

```javascript
// Minimize window
window.electronAPI.minimizeWindow();

// Maximize/restore window
window.electronAPI.maximizeWindow();

// Close window
window.electronAPI.closeWindow();
```

## Security Features

### Production

- **Web Security**: Enabled (prevents insecure content)
- **Context Isolation**: Enabled (sandboxed renderer)
- **Node Integration**: Disabled (no Node.js in renderer)
- **Content Security Policy**: Enforced
- **Navigation Protection**: External URLs open in default browser

### Development

- **Insecure Origins**: Allowed for local testing
- **Web Security**: Disabled for CORS/HTTP testing
- **DevTools**: Auto-opened

## Troubleshooting

### Microphone Permission Issues

**Windows**: Check Windows Privacy Settings > Microphone
**macOS**: Check System Preferences > Security & Privacy > Microphone
**Linux**: Check PulseAudio/ALSA permissions

### Connection Issues

1. Verify `BACKEND_URL` is correct
2. Ensure backend is running and accessible
3. Check firewall settings
4. Check logs for connection errors

### Hotkey Not Working

1. Ensure no other app is using the same hotkey
2. Try changing `HOTKEY_TOGGLE_MUTE` to a different combination
3. Check logs for hotkey registration errors

### DevTools Won't Open

Set `OPEN_DEVTOOLS=true` in `.env` and restart the app.

### Settings Not Persisting

1. Check file permissions in the app data directory
2. Clear settings: Developer menu > Clear Settings (dev mode only)
3. Check logs for storage errors

## Development Tips

### Clearing Cached Settings

In development mode, use the menu: **Developer > Clear Settings**

### Manual Settings Location

Settings are stored in:
- **Windows**: `%APPDATA%\voiceapp-desktop\`
- **macOS**: `~/Library/Application Support/voiceapp-desktop/`
- **Linux**: `~/.config/voiceapp-desktop/`

You can manually edit `config.json` in that directory.

### Hot Reloading

The app doesn't support hot reloading. Use `Ctrl+R` to reload the window after backend changes.

## Architecture

### Main Process (main.js)

- Window management
- Global shortcuts
- Auto-updates
- IPC handlers
- Persistent storage
- Logging

### Preload Script (preload.js)

- Secure IPC bridge
- Exposes APIs to renderer
- Context isolation boundary

### Renderer Process (Vue App)

- UI components
- LiveKit client
- Chat functionality
- User interactions

## Production Deployment

### Code Signing (Recommended)

For production distribution, you should code sign your app:

**Windows:**
```javascript
// In package.json build.win
"certificateFile": "path/to/cert.pfx",
"certificatePassword": "password"
```

**macOS:**
```javascript
// In package.json build.mac
"identity": "Developer ID Application: Your Name (TEAM_ID)"
```

### Update Server

Configure auto-updater to use your update server:

```javascript
// In main.js
autoUpdater.setFeedURL({
  provider: 'generic',
  url: 'https://your-update-server.com/updates'
});
```

## License

[Your License Here]

## Support

For issues or questions, please contact [your support channel].
