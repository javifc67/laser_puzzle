import { useEffect, useRef, useCallback, useState } from "react";
import { computeGeometry, drawRays, drawObjects } from "./boardUtils";
import useSound from "../hooks/useSound.js";

export default function Board({
    canvasRef,
    containerRef,
    config,
    objects,
    draggedIdx,
    setLaserIsSinked,
    laserPathRef,
    solved,
    onMouseDown,
    onMouseMove,
    onMouseUp,
    onWheel
}) {
    const innerRef = useRef(null);
    const canvasWrapperRef = useRef(null);
    const gridAreaRef = useRef(null);
    const cols = config?.cols || 8;
    const rows = config?.rows || 6;

    const winProgressRef = useRef(1);
    const animFrameRef = useRef(null);

    const { play: playWinSound } = useSound("/sounds/laserShoot.wav", { volume: 0.8 });

    useEffect(() => {
        if (solved) {
            playWinSound();
            winProgressRef.current = 0;
            let lastTime = performance.now();
            const animate = (time) => {
                const dt = time - lastTime;
                lastTime = time;
                winProgressRef.current += dt / 1000;
                if (winProgressRef.current >= 1) {
                    winProgressRef.current = 1;
                    draw();
                } else {
                    draw();
                    animFrameRef.current = requestAnimationFrame(animate);
                }
            };
            animFrameRef.current = requestAnimationFrame(animate);
        } else {
            winProgressRef.current = 1;
        }
        return () => {
            if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
        };
    }, [solved]);

    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas || !gridAreaRef.current || !canvasWrapperRef.current) return;
        const width = canvas.width;
        const height = canvas.height;
        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, width, height);

        const containerRect = canvasWrapperRef.current.getBoundingClientRect();
        const innerRect = gridAreaRef.current.getBoundingClientRect();

        const scaleCSS_X = width / containerRect.width;
        const scaleCSS_Y = height / containerRect.height;

        const offsetX = (innerRect.left - containerRect.left) * scaleCSS_X;
        const offsetY = (innerRect.top - containerRect.top) * scaleCSS_Y;
        const innerWidth = innerRect.width * scaleCSS_X;
        const innerHeight = innerRect.height * scaleCSS_Y;

        const scaleX = innerWidth / cols;
        const scaleY = innerHeight / rows;

        ctx.save();
        ctx.translate(offsetX, offsetY);

        if (config.showGrid) {
            ctx.beginPath();
            const gridSizeX = innerWidth / cols;
            const gridSizeY = innerHeight / rows;

            for (let x = 0; x <= innerWidth; x += gridSizeX) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x, innerHeight);
            }
            for (let y = 0; y <= innerHeight; y += gridSizeY) {
                ctx.moveTo(0, y);
                ctx.lineTo(innerWidth, y);
            }
            ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
            ctx.lineWidth = 1;
            ctx.stroke();

            if (draggedIdx !== null && objects[draggedIdx]) {
                const dragObj = objects[draggedIdx];
                const cellX = Math.floor(dragObj.x);
                const cellY = Math.floor(dragObj.y);

                ctx.fillStyle = "rgba(255, 255, 255, 0.1)";
                ctx.fillRect(cellX * gridSizeX, cellY * gridSizeY, gridSizeX, gridSizeY);

                ctx.strokeStyle = "#7dcfff";
                ctx.lineWidth = 2;
                ctx.strokeRect(cellX * gridSizeX, cellY * gridSizeY, gridSizeX, gridSizeY);
            }
        }

        const padLeftLogical = offsetX / scaleX;
        const padTopLogical = offsetY / scaleY;
        const padRightLogical = ((containerRect.right - innerRect.right) * scaleCSS_X) / scaleX;
        const padBottomLogical = ((containerRect.bottom - innerRect.bottom) * scaleCSS_Y) / scaleY;

        const shiftedObjects = objects.map(obj => {
            if ((obj.type === 'laser' || obj.type === 'sink') && obj.style === 'hole') {
                let nx = obj.x;
                let ny = obj.y;
                if (obj.a === 90) nx -= padLeftLogical;
                if (obj.a === 270) nx += padRightLogical;
                if (obj.a === 180) ny += padBottomLogical;
                if (obj.a === 0) ny -= padTopLogical;
                return { ...obj, x: nx, y: ny };
            }
            return obj;
        });

        const geoObjects = computeGeometry(innerWidth, innerHeight, shiftedObjects);
        const laserObjectEmitter = geoObjects.filter(obj => obj.type === "laser" && obj.style !== "hole");
        const everythingElse = geoObjects.filter(obj => !(obj.type === "laser" && obj.style !== "hole"));

        drawObjects(ctx, scaleX, scaleY, everythingElse, config, draw);
        drawRays(ctx, scaleX, scaleY, geoObjects, solved, setLaserIsSinked, laserPathRef, winProgressRef.current);
        drawObjects(ctx, scaleX, scaleY, laserObjectEmitter, config, draw);

        ctx.restore();
    }, [canvasRef, cols, config, draggedIdx, objects, rows, setLaserIsSinked, laserPathRef, solved]);

    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current && canvasWrapperRef.current) {
                const rect = canvasWrapperRef.current.getBoundingClientRect();
                canvasRef.current.width = rect.width;
                canvasRef.current.height = rect.height;
                draw();
            }
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [draw, canvasRef]);

    useEffect(() => {
        draw();
    }, [draw]);

    return (
        <div className={`laser-board-canvas ${solved ? 'solved' : ''}`} ref={containerRef} style={{
            position: 'relative',
            background: config?.gridBackgroundImg ? `url(${config.gridBackgroundImg}) no-repeat center center` : "transparent",
            backgroundSize: config?.gridBackgroundImg ? '100% 100%' : 'auto',
            boxSizing: 'border-box',
            border: config?.gridBackgroundImg ? 'none' : undefined,
            borderRadius: config?.gridBackgroundImg ? '0' : undefined,
            boxShadow: config?.gridBackgroundImg ? 'none' : undefined
        }}>
            <div className="board-canvas-wrapper" ref={canvasWrapperRef} style={{
                position: 'absolute',
                top: config?.canvasPadding?.top || '0',
                right: config?.canvasPadding?.right || '0',
                bottom: config?.canvasPadding?.bottom || '0',
                left: config?.canvasPadding?.left || '0'
            }}>
                <div className="board-inner-area" ref={innerRef} style={{
                    position: 'absolute',
                    top: config?.gridPadding?.top || '0',
                    right: config?.gridPadding?.right || '0',
                    bottom: config?.gridPadding?.bottom || '0',
                    left: config?.gridPadding?.left || '0',
                    pointerEvents: 'none', visibility: 'hidden'
                }}>
                    <div className="actual-grid-area" ref={gridAreaRef} style={{ width: '100%', height: '100%' }}></div>
                </div>
                <canvas
                    ref={canvasRef}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    onWheel={onWheel}
                    style={{ cursor: draggedIdx !== null ? 'grabbing' : 'grab', display: 'block', position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                />
            </div>
        </div>
    );
}
