"use strict";

import {random, seed} from "./random.js";
import {Delaunay} from "https://cdn.skypack.dev/d3-delaunay@6";

let canvas = document.getElementById("voronoiMap");
canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;

window.addEventListener("resize", function() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
});

let ctx = canvas.getContext("2d");

class StreetLevel {
    constructor(nSites, lineColor="black", lineWidth=1) {
        this.nSites = nSites;
        this.lineColor = lineColor;
        this.lineWidth = lineWidth;
    }
}

function drawFiniteMap(canvas, ctx, seedValue, levels) {
    seed(seedValue);

    let accumulatedCells = [[[0,0], [canvas.width, 0], [canvas.width, canvas.height] , [0, canvas.height]]];

    for (let level of levels) {
        accumulatedCells = drawLevel(canvas, ctx, level, accumulatedCells);
    }
}

function drawLevel(canvas, ctx, level, cells) {
    let newCells = [];

    if (level.lineColor !== "random")
        ctx.strokeStyle = level.lineColor;

    for (let cell of cells) {

        if (level.lineColor === "random")
            ctx.strokeStyle = "#"+Math.floor(random()*16777215).toString(16);
        ctx.lineWidth = 1;

        let sites = generateSites(cell, level.nSites);
        let delaunay = Delaunay.from(sites)
        let voronoi = delaunay.voronoi(getBoundingBox(cell));

        let generatedCells = [...voronoi.cellPolygons()];
        newCells = newCells.concat(generatedCells);

        for (let site of sites) {
            ctx.beginPath();
            ctx.arc(site[0], site[1], 2, 0, 2 * Math.PI);
            ctx.stroke();
        }

        ctx.lineWidth = level.lineWidth;
        for (let cell of generatedCells) {
            ctx.beginPath();
            ctx.moveTo(cell[0][0], cell[0][1]);
            for (let i = 1; i < cell.length; i++) {
                ctx.lineTo(cell[i][0], cell[i][1]);
            }
            ctx.closePath();
            ctx.stroke();
        }
    }

    return newCells;
}

function generateSites(cell, nSites) {
    let sites = [];
    for (let i = 0; i < nSites; i++) {
        let bbox = getBoundingBox(cell);
        let x, y;
        do {
            x = Math.round(random() * (bbox[2] - bbox[0]) + bbox[0]);
            y = Math.round(random() * (bbox[3] - bbox[1]) + bbox[1]);
        } while (!isInsidePolygon([x, y], cell, false) && random() < 0.99);
        sites.push([x, y]);
    }
    return sites;
}

function getBoundingBox(cell) {
    let xs = cell.map(p => p[0]);
    let ys = cell.map(p => p[1]);
    return [Math.min(...xs),
            Math.min(...ys),
            Math.max(...xs),
            Math.max(...ys)]
}

function isInsidePolygon(point, polygon, includeEdges=true) {
    let correctSide = null;
    let nVertices = polygon.length;
    for (let i = 0; i < nVertices - 1; i++) {
        let p1 = polygon[i];
        let p2 = polygon[i + 1];
        if (p1[0] === p2[0] && p1[1] === p2[1])
            continue;
        let edgeVector = [p2[0] - p1[0], p2[1] - p1[1]];
        let pointVector = [point[0] - p1[0], point[1] - p1[1]];
        let side = Math.sign(edgeVector[0] * pointVector[1] - edgeVector[1] * pointVector[0]);
        if (side === 0)
            return includeEdges && isOnEdge(point, p1, p2);
        if (correctSide == null)
            correctSide = side;
        if (side !== correctSide)
            return false;
    }
    return true;
}

function isOnEdge(p, p1, p2) {
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    let d = Math.sqrt(dx * dx + dy * dy);
    let d1 = Math.sqrt((p.x - p1.x) * (p.x - p1.x) + (p.y - p1.y) * (p.y - p1.y));
    let d2 = Math.sqrt((p.x - p2.x) * (p.x - p2.x) + (p.y - p2.y) * (p.y - p2.y));
    return (d1 + d2) === d;
}


let seedValue = Date.now();
let levels = [new StreetLevel(14, "black", 6), new StreetLevel(8, "random", 2)];
drawFiniteMap(canvas, ctx, seedValue, levels);


window.addEventListener("resize", () => drawFiniteMap(canvas, ctx, seedValue, levels));