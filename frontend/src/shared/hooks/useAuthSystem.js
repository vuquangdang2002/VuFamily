import { useState, useEffect } from 'react';
import { myLog, myError } from '../utils/logger';
import { getApiBase } from '../services/api';
import { clearAllCache as clearChatCache } from '../services/chatCache';
import { offlineCache } from '../utils/offlineCache';
import { TrackingHelper } from '../services/TrackingHelper';
import { I18nHelper } from '../services/i18n.js';
import { syncRemoteConfig } from '../../firebase.js';

const AUTH_KEY = 'vuFamilyAuth';

function getStoredAuth() {
    try {
        return JSON.parse(localStorage.getItem(AUTH_KEY));
    } catch {
        return null;
    }
}

export default function useAuthSystem() {
    const [user, setUser] = useState(null);
    const [authChecked, setAuthChecked] = useState(false);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [loadingStatus, setLoadingStatus] = useState(I18nHelper.t('splash.initializing'));
    const [forceChangePwd, setForceChangePwd] = useState(false);
    const [tempPwd, setTempPwd] = useState('');
    const [forceChangeError, setForceChangeError] = useState('');
    const [verifyMsg, setVerifyMsg] = useState(null);
    const [toasts, setToasts] = useState([]);

    const addToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts(t => [...t, { id, message, type }]);
        setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
    };

    // Analytics: identify user
    useEffect(() => {
        if (user) {
            TrackingHelper.identifyUser(user.id || user.username, { 
                role: user.role, 
                name: user.displayName 
            });
        }
    }, [user?.id, user?.username]);

    // Request app permissions on startup
    useEffect(() => {
        async function requestAppPermissions() {
            try {
                await syncRemoteConfig();

                if ('Notification' in window) {
                    await Notification.requestPermission();
                }
            } catch (e) {
                myError('APP', 'Failed to request notification permission or module load error:', e);
                if (e.name === 'TypeError' && e.message.includes('dynamically imported module')) {
                    myLog('APP', 'New version detected, reloading page...');
                    window.location.reload();
                }
            }

            if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
                try {
                    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                    stream.getTracks().forEach(t => t.stop());
                } catch (e) {
                    myError('APP', 'Microphone permission not granted:', e);
                }
            }
        }
        requestAppPermissions();
    }, []);

    // Session verification on mount
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);

        const finishLoading = () => {
            setLoadingProgress(100);
            setLoadingStatus(I18nHelper.t('splash.done'));
            setTimeout(() => {
                setAuthChecked(true);
            }, 600);
        };

        // Handle verification link
        const verifyToken = urlParams.get('verifyToken');
        if (verifyToken) {
            setLoadingStatus(I18nHelper.t('splash.verifying_account'));
            setLoadingProgress(30);
            window.history.replaceState({}, document.title, window.location.pathname);
            fetch(`${getApiBase()}/auth/verify-email?token=${encodeURIComponent(verifyToken)}`)
                .then(r => r.json())
                .then(data => {
                    setLoadingProgress(70);
                    setVerifyMsg({ 
                        success: data.success, 
                        text: data.message || data.error || I18nHelper.t('splash.verify_processed') 
                    });
                })
                .catch(() => setVerifyMsg({ success: false, text: I18nHelper.t('splash.verify_error') }))
                .finally(() => finishLoading());
            return;
        }

        // Handle auto-login link (e.g. from password reset)
        const autoUser = urlParams.get('resetUser');
        const autoPw = urlParams.get('resetPw');

        if (autoUser && autoPw) {
            setLoadingStatus(I18nHelper.t('splash.auto_login'));
            setLoadingProgress(30);
            handleLogin(autoUser, autoPw, true)
                .then(() => {
                    setLoadingProgress(70);
                    window.history.replaceState({}, document.title, window.location.pathname);
                })
                .catch(() => {
                    window.history.replaceState({}, document.title, window.location.pathname);
                })
                .finally(() => finishLoading());
            return;
        }

        setLoadingStatus(I18nHelper.t('splash.checking_session'));
        setLoadingProgress(20);
        const stored = getStoredAuth();
        if (!stored) {
            setLoadingProgress(100);
            setUser(null);
            finishLoading();
            return;
        }

        // Always allow local offline sessions
        if (stored.source === 'local') {
            setLoadingProgress(100);
            setUser(stored);
            finishLoading();
            return;
        }

        if (!stored.token) {
            setLoadingProgress(100);
            setUser(null);
            finishLoading();
            return;
        }

        setLoadingStatus(I18nHelper.t('splash.authenticating'));
        setLoadingProgress(50);
        fetch(`${getApiBase()}/auth/me`, {
            headers: { 'x-auth-token': stored.token }
        })
            .then(async (res) => {
                const data = await res.json().catch(() => ({}));
                setLoadingProgress(80);
                if (res.ok && data.success && data.data) {
                    setLoadingStatus(I18nHelper.t('splash.loading_profile'));
                    const freshUser = { ...stored, ...data.data };
                    localStorage.setItem(AUTH_KEY, JSON.stringify(freshUser));
                    setUser(freshUser);
                } else if (res.status === 401 || res.status === 403 || !data.success) {
                    // Only clear cache if token is explicitly rejected (expired or invalid)
                    localStorage.removeItem(AUTH_KEY);
                    setUser(null);
                } else {
                    // Retain session on other 500s
                    setUser(stored);
                }
            })
            .catch(() => {
                // Connection or server error: retain session for offline mode
                setUser(stored);
            })
            .finally(() => finishLoading());
    }, []);

    // Online Ping Loop
    useEffect(() => {
        if (!user?.token) return;

        fetch(`${getApiBase()}/users/ping`, {
            method: 'POST',
            headers: { 'x-auth-token': user.token }
        }).catch((e) => { myError('APP', "Ping error on start:", e); });

        const intervalId = setInterval(() => {
            fetch(`${getApiBase()}/users/ping`, {
                method: 'POST',
                headers: { 'x-auth-token': user.token }
            }).catch((e) => { myError('APP', "Ping error loop:", e); });
        }, 60000);

        return () => clearInterval(intervalId);
    }, [user?.token]);

    const handleLogin = async (username, password, isAutoReset = false) => {
        const localUsers = [
            { username: 'dangvq', password: 'DangVQ@2002', displayName: 'Vũ Quang Đáng', role: 'admin' },
            { username: 'admin', password: 'Admin@1234', displayName: 'Quản trị viên', role: 'admin' },
            { username: 'viewer', password: 'Viewer@1234', displayName: 'Khách xem', role: 'viewer' },
        ];

        try {
            const res = await fetch(`${getApiBase()}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const text = await res.text();
            let data;
            try { 
                data = JSON.parse(text); 
            } catch { 
                throw new Error('SERVER_UNAVAILABLE'); 
            }
            if (data.success) {
                const authData = { ...data.data, source: 'api' };
                localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
                setUser(authData);
                TrackingHelper.trackLoginSuccess('token');
                if (isAutoReset) {
                    setTempPwd(password);
                    setForceChangePwd(true);
                    addToast(I18nHelper.t('app.login_success_reset'), 'success');
                } else {
                    addToast(I18nHelper.t('app.login_welcome').replace('{name}', authData.displayName));
                }
                return;
            }
            throw new Error(data.error || I18nHelper.t('app.login_failed'));
        } catch (err) {
            const isServerError = err.message === 'SERVER_UNAVAILABLE'
                || err.name === 'TypeError'
                || err.message.includes('fetch')
                || err.message.includes('Failed')
                || err.message.includes('NetworkError');
            if (isServerError) {
                const u = localUsers.find(v => v.username === username && v.password === password);
                if (u) {
                    const authData = { username: u.username, displayName: u.displayName, role: u.role, source: 'local' };
                    localStorage.setItem(AUTH_KEY, JSON.stringify(authData));
                    setUser(authData);
                    TrackingHelper.trackLoginSuccess('local');
                    addToast(I18nHelper.t('app.login_welcome_offline').replace('{name}', u.displayName));
                    return;
                }
                addToast(I18nHelper.t('app.login_wrong_credentials'), 'error');
                throw new Error(I18nHelper.t('app.login_wrong_credentials'));
            }
            addToast(err.message || I18nHelper.t('app.login_failed'), 'error');
            throw err;
        }
    };

    const handleLogout = async () => {
        if (user?.token) {
            try { 
                await fetch(`${getApiBase()}/auth/logout`, { 
                    method: 'POST', 
                    headers: { 'x-auth-token': user.token } 
                }); 
            } catch {}
        }
        localStorage.removeItem(AUTH_KEY);
        clearChatCache().catch((e) => { myError('APP', "Logout Chat Cache Clear Error:", e); });
        offlineCache.clearAll().catch((e) => { myError('OFFLINE', "Logout Offline Cache Clear Error:", e); });
        
        setUser(null);
        TrackingHelper.trackLogout();
        addToast(I18nHelper.t('app.logout_success'));
        window.history.replaceState({}, document.title, window.location.pathname);
    };

    const handleForceChangePassword = async (newPwd, confirmNewPwd) => {
        setForceChangeError('');
        if (!newPwd || !confirmNewPwd) { 
            setForceChangeError(I18nHelper.t('app.force_pwd_empty')); 
            return; 
        }

        const strongRegex = new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#\\$%\\^&\\*])(?=.{8,})");
        if (!strongRegex.test(newPwd)) {
            setForceChangeError(I18nHelper.t('app.force_pwd_weak'));
            return;
        }

        if (newPwd !== confirmNewPwd) { 
            setForceChangeError(I18nHelper.t('app.force_pwd_mismatch')); 
            return; 
        }

        try {
            const res = await fetch(`${getApiBase()}/auth/change-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-auth-token': user.token },
                body: JSON.stringify({ currentPassword: tempPwd, newPassword: newPwd })
            });
            const json = await res.json();
            if (json.success) {
                addToast(I18nHelper.t('app.force_pwd_success'));
                setForceChangePwd(false);
                setTempPwd('');
                setForceChangeError('');
            } else {
                setForceChangeError(json.error || I18nHelper.t('app.force_pwd_error'));
            }
        } catch (e) {
            setForceChangeError(I18nHelper.t('app.force_pwd_conn_error'));
        }
    };

    const isAdmin = user?.role === 'admin';
    const canEdit = user?.role === 'admin' || user?.role === 'editor';

    return {
        user,
        setUser,
        authChecked,
        loadingProgress,
        loadingStatus,
        forceChangePwd,
        setForceChangePwd,
        forceChangeError,
        verifyMsg,
        toasts,
        addToast,
        handleLogin,
        handleLogout,
        handleForceChangePassword,
        isAdmin,
        canEdit
    };
}
