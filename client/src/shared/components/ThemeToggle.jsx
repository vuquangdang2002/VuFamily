import { useState, useEffect, useCallback } from 'react';

const THEME_KEY = 'vuFamilyTheme';

/** Apply theme class to <html> and store preference */
function applyTheme(theme) {
    const root = document.documentElement;
    root.classList.remove('light', 'dark');
    if (theme === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
        root.classList.add(theme);
    }
}

export function useTheme() {
    const [theme, setThemeState] = useState(() => localStorage.getItem(THEME_KEY) || 'dark');

    /** setTheme with circular-wipe View Transition */
    const setTheme = useCallback((nextTheme, event) => {
        localStorage.setItem(THEME_KEY, nextTheme);

        // ── View Transitions API (Chrome 111+, Edge 111+) ────────────────────
        const x = event?.clientX ?? window.innerWidth / 2;
        const y = event?.clientY ?? window.innerHeight / 2;

        // Radius: hypotenuse to furthest corner
        const radius = Math.hypot(
            Math.max(x, window.innerWidth - x),
            Math.max(y, window.innerHeight - y)
        );

        if (!document.startViewTransition) {
            // Fallback: CSS transition only
            applyTheme(nextTheme);
            setThemeState(nextTheme);
            return;
        }

        const transition = document.startViewTransition(() => {
            applyTheme(nextTheme);
            setThemeState(nextTheme);
        });

        // Animate a circular clip-path expanding from click point
        transition.ready.then(() => {
            // Keyframes phải là [{clipPath:...}], không phải strings thuần
            document.documentElement.animate(
                [
                    { clipPath: `circle(0px at ${x}px ${y}px)` },
                    { clipPath: `circle(${radius}px at ${x}px ${y}px)` },
                ],
                {
                    duration: 450,
                    easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
                    pseudoElement: '::view-transition-new(root)',
                }
            );
        });
    }, []);

    // Sync on mount + system change
    useEffect(() => {
        applyTheme(theme);
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = () => { if (theme === 'system') applyTheme('system'); };
        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, [theme]);

    return { theme, setTheme };
}

export default function ThemeToggle({ theme, setTheme }) {
    return (
        <div className="theme-select-wrapper">
            <span className="theme-select-icon">
                {theme === 'light' ? '☀️' : theme === 'dark' ? '🌙' : '💻'}
            </span>
            <select
                className="theme-select"
                value={theme}
                onChange={e => setTheme(e.target.value)}
                title="Chọn giao diện"
            >
                <option value="system">Theo hệ thống</option>
                <option value="light">Sáng</option>
                <option value="dark">Tối</option>
            </select>
        </div>
    );
}

