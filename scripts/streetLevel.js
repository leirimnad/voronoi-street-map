import {uuid} from "./random.js";
import {onSitesChange, onLineWidthChange, onLevelDelete} from "./voronoiMap.js";

export class StreetLevel {
    static instances = [];

    constructor(appSettings, nSites, cellStyle) {
        this.appSettings = appSettings;
        this.nSites = nSites;
        this.cellStyle = cellStyle;
        this.id = uuid();
        StreetLevel.instances.push(this);
    }

    static byId(id) {
        return StreetLevel.instances.find(level => level.id === id);
    }

    asHTML() {
        let sliderValue = this.cellStyle.lineWidth;
        let sliderPercent =
            (sliderValue-this.appSettings.cellStyle.minLineWidth)
            /(this.appSettings.cellStyle.maxLineWidth-this.appSettings.cellStyle.minLineWidth)
            *100;
        let html = `
                <div style="width: 4rem; display: inline-block">
                    <input 
                        type="number" 
                        min="${this.appSettings.levelsLimitations.minSites}" 
                        max="${this.appSettings.levelsLimitations.maxSites}" 
                        id="level-sites-${this.id}" 
                        class="form-control" 
                        value="${this.nSites}"
                    />
                </div>
                site${(this.nSites > 1 ? "s" : "")}, line:
                <input class="line-width-slider" id="level-line-width-${this.id}"
                style="
                    --color: ${this.cellStyle.strokeColor}; 
                    --color-tr: ${this.cellStyle.strokeColor}BB;
                    background: linear-gradient(to right, var(--color-tr) 0%, var(--color-tr) ${sliderPercent}%, #fff ${sliderPercent}%, white 100%)
                    "
                min="${this.appSettings.cellStyle.minLineWidth}" 
                max="${this.appSettings.cellStyle.maxLineWidth}" 
                type="range" 
                value="${sliderValue}"/>
                <button class="btn btn-sm btn-danger ms-2 button-delete" id="level-delete-${this.id}">✕</button>
            `;

        return {
            html: html,
            events: [
                {
                    selector: `#level-sites-${this.id}`,
                    event: "change",
                    handler: (e) => onSitesChange(this, e.target)
                },
                {
                    selector: `#level-line-width-${this.id}`,
                    event: "input",
                    handler: (e) => onLineWidthChange(this, e.target)
                },
                {
                    selector: `#level-line-width-${this.id}`,
                    event: "mousedown",
                    handler: (e) => {
                        e.target.parentNode.draggable = false;
                        document.addEventListener("mouseup", () => {
                            e.target.parentNode.draggable = true;
                        }, {once: true});
                    }
                },
                {
                    selector: `#level-delete-${this.id}`,
                    event: "click",
                    handler: () => onLevelDelete(this)
                }
            ],
            id: this.id
        };
    }
}