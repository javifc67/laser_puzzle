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
                    allowMove: obj.allowMove ?? config.allowMoveObjects ?? true,
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
                    allowMove: obs.allowMove ?? config.allowMoveObstacles ?? false,
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
            if (!obj.allowMove) return;
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
                let step = 0;
                if (objType === 'square') {
                    step = 45;
                } else if (objType === 'triangle' || objType === 'laser') {
                    step = 30;
                }

                newObjs[rotateIdx] = { ...newObjs[rotateIdx], a: (newObjs[rotateIdx].a + Math.sign(e.deltaY) * step) % 360 };
                return newObjs;
            });
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
