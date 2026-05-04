import {
    calculateQuartile,
    trackViewedSecond,
    trackUnmute,
    getEndpoint,
    buildPayload,
    sendData,
} from './metrics.js';


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