import * as util from "./util.js"

export function renderGlobe() {

    Promise.all([
        
        d3.json("./assets/data/land-110m.json"),
        d3.csv("./assets/data/dots.csv"),
        d3.csv("./assets/data/links.csv"),
    
    ]).then(function([mapRaw, dotsRaw, linksRaw]) {
    
        const map = topojson.feature(mapRaw, mapRaw.objects.land).features;
    
        const dots = dotsRaw.map(d => ({ 
            id: d.id,
            coords: [+d.lon, +d.lat] 
        }));
    
        const linksGrouped = d3.group(linksRaw, d => d.link_id);
        const links = {
            type: "FeatureCollection",
            features: Array.from(linksGrouped, ([link_id, segments]) => ({
                type: "Feature",
                geometry: {
                    type: "LineString",
                    coordinates: segments.map(d => [
                        [+d.lon_source, +d.lat_source],
                        [+d.lon_target, +d.lat_target]
                    ]).flat()
                },
                properties: segments.map(d => ({
                    link_id: d.link_id,
                    id_source: d.id_source,
                    id_target: d.id_target
                }))
            }))
        }
    
        drawGlobe(map, dots, links); 
    });
}
    
function drawGlobe(map, dotsData, linksData) {

    // let rotationOn = false;
    let rotationOn = true;

    const container = d3.select(".panel");
    container.selectAll("*").remove();
    container.classed("panel-globe", true);

    d3.selectAll(".description > *").classed("show", false);
    d3.select(".description .panel-globe").classed("show", true);

    const svg = container.append("svg")
        .attr("class", "svg-panel")
        .attr("viewBox", [0, 0, util.dim.width, util.dim.height]);

    // Map

    let projection = d3.geoOrthographic()
        .scale(320)
        .center([0, 0])
        .rotate([0, -10])
        .translate([util.dim.width / 2, util.dim.height / 2]);

    let path = d3.geoPath().projection(projection);

    let rotate = projection.rotate();

    svg.append("circle")
        .attr("class", "globe")
        .attr("cx", util.dim.width / 2)
        .attr("cy", util.dim.height / 2)
        .attr("r", projection.scale());

    svg.append("g")
        .selectAll("country")
        .data(map)
        .enter().append("path")
        .attr("class", "border")
        .attr("d", path);

    svg.append("g")
        .selectAll("circle")
        .data(dotsData)
        .join("circle")
        .attr("class", "dot")
        .attr("id", d => "id-" + d.id)
        .attr("cx", d => projection(d.coords)[0])
        .attr("cy", d => projection(d.coords)[1])
        .attr("r", 2)
        .style("filter", "drop-shadow(0 0 .2em white)")
        .classed("hide", d => !path({ type: "Point", coordinates: d.coords }))

    svg.append("g")
        .selectAll("path")
        .data(linksData.features)
        .join("path")
        .attr("class", "link")
        .attr("id", d => "id-" + d.properties[0].id_source)
        .attr("d", path);

    // Spin
    
    const revolutionDuration = 30000;
    let t1, dt, steps, xPos, yPos, t0, oldPos;
    t0 = 0;
    oldPos = 0;
    
    d3.timer((elapsed) => {
        
        if (rotationOn) {
        
            t1 = elapsed;
            steps = (t0 - elapsed) * 360 / revolutionDuration;
            xPos = rotate[0] - steps
            if (xPos <= -180) {xPos = xPos + 360};

            projection.rotate(rotate);
            
            svg.selectAll("path").attr("d", path);

            svg.selectAll(".dot")
                .attr("cx", d => projection(d.coords)[0])
                .attr("cy", d => projection(d.coords)[1])
                .classed("hide", d => !path({ type: "Point", coordinates: d.coords }));
            
            t0 = t1;
            rotate[0] = xPos;

        } else t0 = elapsed;
    });

    const x = 10; // Final value
    let current = 1; // Start from 1

    const interval = d3.interval(() => {

        d3.selectAll(".dot").classed("flash", false);
        d3.selectAll(".link").classed("flash", false);
        d3.selectAll("#id-" + current).classed("flash", true);
        d3.selectAll("#id-" + current * 2).classed("flash", true);
        d3.selectAll("#id-" + current * 3).classed("flash", true);
        d3.selectAll("#id-" + current * 4).classed("flash", true);
        d3.selectAll("#id-" + current * 5).classed("flash", true);
        d3.selectAll("#id-" + current * 6).classed("flash", true);

        current = (current % x) + 1;
    }, 800);
}
