import { useState, useEffect, useRef } from 'react';

export default function Toast({ toasts }) {
    return (
        <div className="toast-container">
            {toasts.map(t => (
                <ToastItem key={t.id} toast={t} />
            ))}
        </div>
    );
}

function ToastItem({ toast }) {
    const [show, setShow] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        requestAnimationFrame(() => setShow(true));
        const timer = setTimeout(() => setShow(false), 3000);
        return () => clearTimeout(timer);
    }, []);

    return (
        <div ref={ref} className={`toast toast-${toast.type} ${show ? 'show' : ''}`}>
            <span className="toast-icon">{toast.type === 'success' ? '✓' : toast.type === 'error' ? '✕' : 'ℹ'}</span>
            <span>{toast.message}</span>
        </div>
    );
}
