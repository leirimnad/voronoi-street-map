"use strict";

import {randomWord, seededRand, uuid} from "./random.js";
import {Delaunay} from "https://cdn.skypack.dev/d3-delaunay@6";

let canvas = document.getElementById("voronoiMap");
canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;



let ctx = canvas.getContext("2d");

class StreetLevel {
    static instances = [];

    constructor(nSites, cellStyle) {
        this.nSites = nSites;
        this.cellStyle = cellStyle;
        this.id = uuid();
        StreetLevel.instances.push(this);
    }

    static byId(id) {
        return StreetLevel.instances.find(level => level.id === id);
    }

    asHTML() {

        let sliderMin = 0;
        let sliderMax = 10;
        let sliderValue = this.cellStyle.lineWidth;
        let sliderPercent = (sliderValue-sliderMin)/(sliderMax-sliderMin)*100;
        let html = `
                <div style="width: 4rem; display: inline-block">
                    <input type="number" min="1" max="10" id="level-sites-${this.id}" class="form-control" value="${this.nSites}"/>
                </div>
                site${(this.nSites > 1 ? "s" : "")}, 
                <input class="line-width-slider" id="line-width-${this.id}"
                style="
                    --color: ${this.cellStyle.strokeColor}; 
                    --color-tr: ${this.cellStyle.strokeColor}BB;
                    background: linear-gradient(to right, var(--color-tr) 0%, var(--color-tr) ${sliderPercent}%, #fff ${sliderPercent}%, white 100%)
                    "
                min="${sliderMin}" max="${sliderMax}" type="range" value="${sliderValue}"/>
            `;

        return {
            html: html,
            events: [
                {
                    selector: `#level-sites-${this.id}`,
                    event: "change",
                    handler: () => {

                    }
                },
                {
                    selector: `#line-width-${this.id}`,
                    event: "input",
                    handler: (e) => {
                        let value = (e.target.value-e.target.min)/(e.target.max-e.target.min)*100;
                        e.target.style.background = 'linear-gradient(to right, var(--color-tr) 0%, var(--color-tr) ' + value + '%, #fff ' + value + '%, white 100%)'
                        this.cellStyle.lineWidth = parseInt(e.target.value);
                        drawCurrentMap();
                    }
                }
            ],
            id: this.id
        };
    }
}

class Cell {
    constructor(site, polygon, cellStyle, parent=null, children=[]) {
        this.site = site;
        this.polygon = polygon;
        this.parent = parent;
        this.children = children;
        this.cellStyle = cellStyle;
        this.borderingSides = [];
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
            return [round((n1 * dp[0] - n2 * dc[0]) * n3, 8), round((n1 * dp[1] - n2 * dc[1]) * n3, 8)];
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
            console.log("subjectPolygon", subjectPolygon, this);
            console.log("clipPolygon", clipPolygon, clipCell);
        }

        let result = [];
        for (let i = 0; i < outputList.length; i++) {
            if (result.length === 0 || result[result.length - 1][0] !== outputList[i][0] || result[result.length - 1][1] !== outputList[i][1])
                result.push(outputList[i]);
        }

        this.polygon = result;
        try {
            if (this.polygon[this.polygon.length - 1][0] !== this.polygon[0][0] || this.polygon[this.polygon.length - 1][1] !== this.polygon[0][1])
                this.polygon.push(result[0]);
        } catch (e) {
            console.log(e);
            console.log(this.polygon);
        }


        this.borderingSides = this.calculateBorderingSides(this.parent);
    }

    calculateBorderingSides(cell, tolerance=0.0001) {
        let result = [];
        let subjectAngles = [];
        for (let i = 0; i < this.polygon.length - 1; i++) {
            subjectAngles.push(Math.atan((this.polygon[i][1] - this.polygon[i+1][1]) / (this.polygon[i][0] - this.polygon[i+1][0])));
        }
        let clipAngles = [];
        for (let i = 0; i < cell.polygon.length - 1; i++) {
            clipAngles.push(Math.atan((cell.polygon[i][1] - cell.polygon[i+1][1]) / (cell.polygon[i][0] - cell.polygon[i+1][0])));
        }

        for (let i = 0; i < this.polygon.length - 1; i++) {
            for (let j = 0; j < cell.polygon.length - 1; j++) {
                if (Math.abs(subjectAngles[i] - clipAngles[j]) < tolerance
                    && isOnEdge(this.polygon[i], cell.polygon[j], cell.polygon[j+1])) {
                    result.push(i);
                }
            }
        }
        return result;
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
        return this._strokeColor;
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

function generateFiniteMap(seedValue, levels) {
    console.log("Generating map with seed", seedValue.toString())

    let seededRandom = seededRand(seedValue);

    if (levels === undefined){
        levels = generateLevels(seededRand(seededRandom()), 3, 4, 4, 6)
    }

    let accumulatedCells = [
        canvasCell
    ];

    let generatedLevels = [];

    for (let level of levels) {
        console.log("Generating level", level);
        accumulatedCells = generateLevel(level, accumulatedCells, seededRand(seededRandom()));
        generatedLevels.push(accumulatedCells);
    }

    updateLevelList(levels);

    return generatedLevels;
}

function generateLevels(randomFunction, minN, maxN, minSites, maxSites) {
    let levelsN = minN + Math.floor(randomFunction() * (maxN - minN + 1));
    let levels = [];
    for (let i = 0; i < levelsN; i++) {
        levels.push(
            new StreetLevel(
                minSites + Math.floor(randomFunction() * (maxSites - minSites + 1)),
                new CellStyle("#000000", (levelsN-i)*2-1)
            )
        );
    }

    return levels;
}

function generateLevel(level, cells, randomFunction){
    let newCells = [];

    for (let cell of cells) {
        let sites = generateSites(cell, level.nSites, randomFunction);
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

function generateSites(cell, nSites, randomFunction) {
    let sites = [];
    for (let i = 0; i < nSites; i++) {
        let bbox = cell.getBoundingBox();
        let x, y;
        let tries = 0;
        do {
            x = randomFunction() * (bbox[2] - bbox[0]) + bbox[0];
            y = randomFunction() * (bbox[3] - bbox[1]) + bbox[1];
            tries++;
        } while (!cell.containsPoint([x, y], false) && tries < 1000);

        if (tries === 100){
            console.warn("Could not find a site in cell", cell);
        }

        sites.push([x, y]);
    }
    return sites;
}

function drawFiniteMap(ctx, map) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let level of [...map].reverse()) {
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

function isOnEdge(p, p1, p2, tolerance=0.0001) {
    let px, py, p1x, p1y, p2x, p2y;
    if (p instanceof Array) {
        px = p[0]; py = p[1];
        p1x = p1[0]; p1y = p1[1];
        p2x = p2[0]; p2y = p2[1];
    } else {
        px = p.x; py = p.y;
        p1x = p1.x; p1y = p1.y;
        p2x = p2.x; p2y = p2.y;
    }
    let dx = p2x - p1x;
    let dy = p2y - p1y;
    let d = Math.sqrt(dx * dx + dy * dy);
    let d1 = Math.sqrt((px - p1x) * (px - p1x) + (py - p1y) * (py - p1y));
    let d2 = Math.sqrt((px - p2x) * (px - p2x) + (py - p2y) * (py - p2y));
    return Math.abs(d - d1 - d2) < tolerance;
}

function round(num, places) {
    return Math.round((num + Number.EPSILON) * Math.pow(10, places)) / Math.pow(10, places);
}


let seedValue = Date.now();

let map = generateFiniteMap(seedValue);
console.log(map);
drawFiniteMap(ctx, map);

function drawCurrentMap(){
    drawFiniteMap(ctx, map);
}

window.addEventListener("resize", function() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    drawFiniteMap(ctx, map);
});

const seedInput = document.querySelector('#seed-input');
const randomSeedButton = document.querySelector('#random-seed-button');
const setSeedButton = document.querySelector('#set-seed-button');

setSeedButton.addEventListener("click", function() {
    seedValue = seedInput.value;
    map = generateFiniteMap(seedValue);
    console.log(map);
    drawFiniteMap(ctx, map);
});

randomSeedButton.addEventListener("click", function() {
    seedValue = randomWord() + Math.floor(Math.random() * 1000).toString();
    seedInput.value = seedValue;
    map = generateFiniteMap(seedValue);
    console.log(map);
    drawFiniteMap(ctx, map);
});

function updateLevelList(levels) {
    let levelsDiv = document.getElementById("levels-list");
    levelsDiv.innerHTML = "";
    for (let level of levels) {
        let levelElem = document.createElement("li");
        levelElem.classList.add("list-group-item");
        let html = level.asHTML();
        levelElem.innerHTML = html.html;
        for (let event of html.events) {
            levelElem.querySelector(event.selector).addEventListener(event.event, event.handler);
        }
        levelsDiv.appendChild(levelElem);
    }
}