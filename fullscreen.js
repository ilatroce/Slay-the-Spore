(function () {
    if (window.__slayTheSporeFullscreenInit) {
        return;
    }
    window.__slayTheSporeFullscreenInit = true;

    const STYLE_ID = 'sts-fullscreen-style';
    const BUTTON_ID = 'sts-fullscreen-toggle';

    function onReady(callback) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', callback, { once: true });
            return;
        }
        callback();
    }

    function getRootElement() {
        return document.documentElement;
    }

    function getFullscreenElement() {
        return document.fullscreenElement
            || document.webkitFullscreenElement
            || document.msFullscreenElement
            || null;
    }

    function isFullscreenActive() {
        return !!getFullscreenElement();
    }

    function isFullscreenSupported() {
        const root = getRootElement();
        return !!(
            document.fullscreenEnabled
            || document.webkitFullscreenEnabled
            || document.msFullscreenEnabled
            || (root && (
                typeof root.requestFullscreen === 'function'
                || typeof root.webkitRequestFullscreen === 'function'
                || typeof root.msRequestFullscreen === 'function'
            ))
        );
    }

    async function requestAppFullscreen() {
        const root = getRootElement();
        if (!root) {
            return;
        }

        if (typeof root.requestFullscreen === 'function') {
            await root.requestFullscreen();
            return;
        }

        if (typeof root.webkitRequestFullscreen === 'function') {
            root.webkitRequestFullscreen();
            return;
        }

        if (typeof root.msRequestFullscreen === 'function') {
            root.msRequestFullscreen();
        }
    }

    async function exitAppFullscreen() {
        if (typeof document.exitFullscreen === 'function') {
            await document.exitFullscreen();
            return;
        }

        if (typeof document.webkitExitFullscreen === 'function') {
            document.webkitExitFullscreen();
            return;
        }

        if (typeof document.msExitFullscreen === 'function') {
            document.msExitFullscreen();
        }
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
#${BUTTON_ID} {
    position: fixed;
    top: calc(env(safe-area-inset-top, 0px) + 12px);
    right: calc(env(safe-area-inset-right, 0px) + 12px);
    z-index: 240;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    min-height: 44px;
    padding: 12px 16px;
    border: 1px solid rgba(255, 255, 255, 0.26);
    border-radius: 999px;
    background: linear-gradient(135deg, rgba(255, 117, 140, 0.94), rgba(255, 126, 179, 0.94));
    color: #ffffff;
    font: 700 14px/1 'Segoe UI', Tahoma, Verdana, sans-serif;
    letter-spacing: 0.04em;
    white-space: nowrap;
    box-sizing: border-box;
    box-shadow: 0 14px 30px rgba(22, 6, 22, 0.35);
    cursor: pointer;
    backdrop-filter: blur(12px);
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
    transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, opacity 0.2s ease;
}

#${BUTTON_ID}::before {
    content: '';
    width: 12px;
    height: 12px;
    border: 2px solid currentColor;
    border-radius: 3px;
    box-sizing: border-box;
    opacity: 0.9;
}

#${BUTTON_ID}:hover {
    transform: translateY(-1px);
    box-shadow: 0 18px 36px rgba(22, 6, 22, 0.42);
}

#${BUTTON_ID}:active {
    transform: scale(0.98);
}

#${BUTTON_ID}.is-active {
    background: linear-gradient(135deg, rgba(92, 197, 171, 0.94), rgba(64, 160, 140, 0.94));
}

#${BUTTON_ID}:disabled {
    opacity: 0.72;
    cursor: wait;
}

body.llm-mode #${BUTTON_ID} {
    right: calc(400px + var(--safe-right, 16px));
}

@media (max-width: 1360px) {
    body.llm-mode #${BUTTON_ID} {
        right: calc(env(safe-area-inset-right, 0px) + 12px);
    }
}

@media (max-width: 640px) {
    #${BUTTON_ID} {
        min-height: 40px;
        padding: 10px 14px;
        font-size: 12px;
        letter-spacing: 0.03em;
    }

    #${BUTTON_ID}::before {
        width: 10px;
        height: 10px;
    }
}

@media (hover: none), (pointer: coarse) {
    #${BUTTON_ID}:hover {
        transform: none;
        box-shadow: 0 14px 30px rgba(22, 6, 22, 0.35);
    }
}
`;
        document.head.appendChild(style);
    }

    onReady(function initFullscreenButton() {
        if (!document.body || !isFullscreenSupported()) {
            return;
        }

        injectStyles();

        let button = document.getElementById(BUTTON_ID);
        if (!button) {
            button = document.createElement('button');
            button.id = BUTTON_ID;
            button.type = 'button';
            document.body.appendChild(button);
        }

        function updateButtonState() {
            const active = isFullscreenActive();
            button.textContent = active ? 'Exit Fullscreen' : 'Fullscreen';
            button.classList.toggle('is-active', active);
            button.setAttribute('aria-pressed', active ? 'true' : 'false');
            button.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
            button.title = active ? 'Exit fullscreen' : 'Enter fullscreen';
        }

        button.addEventListener('click', async function () {
            button.disabled = true;

            try {
                if (isFullscreenActive()) {
                    await exitAppFullscreen();
                } else {
                    await requestAppFullscreen();
                }
            } catch (error) {
                console.warn('Fullscreen toggle failed:', error);
            } finally {
                window.setTimeout(function () {
                    button.disabled = false;
                    updateButtonState();
                }, 120);
            }
        });

        ['fullscreenchange', 'webkitfullscreenchange', 'MSFullscreenChange'].forEach(function (eventName) {
            document.addEventListener(eventName, updateButtonState);
        });

        updateButtonState();
    });
})();
