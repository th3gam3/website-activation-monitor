async function checkStatus() {
    try {
        const response = await fetch('/api/status');
        const data = await response.json();

        updateUI(data);
    } catch (error) {
        console.error('Error fetching status:', error);
        updateUI({ status: 'ERROR', timestamp: new Date().toISOString() });
    }
}

function updateUI(data) {
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
    const timeString = date.toLocaleTimeString();

    lastUpdated.textContent = timeString;
    httpCode.textContent = data.code || '-';
    finalUrl.textContent = data.finalUrl || '-';
    if (data.finalUrl) finalUrl.href = data.finalUrl;

    switch (data.status) {
        case 'QUEUE_ACTIVE':
            card.classList.add('active-queue');
            iconText.textContent = 'ACTIVE';
            statusText.textContent = 'Queue Active';
            break;
        case 'REDIRECT_BLOCK':
            card.classList.add('redirect-block');
            iconText.textContent = 'BLOCKED';
            statusText.textContent = 'Redirected to Block';
            break;
        case 'ACTIVE_OTHER':
            card.classList.add('active-other');
            iconText.textContent = 'UNKNOWN';
            statusText.textContent = 'Active (No Queue)';
            break;
        case 'ERROR':
            card.classList.add('error');
            iconText.textContent = 'ERROR';
            statusText.textContent = 'Monitor Error';
            break;
        default:
            card.classList.add('loading');
            iconText.textContent = '???';
            statusText.textContent = 'Unknown Status';
    }
}

// Initial check
checkStatus();

// Poll every 5 seconds
setInterval(checkStatus, 5000);

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
