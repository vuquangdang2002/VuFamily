import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * PhotoCropper: Facebook-style circular crop.
 * Image is fixed, user drags the circle to choose crop area.
 */
export default function PhotoCropper({ imageSrc, onCrop, onCancel }) {
    const canvasRef = useRef(null);
    const [img, setImg] = useState(null);
    const [circlePos, setCirclePos] = useState({ x: 0, y: 0 });
    const [circleR, setCircleR] = useState(80);
    const [dragging, setDragging] = useState(false);
    const [resizing, setResizing] = useState(false);
    const [lastPt, setLastPt] = useState(null);

    // Image display dimensions (fit image into canvas)
    const [imgRect, setImgRect] = useState({ x: 0, y: 0, w: 0, h: 0 });

    const CANVAS_W = 400;
    const CANVAS_H = 400;

    // Load image and fit into canvas
    useEffect(() => {
        if (!imageSrc) return;
        const image = new Image();
        image.onload = () => {
            setImg(image);
            // Fit image into canvas
            const scale = Math.min(CANVAS_W / image.width, CANVAS_H / image.height);
            const w = image.width * scale;
            const h = image.height * scale;
            const x = (CANVAS_W - w) / 2;
            const y = (CANVAS_H - h) / 2;
            setImgRect({ x, y, w, h });
            // Center circle, radius = 40% of smaller dimension
            const r = Math.min(w, h) * 0.4;
            setCircleR(r);
            setCirclePos({ x: x + w / 2, y: y + h / 2 });
        };
        image.src = imageSrc;
    }, [imageSrc]);

    // Draw
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !img) return;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

        // Background
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Draw full image
        ctx.drawImage(img, imgRect.x, imgRect.y, imgRect.w, imgRect.h);

        // Dark overlay
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

        // Clear circle (show image through)
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(circlePos.x, circlePos.y, circleR, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // Redraw image inside circle
        ctx.save();
        ctx.beginPath();
        ctx.arc(circlePos.x, circlePos.y, circleR, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(img, imgRect.x, imgRect.y, imgRect.w, imgRect.h);
        ctx.restore();

        // Circle border
        ctx.beginPath();
        ctx.arc(circlePos.x, circlePos.y, circleR, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Resize handle (small circle at bottom-right of main circle)
        const handleAngle = Math.PI * 0.25; // 45 degrees
        const hx = circlePos.x + circleR * Math.cos(handleAngle);
        const hy = circlePos.y + circleR * Math.sin(handleAngle);
        ctx.beginPath();
        ctx.arc(hx, hy, 8, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fill();
        ctx.strokeStyle = 'var(--gold, #D4AF37)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Arrows icon on handle
        ctx.fillStyle = '#333';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⤡', hx, hy);
    }, [img, imgRect, circlePos, circleR]);

    useEffect(() => { draw(); }, [draw]);

    // Check if point is near resize handle
    const isOnHandle = (px, py) => {
        const handleAngle = Math.PI * 0.25;
        const hx = circlePos.x + circleR * Math.cos(handleAngle);
        const hy = circlePos.y + circleR * Math.sin(handleAngle);
        return Math.hypot(px - hx, py - hy) < 14;
    };

    // Check if point is inside circle
    const isInCircle = (px, py) => {
        return Math.hypot(px - circlePos.x, py - circlePos.y) < circleR;
    };

    const getCanvasPoint = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    // Clamp circle to stay within image bounds
    const clampCircle = (cx, cy, r) => {
        const minR = 30;
        const maxR = Math.min(imgRect.w, imgRect.h) / 2;
        r = Math.max(minR, Math.min(maxR, r));
        cx = Math.max(imgRect.x + r, Math.min(imgRect.x + imgRect.w - r, cx));
        cy = Math.max(imgRect.y + r, Math.min(imgRect.y + imgRect.h - r, cy));
        return { x: cx, y: cy, r };
    };

    const onPointerDown = (e) => {
        const pt = getCanvasPoint(e);
        if (isOnHandle(pt.x, pt.y)) {
            setResizing(true);
            setLastPt(pt);
        } else if (isInCircle(pt.x, pt.y)) {
            setDragging(true);
            setLastPt(pt);
        }
    };

    const onPointerMove = (e) => {
        const pt = getCanvasPoint(e);
        if (dragging && lastPt) {
            const dx = pt.x - lastPt.x;
            const dy = pt.y - lastPt.y;
            const clamped = clampCircle(circlePos.x + dx, circlePos.y + dy, circleR);
            setCirclePos({ x: clamped.x, y: clamped.y });
            setLastPt(pt);
        } else if (resizing && lastPt) {
            const dist = Math.hypot(pt.x - circlePos.x, pt.y - circlePos.y);
            const clamped = clampCircle(circlePos.x, circlePos.y, dist);
            setCircleR(clamped.r);
            setCirclePos({ x: clamped.x, y: clamped.y });
            setLastPt(pt);
        }

        // Cursor
        const canvas = canvasRef.current;
        if (canvas) {
            if (isOnHandle(pt.x, pt.y)) canvas.style.cursor = 'nwse-resize';
            else if (isInCircle(pt.x, pt.y)) canvas.style.cursor = dragging ? 'grabbing' : 'grab';
            else canvas.style.cursor = 'default';
        }
    };

    const onPointerUp = () => {
        setDragging(false);
        setResizing(false);
        setLastPt(null);
    };

    // Crop: extract circular area
    const handleCrop = () => {
        if (!img) return;
        const outSize = 256;
        const offscreen = document.createElement('canvas');
        offscreen.width = outSize;
        offscreen.height = outSize;
        const octx = offscreen.getContext('2d');

        // Map circle position from canvas coords to source image coords
        const scaleX = img.width / imgRect.w;
        const scaleY = img.height / imgRect.h;
        const srcCX = (circlePos.x - imgRect.x) * scaleX;
        const srcCY = (circlePos.y - imgRect.y) * scaleY;
        const srcR = circleR * scaleX;

        // Clip to circle
        octx.beginPath();
        octx.arc(outSize / 2, outSize / 2, outSize / 2, 0, Math.PI * 2);
        octx.clip();
        octx.drawImage(img,
            srcCX - srcR, srcCY - srcR, srcR * 2, srcR * 2,
            0, 0, outSize, outSize);

        onCrop(offscreen.toDataURL('image/jpeg', 0.85));
    };

    return (
        <div className="photo-cropper-overlay" onClick={e => e.target === e.currentTarget && onCancel()}>
            <div className="photo-cropper-modal">
                <div className="photo-cropper-header">
                    <h3>Cắt ảnh đại diện</h3>
                    <button className="detail-close" onClick={onCancel}>✕</button>
                </div>
                <div className="photo-cropper-hint">Kéo vòng tròn để chọn vùng cắt · Kéo góc ⤡ để thay đổi kích thước</div>
                <canvas
                    ref={canvasRef}
                    width={CANVAS_W} height={CANVAS_H}
                    style={{ borderRadius: 8, display: 'block', margin: '0 auto', touchAction: 'none' }}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    onPointerLeave={onPointerUp}
                />
                <div className="photo-cropper-actions">
                    <button type="button" className="btn" onClick={onCancel}>Hủy</button>
                    <button type="button" className="btn btn-primary" onClick={handleCrop}>✅ Xác nhận</button>
                </div>
            </div>
        </div>
    );
}
