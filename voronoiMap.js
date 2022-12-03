"use strict";

let canvas = document.getElementById("voronoiMap");
canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight;

window.addEventListener("resize", function() {
    canvas.width = document.body.clientWidth;
    canvas.height = document.body.clientHeight;
});

let ctx = canvas.getContext("2d");

import Voronoi from "./rhill-voronoi-core.js";

