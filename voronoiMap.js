"use strict";

let canvas = document.getElementById("voronoiMap");
canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;

window.addEventListener("resize", function() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
});

let ctx = canvas.getContext("2d");
let voronoi = new Voronoi();

import Voronoi from "./rhill-voronoi-core.js";

class StreetLevel {
    constructor(nSites, lineColor="black") {
        this.nSites = nSites;
        this.lineColor = lineColor;
    }
}

function drawFiniteMap(canvas, ctx, seed, levels) {
    let accumulatedCells = generateCanvasCell(canvas);

    for (let level of levels) {
        let cells = drawLevel(canvas, ctx, level, accumulatedCells);
        accumulatedCells = cells;
    }
}

function generateCanvasCell(canvas) {
    let cell = new Voronoi.prototype.Cell();

    cell.halfedges = [
        {getStartpoint: function() {return {x: canvas.width, y: 0}}, getEndpoint: function() {return {x: 0, y: 0}}},
        {getStartpoint: function() {return {x: 0, y: 0}}, getEndpoint: function() {return {x: 0, y: canvas.height}}},
        {getStartpoint: function() {return {x: 0, y: canvas.height}}, getEndpoint: function() {return {x: canvas.width, y: canvas.height}}},
        {getStartpoint: function() {return {x: canvas.width, y: canvas.height}}, getEndpoint: function() {return {x: canvas.width, y: 0}}}
    ];

    cell.site = {x: canvas.width / 2, y: canvas.height / 2};

    return [cell];
}

function drawLevel(canvas, ctx, level, cells) {
    let newCells = [];
    ctx.strokeStyle = level.lineColor;
    for (let cell of cells) {
        let sites = generateSites(cell, level.nSites);

        let bbox = getBoundingBox(cell);
        let diagram = voronoi.compute(sites, bbox);
        newCells = newCells.concat(diagram.cells);

        for (let site of sites) {
            ctx.beginPath();
            ctx.arc(site.x, site.y, 2, 0, 2 * Math.PI);
            ctx.stroke();
        }

        for (let edge of diagram.edges) {
            if (edge.rSite == null) continue;
            let p1 = edge.va;
            let p2 = edge.vb;
            if (p1 && p2) {
                ctx.beginPath();
                ctx.moveTo(p1.x, p1.y);
                ctx.lineTo(p2.x, p2.y);
                ctx.stroke();
            }
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
            x = Math.random() * (bbox.xr - bbox.xl) + bbox.xl;
            y = Math.random() * (bbox.yb - bbox.yt) + bbox.yt;
        } while (!isInsideCell({x: x, y: y}, cell));
        let site = {x: x, y: y};
        sites.push(site);
    }
    return sites;
}

function getBoundingBox(cell) {
    let bbox = Voronoi.prototype.Cell.prototype.getBbox.call(cell);

    return {
        xl: bbox.x,
        xr: bbox.x + bbox.width,
        yt: bbox.y,
        yb: bbox.y + bbox.height
    }
}

function isInsideCell(point, cell, includeEdges=true){
    let res = cell.__proto__.pointIntersection.call(cell, point.x, point.y);
    if (res == 1) return true;
    if (res == 0 && includeEdges) return true;
    return false;
}

function isOnEdge(point, p1, p2) {
    let dx = p2.x - p1.x;
    let dy = p2.y - p1.y;
    let d = Math.sqrt(dx * dx + dy * dy);
    let d1 = Math.sqrt((point.x - p1.x) * (point.x - p1.x) + (point.y - p1.y) * (point.y - p1.y));
    let d2 = Math.sqrt((point.x - p2.x) * (point.x - p2.x) + (point.y - p2.y) * (point.y - p2.y));
    return (d1 + d2) == d;
}

function test() {

    let levels = [new StreetLevel(10), new StreetLevel(5, "blue")];
    drawFiniteMap(canvas, ctx, 0, levels);
}

test()