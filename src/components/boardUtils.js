import ReactDOMServer from "react-dom/server";
import { iconMap } from "../icons/shapesIcons";

const between = (x, a, b) => x >= Math.min(a, b) && x <= Math.max(a, b);
const round = (x) => Math.round(100000000 * x) / 100000000.0;

const getIntersection = (l1, l2) => {
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

const ImageCache = {};
const getCachedImage = (src, onLoad) => {
    if (!src) return null;
    if (!ImageCache[src]) {
        const img = new Image();
        img.onload = () => { if (onLoad) onLoad(); };
        img.src = src;
        ImageCache[src] = img;
    }
    return ImageCache[src];
};

const getObjectSolution = (obj) => {
    const fx = Math.floor(obj.x), fy = Math.floor(obj.y);
    if (obj.label) return `${obj.label},${fx},${fy}`;
    if (obj.img) return `${obj.img},${fx},${fy}`;
    if (obj.ico) return `${obj.color ? obj.color + " " : ""}${obj.ico},${fx},${fy}`;
    if (obj.color) return `${obj.color},${fx},${fy}`;
    return `${fx}${fy},${fx},${fy}`;
};

const IconImageCache = {};

const toPascalCase = (str) => str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();

const getIconImage = (ico, color, onLoad) => {
    const normalizedIco = toPascalCase(ico);
    const key = `${normalizedIco}__${color}`;
    if (IconImageCache[key]) return IconImageCache[key];
    if (!iconMap[normalizedIco]) return null;

    const svgString = ReactDOMServer.renderToString(iconMap[normalizedIco]({ width: 64, height: 64, color }));
    const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
        URL.revokeObjectURL(url);
        if (onLoad) onLoad();
    };
    img.src = url;
    IconImageCache[key] = img;
    return img;
};

const drawLabel = (ctx, scaleX, scaleY, obj, drawTrigger) => {
    if (!obj.img && !obj.ico && !obj.label) return;

    const cellSize = Math.min(scaleX, scaleY);

    ctx.save();
    ctx.translate(obj.x * scaleX, obj.y * scaleY);

    if (obj.img) {
        const img = getCachedImage(obj.img, drawTrigger);
        if (img && img.complete && img.naturalWidth > 0) {
            ctx.rotate(-obj.a * Math.PI / 180);
            const size = cellSize * 0.5;
            ctx.drawImage(img, -size / 2, -size / 2, size, size);
        }
    } else if (obj.ico) {
        const color = obj.color || "#ffffff";
        const img = getIconImage(obj.ico, color, drawTrigger);
        if (img && img.complete && img.naturalWidth > 0) {
            const iconSize = cellSize * 0.55;
            ctx.drawImage(img, -iconSize / 2, -iconSize / 2, iconSize, iconSize);
        }
    } else if (obj.label) {
        const maxAvailableWidth = cellSize * 0.7;
        let fontSize = cellSize * 0.3;
        ctx.font = `bold ${fontSize}px sans-serif`;
        let textWidth = ctx.measureText(obj.label).width;

        if (textWidth > maxAvailableWidth) {
            fontSize *= maxAvailableWidth / textWidth;
            ctx.font = `bold ${fontSize}px sans-serif`;
            textWidth = ctx.measureText(obj.label).width;
        }

        ctx.fillStyle = obj.color || "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(obj.label, 0, 0);
    }

    ctx.restore();
};

const mirrorsize = 0.65;
const trianglediameter = (Math.sqrt(3) / 2.5) * mirrorsize;
const squarediameter = (Math.sqrt(2 * Math.pow(mirrorsize, 2))) / 2;

export const computeGeometry = (width, height, objs) => {
    let geometry = objs.map(obj => ({ ...obj, points: [], lines: [] }));

    geometry.forEach((obj) => {
        let x1, y1, x2, y2, x3, y3, x4, y4, d, a, r;
        if (obj.type === 'laser') {
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
        } else if (obj.type === 'triangle') {
            x1 = obj.x + trianglediameter * Math.sin((obj.a + 180) * Math.PI / 180);
            y1 = obj.y + trianglediameter * Math.cos((obj.a + 180) * Math.PI / 180);
            x2 = obj.x + trianglediameter * Math.sin((obj.a + 300) * Math.PI / 180);
            y2 = obj.y + trianglediameter * Math.cos((obj.a + 300) * Math.PI / 180);
            x3 = obj.x + trianglediameter * Math.sin((obj.a + 60) * Math.PI / 180);
            y3 = obj.y + trianglediameter * Math.cos((obj.a + 60) * Math.PI / 180);
            obj.points = [{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }];
            obj.lines = [
                { x1, y1, x2, y2, type: obj.type, behavior: "absorb" },
                { x1: x2, y1: y2, x2: x3, y2: y3, type: obj.type, behavior: "mirror" },
                { x1: x3, y1: y3, x2: x1, y2: y1, type: obj.type, behavior: "absorb" }
            ];
        } else if (obj.type === 'square') {
            x1 = obj.x + squarediameter * Math.sin((obj.a + 45) * Math.PI / 180);
            y1 = obj.y + squarediameter * Math.cos((obj.a + 45) * Math.PI / 180);
            x2 = obj.x + squarediameter * Math.sin((obj.a + 135) * Math.PI / 180);
            y2 = obj.y + squarediameter * Math.cos((obj.a + 135) * Math.PI / 180);
            x3 = obj.x + squarediameter * Math.sin((obj.a + 225) * Math.PI / 180);
            y3 = obj.y + squarediameter * Math.cos((obj.a + 225) * Math.PI / 180);
            x4 = obj.x + squarediameter * Math.sin((obj.a + 315) * Math.PI / 180);
            y4 = obj.y + squarediameter * Math.cos((obj.a + 315) * Math.PI / 180);
            obj.points = [{ x: x1, y: y1 }, { x: x2, y: y2 }, { x: x3, y: y3 }, { x: x4, y: y4 }];
            obj.lines = [
                { x1, y1, x2, y2, type: obj.type, behavior: "absorb" },
                { x1: x2, y1: y2, x2: x3, y2: y3, type: obj.type, behavior: "absorb" },
                { x1: x3, y1: y3, x2: x4, y2: y4, type: obj.type, behavior: "absorb" },
                { x1: x4, y1: y4, x2: x1, y2: y1, type: obj.type, behavior: "mirror" }
            ];
        } else if (obj.type === 'block') {
            d = Math.hypot(0.8, 0.8) / 2;
            a = Math.atan(0.8 / 0.8);
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
            let radius = obj.style === 'hole' ? 0.02 : trianglediameter * 1.1;
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

export const drawRays = (ctx, scaleX, scaleY, geoObjects, solved, setLaserIsSinked, laserPathRef, winProgress = 1) => {
    let currentLaserPath = [];
    ctx.lineWidth = 3;

    geoObjects.filter(o => o.type === 'laser').forEach(laserSrc => {
        let lasera = laserSrc.a * Math.PI / 180;
        let x1 = laserSrc.x;
        let y1 = laserSrc.y;
        let ray = { x1, y1, a: lasera, x2: x1 + 100 * Math.sin(lasera), y2: y1 + 100 * Math.cos(lasera) };

        let bounce = 0;
        let terminated = false;
        let curSinked = false;
        let lasthit = null;
        let segments = [];

        while (!terminated && bounce < 50) {
            let earliestHit = null;
            let newLasthit = null;

            geoObjects.forEach((obj, iIdx) => {
                if (obj === laserSrc) return;

                obj.lines.forEach((line, jIdx) => {
                    if (lasthit === null || lasthit.objIdx !== iIdx || lasthit.lineIdx !== jIdx) {
                        let intersection = getIntersection(ray, line);
                        if (intersection && intersection.d > 0.001) {
                            if (earliestHit === null || intersection.d < earliestHit.d) {
                                earliestHit = intersection;
                                newLasthit = { objIdx: iIdx, lineIdx: jIdx, type: line.type, behavior: line.behavior };
                            }
                        }
                    }
                });
            });

            if (earliestHit === null) {
                terminated = true;
                segments.push({ x1: ray.x1, y1: ray.y1, x2: ray.x2, y2: ray.y2 });
            } else {
                segments.push({ x1: ray.x1, y1: ray.y1, x2: earliestHit.x, y2: earliestHit.y });

                if (lasthit === null || lasthit.objIdx !== newLasthit.objIdx) {
                    const hitObj = geoObjects[newLasthit.objIdx];
                    if (hitObj && hitObj.type !== 'laser' && hitObj.type !== 'sink') {
                        currentLaserPath.push(getObjectSolution(hitObj));
                    }
                }

                if (newLasthit.type === 'block' || newLasthit.type === 'sink' || newLasthit.type === 'laser' || newLasthit.behavior === 'absorb') {
                    terminated = true;
                    if (newLasthit.type === 'sink') {
                        curSinked = true;
                    }
                } else {
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

        if (solved && winProgress < 1) {
            ctx.beginPath();
            segments.forEach((seg, i) => {
                if (i === 0) ctx.moveTo(seg.x1 * scaleX, seg.y1 * scaleY);
                ctx.lineTo(seg.x2 * scaleX, seg.y2 * scaleY);
            });
            ctx.strokeStyle = "yellow";
            ctx.setLineDash([]);
            ctx.stroke();
        }

        let totalLen = segments.reduce((sum, seg) => sum + Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1), 0);
        let targetLen = totalLen * winProgress;

        ctx.beginPath();
        let currentLen = 0;
        let tipX = x1, tipY = y1;

        for (let i = 0; i < segments.length; i++) {
            let seg = segments[i];
            let segLen = Math.hypot(seg.x2 - seg.x1, seg.y2 - seg.y1);
            if (i === 0) ctx.moveTo(seg.x1 * scaleX, seg.y1 * scaleY);

            if (currentLen + segLen <= targetLen) {
                ctx.lineTo(seg.x2 * scaleX, seg.y2 * scaleY);
                currentLen += segLen;
                tipX = seg.x2; tipY = seg.y2;
            } else {
                let ratio = (targetLen - currentLen) / segLen;
                if (ratio > 0) {
                    tipX = seg.x1 + (seg.x2 - seg.x1) * ratio;
                    tipY = seg.y1 + (seg.y2 - seg.y1) * ratio;
                    ctx.lineTo(tipX * scaleX, tipY * scaleY);
                }
                break;
            }
        }

        ctx.strokeStyle = solved ? "#9ece6a" : curSinked ? "yellow" : "#ff0055";
        ctx.setLineDash([]);
        ctx.stroke();

        if (solved && winProgress < 1) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(tipX * scaleX, tipY * scaleY, 5, 0, Math.PI * 2);
            ctx.fillStyle = "#ffffff";
            ctx.shadowColor = "#9ece6a";
            ctx.shadowBlur = 15;
            ctx.fill();
            ctx.fill();
            ctx.restore();
        }
    });

    laserPathRef.current = currentLaserPath;
};

export const drawObjects = (ctx, scaleX, scaleY, geoObjects, config, drawTrigger) => {
    geoObjects.forEach((obj) => {
        ctx.beginPath();
        obj.points.forEach((p, idx) => {
            if (idx === 0) ctx.moveTo(p.x * scaleX, p.y * scaleY);
            else ctx.lineTo(p.x * scaleX, p.y * scaleY);
        });
        ctx.closePath();

        ctx.setLineDash([]);
        if (obj.type === "triangle" || obj.type === "square") {
            const skinImgSrc = obj.type === "triangle" ? config?.triangleImg : config?.squareImg;
            const skinImg = skinImgSrc ? getCachedImage(skinImgSrc, drawTrigger) : null;
            const activeImg = skinImg && skinImg.complete && skinImg.naturalWidth > 0 ? skinImg : null;

            if (activeImg) {
                ctx.save();
                ctx.translate(obj.x * scaleX, obj.y * scaleY);
                ctx.scale(scaleX, scaleY);

                if (obj.type === "square") {
                    const rotDegree = -obj.a;
                    ctx.rotate(rotDegree * Math.PI / 180);
                    const logicalW = squarediameter * Math.sqrt(2);
                    const logicalH = logicalW;
                    ctx.drawImage(activeImg, -logicalW / 2, -logicalH / 2, logicalW, logicalH);
                } else {
                    const rotDegree = -obj.a;
                    ctx.rotate(rotDegree * Math.PI / 180);
                    const logicalW = trianglediameter * Math.sqrt(3);
                    const logicalH = trianglediameter * 1.5;
                    ctx.drawImage(activeImg, -logicalW / 2, -logicalH * (2 / 3), logicalW, logicalH);
                }
                ctx.restore();
            } else {
                ctx.fillStyle = "#1a1b26";
                ctx.strokeStyle = "#555";
                ctx.lineWidth = 2;
                ctx.fill();
                ctx.stroke();

                // Resaltar la cara que es el Espejo con más grosor y el color asignado
                ctx.beginPath();
                if (obj.lines) {
                    obj.lines.forEach(line => {
                        if (line.behavior === "mirror") {
                            ctx.moveTo(line.x1 * scaleX, line.y1 * scaleY);
                            ctx.lineTo(line.x2 * scaleX, line.y2 * scaleY);
                        }
                    });
                }
                ctx.strokeStyle = obj.color || "#7dcfff";
                ctx.lineWidth = 5;
                ctx.stroke();
            }

        } else if (obj.type === "block") {
            const imgSrc = config?.obstacleImg;
            const img = imgSrc ? getCachedImage(imgSrc, drawTrigger) : null;

            if (img && img.complete && img.naturalWidth > 0) {
                ctx.save();
                ctx.translate(obj.x * scaleX, obj.y * scaleY);
                ctx.scale(scaleX, scaleY);
                ctx.rotate(-obj.a * Math.PI / 180);

                const logicalW = 0.8;
                const logicalH = 0.8;
                ctx.drawImage(img, -logicalW / 2, -logicalH / 2, logicalW, logicalH);
                ctx.restore();
            } else {
                ctx.fillStyle = obj.color || "#333";
                ctx.strokeStyle = "#555";
                ctx.fill();
                ctx.stroke();
            }
        } else if (obj.type === "sink") {
            if (obj.style === "hole") {
                const holeImgSrc = config?.receptorHoleImg || "/images/hole-green.svg";
                const holeImg = getCachedImage(holeImgSrc, drawTrigger);
                if (holeImg && holeImg.complete && holeImg.naturalWidth > 0) {
                    ctx.save();
                    ctx.translate(obj.x * scaleX, obj.y * scaleY);
                    ctx.rotate((-obj.a + 90) * Math.PI / 180);

                    const size = Math.min(scaleX, scaleY) * 1.2;
                    ctx.drawImage(holeImg, 0, -size / 2, size, size);
                    ctx.restore();
                }
            } else {
                ctx.fillStyle = "#24283b";
                ctx.strokeStyle = obj.color || "#9ece6a";
                ctx.lineWidth = 3;
                ctx.fill();
                ctx.stroke();
            }
        } else if (obj.type === "laser") {
            if (obj.style === "hole") {
                const holeImgSrc = config?.holeImg || "/images/hole.svg";
                const holeImg = getCachedImage(holeImgSrc, drawTrigger);
                if (holeImg && holeImg.complete && holeImg.naturalWidth > 0) {
                    ctx.save();
                    ctx.translate(obj.x * scaleX, obj.y * scaleY);
                    ctx.rotate((-obj.a + 90) * Math.PI / 180);

                    const size = Math.min(scaleX, scaleY) * 1.2;
                    ctx.drawImage(holeImg, 0, -size / 2, size, size);
                    ctx.restore();
                }
            } else {
                const laserImgSrc = config?.laserEmitterImg;
                const laserImg = laserImgSrc ? getCachedImage(laserImgSrc, drawTrigger) : null;

                if (laserImg && laserImg.complete && laserImg.naturalWidth > 0) {
                    ctx.save();
                    ctx.translate(obj.x * scaleX, obj.y * scaleY);
                    ctx.rotate((-obj.a + 90) * Math.PI / 180);
                    const drawW = Math.min(scaleX, scaleY) * 0.7;
                    const aspect = laserImg.naturalHeight / laserImg.naturalWidth;
                    const drawH = drawW * aspect;
                    ctx.drawImage(laserImg, -drawW / 1.5, -drawH / 2, drawW, drawH);
                    ctx.restore();
                } else {
                    ctx.fillStyle = "#333";
                    ctx.strokeStyle = obj.color || "#ff0055";
                    ctx.lineWidth = 2;
                    ctx.fill();
                    ctx.stroke();
                }
            }
        }

        drawLabel(ctx, scaleX, scaleY, obj, drawTrigger);
    });
};
