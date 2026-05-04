export function calculateQuartile(currentTime, duration, milestones) {
    if (!duration || isNaN(duration)) return null;
    const percentage = (currentTime / duration) * 100;
    for (const mark of [25, 50, 75, 100]) {
        if (percentage >= mark && !milestones[mark]) {
            milestones[mark] = true;
            return mark;
        }
    }
    return null;
}

export function trackViewedSecond(currentTime, isVisible, isPaused, viewedSeconds, duration) {
    if (isVisible && !isPaused) {
        const second = Math.floor(currentTime);
        if (duration && second < Math.floor(duration)) {
            viewedSeconds.add(second);
        }
    }
}

export function trackUnmute(isMuted, currentTime, unmuteSecond) {
    if (!isMuted && unmuteSecond === null) {
        return Math.floor(currentTime);
    }
    return unmuteSecond;
}

export function getVisitorId() {
    try {
        let id = localStorage.getItem('bastody_visitor_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('bastody_visitor_id', id);
        }
        return id;
    } catch {
        return crypto.randomUUID();
    }
}

export function getEndpoint() {
    const script = document.currentScript
        || document.querySelector('script[data-endpoint]');
    return script?.getAttribute('data-endpoint');
}

export function buildPayload({ events, viewedSeconds, unmuteSecond }) {
    return {
        visitor_id: getVisitorId(),
        page: window.location.href,
        timestamp: Date.now(),
        events,
        viewed_seconds: viewedSeconds.size,
        unmute_second: unmuteSecond,
    };
}

export function sendData(url, data) {
    const blob = new Blob(
        [JSON.stringify(data)],
        { type: 'text/plain' }
    );

    if (navigator.sendBeacon && navigator.sendBeacon(url, blob)) return;

    fetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
    }).catch(() => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, false);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.send(JSON.stringify(data));
    });
}