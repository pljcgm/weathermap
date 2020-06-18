const YEARS = [...Array(29).keys()].map(i => i + 1991);
const DATATYPES = ["Temperatur", "Sonnenscheindauer", "Niederschlag"];
// const BUNDESLAENDER_JSON = "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/master/2_bundeslaender/1_sehr_hoch.geo.json";
// const BUNDESLAENDER_JSON = "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/master/2_bundeslaender/3_mittel.geo.json";
const BUNDESLAENDER_JSON = "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/master/2_bundeslaender/4_niedrig.geo.json";

const MAP_SIZE = {
    "height": 600,
    "width": 400
}

// TODO: better structure for data / functions (json function calls?)
// TODO: only update legend when dataType has changed
// TODO: var/let/const & self/this reference


class Map {
    constructor(mapSelector, yearSelector, typeSelector, legendSelector, tooltipSelector) {
        this.mapId = mapSelector.slice(1);
        this.map = d3.select(mapSelector);
        this.typeField = d3.select(typeSelector);
        this.yearField = d3.select(yearSelector);
        this.legend = d3.select(legendSelector);
        this.minMax = {}
        this.tooltip = d3.select(tooltipSelector)

        this.dataType = {
            temperature: {},
            precipitation: {},
            sunshine: {},
            data: null
        }


        this.initSelectors();
        this.initMap();
        this.initListeners();
    }

    changeHandler(){
        let self = this;
        let dataType = this.typeField.property("value");
        let data, colorScale;

        if (dataType === "Temperatur"){
            dataType = this.dataType.temperature
            // data = this.avgTemp;
            // colorScale = this.dataType.temperature.colorScale;
        } else if (dataType === "Sonnenscheindauer"){
            dataType = this.dataType.sunshine;
            // data = this.sunshineDuration;
            // colorScale = this.dataType.sunshine.colorScale;
        } else {
            dataType = this.dataType.precipitation;
            // data = this.precipitation;
            // colorScale = this.dataType.precipitation.colorScale;
        }

        data = dataType.data;
        colorScale = dataType.colorScale;

        let year = this.yearField.property("value");

        let currentData = data.filter(d => d['Jahr'] == year)[0];

        // TODO: DATEN ÜBERPRÜFEN!!!!!

        self.map.selectAll("path").each(function(state) {
            d3.select(this)
                .on("mouseenter", (d, i) => self.showTooltip(this, d, currentData, dataType))
                .on("mousemove", (d, i) => self.moveTooltip())
                .on("mouseout", (d, i) => self.hideTooltip())
        });

        this.map.selectAll("path")
            //.data(this.bundeslaender)
            .transition()
            .duration(1000)
            .style("fill", d => colorScale(currentData[d['properties']['name']]));

        this.createLegend(dataType);
    }

    showTooltip(element, d, currentData, dataType) {
        // TODO: better location for tooltip/better update of tooltip
        let currentValue = currentData[d['properties']['name']];

        this.map.selectAll("path").attr("opacity", 0.7);
        d3.select(element).attr("opacity", 1);

        this.tooltip
            .style("visibility", "visible")
            .style("top", (event.pageY-30) + "px")
            .style("left", event.pageX + "px")
            .text(d['properties']['name'] + ": " + currentValue)
            .style("background-color", dataType.colorScale(currentValue))
            .style("opacity", 0);
        this.tooltip.transition().duration(100)
            .style("opacity", 0.8);

        // Show value indicator on legend
        let currentPosOnLegend = dataType.scaleDataToWidth(currentValue);

        let tri = {
            a: [currentPosOnLegend, 20],
            b: [currentPosOnLegend + 10, 0],
            c: [currentPosOnLegend - 10, 0]
        }

        this.legend.append("polygon").attr("points", tri.a[0]+","+tri.a[1]+" "+tri.b[0]+","+tri.b[1]+" "+tri.c[0]+","+tri.c[1])
            .style("fill", dataType.colorScale(currentValue))
            .attr("class", "marker");
    }

    moveTooltip(){
        this.tooltip
            .style("top", (event.pageY-30) + "px")
            .style("left", (event.pageX+30) + "px")
    }

    hideTooltip() {
        this.map.selectAll("path").attr("opacity", 1);
        this.tooltip.style("visibility", "hidden");
        this.legend.selectAll('.marker').remove();
    }

    initListeners(){
        let self = this;
        this.typeField.on("change", function(){
            self.changeHandler();
        });
        this.yearField.on("change", function(){
            self.changeHandler();
        });
    }

    initSelectors(){
        this.typeField.selectAll("option")
            .data(DATATYPES)
            .enter()
            .append("option")
            .text(d=>d)
            .attr("value", d=>d)


        this.yearField.selectAll("option")
            .data(YEARS)
            .enter()
            .append("option")
            .text(d => d)
            .attr("value", d => d);
    }

    createLegend(dataType){
        let colorScale = dataType.colorScale;
        let widthToDataScale = dataType.scaleWidthToData;
        let dataToWidthScale = dataType.scaleDataToWidth;

        // steps of legend color change
        let data2 = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380]
        let legendSvg = this.legend.attr("width", MAP_SIZE['width'] + "px").attr("height", "60px")
        legendSvg.selectAll("rect").remove(); // remove legend if there was one before
        legendSvg.selectAll("rect").data(data2).enter().append("rect")
            .attr("height", "20px")
            .attr("width", "40px")
            .attr("x", d => d + "px")
            .attr("y", "20px")
            .attr("fill", d => colorScale(widthToDataScale(d)))

        legendSvg.select("g").remove(); // remove axis if there was one before
        let axis = d3.axisBottom().scale(dataToWidthScale).ticks(10).tickSize(5)

        legendSvg.append("g").attr("transform", "translate(0,40)").call(axis);
        legendSvg.select("g").call(g => g.select(".domain").remove()) // remove axis line
    }

    initMap(){
        let self = this; // keep reference to instance
        d3.json(BUNDESLAENDER_JSON).then(function(json){
            /*
            geoBounds Idee kommt von https://observablehq.com/@sto3psl/map-of-germany-in-d3-js
            */
            self.width = MAP_SIZE['width'];
            self.height = MAP_SIZE['height'];

            let bounds = d3.geoBounds(json);
            let bottomLeft = bounds[0], topRight = bounds[1];
            let rotLong = -(topRight[0]+bottomLeft[0])/2;
            let center = [(topRight[0]+bottomLeft[0])/2+rotLong, (topRight[1]+bottomLeft[1])/2];

            let scale = Math.min(
                self.width / (topRight[0] + bottomLeft[0]),
                self.height / (topRight[1] - bottomLeft[1])
            );

            //Define map projection
            self.projection = d3.geoAlbers()
                .center(center)
                .rotate([rotLong, 0, 0])
                .parallels([bottomLeft[1], topRight[1]])
                .translate([self.width / 2, self.height / 2])
                .scale(scale * 200);

            //Define path generator
            self.pathGenerator = d3.geoPath()
                .projection(self.projection);

            self.bundeslaender = json.features;

            // load temperature data
            d3.csv("./data/regional_averages_tm_year.csv").then(function(data) {
                //self.avgTemp = data;
                self.dataType.temperature['data'] = data;
                let minMax = self.getMinMax(data);
                self.dataType.temperature['minMax'] = minMax;

                self.dataType.temperature['colorScale'] = d3.scaleLinear(
                    [minMax['min'], minMax['max']],
                    ["lightblue", "red"]
                );

                self.colorScaleTemp = d3.scaleLinear(
                    [minMax['min'], minMax['max']],
                    ["lightblue", "red"]
                );

                // initialize map (with temperature data)
                let dataForYear = self.dataType.temperature.data.filter(d => d['Jahr'] == 1991)[0];

                self.map.selectAll("path")
                    .data(self.bundeslaender)
                    .enter()
                    .append("path")
                    .attr("class", "state")
                    .attr("id", d => self.mapId + d['properties']['name'])
                    .attr("d", self.pathGenerator)
                    .style("fill", function(d){
                        return self.dataType.temperature.colorScale(dataForYear[d['properties']['name']]);
                    });

                // prepare legend
                self.dataType.temperature['scaleWidthToData'] = d3.scaleLinear([0,380], [self.dataType.temperature['minMax']['min'], self.dataType.temperature['minMax']['max']]);
                self.dataType.temperature['scaleDataToWidth'] = d3.scaleLinear([self.dataType.temperature['minMax']['min'], self.dataType.temperature['minMax']['max']], [0,400]);

                //console.log(self.dataType.temperature['scaleDataToWidth'](200))

                self.createLegend(self.dataType.temperature);
                // didn't work with the normal d3 function (because of class/this reference?
                self.map.selectAll("path").each(function(state) {
                    d3.select(this)
                        .on("mouseenter", (d, i) => self.showTooltip(this, d,dataForYear, self.dataType.temperature))
                        .on("mouseout", (d, i) => self.hideTooltip(d, i, dataForYear))
                        .on("mousemove", (d, i) => self.moveTooltip())
                });
            });

            // load sunshine data
            d3.csv("./data/regional_averages_sd_year.csv").then(function(data){
                //self.sunshineDuration = data;
                self.dataType.sunshine['data'] = data;
                let minMax = self.getMinMax(data);
                self.dataType.sunshine['minMax'] = minMax;
                self.dataType.sunshine['colorScale'] = d3.scaleLinear(
                    [minMax['min'], minMax['max']],
                    ["darkblue", "yellow"]
                );

                self.dataType.sunshine['scaleWidthToData'] = d3.scaleLinear([0,380], [self.dataType.sunshine['minMax']['min'], self.dataType.sunshine['minMax']['max']]);
                self.dataType.sunshine['scaleDataToWidth'] = d3.scaleLinear([self.dataType.sunshine['minMax']['min'], self.dataType.sunshine['minMax']['max']], [0,400]);
            });

            // load precipitation data
            d3.csv("./data/regional_averages_rr_year.csv").then(function(data){
                //self.precipitation = data;
                self.dataType.precipitation['data'] = data;
                let minMax = self.getMinMax(data);
                self.dataType.precipitation['minMax'] = minMax;

                self.dataType.precipitation['colorScale'] = d3.scaleLinear(
                    [minMax['min'], minMax['max']],
                    ["lightyellow", "green", "blue"]
                );

                self.dataType.precipitation['scaleWidthToData'] = d3.scaleLinear([0,380], [self.dataType.precipitation['minMax']['min'], self.dataType.precipitation['minMax']['max']]);
                self.dataType.precipitation['scaleDataToWidth'] = d3.scaleLinear([self.dataType.precipitation['minMax']['min'], self.dataType.precipitation['minMax']['max']], [0,400]);

            })
        });
    }

    getMinMax(data){
        // gets min/max from all years for comparability
        let max = 0, min = 9999999999;
        for (let row in data){
            let rowCopy = Object.assign({}, data[row]);
            delete rowCopy['Jahr'];

            let tempMax = d3.max(Object.values(rowCopy), d => +d);
            let tempMin = d3.min(Object.values(rowCopy), function(d){
                if (d === ""){
                    return 999999999;
                } else {
                    return +d;
                }
            });

            if (tempMax > max){
                max = tempMax;
            }
            if (tempMin < min){
                min = tempMin;
            }
        }
        return {"min": min, "max": max}
    }
}


var mapLeft, mapRight, legend, scale, cScale;

$(document).ready(function(){
    mapLeft = new Map("#mapLeft", "#selectYearLeft", "#selectTypeLeft",
        "#legendLeft", "#tooltip");
    mapRight = new Map("#mapRight", "#selectYearRight", "#selectTypeRight",
        "#legendRight", "#tooltip");

});