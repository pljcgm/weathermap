const YEARS = [...Array(29).keys()].map(i => i + 1991);
const DATATYPES = ["Temperatur", "Sonnenscheindauer", "Niederschlag"];
const BUNDESLAENDER_JSON = "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/master/2_bundeslaender/1_sehr_hoch.geo.json";
// const BUNDESLAENDER_JSON = "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/master/2_bundeslaender/3_mittel.geo.json";
//const BUNDESLAENDER_JSON = "https://raw.githubusercontent.com/isellsoap/deutschlandGeoJSON/master/2_bundeslaender/4_niedrig.geo.json";

const MAP_SIZE = {
    "height": 800,
    "width": 600,
    "legend-width": 350
}

// TODO: better structure for data / functions (json function calls?)
// TODO: only update legend when dataType has changed
// TODO: var/let/const & self/this reference


class Map {
    constructor(mapSelector, yearSelector, typeSelector, legendSelector, tooltipSelector) {
        this.mapId = mapSelector.slice(1);
        this.map = d3.select(mapSelector)
            .attr("viewBox", [0,0,MAP_SIZE.width,MAP_SIZE.height])//.attr("viewBox", "(0, 0," + MAP_SIZE.width + "," + MAP_SIZE.height + ")")
            .classed("svg-content", true)
            .attr("preserveAspectRatio", "xMinYMin meet");

        // if we want background color:
        // this.map.append("rect").attr("width", MAP_SIZE['width'])
        //     .attr("height", MAP_SIZE['height']).style("fill", "black")

        this.typeField = d3.select(typeSelector);
        this.yearField = d3.select(yearSelector);
        this.legend = d3.select(legendSelector)
            .attr("viewBox", [0,0,MAP_SIZE["legend-width"], 60])
            .attr("svg-content", true)
            //.attr("preserverAspectRatio", "xMinYMin meet");

        this.minMax = {}
        this.tooltip = d3.select(tooltipSelector)

        this.dataType = {
            temperature: {},
            precipitation: {},
            sunshine: {},
            minMax: {},
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
        } else if (dataType === "Sonnenscheindauer"){
            dataType = this.dataType.sunshine;
        } else {
            dataType = this.dataType.precipitation;
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
        let widthVB = this.legend.attr('viewBox').split(",")[2];
        let xVB = this.legend.attr('viewBox').split(",")[0];

        let dataToPositionScale = d3.scaleLinear([dataType.minMax.min, dataType.minMax.max], [xVB, widthVB]);
        let currentPosOnLegend = parseInt(dataToPositionScale(currentValue));//dataType.scaleDataToWidth(currentValue) + offset;

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

        console.log(MAP_SIZE)

        let offset = 0;//Math.round((MAP_SIZE['width'] - MAP_SIZE['legend-width']) / 2);

        // steps of legend color change
        let scaleIncrements = [...Array(MAP_SIZE['legend-width']).keys()].map(i => i);
        // let scaleIncrements = [...Array(381).keys()].map(i => i);
        let legendSvg = this.legend; //.attr("width", (MAP_SIZE['legend-width'] + offset ) + "px").attr("height", "60px")
        legendSvg.selectAll("rect").remove(); // remove legend if there was one before
        legendSvg.selectAll("rect").data(scaleIncrements).enter().append("rect")
            .attr("transform", "translate(" + offset + ",0)")
            .attr("height", "20px")
            .attr("width", "2px")
            .attr("x", d => d + "px")
            .attr("y", "20px")
            .attr("fill", d => colorScale(widthToDataScale(d)))

        legendSvg.select("g").remove(); // remove axis if there was one before
        let axis = d3.axisBottom().scale(dataToWidthScale).ticks(10).tickSize(5)

        legendSvg.append("g").attr("transform", "translate( " + offset + ",40)").call(axis);
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

            //self.map.attr("width", self.width);
            //self.map.attr("height", self.height);

            let bounds = d3.geoBounds(json);
            let bottomLeft = bounds[0], topRight = bounds[1];
            let rotLong = -(topRight[0]+bottomLeft[0])/2;
            let center = [(topRight[0]+bottomLeft[0])/2+rotLong, (topRight[1]+bottomLeft[1])/2];

            let projectionScaleFactor = Math.min(
                MAP_SIZE['width']/ (topRight[0] + bottomLeft[0]),
                MAP_SIZE['height'] / (topRight[1] - bottomLeft[1])
            );

            //Define map projection
            self.projection = d3.geoAlbers()
                .center(center)
                .rotate([rotLong, 0, 0])
                .parallels([bottomLeft[1], topRight[1]])
                .translate([MAP_SIZE['width'] / 2, MAP_SIZE['height'] / 2])
                .scale(1); // dummy value used to calculate actuale factor later
            // TODO: find the right projection settings so that size of map can be changed

            //Define path generator
            self.pathGenerator = d3.geoPath()
                .projection(self.projection);

            // Set the actual scale factor
            let scaleCenter = calculateScaleCenter(json, MAP_SIZE['width'], MAP_SIZE['height'], self.pathGenerator);
            //self.projection.center(scaleCenter.center);
            self.projection.scale(scaleCenter.scale);


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
                self.dataType.temperature['scaleWidthToData'] = d3.scaleLinear([0,MAP_SIZE['legend-width']], [minMax['min'], minMax['max']]);
                self.dataType.temperature['scaleDataToWidth'] = d3.scaleLinear([minMax['min'], minMax['max']], [0,MAP_SIZE['legend-width']]);

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
                self.dataType['minMax'] = minMax;

                self.dataType.sunshine['scaleWidthToData'] = d3.scaleLinear([0,MAP_SIZE['legend-width']], [self.dataType.sunshine['minMax']['min'], self.dataType.sunshine['minMax']['max']]);
                self.dataType.sunshine['scaleDataToWidth'] = d3.scaleLinear([self.dataType.sunshine['minMax']['min'], self.dataType.sunshine['minMax']['max']], [0,MAP_SIZE['legend-width']]);
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

                self.dataType.precipitation['scaleWidthToData'] = d3.scaleLinear([0,MAP_SIZE['legend-width']], [self.dataType.precipitation['minMax']['min'], self.dataType.precipitation['minMax']['max']]);
                self.dataType.precipitation['scaleDataToWidth'] = d3.scaleLinear([self.dataType.precipitation['minMax']['min'], self.dataType.precipitation['minMax']['max']], [0,MAP_SIZE['legend-width']]);

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

    // resize map to current screen
    let container = document.getElementById("mapContainerLeft");
    MAP_SIZE.height = container.clientHeight - ((container.offsetHeight/100)*10);//container.offsetHeight;//window.innerHeight - 200;
    MAP_SIZE.width = container.clientWidth;//Math.round(window.innerWidth / 2);

    MAP_SIZE["legend-width"] = Math.round((MAP_SIZE.width / 100) * 80);

    mapLeft = new Map("#mapLeft", "#selectYearLeft", "#selectTypeLeft",
       "#legendLeft", "#tooltip");
    mapRight = new Map("#mapRight", "#selectYearRight", "#selectTypeRight",
       "#legendRight", "#tooltip");

});


/**
 * Calculate the scale factor and the center coordinates of a GeoJSON
 * FeatureCollection. For the calculation, the height and width of the
 * map container is needed.
 *
 * Thanks to: http://stackoverflow.com/a/17067379/841644
 *
 * @param {object} features - A GeoJSON FeatureCollection object
 *   containing a list of features.
 *
 * @param width
 * @param height
 * @param path
 * @return {object} An object containing the following attributes:
 *   - scale: The calculated scale factor.
 *   - center: A list of two coordinates marking the center.
 */
function calculateScaleCenter(features, width, height, path) {
    // Get the bounding box of the paths (in pixels!) and calculate a
    // scale factor based on the size of the bounding box and the map
    // size.
    var bbox_path = path.bounds(features),
        scale = 0.95 / Math.max(
            (bbox_path[1][0] - bbox_path[0][0]) / width,
            (bbox_path[1][1] - bbox_path[0][1]) / height
        );

    // Get the bounding box of the features (in map units!) and use it
    // to calculate the center of the features.
    var bbox_feature = d3.geoBounds(features),
        center = [
            (bbox_feature[1][0] + bbox_feature[0][0]) / 2,
            (bbox_feature[1][1] + bbox_feature[0][1]) / 2];

    return {
        'scale': scale,
        'center': center
    };
}