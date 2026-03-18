let inFlight = false;
const MAX_HISTORY = 50;
const history = [];

// ── Remote-control state ──────────────────────────────────────────
let paused = false;
let pollIntervalMs = 1000;
let pollTimer = null;
let soundEnabled = false;
let lastStatus = null;          // tracks previous status for change detection
let audioCtx = null;            // Web Audio context (lazy init)

// ── Audio helpers ─────────────────────────────────────────────────

function getAudioCtx() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    return audioCtx;
}

function playActivationChime() {
    try {
        const ctx = getAudioCtx();
        // Two-tone rising chime: 880 Hz then 1320 Hz
        const notes = [880, 1320];
        notes.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            const t = ctx.currentTime + i * 0.18;
            gain.gain.setValueAtTime(0, t);
            gain.gain.linearRampToValueAtTime(0.30, t + 0.04);
            gain.gain.exponentialRampToValueAtTime(0.001, t + 0.38);
            osc.start(t);
            osc.stop(t + 0.40);
        });
    } catch (e) {
        // Audio not available — silently ignore
    }
}

// ── Formatting helpers ────────────────────────────────────────────

function formatTime12(date) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) return '-';
    return date.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

function normalizeData(data) {
    const nowIso = new Date().toISOString();
    const d = data && typeof data === 'object' ? data : {};
    const status = (d.status === 'ACTIVE_OTHER' || d.status === 'REDIRECT_BLOCK') ? d.status : 'REDIRECT_BLOCK';
    return {
        status,
        detailStatus: d.detailStatus || (status === 'ACTIVE_OTHER' ? 'ACTIVE_OTHER' : 'UNKNOWN'),
        code: d.code,
        finalUrl: d.finalUrl,
        durationMs: d.durationMs,
        message: d.message,
        timestamp: d.timestamp || nowIso
    };
}

// ── History ───────────────────────────────────────────────────────

function addHistoryEntry(data) {
    const list = document.getElementById('history-list');
    if (!list) return;

    history.unshift(data);
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;

    const date = new Date(data.timestamp);
    const timeString = formatTime12(date);

    const li = document.createElement('li');
    li.className = `history-item ${data.status === 'ACTIVE_OTHER' ? 'active-other' : 'redirect-block'}`;

    const badgeText = data.status === 'ACTIVE_OTHER' ? 'ACTIVE' : 'BLOCKED';
    const metaParts = [];
    if (typeof data.code !== 'undefined') metaParts.push(`code ${data.code}`);
    if (data.detailStatus && data.detailStatus !== data.status) metaParts.push(`detail ${data.detailStatus}`);
    if (typeof data.durationMs === 'number') metaParts.push(`${data.durationMs}ms`);
    if (data.message) metaParts.push(data.message);

    const timeEl = document.createElement('span');
    timeEl.className = 'history-time';
    timeEl.textContent = timeString;

    const mainEl = document.createElement('span');
    mainEl.className = 'history-main';

    const badgeEl = document.createElement('span');
    badgeEl.className = 'history-badge';
    badgeEl.textContent = badgeText;

    const metaEl = document.createElement('span');
    metaEl.className = 'history-meta';
    metaEl.textContent = metaParts.join(' · ');

    mainEl.appendChild(badgeEl);
    mainEl.appendChild(metaEl);
    li.appendChild(timeEl);
    li.appendChild(mainEl);

    list.prepend(li);
    while (list.children.length > MAX_HISTORY) list.removeChild(list.lastElementChild);
}

function clearHistory() {
    history.length = 0;
    const list = document.getElementById('history-list');
    if (list) list.innerHTML = '';
}

// ── Status check & UI update ──────────────────────────────────────

async function checkStatus() {
    if (inFlight || paused) return;
    inFlight = true;
    try {
        const response = await fetch('/api/status');

        let data;
        try {
            data = await response.json();
        } catch {
            data = null;
        }

        const normalized = normalizeData(data || { status: 'REDIRECT_BLOCK', detailStatus: 'BAD_RESPONSE', message: `HTTP ${response.status}` });
        updateUI(normalized);
    } catch (error) {
        console.error('Error fetching status:', error);
        updateUI(normalizeData({ status: 'REDIRECT_BLOCK', detailStatus: 'CLIENT_ERROR', message: error.message }));
    } finally {
        inFlight = false;
    }
}

function updateUI(data) {
    data = normalizeData(data);
    const card = document.getElementById('status-card');
    const iconText = document.getElementById('icon');
    const statusText = document.getElementById('status-text');
    const httpCode = document.getElementById('http-code');
    const finalUrl = document.getElementById('final-url');
    const lastUpdated = document.getElementById('last-updated');

    // Reset classes (keep paused-overlay if paused)
    card.className = 'card';

    // Format timestamp
    const date = new Date(data.timestamp);
    const timeString = formatTime12(date);

    lastUpdated.textContent = timeString;
    httpCode.textContent = data.code || '-';
    if (data.finalUrl) {
        finalUrl.textContent = data.finalUrl;
        finalUrl.href = data.finalUrl;
    } else {
        finalUrl.textContent = '-';
        finalUrl.href = '#';
    }

    switch (data.status) {
        case 'REDIRECT_BLOCK':
            card.classList.add('redirect-block');
            iconText.textContent = 'BLOCKED';
            statusText.textContent = 'Blocked';
            break;
        case 'ACTIVE_OTHER':
            card.classList.add('active-other');
            iconText.textContent = 'ACTIVE';
            statusText.textContent = 'Active';
            break;
        default:
            card.classList.add('redirect-block');
            iconText.textContent = 'BLOCKED';
            statusText.textContent = 'Blocked';
    }

    // Sound alert: play chime when transitioning to ACTIVE
    if (soundEnabled && lastStatus !== null && lastStatus !== 'ACTIVE_OTHER' && data.status === 'ACTIVE_OTHER') {
        playActivationChime();
    }
    lastStatus = data.status;

    addHistoryEntry(data);
}

// ── Polling control ───────────────────────────────────────────────

function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(checkStatus, pollIntervalMs);
}

function stopPolling() {
    if (pollTimer) {
        clearInterval(pollTimer);
        pollTimer = null;
    }
}

// ── Remote-control UI wiring ──────────────────────────────────────

function initRemoteControl() {
    // Pause / Resume
    const btnPause = document.getElementById('btn-pause');
    const pauseIcon = document.getElementById('pause-icon');
    const pauseLabel = document.getElementById('pause-label');
    const card = document.getElementById('status-card');

    btnPause.addEventListener('click', () => {
        paused = !paused;
        if (paused) {
            pauseIcon.textContent = '▶';
            pauseLabel.textContent = 'Resume';
            btnPause.classList.add('paused');
            card.classList.add('paused-overlay');
        } else {
            pauseIcon.textContent = '⏸';
            pauseLabel.textContent = 'Pause';
            btnPause.classList.remove('paused');
            card.classList.remove('paused-overlay');
            checkStatus(); // immediate check on resume
        }
    });

    // Clear history
    document.getElementById('btn-clear').addEventListener('click', clearHistory);

    // Interval pills
    document.querySelectorAll('.rc-interval-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.rc-interval-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            pollIntervalMs = Number(btn.dataset.ms);
            startPolling();
        });
    });

    // Sound toggle
    const btnSound = document.getElementById('btn-sound');
    const soundLabel = document.getElementById('sound-label');

    btnSound.addEventListener('click', () => {
        soundEnabled = !soundEnabled;
        btnSound.setAttribute('aria-checked', String(soundEnabled));
        soundLabel.textContent = soundEnabled ? 'On' : 'Off';
        // Play a preview chime so the user knows audio is working
        if (soundEnabled) playActivationChime();
    });
}

// ── Init ──────────────────────────────────────────────────────────

// Initial check then start polling
checkStatus();
startPolling();

initRemoteControl();

// Live Clock
function updateClock() {
    const clockElement = document.getElementById('live-clock');
    const now = new Date();
    const dateLine = now.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: '2-digit'
    });
    const timeLine = now.toLocaleTimeString('en-US', {
        hour12: true,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    const dateEl = clockElement.querySelector('.clock-date');
    const timeEl = clockElement.querySelector('.clock-time');
    if (dateEl && timeEl) {
        dateEl.textContent = dateLine;
        timeEl.textContent = timeLine;
    } else {
        clockElement.textContent = `${dateLine} ${timeLine}`;
    }
}

updateClock();
setInterval(updateClock, 1000);
