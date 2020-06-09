const YEARS = [...Array(29).keys()].map(i => i + 1991);
const DATATYPES = ["Temperatur", "Sonnenscheindauer", "Niederschlag"];
const BUNDESLAENDER_JSON = "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/master/2_bundeslaender/1_sehr_hoch.geo.json";


class Map {
    constructor(mapSelector, yearSelector, typeSelector) {
        this.map = d3.select(mapSelector);
        this.typeField = d3.select(typeSelector);
        this.yearField = d3.select(yearSelector);

        this.initSelectors();
        this.initMap();
        this.initListeners();
    }

    changeHandler(){
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

        let dataForYear = data.filter(d => d['Jahr'] == year)[0];

        this.map.selectAll("path")
            .data(this.bundeslaender)
            .transition()
            .duration(1000)
            .style("fill", function(d){
                return colorScale(dataForYear[d['properties']['name']]);
            });
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

    initMap(){
        let self = this; // keep reference to instance
        d3.json(BUNDESLAENDER_JSON).then(function(json){
            /*
            geoBounds Idee kommt von https://observablehq.com/@sto3psl/map-of-germany-in-d3-js
            */
            self.width = +self.map.attr("width");
            self.height = +self.map.attr("height");

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
            d3.csv("./data/temperature.csv").then(function(data) {
                self.avgTemp = data;
                let minMax = self.getMinMax(data);

                self.colorScaleTemp = d3.scaleLinear(
                    [minMax['min'], minMax['max']],
                    [d3.interpolateOranges(0), d3.interpolateOranges(1)]
                );

                // init map with temperature
                let dataForYear = self.avgTemp.filter(d => d['Jahr'] == 1991)[0];

                self.map.selectAll("path")
                    .data(self.bundeslaender)
                    .enter()
                    .append("path")
                    .attr("class", "state")
                    .attr("d", self.path)
                    .style("fill", function(d){
                        return self.colorScaleTemp(dataForYear[d['properties']['name']]);
                    });

            });

            // load sunshine data
            d3.csv("./data/sunshine.csv").then(function(data){
                self.sunshineDuration = data;
                let minMax = self.getMinMax(data);

                self.colorScaleSunshine = d3.scaleLinear(
                    [minMax['min'], minMax['max']],
                    ["white", "red"]
                );
            });

            // load precipitation data
            d3.csv("./data/precipitation.csv").then(function(data){
                self.precipitation = data;
                let minMax = self.getMinMax(data);

                self.colorScalePrecipitation = d3.scaleLinear(
                    [minMax['min'], minMax['max']],
                    ["white", "blue"]
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

var mapLeft, mapRight;

$(document).ready(function(){
    mapLeft = new Map("#mapLeft", "#selectYearLeft", "#selectTypeLeft");
    mapRight = new Map("#mapRight", "#selectYearRight", "#selectTypeRight");
});