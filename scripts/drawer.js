function drawFiniteMap(ctx, map) {
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    for (let level of [...map.generatedLevels].reverse()) {
        for (let cell of level) {
            drawCell(ctx, cell);
        }
    }
}

function drawCell(ctx, cell) {
    if (cell.cellStyle.lineWidth === 0) return;
    ctx.lineWidth = cell.cellStyle.lineWidth;
    ctx.strokeStyle = cell.cellStyle.strokeColor;

    let polygon = cell.polygon;
    ctx.beginPath();
    ctx.moveTo(polygon[0][0], polygon[0][1]);
    let borderingSides = [...cell.borderingSides];
    for (let i = 1; i < polygon.length; i++) {
        if (i-1 === borderingSides[0]){
            borderingSides.shift();
            ctx.moveTo(polygon[i][0], polygon[i][1]);
        } else {
            ctx.lineTo(polygon[i][0], polygon[i][1]);
        }
    }
    ctx.stroke();
}

export {drawFiniteMap, drawCell};