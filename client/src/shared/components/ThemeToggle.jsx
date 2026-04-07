import { useState, useEffect } from 'react';

const THEME_KEY = 'vuFamilyTheme';

export function useTheme() {
    const [theme, setTheme] = useState(() => {
        return localStorage.getItem(THEME_KEY) || 'system';
    });

    useEffect(() => {
        localStorage.setItem(THEME_KEY, theme);

        const root = document.documentElement;
        root.classList.remove('light', 'dark');

        if (theme === 'system') {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            root.classList.add(prefersDark ? 'dark' : 'light');
        } else {
            root.classList.add(theme);
        }

        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const handler = (e) => {
            if (theme === 'system') {
                root.classList.remove('light', 'dark');
                root.classList.add(e.matches ? 'dark' : 'light');
            }
        };
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
