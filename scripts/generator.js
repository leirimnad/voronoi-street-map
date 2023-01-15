import {seededRand} from "./random.js";
import {Cell, CellStyle} from "./cell.js";
import {StreetLevel} from "./streetLevel.js";
import {Delaunay} from "https://cdn.skypack.dev/d3-delaunay@6";

function generateMap(mapSettings, appSettings) {
    console.log("Generating map with settings", mapSettings)

    let seededRandom = seededRand(mapSettings.seed);

    let randomFunctionSeeds = {
        levelListGeneration: seededRandom(),
        levelCellGeneration: seededRandom(),
    };
    if (!mapSettings.levelList){
        let seededRandomForLevelList = seededRand(randomFunctionSeeds.levelListGeneration);
        mapSettings.levelList = generateLevelList(seededRandomForLevelList, appSettings)
    }
    let canvasCell = getCanvasCell(mapSettings.canvas);
    let seededRandomForLevels = seededRand(randomFunctionSeeds.levelCellGeneration);
    let generatedLevels = generateLevels(mapSettings.levelList, canvasCell, seededRandomForLevels, (mapSettings.mapType === "finiteEven" ? 1 : 0));

    const result = {
        generatedLevels: generatedLevels,
        levels: mapSettings.levelList,
        width:
            canvasCell.polygon.map((point) => point[0]).reduce((a, b) => Math.max(a, b))
            - canvasCell.polygon.map((point) => point[0]).reduce((a, b) => Math.min(a, b)),
        height: canvasCell.polygon.map((point) => point[1]).reduce((a, b) => Math.max(a, b))
            - canvasCell.polygon.map((point) => point[1]).reduce((a, b) => Math.min(a, b)),
    }
    console.log("Map generation complete:", result);
    return result;
}

function generateLevelList(randomFunction, appSettings) {
    let limitations = appSettings.randomLevelsLimitations;
    let levelsN = limitations.minN + Math.floor(randomFunction() * (limitations.maxN - limitations.minN + 1));
    let levels = [];
    for (let i = 0; i < levelsN; i++) {
        levels.push(
            new StreetLevel(
                appSettings,
                limitations.minSites + Math.floor(randomFunction() * (limitations.maxSites - limitations.minSites + 1)),
                new CellStyle("#000000", (levelsN-i)*2-1)
            )
        );
    }

    return levels;
}

function generateLevels(levelsList, rootCell, random, even){
    let accumulatedCells = [
        rootCell
    ];

    let generatedLevels = [];

    if (even) {
        let maxCellN = 1;
        for (let level of levelsList) {
            maxCellN *= level.nSites;
            console.log("Generating even level", level, " with ", maxCellN, " distributed cells");
            accumulatedCells = generateEvenLevel(level, accumulatedCells, random, maxCellN, rootCell.area);
            generatedLevels.push(accumulatedCells);
        }
    } else {
        for (let level of levelsList) {
            console.log("Generating uneven level", level);
            accumulatedCells = generateUnevenLevel(level, accumulatedCells, random);
            generatedLevels.push(accumulatedCells);
        }
    }


    return generatedLevels;
}

function generateEvenLevel(level, cells, randomFunction, sitesN, rootArea) {
    let newCells = [];

    for (let cell of cells) {
        let n;
        n = Math.floor(sitesN * cell.area / rootArea);
        if (n < 1) n = 1;

        let generatedCells = generateCells(cell, n, randomFunction, level);
        newCells = newCells.concat(generatedCells);
        cell.addChildren(generatedCells);
    }
    return newCells;
}

function generateUnevenLevel(level, cells, randomFunction) {
    let newCells = [];

    for (let cell of cells) {
        let generatedCells = generateCells(cell, level.nSites, randomFunction, level);
        newCells = newCells.concat(generatedCells);
        cell.addChildren(generatedCells);
    }

    return newCells;
}

function generateCells(cell, n, randomFunction, level) {
    let sites = generateSites(cell, n, randomFunction);
    let delaunay = Delaunay.from(sites)
    let voronoi = delaunay.voronoi(cell.getBoundingBox());

    let generatedPolygons = [...voronoi.cellPolygons()];

    let generatedCells = generatedPolygons.map((polygon, i) => new Cell(sites[i], polygon, level.cellStyle, cell));

    if (n === 2 ) {
        for (let generatedCell of generatedCells) {
            generatedCell.joinParallelSides();
        }
    }

    for (let generatedCell of generatedCells) {
        generatedCell.clip(cell);
    }

    return generatedCells;
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

function getCanvasCell(canvas){
    return new Cell(
        null,
        [
            [0, 0],
            [canvas.width, 0],
            [canvas.width, canvas.height] ,
            [0, canvas.height],
            [0, 0]
        ],
        new CellStyle("#FFFF", 0)
    )
}

export {generateMap}