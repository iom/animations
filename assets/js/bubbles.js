import * as util from "./util.js"

export function renderBubbles () {

    Promise.all([
    
        d3.json("./assets/data/land-110m.json"),
        d3.csv("./assets/data/nodes.csv"),
    
    ]).then(function([mapRaw, nodesRaw]) {
    
        const map = topojson.feature(mapRaw, mapRaw.objects.land).features;
    
        const nodes = nodesRaw.map(d => ({
            t: +d.t,
            type: +d.type,
            coords: [+d.lon, +d.lat],
            var: d.var,
            v: +d.v,
            v_fill: +d.v_fill,
            n: +d.n
        }))
    
        drawMap(map, nodes);  
    })
};

function drawMap(map, nodes) {

    const container = d3.select(".panel");
    container.selectAll("*").remove();
    container.attr("class", "panel panel-bubbles");

    d3.selectAll(".description > *").classed("show", false);
    d3.select(".description .panel-bubbles").classed("show", true);

    // Chart ////////////////////////////////////

    const panelSVG = container.append("svg")
        .attr("class", "svg-panel")
        .attr("width", "100%")
        .attr("viewBox", [0, 0, util.dim.width, util.dim.height]);

    // Map

    const projection = d3.geoEquirectangular()
        .scale(300)
        .center([0, 10])
        .translate([util.dim.width / 2, util.dim.height / 2]);

    const path = d3.geoPath().projection(projection);

    const mapSVG = panelSVG.append("g");

    mapSVG.append("g")
        .attr("class", "borders")
        .selectAll("land")
        .data(map)
        .join("path")
        .attr("class", "border")
        .attr("d", path);

    // Nodes

    const group = mapSVG.append("g").attr("class", "nodes-container");
    const radius = { min: .1, max: 12 };
    const nRange = { min: 500, max: d3.max(nodes, d => d.n) };
    const rScaler = d3.scaleLog()
        .base(2)
        .domain([nRange.min, nRange.max])
        .range([radius.min, radius.max]);

    let currentTransform = d3.zoomIdentity;
    
    const zoom = d3.zoom()
        .scaleExtent([1, 16])
        .on("zoom", (event) => {
            mapSVG.selectAll("path").attr("transform", event.transform);
            mapSVG.selectAll(".nodes-container").attr("transform", event.transform);
        });

    mapSVG.call(zoom);

    // Data

    let yearMin = 2023
    let yearMax = 2024

    let dataIndicator = nodes.filter(d => 
        d.t >= yearMin && 
        d.t <= yearMax && 
        d.n >= nRange.min && 
        d.var == 1
    );

    let data = nodes.filter(d => 
        d.t >= yearMin && 
        d.t <= yearMax && 
        d.n >= nRange.min && 
        d.var == 1
    );

    let colorScaler = d3.scaleLinear()
        .domain([
            d3.min(dataIndicator, d => d.v_fill), 
            d3.mean(dataIndicator, d => d.v_fill), 
            d3.max(dataIndicator, d => d.v_fill)
        ])
        .range([util.colors.yellow, util.colors.green1, util.colors.blue1]);

    const groupData = group.selectAll("g")
        .attr("class", "node-container")
        .data(data, d => d.t + "-" + d.type + "-" + d.coords[0] + "-" + d.coords[1])
        .order()
        .join("g")
        .attr("transform", d => `translate(${ projection(d.coords)[0] }, ${ projection(d.coords)[1] })`);
    
    groupData.append("circle")
        .attr("id", d => d.geo + "-" + d.t + "-" + d.type + "-" + d.coords[0] + "-" + d.coords[1])
        .attr("class", "node")
        .attr("r", d => rScaler(d.n) / Math.sqrt(currentTransform.k))
        .attr("fill-opacity", .3)
        .attr("stroke-opacity", .3)
        .style("fill", d => colorScaler(d.v))
        .style("stroke-width", .75 / currentTransform.k);
    
    // Animation ////////////////////////////////

    const time = { in: 8000, pause: 2000, trans: 1000 };

    const zoomPoints = [
        [29.14, -4.32, 3],
        [-77.9, -7.7, 3],
        [114.6, 27.5, 3],
        [0, 0, 1]
    ];

    const pieCharts = [
        [ [10, 20, 30, 20, 5], [ util.dim.width - 200, util.dim.height / 2 ] ],
        [ [10, 2, 30, 9, 10], [ 400, util.dim.height / 2 ] ],
        [ [20, 20, 20, 20, 20], [ util.dim.width - 200, util.dim.height / 2 + 50 ] ]
    ]
    
    animateSequence();

    // Functions ////////////////////////////////

    function animateSequence(index = 0) {

        if (index >= zoomPoints.length) return;

        console.log("Dog")
    
        const [x, y, z] = zoomPoints[index];
        zoomToPoint(x, y, z);

        if (index !== zoomPoints.length - 1) {
            const [data, position] = pieCharts[index];
            renderPie(data, position);
        }
    
        setTimeout(() => {
            animateSequence((index + 1) % zoomPoints.length); 
        }, time.in + time.pause);
    }

    function zoomToPoint(x, y, scale) {

        const [xProj, yProj] = projection([x, y]);

        mapSVG.transition()
            .duration(time.in)
            .call(zoom.transform, d3.zoomIdentity
                .translate(util.dim.width / 2, util.dim.height / 2)
                .scale(scale)
                .translate(-xProj, -yProj)
            );
    }

    function renderPie(data, position) {

        const width = 200, height = 200, radius = Math.min(width, height) / 2;
    
        const id = Math.floor(d3.randomUniform(1, 99)()); 

        const pieContainer = panelSVG.append("g")
            .attr("id", "pie-" + id)
            .attr("transform", `translate(${ position[0] }, ${ position[1] })`);
    
        const color = d3.scaleOrdinal()
            .domain([0, 1, 2, 3, 4])
            .range([
                util.colors.blue1, 
                util.colors.green1, 
                util.colors.unBlue1, 
                util.colors.blue2,
                util.colors.yellow
            ]);
    
        const pie = d3.pie().value(d => d);
        const arc = d3.arc().innerRadius(radius / 2).outerRadius(radius);
    
        pieContainer.selectAll("path")
            .data(pie(data))
            .enter()
            .append("path")
            .attr("d", arc)
            .attr("class", "pie-slice")
            .style("opacity", 0)
            .transition()
                .duration(time.trans)
                // .delay((d, i) => .8 * time.in + i * (time.trans / 10)) // Delay each slice
                .delay(.8 * time.in) // Delay each slice
                .attr("fill", (d, i) => color(i))
                .style("opacity", .35)
        
        pieContainer.selectAll("path")
            .transition()
            .delay(1.2 * time.in + time.pause)
            .duration(time.trans)
            .style("opacity", 0)
            .on("end", () => d3.select("#pie-" + id).remove());

        console.log("Cat")
    }

    // function zoomOut() {
    //     panelSVG.transition()
    //         .duration(time.out)
    //         .call(zoom.transform, d3.zoomIdentity);
    // }
    
    // function update() {

    //     d3.selectAll(".node-container").remove();

    //     let yearMin = 2023
    //     let yearMax = 2024

    //     let dataIndicator = nodes.filter(d => 
    //         d.t >= yearMin && 
    //         d.t <= yearMax && 
    //         d.n >= nRange.min && 
    //         d.var == 1
    //     );

    //     let data = nodes.filter(d => 
    //         d.t >= yearMin && 
    //         d.t <= yearMax && 
    //         d.n >= nRange.min && 
    //         d.var == 1
    //     );

    //     let colorScaler = d3.scaleLinear()
    //         .domain([
    //             d3.min(dataIndicator, d => d.v_fill), 
    //             d3.mean(dataIndicator, d => d.v_fill), 
    //             d3.max(dataIndicator, d => d.v_fill)
    //         ])
    //         .range([util.colors.yellow, util.colors.green1, util.colors.blue1]);

    //     const groupData = group.selectAll("g")
    //         .attr("class", "node-container")
    //         .data(data, d => d.t + "-" + d.type + "-" + d.coords[0] + "-" + d.coords[1])
    //         .order()
    //         .join("g")
    //         .attr("transform", d => `translate(${ projection(d.coords)[0] }, ${ projection(d.coords)[1] })`);
        
    //     groupData.selectAll("circle").remove();
    //     groupData.append("circle")
    //         .attr("id", d => d.geo + "-" + d.t + "-" + d.type + "-" + d.coords[0] + "-" + d.coords[1])
    //         .attr("class", "node")
    //         .attr("r", d => rScaler(d.n) / Math.sqrt(currentTransform.k))
    //         .attr("fill-opacity", .3)
    //         .attr("stroke-opacity", .3)
    //         .style("fill", d => colorScaler(d.v))
    //         .style("stroke-width", .75 / currentTransform.k);
    // };
}
