const svg = d3.select("#chart")
  .append("svg")
  .attr("width", "100%")
  .attr("height", 500);

const margin = { top: 50, right: 30, bottom: 60, left: 30 };
const width = document.getElementById("chart").clientWidth - margin.left - margin.right;
const height = 400;

const mainGroup = svg.append("g")
  .attr("transform", `translate(${margin.left}, ${margin.top})`);

const zoomLayer = mainGroup.append("g")
  .attr("class", "zoom-layer");

// Tooltip
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Parse dates
const parseDate = d3.timeParse("%Y-%m-%d");
const flatData = data[0].data.map(d => ({
  ...d,
  parsedDate: parseDate(d.date)
}));

// Fixed extended date range
const xScale = d3.scaleTime()
  .domain([new Date("1935-01-01"), new Date("1950-01-01")])
  .range([0, width]);

// Initial axis
const xAxis = d3.axisBottom(xScale)
  .ticks(d3.timeYear.every(1))  // ← here
  .tickFormat(d3.timeFormat("%Y"));

zoomLayer.append("g")
  .attr("class", "x-axis")
  .attr("transform", `translate(0, ${height / 2 + 60})`)
  .call(xAxis);


// Draw circles
const circles = zoomLayer.selectAll("circle")
  .data(flatData)
  .enter()
  .append("circle")
  .attr("cx", d => xScale(d.parsedDate))
  .attr("cy", (d, i) => {
    const offset = [height / 2 - 100, height / 2 - 30, height / 2 + 40];
    return offset[i % 3];
  })
  .attr("r", 8)
  .attr("fill", d => d.details.type === "milestone" ? "red" : "#001f3f")
  .on("mouseover", function(event, d) {
    d3.select(this)
      .transition().duration(200)
      .attr("r", 14)
      .attr("fill", d.details.type === "milestone" ? "#cc0000" : "#ff851b");

    const html = `
      <strong>${d.details.event}</strong><br/>
      <em>${d3.timeFormat("%B %d, %Y")(d.parsedDate)}</em><br/>
      ${d.details.description}
    `;
    tooltip.transition().duration(200).style("opacity", 0.95);
    tooltip.html(html);
  })
  .on("mousemove", function(event) {
    tooltip
      .style("left", (event.pageX + 15) + "px")
      .style("top", (event.pageY - 28) + "px");
  })
  .on("mouseout", function(event, d) {
    d3.select(this)
      .transition().duration(200)
      .attr("r", 8)
      .attr("fill", d.details.type === "milestone" ? "red" : "#001f3f");

    tooltip.transition().duration(200).style("opacity", 0);
  });


// Draw labels
const labels = zoomLayer.selectAll("text.label")
  .data(flatData)
  .enter()
  .append("text")
  .attr("class", "label")
  .attr("x", d => xScale(d.parsedDate))
  .attr("y", (d, i) => {
    const offset = [height / 2 - 115, height / 2 - 45, height / 2 + 55];
    return offset[i % 3];
  })
  
  
  
  .attr("text-anchor", "middle")
  .attr("font-size", "12px")
  .text(d => d.details.event);

// Helper: tick spacing based on zoom level
function getTickStep(zoomLevel) {
  if (zoomLevel < 1.5) return 5;
  if (zoomLevel < 3) return 2;
  return 1;
}

// Zoom behavior
const zoom = d3.zoom()
  .scaleExtent([0.5, 10])
  .translateExtent([[0, 0], [width, height]])
  .on("zoom", (event) => {
    const transform = event.transform;
    const newX = transform.rescaleX(xScale);

    // Update axis ticks responsively
    zoomLayer.select(".x-axis")
    .call(d3.axisBottom(newX)
      .ticks(d3.timeYear.every(1))  // ← here too
      .tickFormat(d3.timeFormat("%Y")));
  

    // Reposition elements based on zoomed scale
    circles.attr("cx", d => newX(d.parsedDate));
    labels
      .attr("x", d => newX(d.parsedDate))
      .style("font-size", `${Math.max(10, 14 / transform.k)}px`);
  });

svg.call(zoom);

// Reset Zoom button
const defaultTransform = d3.zoomIdentity;

d3.select("#resetZoomBtn").on("click", () => {
  svg.transition()
    .duration(500)
    .call(zoom.transform, defaultTransform);
});


function updateVisibility() {
  const showKey = d3.select("#filter-key").property("checked");
  const showMilestone = d3.select("#filter-milestone").property("checked");

  // Show/hide circles and labels based on type
  circles.style("display", d => {
    if (d.details.type === "key" && !showKey) return "none";
    if (d.details.type === "milestone" && !showMilestone) return "none";
    return null;
  });

  labels.style("display", d => {
    if (d.details.type === "key" && !showKey) return "none";
    if (d.details.type === "milestone" && !showMilestone) return "none";
    return null;
  });
}

// Listen to filter checkboxes
d3.select("#filter-key").on("change", updateVisibility);
d3.select("#filter-milestone").on("change", updateVisibility);


svg.append("foreignObject")
  .attr("x", width - 180)
  .attr("y", 10)
  .attr("width", 170)
  .attr("height", 120)
  .append("xhtml:div")
  .html(`
    <div style="font-family: sans-serif; font-size: 13px; background: rgba(255,255,255,0.9); padding: 10px; border-radius: 8px; border: 1px solid #ccc;">
      <button id="resetZoomBtn" style="margin-bottom: 8px; padding: 4px 10px;">Reset Zoom</button><br/>
      <label><input type="checkbox" id="filter-key" checked> Show Key Events</label><br/>
      <label><input type="checkbox" id="filter-milestone" checked> Show Casualty Milestones</label>
    </div>
  `);

  // Wait for DOM to be ready before attaching listeners
setTimeout(() => {
  d3.select("#resetZoomBtn").on("click", () => {
    svg.transition()
      .duration(500)
      .call(zoom.transform, defaultTransform);
  });

  d3.select("#filter-key").on("change", updateVisibility);
  d3.select("#filter-milestone").on("change", updateVisibility);
}, 0);


