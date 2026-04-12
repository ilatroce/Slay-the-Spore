(function initSlayTheSporeSoundtrack() {
    const TRACKS = {
        normal: [
            'OST/Normal/Normal 1.mp3',
            'OST/Normal/Normal 2.mp3',
            'OST/Normal/Normal 3.mp3'
        ],
        elite: [
            'OST/Elite/Elit 1.mp3',
            'OST/Elite/Elit 2.mp3',
            'OST/Elite/Elit 3.mp3',
            'OST/Elite/Elit 4.mp3'
        ]
    };
    const failedTracksByMode = {
        normal: new Set(),
        elite: new Set()
    };
    const audio = new Audio();
    const unlockEvents = ['pointerdown', 'keydown', 'touchstart'];
    let currentMode = '';
    let desiredMode = resolveInitialMode();
    let currentTrack = '';
    let unlockBound = false;

    audio.preload = 'auto';
    audio.loop = false;
    audio.volume = 0.38;

    function normalizeMode(mode) {
        return mode === 'elite' ? 'elite' : 'normal';
    }

    function resolveInitialMode() {
        const configuredMode = window.SLAY_THE_SPORE_SOUNDTRACK?.mode;
        if (configuredMode) {
            return normalizeMode(configuredMode);
        }

        const params = new URLSearchParams(window.location.search);
        return params.get('scene') === 'elite' ? 'elite' : 'normal';
    }

    function availableTracks(mode) {
        const normalizedMode = normalizeMode(mode);
        const failedTracks = failedTracksByMode[normalizedMode];
        return (TRACKS[normalizedMode] || []).filter((track) => !failedTracks.has(track));
    }

    function chooseRandomTrack(mode) {
        const tracks = availableTracks(mode);
        if (!tracks.length) {
            return '';
        }
        if (tracks.length === 1) {
            return tracks[0];
        }

        let nextTrack = tracks[Math.floor(Math.random() * tracks.length)];
        let attempts = 0;
        while (nextTrack === currentTrack && attempts < 12) {
            nextTrack = tracks[Math.floor(Math.random() * tracks.length)];
            attempts += 1;
        }
        return nextTrack;
    }

    function removeUnlockListeners(handler) {
        unlockEvents.forEach((eventName) => {
            window.removeEventListener(eventName, handler);
        });
        unlockBound = false;
    }

    function bindUnlockListeners() {
        if (unlockBound) return;
        unlockBound = true;

        const unlockPlayback = () => {
            removeUnlockListeners(unlockPlayback);
            requestPlayback(currentMode !== desiredMode || !audio.src);
        };

        unlockEvents.forEach((eventName) => {
            window.addEventListener(eventName, unlockPlayback, { once: true, passive: true });
        });
    }

    function requestPlayback(forceNewTrack = false) {
        const mode = normalizeMode(desiredMode);
        const nextTrack = forceNewTrack ? chooseRandomTrack(mode) : '';
        const shouldLoadTrack = forceNewTrack || currentMode !== mode || !audio.src;

        currentMode = mode;

        if (shouldLoadTrack) {
            const trackToPlay = nextTrack || chooseRandomTrack(mode);
            if (!trackToPlay) {
                console.warn(`No playable soundtrack files remain for ${mode} mode.`);
                return;
            }

            currentTrack = trackToPlay;
            audio.src = trackToPlay;
            audio.load();
        }

        const playPromise = audio.play();
        if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {
                bindUnlockListeners();
            });
        }
    }

    function setMode(mode) {
        desiredMode = normalizeMode(mode);
        requestPlayback(currentMode !== desiredMode || !audio.src);
    }

    window.setSlayTheSporeMusicMode = setMode;
    window.getSlayTheSporeMusicMode = function getSlayTheSporeMusicMode() {
        return desiredMode;
    };

    audio.addEventListener('ended', () => {
        requestPlayback(true);
    });

    audio.addEventListener('error', () => {
        if (currentTrack) {
            failedTracksByMode[currentMode].add(currentTrack);
        }
        requestPlayback(true);
    });

    document.addEventListener('visibilitychange', () => {
        if (!document.hidden && audio.paused) {
            requestPlayback(false);
        }
    });

    requestPlayback(true);
})();
