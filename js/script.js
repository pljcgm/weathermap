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
            d3.csv("./data/avg_temp.csv").then(function(data) {
                self.avgTemp = data;
                let maximumTemp = 0, minimumTemp = 99999999;
                // find maximum/minimum in data
                for (let row in data) {
                    let rowCopy = Object.assign({}, data[row]);
                    delete rowCopy['Jahr'];

                    let maxTemp = d3.max(Object.values(rowCopy), d => +d);
                    let minTemp = d3.min(Object.values(rowCopy), d => +d);
                    if (maxTemp > maximumTemp) {
                        maximumTemp = maxTemp;
                    }
                    if (minTemp < minimumTemp) {
                        minimumTemp = minTemp;
                    }
                }

                self.colorScaleTemp = d3.scaleLinear(
                    [minimumTemp, maximumTemp],
                    [d3.interpolateOranges(0), d3.interpolateOranges(1)]
                );

                // handle double entries !!!
                for (let row in self.avgTemp) {
                    for (let field in self.avgTemp[row]) {
                        if (field.includes("/")) {
                            let tempStates = field.split("/");
                            for (let state in tempStates) {
                                self.avgTemp[row][tempStates[state]] = self.avgTemp[row][field];
                            }
                        }
                    }
                }

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

                let maximumSun = 0, minimumSun = 9999999999;
                // calculate min and max values
                for (let row in self.sunshineDuration){
                    let rowCopy = Object.assign({}, self.sunshineDuration[row]);
                    delete rowCopy['Jahr'];

                    let maxSun = d3.max(Object.values(rowCopy), d => +d);
                    let minSun = d3.min(Object.values(rowCopy), function(d){
                        if (d == ""){
                            return 999999999;
                        } else {
                            return +d;
                        }
                    });

                    if (maxSun > maximumSun){
                        maximumSun = maxSun;
                    }
                    if (minSun < minimumSun){
                        minimumSun = minSun;
                    }
                }

                self.colorScaleSunshine = d3.scaleLinear(
                    [minimumSun, maximumSun],
                    ["white", "red"]
                );

                // handle duplicate entries !!!
                for (let row in self.sunshineDuration){
                    for (let field in self.sunshineDuration[row]){
                        if (field.includes("/")){
                            let tempStates = field.split("/");
                            for (let state in tempStates){
                                self.sunshineDuration[row][tempStates[state]] = self.sunshineDuration[row][field];
                            }
                        }
                    }
                }
            });

            // load precipitation data
            d3.csv("./data/precipitation.csv").then(function(data){
                self.precipitation = data;
                let maximumPrec = 0, minimumPrec = 9999999999;
                for (let row in self.precipitation){
                    let rowCopy = Object.assign({}, self.precipitation[row]);
                    delete rowCopy['Jahr'];

                    let maxPrecipitation = d3.max(Object.values(rowCopy), d => +d);
                    let minPrecipitation = d3.min(Object.values(rowCopy), function(d){
                        if (d == ""){
                            return 999999999;
                        } else {
                            return +d;
                        }
                    });

                    if (maxPrecipitation > maximumPrec){
                        maximumPrec = maxPrecipitation;
                    }
                    if (minPrecipitation < minimumPrec){
                        minimumPrec = minPrecipitation;
                    }
                }

                self.colorScalePrecipitation = d3.scaleLinear(
                    [minimumPrec, maximumPrec],
                    ["white", "blue"]
                );
            })
        });
    }
}

var mapLeft, mapRight;

$(document).ready(function(){
    mapLeft = new Map("#mapLeft", "#selectYearLeft", "#selectTypeLeft");
    mapRight = new Map("#mapRight", "#selectYearRight", "#selectTypeRight");
});