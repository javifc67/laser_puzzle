import { useContext, useRef, useState } from "react";
import "./../assets/scss/MainScreen.scss";
import { GlobalContext } from "./GlobalContext.jsx";
import Board from "./Board.jsx";

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
            let a = config.transmitter.angle || 0;
            let style = config.transmitter.style || 'object';
            let gx = toGridX(config.transmitter.x);
            let gy = toGridY(config.transmitter.y);

            // Si el modo es agujero, lo anclamos a la pared del final de su propia celda (borde)
            if (style === 'hole') {
                if (a === 0) gy -= 0.5;
                if (a === 90) gx -= 0.5;
                if (a === 180) gy += 0.5;
                if (a === 270) gx += 0.5;
            }

            objs.push({
                type: 'laser',
                x: gx,
                y: gy,
                a: a,
                allowMove: config.transmitter.allowMove ?? false,
                label: config.transmitter.label || '',
                color: config.transmitter.color || null,
                style: style,
                img: config.transmitter.img || null
            });
        }

        if (config.receptor) {
            let a = config.receptor.angle || 0;
            let style = config.receptor.style || 'object';
            let gx = toGridX(config.receptor.x);
            let gy = toGridY(config.receptor.y);

            if (style === 'hole') {
                if (a === 0) gy -= 0.5;
                if (a === 90) gx -= 0.5;
                if (a === 180) gy += 0.5;
                if (a === 270) gx += 0.5;
            }

            objs.push({
                type: 'sink',
                x: gx,
                y: gy,
                a: a,
                allowMove: config.receptor.allowMove ?? false,
                label: config.receptor.label || '',
                color: config.receptor.color || null,
                style: style,
                img: config.receptor.img || null
            });
        }

        if (config.objects) {
            config.objects.forEach(obj => {
                objs.push({
                    type: obj.type === "SQUARE" ? "square" : "triangle",
                    x: toGridX(obj.x),
                    y: toGridY(obj.y),
                    a: obj.angle || 0,
                    allowMove: obj.allowMove ?? config.allowMoveObjects ?? true,
                    label: obj.label || '',
                    color: obj.color || null,
                    ico: obj.ico || null,
                    img: obj.img || null
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
                    allowMove: obs.allowMove ?? config.allowMoveObstacles ?? false,
                    label: obs.label || '',
                    color: obs.color || null,
                    ico: obs.ico || null,
                    img: obs.img || null
                });
            });
        }

        return objs;
    });

    const [draggedIdx, setDraggedIdx] = useState(null);
    const [laserIsSinked, setLaserIsSinked] = useState(false);
    const dragStart = useRef({ x: 0, y: 0 });
    const laserPathRef = useRef("");

    const getMousePos = (e) => {
        const innerEl = containerRef.current?.querySelector('.actual-grid-area');
        const rect = innerEl ? innerEl.getBoundingClientRect() : canvasRef.current.getBoundingClientRect();
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
            if (!obj.allowMove) return;
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

    const rotateObject = (idx, direction = 1) => {
        setObjects(prev => {
            let newObjs = [...prev];
            const objType = newObjs[idx].type;
            let step = 90;
            if (objType === 'square' || objType === 'laser') {
                step = 45;
            } else if (objType === 'triangle') {
                step = 30;
            }
            newObjs[idx] = { ...newObjs[idx], a: (newObjs[idx].a + direction * step) % 360 };
            return newObjs;
        });
    };

    const handleMouseUp = (e) => {
        if (draggedIdx !== null) {
            const dist = Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y);
            if (dist < 1) { // Consider as a click instead of a drag
                rotateObject(draggedIdx, 1);
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
            if (!obj.allowMove) return;
            let dist = Math.hypot(obj.x - pos.x, obj.y - pos.y);
            if (dist < 1.0 && dist < minDist) {
                minDist = dist;
                rotateIdx = idx;
            }
        });
        if (rotateIdx !== -1) {
            rotateObject(rotateIdx, Math.sign(e.deltaY));
        }
    };

    return (
        <div className="mainScreen">
            <Board
                canvasRef={canvasRef}
                containerRef={containerRef}
                config={config}
                objects={objects}
                draggedIdx={draggedIdx}
                setLaserIsSinked={setLaserIsSinked}
                laserPathRef={laserPathRef}
                solved={solved}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onWheel={handleWheel}
            />
        </div>
    );
}
