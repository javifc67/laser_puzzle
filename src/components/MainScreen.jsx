import { useContext, useEffect, useRef, useState } from "react";
import "./../assets/scss/MainScreen.scss";
import { GlobalContext } from "./GlobalContext.jsx";

// Math utilities
const between = (x, a, b) => x >= Math.min(a, b) && x <= Math.max(a, b);
const round = (x) => Math.round(100000000 * x) / 100000000.0;

function getIntersection(l1, l2) {
    let m1, m2, b1, b2, xi, yi, a, d;

    if (round(l1.x2) === round(l1.x1)) { m1 = NaN; b1 = l1.x1; }
    else { m1 = round((l1.y2 - l1.y1) / (l1.x2 - l1.x1)); b1 = l1.y1 - m1 * l1.x1; }

    if (round(l2.x2) === round(l2.x1)) { m2 = NaN; b2 = l2.x1; }
    else { m2 = round((l2.y2 - l2.y1) / (l2.x2 - l2.x1)); b2 = l2.y1 - m2 * l2.x1; }

    if (isNaN(m1) && !isNaN(m2)) {
        xi = b1; yi = m2 * xi + b2;
        if (between(xi, l2.x1, l2.x2) && between(xi, l1.x1, l1.x2) && between(yi, l1.y1, l1.y2)) {
            a = Math.atan(1 / m2);
            d = Math.hypot(xi - l1.x1, yi - l1.y1);
            return { x: xi, y: yi, a, d };
        }
        return null;
    }
    if (isNaN(m2) && !isNaN(m1)) {
        xi = b2; yi = m1 * xi + b1;
        if (between(yi, l2.y1, l2.y2) && between(xi, l1.x1, l1.x2)) {
            a = Math.atan(m1) + Math.PI / 2;
            d = Math.hypot(xi - l1.x1, yi - l1.y1);
            return { x: xi, y: yi, a, d };
        }
        return null;
    }
    if (m1 === m2) return null;

    xi = (b2 - b1) / (m1 - m2);
    yi = m1 * xi + b1;
    if (between(xi, l2.x1, l2.x2) && between(xi, l1.x1, l1.x2)) {
        a = Math.atan((m1 - m2) / (1 + m1 * m2));
        d = Math.hypot(xi - l1.x1, yi - l1.y1);
        return { x: xi, y: yi, a, d };
    }
    return null;
}

export default function MainScreen({ solvePuzzle, solved }) {
    const { appSettings: config, Utils } = useContext(GlobalContext);
    const canvasRef = useRef(null);
    const containerRef = useRef(null);

    const cols = config?.cols || 8;
    const rows = config?.rows || 6;

    const [objects, setObjects] = useState(() => {
        let objs = [];
        if (!config) return objs;

        const toGridX = (gx) => gx + 0.5;
        const toGridY = (gy) => gy + 0.5;

        if (config.transmitter) {
            objs.push({
                type: 'laser',
                x: toGridX(config.transmitter.x),
                y: toGridY(config.transmitter.y),
                a: config.transmitter.angle || 0,
                allowMove: config.transmitter.allowMove ?? false,
                label: config.transmitter.label || '',
                color: config.transmitter.color || null
            });
        }

        if (config.receptor) {
            objs.push({
                type: 'sink',
                x: toGridX(config.receptor.x),
                y: toGridY(config.receptor.y),
                a: 0,
                allowMove: config.receptor.allowMove ?? false,
                label: config.receptor.label || '',
                color: config.receptor.color || null
            });
        }

        if (config.objects) {
            config.objects.forEach(obj => {
                objs.push({
                    type: obj.type === "SQUARE" ? "square" : "triangle",
                    x: toGridX(obj.x),
                    y: toGridY(obj.y),
                    a: obj.angle || 0,
                    allowMove: obj.allowMove ?? true,
                    label: obj.label || '',
                    color: obj.color || null
                });
            });
        }

        if (config.obstacles) {
            config.obstacles.forEach(obs => {
                objs.push({
                    type: 'block',
                    x: toGridX(obs.x),
                    y: toGridY(obs.y),
                    a: obs.angle || 0,
                    w: 0.8,
                    h: 0.8,
                    allowMove: obs.allowMove ?? false,
                    label: obs.label || '',
                    color: obs.color || null
                });
            });
        }

        return objs;
    });

    const [draggedIdx, setDraggedIdx] = useState(null);
    const [laserIsSinked, setLaserIsSinked] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const laserPathRef = useRef("");

    const mirrorsize = 0.5; // 50% of a grid square
    const trianglediameter = (Math.sqrt(3) / 2.5) * mirrorsize;
    const squarediameter = (Math.sqrt(2 * Math.pow(mirrorsize, 2))) / 2;

    const computeGeometry = (width, height, objs) => {
        let geometry = objs.map(obj => ({ ...obj, points: [], lines: [] }));

        geometry.forEach((obj) => {
            let x1, y1, x2, y2, x3, y3, x4, y4, d, a, r;
            if (obj.type === 'triangle' || obj.type === 'laser') {
                x1 = obj.x + trianglediameter * Math.sin(obj.a * Math.PI / 180);
                y1 = obj.y + trianglediameter * Math.cos(obj.a * Math.PI / 180);
                x2 = obj.x + trianglediameter * Math.sin((obj.a + 120) * Math.PI / 180);
                y2 = obj.y + trianglediameter * Math.cos((obj.a + 120) * Math.PI / 180);
                x3 = obj.x + trianglediameter * Math.sin((obj.a + 240) * Math.PI / 180);
                y3 = obj.y + trianglediameter * Math.cos((obj.a + 240) * Math.PI / 180);
                obj.points = [{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }];
                obj.lines = [
                    { x1, y1, x2, y2, type: obj.type },
                    { x1: x2, y1: y2, x2: x3, y2: y3, type: obj.type },
                    { x1: x3, y1: y3, x2: x1, y2: y1, type: obj.type }
                ];
            } else if (obj.type === 'square') {
                x1 = obj.x + squarediameter * Math.sin(obj.a * Math.PI / 180);
                y1 = obj.y + squarediameter * Math.cos(obj.a * Math.PI / 180);
                x2 = obj.x + squarediameter * Math.sin((obj.a + 90) * Math.PI / 180);
                y2 = obj.y + squarediameter * Math.cos((obj.a + 90) * Math.PI / 180);
                x3 = obj.x + squarediameter * Math.sin((obj.a + 180) * Math.PI / 180);
                y3 = obj.y + squarediameter * Math.cos((obj.a + 180) * Math.PI / 180);
                x4 = obj.x + squarediameter * Math.sin((obj.a + 270) * Math.PI / 180);
                y4 = obj.y + squarediameter * Math.cos((obj.a + 270) * Math.PI / 180);
                obj.points = [{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }, { x: x4, y: y4 }];
                obj.lines = [
                    { x1, y1, x2, y2, type: obj.type }, { x1: x2, y1: y2, x2: x3, y2: y3, type: obj.type },
                    { x1: x3, y1: y3, x2: x4, y2: y4, type: obj.type }, { x1: x4, y1: y4, x2: x1, y2: y1, type: obj.type }
                ];
            } else if (obj.type === 'block') {
                d = Math.hypot(obj.w, obj.h) / 2;
                a = Math.atan(obj.w / obj.h);
                r = obj.a * Math.PI / 180;
                x1 = obj.x + d * Math.sin(a + r); y1 = obj.y + d * Math.cos(a + r);
                x2 = obj.x + d * Math.sin(Math.PI - a + r); y2 = obj.y + d * Math.cos(Math.PI - a + r);
                x3 = obj.x + d * Math.sin(Math.PI + a + r); y3 = obj.y + d * Math.cos(Math.PI + a + r);
                x4 = obj.x + d * Math.sin(-a + r); y4 = obj.y + d * Math.cos(-a + r);
                obj.points = [{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }, { x: x4, y: y4 }];
                obj.lines = [
                    { x1, y1, x2, y2, type: obj.type }, { x1: x2, y1: y2, x2: x3, y2: y3, type: obj.type },
                    { x1: x3, y1: y3, x2: x4, y2: y4, type: obj.type }, { x1: x4, y1: y4, x2: x1, y2: y1, type: obj.type }
                ];
            } else if (obj.type === 'sink') {
                let radius = trianglediameter * 1.1;
                for (let k = 0; k < 256; k++) {
                    let angle = obj.a * Math.PI / 180 + k * (Math.PI / 128);
                    let px = obj.x + radius * Math.sin(angle);
                    let py = obj.y + radius * Math.cos(angle);
                    obj.points.push({ x: px, y: py });
                }
                for (let k = 0; k < 256; k++) {
                    let nextK = (k + 1) % 256;
                    obj.lines.push({
                        x1: obj.points[k].x, y1: obj.points[k].y,
                        x2: obj.points[nextK].x, y2: obj.points[nextK].y,
                        type: obj.type
                    });
                }
            }
        });
        return geometry;
    };

    const draw = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const width = canvas.width;
        const height = canvas.height;
        const ctx = canvas.getContext("2d");

        ctx.clearRect(0, 0, width, height);

        const scaleX = width / cols;
        const scaleY = height / rows;

        // Draw background grid
        ctx.beginPath();
        const gridSizeX = width / config.cols;
        const gridSizeY = height / config.rows;

        for (let x = 0; x <= width; x += gridSizeX) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = 0; y <= height; y += gridSizeY) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
        ctx.lineWidth = 1;
        ctx.stroke();

        if (draggedIdx !== null && objects[draggedIdx]) {
            const dragObj = objects[draggedIdx];
            const cellX = Math.floor(dragObj.x);
            const cellY = Math.floor(dragObj.y);

            ctx.fillStyle = "rgba(255, 255, 255, 0.1)"; /* leve fondo iluminado */
            ctx.fillRect(cellX * gridSizeX, cellY * gridSizeY, gridSizeX, gridSizeY);

            ctx.strokeStyle = "#7dcfff"; /* Azul cián brillante de selección */
            ctx.lineWidth = 2;
            ctx.strokeRect(cellX * gridSizeX, cellY * gridSizeY, gridSizeX, gridSizeY);
        }

        const geoObjects = computeGeometry(width, height, objects);

        // Draw objects
        geoObjects.forEach((obj) => {
            ctx.beginPath();
            obj.points.forEach((p, idx) => {
                if (idx === 0) ctx.moveTo(p.x * scaleX, p.y * scaleY);
                else ctx.lineTo(p.x * scaleX, p.y * scaleY);
            });
            ctx.closePath();

            ctx.setLineDash([]);
            if (obj.type === "triangle" || obj.type === "square") {
                ctx.fillStyle = "#1a1b26";
                ctx.strokeStyle = obj.color || "#7dcfff";
                ctx.lineWidth = 2;
                ctx.fill();
                ctx.stroke();
            } else if (obj.type === "block") {
                ctx.fillStyle = obj.color || "#333";
                ctx.strokeStyle = "#555";
                ctx.fill();
                ctx.stroke();
            } else if (obj.type === "sink") {
                ctx.fillStyle = "#24283b";
                ctx.strokeStyle = obj.color || "#9ece6a";
                ctx.lineWidth = 3;
                ctx.fill();
                ctx.stroke();
            } else if (obj.type === "laser") {
                ctx.fillStyle = "#333";
                ctx.strokeStyle = obj.color || "#ff0055";
                ctx.lineWidth = 2;
                ctx.fill();
                ctx.stroke();
            }

            // Draw Label
            if (obj.label) {
                ctx.save();
                ctx.translate(obj.x * scaleX, obj.y * scaleY);

                // Maximum available width inside a tile (approx 70% of cell)
                const maxAvailableWidth = Math.min(scaleX, scaleY) * 0.7;

                // Start with a large relative font height
                let fontSize = Math.min(scaleX, scaleY) * 0.3;
                ctx.font = `bold ${fontSize}px sans-serif`;

                // Measure how wide it is
                let textWidth = ctx.measureText(obj.label).width;

                // Shrink fontSize linearly based on proportion if it overflows the maxAvailableWidth
                if (textWidth > maxAvailableWidth) {
                    const ratio = maxAvailableWidth / textWidth;
                    fontSize = fontSize * ratio;
                    ctx.font = `bold ${fontSize}px sans-serif`;
                }

                ctx.fillStyle = obj.color || "#ffffff";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(obj.label, 0, 0);

                ctx.restore();
            }
        });

        // Compute and Draw Rays
        let sinkHits = 0;
        let totalSinks = geoObjects.filter(o => o.type === 'sink').length;
        let currentLaserPath = [];

        ctx.lineWidth = 2;
        geoObjects.filter(o => o.type === 'laser').forEach(laserSrc => {
            let lasera = laserSrc.a * Math.PI / 180;
            let x1 = laserSrc.points[0].x;
            let y1 = laserSrc.points[0].y;
            let ray = { x1, y1, a: lasera, x2: x1 + 100 * Math.sin(lasera), y2: y1 + 100 * Math.cos(lasera) };

            ctx.beginPath();
            ctx.moveTo(x1 * scaleX, y1 * scaleY);

            let bounce = 0;
            let terminated = false;
            let curSinked = false;
            let lasthit = null;

            while (!terminated && bounce < 50) {
                let earliestHit = null;
                let newLasthit = null;

                geoObjects.forEach((obj, iIdx) => {
                    if (obj === laserSrc) return; // Un laser no choca consigo mismo

                    obj.lines.forEach((line, jIdx) => {
                        if (lasthit === null || lasthit.objIdx !== iIdx || lasthit.lineIdx !== jIdx) {
                            let intersection = getIntersection(ray, line);
                            if (intersection && intersection.d > 0.001) {
                                if (earliestHit === null || intersection.d < earliestHit.d) {
                                    earliestHit = intersection;
                                    newLasthit = { objIdx: iIdx, lineIdx: jIdx, type: line.type };
                                }
                            }
                        }
                    });
                });

                if (earliestHit === null) {
                    terminated = true;
                    ctx.lineTo(ray.x2 * scaleX, ray.y2 * scaleY);
                } else {
                    ctx.lineTo(earliestHit.x * scaleX, earliestHit.y * scaleY);

                    if (lasthit === null || lasthit.objIdx !== newLasthit.objIdx) {
                        const hitObj = geoObjects[newLasthit.objIdx];
                        if (hitObj && hitObj.label && hitObj.type !== 'laser' && hitObj.type !== 'sink') {
                            currentLaserPath.push(`${hitObj.label},${Math.floor(hitObj.x)},${Math.floor(hitObj.y)}`);
                        }
                    }

                    if (newLasthit.type === 'block' || newLasthit.type === 'sink' || newLasthit.type === 'laser') {
                        terminated = true;
                        if (newLasthit.type === 'sink') {
                            curSinked = true;
                            sinkHits++;
                        }
                    } else {
                        // Reflect
                        let a = ray.a + Math.PI * (earliestHit.a / (Math.PI / 2));
                        ray = {
                            x1: earliestHit.x, y1: earliestHit.y, a,
                            x2: earliestHit.x + 100 * Math.sin(a),
                            y2: earliestHit.y + 100 * Math.cos(a)
                        };
                    }
                }
                bounce++;
                lasthit = newLasthit;
            }
            setLaserIsSinked(curSinked);
            ctx.strokeStyle = curSinked ? "#9ece6a" : "#ff0055";
            ctx.setLineDash([]);
            ctx.stroke();
        });

        laserPathRef.current = currentLaserPath;
    };

    useEffect(() => {
        const resizeCanvas = () => {
            if (canvasRef.current && containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                canvasRef.current.width = rect.width;
                canvasRef.current.height = rect.height;
                draw();
            }
        };
        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);
        return () => window.removeEventListener('resize', resizeCanvas);
    }, [objects, solved, draggedIdx]);

    useEffect(() => {
        draw();
    }, [objects, draggedIdx]);

    const getMousePos = (e) => {
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: ((e.clientX - rect.left) / rect.width) * cols,
            y: ((e.clientY - rect.top) / rect.height) * rows
        };
    };

    const handleMouseDown = (e) => {
        if (solved) return;
        const pos = getMousePos(e);
        let minDist = 1000;
        let clickedIdx = -1;
        objects.forEach((obj, idx) => {
            if (!obj.allowMove) return; // Only movable objects
            let dist = Math.hypot(obj.x - pos.x, obj.y - pos.y);
            if (dist < 0.5 && dist < minDist) {
                minDist = dist;
                clickedIdx = idx;
            }
        });
        if (clickedIdx !== -1) {
            dragStart.current = { x: e.clientX, y: e.clientY };
            setDraggedIdx(clickedIdx);
        }
    };

    const handleMouseMove = (e) => {
        if (draggedIdx !== null) {
            const pos = getMousePos(e);
            setObjects(prev => {
                let newObjs = [...prev];
                newObjs[draggedIdx] = { ...newObjs[draggedIdx], x: pos.x, y: pos.y };
                return newObjs;
            });
        }
    };

    const sendLaserStatus = () => {
        setTimeout(() => {
            if (typeof solvePuzzle === 'function') {
                if (config.solutionLength === laserPathRef.current.length && laserIsSinked) {
                    solvePuzzle(laserPathRef.current.join(';'));
                }
                Utils.log(laserPathRef.current);
            }
        }, 50); // Retraso de 50ms para asegurar que React haya dibujado el último frame y actualizado el ref
    };

    const handleMouseUp = (e) => {
        if (draggedIdx !== null) {
            const dist = Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
            if (dist < 1) { // Consider as a click instead of a drag
                setObjects(prev => {
                    let newObjs = [...prev];
                    const objType = newObjs[draggedIdx].type;
                    let step = 90;
                    if (objType === 'square') {
                        step = 45;
                    } else if (objType === 'triangle' || objType === 'laser') {
                        step = 30;
                    }
                    newObjs[draggedIdx] = { ...newObjs[draggedIdx], a: (newObjs[draggedIdx].a + step) % 360 };
                    return newObjs;
                });
            }
            setDraggedIdx(null);
            sendLaserStatus();
        }
    };

    const handleWheel = (e) => {
        if (solved || draggedIdx === null) return;
        const pos = getMousePos(e);
        let minDist = 1000;
        let rotateIdx = -1;
        objects.forEach((obj, idx) => {
            if (!obj.allowMove) return; // Only rotatable objects
            let dist = Math.hypot(obj.x - pos.x, obj.y - pos.y);
            if (dist < 1.0 && dist < minDist) {
                minDist = dist;
                rotateIdx = idx;
            }
        });
        if (rotateIdx !== -1) {
            setObjects(prev => {
                let newObjs = [...prev];
                const objType = newObjs[rotateIdx].type;
                let step = 0; // Default for blocks/others
                if (objType === 'square') {
                    step = 45; // allows 0, 45, 90...
                } else if (objType === 'triangle' || objType === 'laser') {
                    step = 30; // allows 0, 30, 60, 90...
                }

                newObjs[rotateIdx] = { ...newObjs[rotateIdx], a: (newObjs[rotateIdx].a + Math.sign(e.deltaY) * step) % 360 };
                return newObjs;
            });
        }
    };

    return (
        <div className="mainScreen">
            <div className="laser-board-canvas" ref={containerRef}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onWheel={handleWheel}
                    style={{ cursor: draggedIdx !== null ? 'grabbing' : 'grab' }}
                />
            </div>
        </div>
    );
}
