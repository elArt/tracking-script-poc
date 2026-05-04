import { describe, test, expect, beforeEach } from 'vitest';
import { calculateQuartile, trackUnmute, trackViewedSecond } from '../src/metrics.js';


describe('calculateQuartile', () => {
    let milestones;

    beforeEach(() => {
        milestones = { 25: false, 50: false, 75: false, 100: false };
    });

    test('returns 25 when 25% reached', () => {
        expect(calculateQuartile(25, 100, milestones)).toBe(25);
        expect(milestones[25]).toBe(true);
    });

    test('does not fire same milestone twice', () => {
        calculateQuartile(25, 100, milestones);
        expect(calculateQuartile(26, 100, milestones)).toBeNull();
    });

    test('returns null if duration is NaN', () => {
        expect(calculateQuartile(25, NaN, milestones)).toBeNull();
    });

    test('returns null if milestone not reached', () => {
        expect(calculateQuartile(10, 100, milestones)).toBeNull();
    });
});


describe('trackUnmute', () => {
    test('records second when video is unmuted', () => {
        expect(trackUnmute(false, 5.7, null)).toBe(5);
    });

    test('does not record if video is still muted', () => {
        expect(trackUnmute(true, 5.7, null)).toBeNull();
    });

    test('does not overwrite first unmute second', () => {
        expect(trackUnmute(false, 10, 5)).toBe(5);
    });

    test('floors currentTime to whole second', () => {
        expect(trackUnmute(false, 9.9, null)).toBe(9);
    });
});

describe('trackViewedSecond', () => {
    let viewedSeconds;

    beforeEach(() => {
        viewedSeconds = new Set();
    });

    test('adds second when visible and playing', () => {
        trackViewedSecond(5.5, true, false, viewedSeconds);
        expect(viewedSeconds.has(5)).toBe(true);
    });

    test('does not add second when not visible', () => {
        trackViewedSecond(5.5, false, false, viewedSeconds);
        expect(viewedSeconds.size).toBe(0);
    });

    test('does not add second when paused', () => {
        trackViewedSecond(5.5, true, true, viewedSeconds);
        expect(viewedSeconds.size).toBe(0);
    });

    test('deduplicates same second', () => {
        trackViewedSecond(5.1, true, false, viewedSeconds);
        trackViewedSecond(5.8, true, false, viewedSeconds);
        expect(viewedSeconds.size).toBe(1);
    });
});