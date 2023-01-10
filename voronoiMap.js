"use strict";

import {random, seed} from "./random.js";
import {Delaunay} from "https://cdn.skypack.dev/d3-delaunay@6";

let canvas = document.getElementById("voronoiMap");
canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;

window.addEventListener("resize", function() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    drawFiniteMap(canvas, ctx, seedValue, levels);
});

let ctx = canvas.getContext("2d");

class StreetLevel {
    constructor(nSites, lineColor="black", lineWidth=1) {
        this.nSites = nSites;
        this.lineColor = lineColor;
        this.lineWidth = lineWidth;
    }
}

class Cell {
    constructor(site, polygon, children=[]) {
        this.site = site;
        this.polygon = polygon;
        this.children = children;
    }

    addChildren(children) {
        this.children.push(children);
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
        this.polygon.push(result[0]);
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
    ]
)

function drawFiniteMap(canvas, ctx, seedValue, levels) {
    seed(seedValue);

    let accumulatedCells = [
        canvasCell
    ];

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
        let voronoi = delaunay.voronoi(cell.getBoundingBox());

        let generatedPolygons = [...voronoi.cellPolygons()];
        let generatedCells = generatedPolygons.map((polygon, i) => new Cell(sites[i], polygon));
        for (let generatedCell of generatedCells) {
            generatedCell.clip(cell);
        }
        newCells = newCells.concat(generatedCells);
        cell.addChildren(generatedCells);

        ctx.lineWidth = level.lineWidth;
        for (let cell of generatedCells) {
            let polygon = cell.polygon;
            // console.log(cell, polygon);
            ctx.beginPath();
            ctx.moveTo(polygon[0][0], polygon[0][1]);
            for (let i = 1; i < polygon.length; i++) {
                ctx.lineTo(polygon[i][0], polygon[i][1]);
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
        let bbox = cell.getBoundingBox();
        let x, y;
        do {
            x = Math.round(random() * (bbox[2] - bbox[0]) + bbox[0]);
            y = Math.round(random() * (bbox[3] - bbox[1]) + bbox[1]);
        } while (!cell.containsPoint([x, y], false));
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
    new StreetLevel(17, "black", 6),
    new StreetLevel(8, "random", 2),
    new StreetLevel(8, "random", 2)
];

drawFiniteMap(canvas, ctx, seedValue, levels);