"use strict";

import {randomWord} from "./random.js";
import {CellStyle} from "./cell.js";
import {drawFiniteMap} from "./drawer.js";
import {generateMap} from "./generator.js";
import {StreetLevel} from "./streetLevel.js";

let canvas = document.getElementById("voronoiMap");
canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;
let ctx = canvas.getContext("2d");

const mapSettings = {
    levelList: null,
    seed: Date.now(),
    mapType: "finiteEven",
    canvas: canvas
}

const appSettings = {
    randomLevelsLimitations: {
        minN: 4,
        maxN: 5,
        minSites: 4,
        maxSites: 9
    },
    levelsLimitations: {
        minLevels: 0,
        maxLevels: 7,
        minSites: 1,
        maxSites: 10,
    },
    cellStyle: {
        minLineWidth: 0,
        maxLineWidth: 10,
    }
}

// First generation

const levelUl = document.querySelector('#levels-list');
connectLevelListToMap(levelUl);
let map = generateMap(mapSettings, appSettings);
updateLevelList(levelUl, mapSettings.levelList);
drawFiniteMap(ctx, map);

// HTML Events

window.addEventListener("resize", function() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
    updateMap();
});

const seedInput = document.querySelector('#seed-input');
const randomSeedButton = document.querySelector('#random-seed-button');
const setSeedButton = document.querySelector('#set-seed-button');
const addLevelButton = document.querySelector('#add-level-button');
const mapTypeRadios = document.querySelectorAll('input[name="mapType"]');

setSeedButton.addEventListener("click", function() {
    mapSettings.seed = seedInput.value;
    mapSettings.levelList = null;
    updateMap();
    seedInput.classList.remove("irrelevant");
});

randomSeedButton.addEventListener("click", function() {
    mapSettings.seed = randomWord() + Math.floor(Math.random() * 1000).toString();
    mapSettings.levelList = null;
    seedInput.value = mapSettings.seed;
    updateMap();
    seedInput.classList.remove("irrelevant");
});

addLevelButton.addEventListener("click", function() {
    let level = new StreetLevel(appSettings, 2, new CellStyle("#000000", 1));
    mapSettings.levelList = [...map.levels, level];
    if (mapSettings.levelList.length >= appSettings.levelsLimitations.maxLevels) {
        addLevelButton.disabled = true;
        addLevelButton.title = `Maximum number of levels (${appSettings.levelsLimitations.maxLevels}) reached`;
    }
    updateMap();
    seedInput.classList.add("irrelevant");
});

mapTypeRadios.forEach(function(radio) {
    radio.addEventListener("change", function() {
        mapSettings.mapType = radio.value;
        updateMap();
    });
});

function updateLevelList(levelsDiv, levels) {
    levelsDiv.innerHTML = "";
    for (let level of levels) {
        let levelElem = document.createElement("li");
        levelElem.classList.add("list-group-item");
        let html = level.asHTML();
        levelElem.innerHTML = html.html;
        levelElem.id = html.id;
        for (let event of html.events) {
            levelElem.querySelector(event.selector).addEventListener(event.event, event.handler);
        }
        levelsDiv.appendChild(levelElem);
    }
    slist(levelsDiv);
}

function connectLevelListToMap(ul) {
    ul.addEventListener("slistChanged", function() {
        mapSettings.seed = seedInput.value;
        mapSettings.levelList = parseLevelList(ul);
        updateMap();
        seedInput.classList.add("irrelevant");
    });
}

function updateMap(){
    map = generateMap(mapSettings, appSettings);
    updateLevelList(levelUl, mapSettings.levelList);
    drawFiniteMap(ctx, map);
}

function parseLevelList(ul) {
    let levels = [];
    for (let li of ul.children) {
        let id = li.id;
        let nSites = parseInt(document.getElementById("level-sites-" + id).value);
        let lineWidth = parseInt(document.getElementById("level-line-width-" + id).value);
        let level = new StreetLevel(appSettings, nSites, new CellStyle("#000000", lineWidth));
        levels.push(level);
    }
    return levels;
}

export function onSitesChange(level, inputChanged) {
    level.nSites = parseInt(inputChanged.value);
    updateMap();
}

export function onLineWidthChange(level, inputChanged) {
    let value = (inputChanged.value-inputChanged.min)/(inputChanged.max-inputChanged.min)*100;
    inputChanged.style.background = 'linear-gradient(to right, var(--color-tr) 0%, var(--color-tr) ' + value + '%, #fff ' + value + '%, white 100%)'
    level.cellStyle.lineWidth = parseInt(inputChanged.value);
    drawFiniteMap(ctx, map);
}

export function onLevelDelete(level) {
    mapSettings.levelList = map.levels.filter(l => l.id !== level.id);
    if (mapSettings.levelList.length < level.appSettings.levelsLimitations.maxLevels) {
        addLevelButton.disabled = false;
        addLevelButton.title = null;
    }
    updateMap();
    seedInput.classList.add("irrelevant");
}