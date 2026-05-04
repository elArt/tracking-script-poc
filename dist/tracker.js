(function () {
    'use strict';

    function calculateQuartile(currentTime, duration, milestones) {
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

    function trackViewedSecond(currentTime, isVisible, isPaused, viewedSeconds, duration) {
        if (isVisible && !isPaused) {
            const second = Math.floor(currentTime);
            if (duration && second < Math.floor(duration)) {
                viewedSeconds.add(second);
            }
        }
    }

    function trackUnmute(isMuted, currentTime, unmuteSecond) {
        if (!isMuted && unmuteSecond === null) {
            return Math.floor(currentTime);
        }
        return unmuteSecond;
    }

    function getVisitorId() {
        let id = localStorage.getItem('bastody_visitor_id');
        if (!id) {
            id = crypto.randomUUID();
            localStorage.setItem('bastody_visitor_id', id);
        }
        return id;
    }

    function getEndpoint() {
        const script = document.currentScript
            || document.querySelector('script[data-endpoint]');
        return script?.getAttribute('data-endpoint');
    }

    function buildPayload({ events, viewedSeconds, unmuteSecond }) {
        return {
            visitor_id: getVisitorId(),
            page: window.location.href,
            timestamp: Date.now(),
            events,
            viewed_seconds: viewedSeconds.size,
            unmute_second: unmuteSecond,
        };
    }

    function sendData(url, data) {
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

    const events = [];
    const viewedSeconds = new Set();
    let unmuteSecond = null;
    let sent = false;

    function flush() {
        if (sent) return;
        sent = true;

        const url = getEndpoint();
        if (!url) {
            sent = false;
            return;
        }

        sendData(url, buildPayload({ events, viewedSeconds, unmuteSecond }));
        events.length = 0;
        viewedSeconds.clear();
        unmuteSecond = null;
        sent = false;
    }

    const milestones = { 25: false, 50: false, 75: false, 100: false };
    let isAdVisible = false;

    function init() {
        const adEl = document.querySelector('[data-track="ad"]');
        const video = adEl?.querySelector('video');
        if (!adEl || !video) return;

        new IntersectionObserver((entries) => {
            isAdVisible = entries[0].isIntersecting;
        }, { threshold: 0.5 }).observe(adEl);

        video.addEventListener('timeupdate', () => {
            const mark = calculateQuartile(video.currentTime, video.duration, milestones);
            if (mark) events.push({ type: `quartile_${mark}`, second: Math.floor(video.currentTime) });
            trackViewedSecond(video.currentTime, isAdVisible, video.paused, viewedSeconds, video.duration);
        });

        video.addEventListener('ended', () => {
            const mark = calculateQuartile(100, 100, milestones);
            if (mark) events.push({ type: 'quartile_100', second: Math.floor(video.currentTime) });
            flush();
        });

        video.addEventListener('error', () => flush());

        video.addEventListener('volumechange', () => {
            unmuteSecond = trackUnmute(video.muted, video.currentTime, unmuteSecond);
        });

        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') flush();
        });
        window.addEventListener('pagehide', () => flush());
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
