/**
 * Settings Page Script
 * Handles hotkey recording, microphone selection, and settings persistence
 */

// State
let isRecordingHotkey = false;
let currentHotkey = '';
let currentMicrophone = '';
let pressedKeys = new Set();

// Elements
const hotkeyInput = document.getElementById('hotkeyInput');
const microphoneSelect = document.getElementById('microphoneSelect');
const saveButton = document.getElementById('saveSettings');
const cancelButton = document.getElementById('cancelSettings');
const resetButton = document.getElementById('resetSettings');
const refreshButton = document.getElementById('refreshDevices');
const hotkeyStatus = document.getElementById('hotkeyStatus');
const micStatus = document.getElementById('micStatus');
const appVersionValue = document.getElementById('appVersionValue');
const checkUpdatesButton = document.getElementById('checkUpdates');
const updateStatus = document.getElementById('updateStatus');

// ============================================================================
// INITIALIZATION
// ============================================================================

async function init() {
    await loadSettings();
    await loadMicrophones();
    await loadAppVersion();
    setupEventListeners();
}

async function loadSettings() {
    try {
        // Load hotkey setting
        const savedHotkey = await window.electronAPI.getSetting('hotkey');
        currentHotkey = savedHotkey || 'CommandOrControl+Shift+M';
        hotkeyInput.value = formatHotkeyDisplay(currentHotkey);

        // Load microphone setting
        const savedMic = await window.electronAPI.getSetting('selectedMicrophone');
        currentMicrophone = savedMic || '';
    } catch (error) {
        console.error('Failed to load settings:', error);
        showStatus(hotkeyStatus, 'Failed to load settings', 'error');
    }
}

async function loadMicrophones() {
    try {
        // Get permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Now enumerate devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioInputs = devices.filter(device => device.kind === 'audioinput');
        
        populateMicrophoneSelect(audioInputs);
    } catch (error) {
        console.error('Failed to load microphones:', error);
        
        if (error.name === 'NotAllowedError') {
            showStatus(micStatus, 'Microphone permission denied. Please allow microphone access.', 'error');
        } else {
            showStatus(micStatus, 'Failed to load audio devices: ' + error.message, 'error');
        }
        
        microphoneSelect.innerHTML = '<option value="">Error loading devices</option>';
    }
}

async function loadAppVersion() {
    if (!appVersionValue) return;

    try {
        const version = await window.electronAPI.getAppVersion();
        appVersionValue.textContent = version ? `v${version}` : 'Unknown';
    } catch (error) {
        console.error('Failed to load app version:', error);
        appVersionValue.textContent = 'Unknown';
    }
}

function populateMicrophoneSelect(devices) {
    microphoneSelect.innerHTML = '';

    if (!devices || devices.length === 0) {
        microphoneSelect.innerHTML = '<option value="">No microphones found</option>';
        return;
    }

    // Add default option
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'System Default';
    microphoneSelect.appendChild(defaultOption);

    // Add each device
    // Use device.label as the value (persistent identifier) instead of deviceId (session-based)
    devices.forEach((device, index) => {
        const option = document.createElement('option');
        // Use label as the persistent identifier
        option.value = device.label || '';
        option.textContent = device.label || `Microphone ${index + 1}`;
        
        // Match against currentMicrophone which is now a label, not a deviceId
        if (device.label === currentMicrophone) {
            option.selected = true;
        }
        
        microphoneSelect.appendChild(option);
    });

    // If saved mic not found, select default
    if (currentMicrophone && !devices.find(d => d.label === currentMicrophone)) {
        microphoneSelect.value = '';
        currentMicrophone = '';
    }
}

// ============================================================================
// HOTKEY RECORDING
// ============================================================================

function startRecordingHotkey() {
    isRecordingHotkey = true;
    pressedKeys.clear();
    hotkeyInput.value = 'Press keys...';
    hotkeyInput.classList.add('recording');
    hideStatus(hotkeyStatus);
}

function stopRecordingHotkey() {
    isRecordingHotkey = false;
    hotkeyInput.classList.remove('recording');
    pressedKeys.clear();
}

function handleKeyDown(event) {
    if (!isRecordingHotkey) return;
    
    event.preventDefault();
    
    // Build the key combination
    const modifiers = [];
    
    // Check for modifiers
    if (event.ctrlKey || event.metaKey) {
        modifiers.push('CommandOrControl');
    }
    if (event.altKey) {
        modifiers.push('Alt');
    }
    if (event.shiftKey) {
        modifiers.push('Shift');
    }
    
    // Get the actual key (not modifier)
    const key = event.key;
    
    // Ignore standalone modifiers
    if (['Control', 'Alt', 'Shift', 'Meta', 'Command'].includes(key)) {
        return;
    }
    
    // Build hotkey string
    const keyParts = [...modifiers];
    
    // Convert key to proper format
    let normalizedKey = key;
    if (key.length === 1) {
        normalizedKey = key.toUpperCase();
    } else if (key.startsWith('Arrow')) {
        normalizedKey = key.substring(5); // Remove 'Arrow' prefix
    } else if (key === ' ') {
        normalizedKey = 'Space';
    }
    
    // Add the key to the combination
    if (normalizedKey && normalizedKey !== 'Unidentified') {
        keyParts.push(normalizedKey);
    }
    
    // Must have at least one modifier for global hotkeys
    if (modifiers.length === 0) {
        hotkeyInput.value = 'Hotkeys must include a modifier key (Ctrl, Alt, Shift, or Cmd)';
        return;
    }
    
    // Create the hotkey string
    const hotkeyString = keyParts.join('+');
    
    // Validate
    if (isValidHotkey(hotkeyString)) {
        currentHotkey = hotkeyString;
        hotkeyInput.value = formatHotkeyDisplay(hotkeyString);
        stopRecordingHotkey();
        showStatus(hotkeyStatus, 'Hotkey recorded! Click "Save Settings" to apply.', 'success');
    } else {
        hotkeyInput.value = 'Invalid key combination';
    }
}

function handleKeyUp(event) {
    if (!isRecordingHotkey) return;
    event.preventDefault();
}

function isValidHotkey(hotkey) {
    // Basic validation - must have at least one modifier and one key
    const parts = hotkey.split('+');
    return parts.length >= 2;
}

function formatHotkeyDisplay(hotkey) {
    // Format for display (make it more readable)
    return hotkey
        .replace('CommandOrControl', window.platform?.isMac ? '⌘' : 'Ctrl')
        .replace('Alt', window.platform?.isMac ? '⌥' : 'Alt')
        .replace('Shift', '⇧')
        .replace('+', ' + ');
}

// ============================================================================
// EVENT LISTENERS
// ============================================================================

function setupEventListeners() {
    // Hotkey input
    hotkeyInput.addEventListener('click', () => {
        if (!isRecordingHotkey) {
            startRecordingHotkey();
        }
    });
    
    hotkeyInput.addEventListener('blur', () => {
        if (isRecordingHotkey) {
            stopRecordingHotkey();
            hotkeyInput.value = formatHotkeyDisplay(currentHotkey);
        }
    });
    
    // Keyboard events for hotkey recording
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Microphone select
    microphoneSelect.addEventListener('change', () => {
        currentMicrophone = microphoneSelect.value;
        hideStatus(micStatus);
    });
    
    // Refresh devices button
    refreshButton.addEventListener('click', async () => {
        refreshButton.disabled = true;
        refreshButton.textContent = '🔄 Refreshing...';
        
        await loadMicrophones();
        
        refreshButton.disabled = false;
        refreshButton.textContent = '🔄 Refresh';
        showStatus(micStatus, 'Devices refreshed', 'success');
        setTimeout(() => hideStatus(micStatus), 2000);
    });

    if (checkUpdatesButton) {
        checkUpdatesButton.addEventListener('click', checkForUpdates);
    }
    
    // Save button
    saveButton.addEventListener('click', saveSettings);
    
    // Cancel button
    cancelButton.addEventListener('click', () => {
        window.electronAPI.closeSettings();
    });
    
    // Reset button
    resetButton.addEventListener('click', async () => {
        if (confirm('Reset all settings to defaults?')) {
            currentHotkey = 'CommandOrControl+Shift+M';
            currentMicrophone = '';
            hotkeyInput.value = formatHotkeyDisplay(currentHotkey);
            microphoneSelect.value = '';
            showStatus(hotkeyStatus, 'Settings reset. Click "Save Settings" to apply.', 'success');
        }
    });
}

// ============================================================================
// UPDATE CHECK
// ============================================================================

async function checkForUpdates() {
    if (!checkUpdatesButton || !updateStatus) return;

    try {
        checkUpdatesButton.disabled = true;
        checkUpdatesButton.textContent = 'Checking...';
        showStatus(updateStatus, 'Checking for updates...', 'info');

        const result = await window.electronAPI.checkForUpdates();

        if (!result?.success) {
            if (result?.reason === 'disabled') {
                showStatus(updateStatus, 'Auto-updates are disabled. Set AUTO_UPDATE_ENABLED=true.', 'error');
            } else if (result?.reason === 'dev') {
                showStatus(updateStatus, 'Update checks only run in production builds.', 'error');
            } else {
                showStatus(updateStatus, result?.message || 'Update check failed.', 'error');
            }
            return;
        }

        showStatus(updateStatus, 'Update check started. You will be notified if one is available.', 'success');
    } catch (error) {
        console.error('Failed to check for updates:', error);
        showStatus(updateStatus, 'Update check failed: ' + error.message, 'error');
    } finally {
        checkUpdatesButton.disabled = false;
        checkUpdatesButton.textContent = 'Check for Updates';
    }
}

// ============================================================================
// SAVE SETTINGS
// ============================================================================

async function saveSettings() {
    try {
        saveButton.disabled = true;
        saveButton.textContent = 'Saving...';
        
        // Validate hotkey
        if (!isValidHotkey(currentHotkey)) {
            showStatus(hotkeyStatus, 'Invalid hotkey. Please record a new one.', 'error');
            saveButton.disabled = false;
            saveButton.textContent = 'Save Settings';
            return;
        }
        
        // Save hotkey
        await window.electronAPI.setSetting('hotkey', currentHotkey);
        await window.electronAPI.updateHotkey(currentHotkey);
        
        // Save microphone
        await window.electronAPI.setSetting('selectedMicrophone', currentMicrophone);
        
        // Notify renderer to update microphone
        await window.electronAPI.updateMicrophone(currentMicrophone);
        
        showStatus(hotkeyStatus, 'Settings saved successfully!', 'success');
        showStatus(micStatus, 'Settings saved successfully!', 'success');
        
        saveButton.disabled = false;
        saveButton.textContent = 'Save Settings';
        
        // Close after a short delay
        setTimeout(() => {
            window.electronAPI.closeSettings();
        }, 1000);
        
    } catch (error) {
        console.error('Failed to save settings:', error);
        showStatus(hotkeyStatus, 'Failed to save settings: ' + error.message, 'error');
        saveButton.disabled = false;
        saveButton.textContent = 'Save Settings';
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function showStatus(element, message, type) {
    element.textContent = message;
    element.className = `status-message ${type}`;
}

function hideStatus(element) {
    element.className = 'status-message';
}

// ============================================================================
// START
// ============================================================================

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
