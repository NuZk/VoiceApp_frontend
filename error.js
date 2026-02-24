/**
 * Error Page - Minimal Version
 */

const retryBtn = document.getElementById('retryBtn');
const exitBtn = document.getElementById('exitBtn');
const errorMessage = document.getElementById('errorMessage');

async function init() {
    try {
        console.log('[ERROR PAGE] Fetching error details...');
        const details = await window.electronAPI.getErrorDetails();
        console.log('[ERROR PAGE] Details:', details);
        errorMessage.textContent = details?.message || 'Unknown error';
    } catch (err) {
        console.error('[ERROR PAGE] Init error:', err);
        errorMessage.textContent = 'Failed to load error details';
    }
}

async function handleRetry() {
    retryBtn.disabled = true;
    retryBtn.innerHTML = '<span class="spinner"></span>Retrying...';

    try {
        console.log('[RETRY] Calling retryBackendConnection');
        const result = await window.electronAPI.retryBackendConnection();
        console.log('[RETRY] Result:', result);
        
        // If we get here and the window hasn't changed, it means the backend load is happening
        // If it succeeds, the window will navigate to the backend page
        // If it fails, the window will show error.html again
        
        // Don't do anything else - either the page loads successfully or error.html loads again
    } catch (err) {
        console.error('[RETRY] Error:', err);
        retryBtn.disabled = false;
        retryBtn.textContent = 'Retry';
        errorMessage.textContent = 'Retry error: ' + err.message;
    }
}

function handleExit() {
    window.electronAPI.closeWindow();
}

retryBtn.addEventListener('click', handleRetry);
exitBtn.addEventListener('click', handleExit);

init();
