"use strict";

import {random, seed} from "./random.js";
import {Delaunay} from "https://cdn.skypack.dev/d3-delaunay@6";

let canvas = document.getElementById("voronoiMap");
canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;



let ctx = canvas.getContext("2d");

class StreetLevel {
    constructor(nSites, cellStyle) {
        this.nSites = nSites;
        this.cellStyle = cellStyle;
    }
}

class Cell {
    constructor(site, polygon, cellStyle, parent=null, children=[]) {
        this.site = site;
        this.polygon = polygon;
        this.parent = parent;
        this.children = children;
        this.cellStyle = cellStyle;
    }

    addChildren(children) {
        this.children = this.children.concat(children);
    }

    getBoundingBox() {
        let xs = this.polygon.map(p => p[0]);
        let ys = this.polygon.map(p => p[1]);
        return [
            Math.min(...xs),
            Math.min(...ys),
            Math.max(...xs),
            Math.max(...ys)
        ];
    }

    containsPoint(point, includeEdges=true) {
        let correctSide = null;
        let nVertices = this.polygon.length;
        for (let i = 0; i < nVertices - 1; i++) {
            let p1 = this.polygon[i];
            let p2 = this.polygon[i + 1];
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

    static getEdges(polygon){
        let edges = [];
        for (let i = 0; i < polygon.length - 1; i++) {
            edges.push([polygon[i], polygon[i + 1]]);
        }
        return edges;
    }

    clip (clipCell) {
        let subjectPolygon = this.polygon.slice(0, -1);
        let clipPolygon = clipCell.polygon.slice(0, -1);

        // From https://rosettacode.org/wiki/Sutherland-Hodgman_polygon_clipping#JavaScript
        let cp1, cp2, s, e;
        const inside = function (p) {
            return (cp2[0] - cp1[0]) * (p[1] - cp1[1]) > (cp2[1] - cp1[1]) * (p[0] - cp1[0]);
        };
        const intersection = function () {
            const dc = [cp1[0] - cp2[0], cp1[1] - cp2[1]],
                dp = [s[0] - e[0], s[1] - e[1]],
                n1 = cp1[0] * cp2[1] - cp1[1] * cp2[0],
                n2 = s[0] * e[1] - s[1] * e[0],
                n3 = 1.0 / (dc[0] * dp[1] - dc[1] * dp[0]);
            return [round((n1 * dp[0] - n2 * dc[0]) * n3, 4), round((n1 * dp[1] - n2 * dc[1]) * n3, 4)];
        };
        let outputList = subjectPolygon;
        cp1 = clipPolygon[clipPolygon.length-1];
        for (const j in clipPolygon) {
            cp2 = clipPolygon[j];
            const inputList = outputList;
            outputList = [];
            s = inputList[inputList.length - 1];
            for (const i in inputList) {
                e = inputList[i];
                if (inside(e)) {
                    if (!inside(s)) {
                        outputList.push(intersection());
                    }
                    outputList.push(e);
                }
                else if (inside(s)) {
                    outputList.push(intersection());
                }
                s = e;
            }
            cp1 = cp2;
        }

        if (outputList.length < 3){
            console.warn("outputList.length < 3");
            console.log(outputList);
            console.log("subjectPolygon", subjectPolygon);
            console.log("clipPolygon", clipPolygon);
        }

        let result = [];
        for (let i = 0; i < outputList.length; i++) {
            if (result.length === 0 || result[result.length - 1][0] !== outputList[i][0] || result[result.length - 1][1] !== outputList[i][1])
                result.push(outputList[i]);
        }

        this.polygon = result;
        if (this.polygon[this.polygon.length - 1][0] !== this.polygon[0][0] || this.polygon[this.polygon.length - 1][1] !== this.polygon[0][1])
            this.polygon.push(result[0]);
    }
}

class CellStyle {
    constructor(strokeColor, lineWidth=1) {
        this._strokeColor = strokeColor;
        this.lineWidth = lineWidth;
    }

    withLineWidth(lineWidth) {
        return new CellStyle(this._strokeColor, lineWidth);
    }

    get strokeColor(){
        if (this._strokeColor === "random")
            this._strokeColor = "#"+Math.floor(random()*16777215).toString(16);
        return this._strokeColor;
    }

    static get random() {
        return new CellStyle("random");
    }

    static get black() {
        return new CellStyle("#000000");
    }
}


let canvasCell = new Cell(
    [canvas.width / 2, canvas.height / 2],
    [
        [0, 0],
        [canvas.width, 0],
        [canvas.width, canvas.height] ,
        [0, canvas.height],
        [0, 0]
    ],
    new CellStyle("#FFFF", 0)
)

function generateFiniteMap(seedValue, levels){
    console.log("Generating map with seed", seedValue)
    seed(seedValue);

    let accumulatedCells = [
        canvasCell
    ];

    let generatedLevels = [];

    for (let level of levels) {
        console.log("Generating level", level);
        accumulatedCells = generateLevel(level, accumulatedCells);
        generatedLevels.push(accumulatedCells);
    }

    return generatedLevels;
}

function generateLevel(level, cells){
    let newCells = [];

    for (let cell of cells) {
        let sites = generateSites(cell, level.nSites);
        let delaunay = Delaunay.from(sites)
        let voronoi = delaunay.voronoi(cell.getBoundingBox());

        let generatedPolygons = [...voronoi.cellPolygons()];
        let generatedCells = generatedPolygons.map((polygon, i) => new Cell(sites[i], polygon, level.cellStyle, cell));
        for (let generatedCell of generatedCells) {
            generatedCell.clip(cell);
        }
        newCells = newCells.concat(generatedCells);
        cell.addChildren(generatedCells);
    }

    return newCells;
}

function drawFiniteMap(ctx, map) {
    console.log("Drawing map");
    for (let level of [...map].reverse()) {
        for (let cell of level) {
            drawCell(ctx, cell);
        }
    }
}

function drawCell(ctx, cell) {
    ctx.lineWidth = cell.cellStyle.lineWidth;
    ctx.strokeStyle = cell.cellStyle.strokeColor;

    let polygon = cell.polygon;
    ctx.beginPath();
    ctx.moveTo(polygon[0][0], polygon[0][1]);
    for (let i = 1; i < polygon.length; i++) {
        ctx.lineTo(polygon[i][0], polygon[i][1]);
    }
    ctx.closePath();
    ctx.stroke();
}

function generateSites(cell, nSites) {
    let sites = [];
    for (let i = 0; i < nSites; i++) {
        let bbox = cell.getBoundingBox();
        let x, y;
        let tries = 0;
        do {
            x = random() * (bbox[2] - bbox[0]) + bbox[0];
            y = random() * (bbox[3] - bbox[1]) + bbox[1];
            tries++;
        } while (!cell.containsPoint([x, y], false) && tries < 1000);

        if (tries === 100){
            console.warn("Could not find a site in cell", cell);
        }

        sites.push([x, y]);
    }
    return sites;
}

function isOnEdge(p, p1, p2) {
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    let d = Math.sqrt(dx * dx + dy * dy);
    let d1 = Math.sqrt((p.x - p1.x) * (p.x - p1.x) + (p.y - p1.y) * (p.y - p1.y));
    let d2 = Math.sqrt((p.x - p2.x) * (p.x - p2.x) + (p.y - p2.y) * (p.y - p2.y));
    return (d1 + d2) === d;
}

function round(num, places) {
    return Math.round((num + Number.EPSILON) * Math.pow(10, places)) / Math.pow(10, places);
}


let seedValue = Date.now();

let levels = [
    new StreetLevel(10, CellStyle.black.withLineWidth(8)),
    new StreetLevel(8, CellStyle.random.withLineWidth(4)),
    new StreetLevel(6, CellStyle.random.withLineWidth(2)),
    new StreetLevel(14, CellStyle.random),
    new StreetLevel(2, CellStyle.random)
];

let map = generateFiniteMap(seedValue, levels);
console.log(map);
drawFiniteMap(ctx, map);
window.addEventListener("resize", function() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    drawFiniteMap(ctx, map);
});