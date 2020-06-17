const YEARS = [...Array(29).keys()].map(i => i + 1991);
const DATATYPES = ["Temperatur", "Sonnenscheindauer", "Niederschlag"];
const BUNDESLAENDER_JSON = "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/master/2_bundeslaender/1_sehr_hoch.geo.json";

const MAP_SIZE = {
    "height": 600,
    "width": 400
}

// TODO: better structure for data / functions (json function calls?)
// TODO: only update legend when dataType has changed

const tooltip = d3.select("#tooltip")
    .style("background-color", "steelblue")
    .style("position", "absolute")
    .style("visibility", "hidden")
    .style("font-family", "Arial, Helvetica, sans-serif")
    .style("padding", "5px")
    .style("border-radius", "25px")
    .style("opacity", 0.9)



class Map {
    constructor(mapSelector, yearSelector, typeSelector, legendSelector) {
        this.map = d3.select(mapSelector);
        this.typeField = d3.select(typeSelector);
        this.yearField = d3.select(yearSelector);
        this.legend = d3.select(legendSelector);
        this.minMax = {}

        this.tooltip = d3.select("#tooltip")
            .style("background-color", "steelblue")
            .style("position", "absolute")
            .style("visibility", "hidden")
            .style("font-family", "Arial, Helvetica, sans-serif")
            .style("padding", "5px")
            .style("border-radius", "15px")
            .style("opacity", 0.2)

        this.initSelectors();
        this.initMap();
        this.initListeners();
    }

    changeHandler(){
        var self = this;
        let dataType = this.typeField.property("value");
        let data, colorScale;

        if (dataType === "Temperatur"){
            data = this.avgTemp;
            colorScale = this.colorScaleTemp;
        } else if (dataType === "Sonnenscheindauer"){
            data = this.sunshineDuration;
            colorScale = this.colorScaleSunshine;
        } else {
            data = this.precipitation;
            colorScale = this.colorScalePrecipitation;
        }

        let year = this.yearField.property("value");

        let currentData = data.filter(d => d['Jahr'] == year)[0];

        this.map.selectAll("path")
            .data(this.bundeslaender)
            .on("mouseover", (d, i) => self.showTooltip(d,i,currentData))
            .on("mouseout", (d, i) => self.tooltip.style("visibility", "hidden"))
            .transition()
            .duration(1000)
            .style("fill", function(d){
                return colorScale(currentData[d['properties']['name']]);
            });

        self.createLegend(dataType);
    }

    showTooltip(d, i, currentData) {
        // TODO: better location for tooltip/better update of tooltip
        this.tooltip
            .style("visibility", "visible")
            .style("top", (event.pageY-30) + "px")
            .style("left", event.pageX + "px")
            .text(currentData[d['properties']['name']])
            .style("opacity", 0)
        this.tooltip.transition().duration(100)
            .style("opacity", 0.8)
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
        // LEGEND TEST
        let colorScale;
        if (dataType === "Temperatur"){
            colorScale = this.colorScaleTemp;
        } else if (dataType === "Sonnenscheindauer"){
            colorScale = this.colorScaleSunshine;
        } else {
            colorScale = this.colorScalePrecipitation;
        }

        let sc = d3.scaleLinear([0,380], [this.minMax[dataType]['min'], this.minMax[dataType]['max']]);
        let scReverse = d3.scaleLinear([this.minMax[dataType]['min'], this.minMax[dataType]['max']], [0,400]);
        let data2 = [0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300, 320, 340, 360, 380]
        let legendSvg = this.legend.attr("width", MAP_SIZE['width'] + "px").attr("height", "40px")
        legendSvg.selectAll("rect").remove(); // remove legend if there was one before
        legendSvg.selectAll("rect").data(data2).enter().append("rect")
            .attr("height", "20px")
            .attr("width", "40px")
            .attr("x", d => d + "px")
            .attr("fill", d => colorScale(sc(d)))

        legendSvg.select("g").remove(); // remove axis if there was one before
        let axis = d3.axisBottom().scale(scReverse).ticks(10).tickSize(5)

        legendSvg.append("g").attr("transform", "translate(0,20)").call(axis);
        legendSvg.select("g").call(g => g.select(".domain").remove()) // remove axis line
        // LEGEND TEST
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
            self.path = d3.geoPath()
                .projection(self.projection);

            self.bundeslaender = json.features;

            // load temperature data
            d3.csv("./data/regional_averages_tm_year.csv").then(function(data) {
                self.avgTemp = data;
                let minMax = self.getMinMax(data);
                self.minMax['Temperatur'] = minMax;

                self.colorScaleTemp = d3.scaleLinear(
                    [minMax['min'], minMax['max']],
                    ["lightblue", "red"]
                );

                // init map with temperature
                let dataForYear = self.avgTemp.filter(d => d['Jahr'] == 1991)[0];

                self.createLegend("Temperatur");

                self.map.selectAll("path")
                    .data(self.bundeslaender)
                    .enter()
                    .append("path")
                    .on("mouseover", (d, i) => self.showTooltip(d,i,dataForYear))
                    .on("mouseout", (d, i) => self.tooltip.style("visibility", "hidden"))
                    .attr("class", "state")
                    .attr("d", self.path)
                    .style("fill", function(d){
                        return self.colorScaleTemp(dataForYear[d['properties']['name']]);
                    })

            });

            // load sunshine data
            d3.csv("./data/regional_averages_sd_year.csv").then(function(data){
                self.sunshineDuration = data;
                let minMax = self.getMinMax(data);
                self.minMax['Sonnenscheindauer'] = minMax;

                self.colorScaleSunshine = d3.scaleLinear(
                    [minMax['min'], minMax['max']],
                    ["darkblue", "yellow"]
                );
            });

            // load precipitation data
            d3.csv("./data/regional_averages_rr_year.csv").then(function(data){
                self.precipitation = data;
                let minMax = self.getMinMax(data);
                self.minMax['Niederschlag'] = minMax;

                self.colorScalePrecipitation = d3.scaleLinear(
                    [minMax['min'], minMax['max']],
                    ["lightyellow", "green", "blue"]
                );
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
    mapLeft = new Map("#mapLeft", "#selectYearLeft", "#selectTypeLeft", "#legendLeft");
    mapRight = new Map("#mapRight", "#selectYearRight", "#selectTypeRight", "#legendRight");

    // sScale = d3.scaleLinear([0, 10], [0, 10])
    // cScale = d3.scaleLinear([0, 5, 10], ["rgb(255, 0, 0)", "rgb(0, 255, 0)", "rgb(255, 255, 255)"]);
    //
    // var svg = d3.select("#legendLeft").attr("width", "200px").attr("height", "20px")
    //
    // let data = [0,1,2,3,4,5,6,7,8,9,10]
    //
    // svg.selectAll("rect").data(data).enter().append("rect")
    //     .attr("height", "20px")
    //     .attr("width", "20px")
    //     .attr("x", d => d*20)
    //     .attr("fill", d => cScale(d))




});