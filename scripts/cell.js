class Cell {
    #area;
    #polygon;

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

    clip (clipCell) {
        let subjectPolygon = this.polygon.slice(0, -1);
        let clipPolygon = clipCell.polygon.slice(0, -1);

        // From https://rosettacode.org/wiki/Sutherland-Hodgman_polygon_clipping#JavaScript
        let cp1, cp2, s, e;
        const inside = function (p) {
            return (cp2[0] - cp1[0]) * (p[1] - cp1[1]) > (cp2[1] - cp1[1]) * (p[0] - cp1[0]);
        };
        const intersection = function () {
            // Line AB represented as a1x + b1y = c1
            const a1 = cp2[1] - cp1[1];
            const b1 = cp1[0] - cp2[0];
            const c1 = a1*(cp1[0]) + b1*(cp1[1]);

            // Line CD represented as a2x + b2y = c2
            const a2 = e[1] - s[1];
            const b2 = s[0] - e[0];
            const c2 = a2*(s[0])+ b2*(s[1]);

            const determinant = a1*b2 - a2*b1;

            if (determinant === 0)
            {
                throw new Error("Lines are parallel");
            } else {
                let x = (b2*c1 - b1*c2)/determinant;
                let y = (a1*c2 - a2*c1)/determinant;
                let tolerance = 0.0001

                if (Math.abs(x - cp1[0]) < tolerance)
                    x = cp1[0];
                else if (Math.abs(x - cp2[0]) < tolerance)
                    x = cp2[0];
                else if (Math.abs(x - s[0]) < tolerance)
                    x = s[0];
                else if (Math.abs(x - e[0]) < tolerance)
                    x = e[0];


                if (Math.abs(y - cp1[1]) < tolerance)
                    y = cp1[1];
                else if (Math.abs(y - cp2[1]) < tolerance)
                    y = cp2[1];
                else if (Math.abs(y - s[1]) < tolerance)
                    y = s[1];
                else if (Math.abs(y - e[1]) < tolerance)
                    y = e[1];

                return [x, y];
            }
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

        if (!this.isConvex()) {
            console.warn("Not convex");
            console.log(subjectPolygon);
            console.log(clipPolygon);
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

    isConvex () {
        let arr = this.polygon.slice(0, -1);
        const { length } = arr;
        let pre = 0, curr = 0;
        for (let i = 0; i < length; ++i) {
            let dx1 = arr[(i + 1) % length][0] - arr[i][0];
            let dx2 = arr[(i + 2) % length][0] - arr[(i + 1) % length][0];
            let dy1 = arr[(i + 1) % length][1] - arr[i][1];
            let dy2 = arr[(i + 2) % length][1] - arr[(i + 1) % length][1];
            curr = dx1 * dy2 - dx2 * dy1;
            if (curr !== 0) {
                if ((curr > 0 && pre < 0) || (curr < 0 && pre > 0)) {
                    return false;
                }
                else
                    pre = curr;
            }
        }
        return true;
    };

    joinParallelSides(tolerance=1e-10) {
        let result = [];
        let arr = this.polygon.slice(0, -1);
        const { length } = arr;
        for (let i = 0; i < length; ++i) {
            let dx1 = arr[(i + 1) % length][0] - arr[i][0];
            let dx2 = arr[(i + 2) % length][0] - arr[(i + 1) % length][0];
            let dy1 = arr[(i + 1) % length][1] - arr[i][1];
            let dy2 = arr[(i + 2) % length][1] - arr[(i + 1) % length][1];
            let d = dx1 * dy2 - dx2 * dy1;
            if (Math.abs(d) > tolerance) {
                result.push(arr[(i+1)%length]);
            }
        }
        result.push(result[0]);
        this.polygon = result;
        this.borderingSides = this.calculateBorderingSides(this.parent);
    }

    #updateArea() {
        let total = 0;

        for (let i = 0; i < this.polygon.length - 1; i++) {
            let addX = this.polygon[i][0];
            let addY = this.polygon[i === this.polygon.length - 1 ? 0 : i + 1][1];
            let subX = this.polygon[i === this.polygon.length - 1 ? 0 : i + 1][0];
            let subY = this.polygon[i][1];

            total += (addX * addY * 0.5);
            total -= (subX * subY * 0.5);
        }

        this.#area = Math.abs(total);
    }

    get area() {
        if (this.#area === null) {
            this.#updateArea();
        }
        return this.#area;
    }

    set polygon(polygon) {
        this.#polygon = polygon;
        this.#area = null;
    }

    get polygon() {
        return this.#polygon;
    }
}

class CellStyle {
    #strokeColor;

    constructor(strokeColor, lineWidth=1) {
        this.#strokeColor = strokeColor;
        this.lineWidth = lineWidth;
    }

    withLineWidth(lineWidth) {
        return new CellStyle(this.#strokeColor, lineWidth);
    }

    get strokeColor(){
        return this.#strokeColor;
    }

    static get black() {
        return new CellStyle("#000000");
    }
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

export {Cell, CellStyle};