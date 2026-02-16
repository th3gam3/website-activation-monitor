let inFlight = false;
const MAX_HISTORY = 50;
const history = [];

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

async function checkStatus() {
    if (inFlight) return;
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

    // Reset classes
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
            // Keep UI binary even if backend changes.
            card.classList.add('redirect-block');
            iconText.textContent = 'BLOCKED';
            statusText.textContent = 'Blocked';
    }

    addHistoryEntry(data);
}

// Initial check
checkStatus();

// Poll every 1 second.
setInterval(checkStatus, 1000);

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

// Update clock immediately and then every second
updateClock();
setInterval(updateClock, 1000);
