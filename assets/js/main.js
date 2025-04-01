import { renderGlobe } from "./globe.js";

let panelSelect = "globe";

d3.selectAll(".tab")
    .on("click", switchPanel)

function switchPanel() {
    d3.selectAll(".tab").classed("active", false);
    d3.select(this).classed("active", true);
    panelSelect = d3.select(this).attr("panel");
    render(panelSelect);
}

render(panelSelect);

function render(panel) {

    if (panel == "globe") {
        renderGlobe()
    }

}