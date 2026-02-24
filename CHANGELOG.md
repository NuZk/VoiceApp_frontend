# Changelog

All notable changes to the VoiceApp Desktop client.

## [1.0.6] - 2026-02-24

### Added
- Settings page section to display the installed app version and trigger a manual update check

### Changed
- Shared auto-updater initialization so manual update checks use the same listeners

## [1.0.0] - Production Ready Release

### Added

#### Configuration & Environment
- Environment-based configuration with `.env` files
- Separate development and production configurations
- Environment variables for all configurable options
- `.env.example` template for easy setup

#### Security & Best Practices  
- Context isolation with secure IPC bridge
- Preload script for controlled renderer access
- Content Security Policy (CSP) in production
- Navigation protection (external links open in browser)
- Proper permission handling for microphone/camera

#### Features
- **Global Hotkeys**: Toggle mute from anywhere (Ctrl+Shift+M)
- **Persistent Settings**: Auto-save window size, user preferences, etc.
- **Auto-Updates**: Automatic update checks in production (via electron-updater)
- **Application Menu**: Full menu with keyboard shortcuts
- **Window Management**: Save/restore window position and size
- **Logging System**: File and console logging with configurable levels (electron-log)

#### Developer Experience
- Development mode with auto-open DevTools
- Detailed debug logging in dev mode
- Settings clear option in dev menu
- Better error handling and logging
- Cross-platform build scripts

#### Documentation
- Comprehensive README.md with full setup guide
- QUICKSTART.md for immediate getting started
- Inline code documentation
- Configuration examples for dev/prod

### Changed

#### Architecture Improvements
- Refactored main.js with modular structure and clear sections
- Separated concerns (window, IPC, hotkeys, updates, menu)
- Added proper lifecycle management
- Improved error handling and process cleanup

#### Dependencies
- Updated to latest Electron (^28.2.0)
- Added electron-store for settings persistence
- Added electron-log for enhanced logging
- Added electron-updater for auto-updates
- Added dotenv for environment configuration
- Added cross-env for cross-platform scripts
- Added electron-builder for distribution builds

#### Configuration
- Replaced hardcoded boolean `isDev` with environment-based config
- Backend URL now configurable via environment variable
- All features now configurable (DevTools, updates, hotkeys, etc.)
- Added build configuration for Windows, Mac, and Linux

### Technical Details

#### IPC Handlers
- `app:getVersion` - Get application version
- `window:minimize` - Minimize window
- `window:maximize` - Toggle maximize/restore
- `window:close` - Close window
- `settings:get` - Get a setting value
- `settings:set` - Save a setting value
- `settings:getAll` - Get all settings
- `log` - Log from renderer process

#### IPC Messages (Main → Renderer)
- `hotkey:toggle-mute` - Global mute hotkey triggered

#### Exposed APIs (via preload.js)
- `window.electronAPI.*` - App info, window controls, settings, logging
- `window.electronHotkeys.*` - Hotkey listeners
- `window.platform.*` - Platform detection

### Build Configuration
- Windows: NSIS installer + portable executable
- macOS: DMG + ZIP
- Linux: AppImage + DEB package

### Removed
- Hardcoded URLs (now environment-based)
- Boolean `isDev` toggle (replaced with NODE_ENV)
- Inline permission handlers (moved to dedicated section)

---

## Previous Version

### [0.1.0] - Initial Version
- Basic Electron window
- Hardcoded dev/prod toggle
- Simple permission handling
- No persistent settings
- No global hotkeys
- No logging
- No auto-updates
