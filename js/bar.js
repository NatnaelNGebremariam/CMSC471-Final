const margin = { top: 50, right: 30, bottom: 80, left: 100 };
const width = document.getElementById("chart").clientWidth - margin.left - margin.right;
const height = 400;

// Append the SVG object to the container
const svg = d3.select("#vis2")
  .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
  .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

// Create tooltip div (hidden by default), styled using your CSS
const tooltip = d3.select("#vis2")
  .append("div")
  .attr("class", "tooltip")
  .style("opacity", 0);

// Load the JSON data
d3.json("data/ww2_deaths.json").then(data => {
  // Sort data descending by deaths
  data.sort((a, b) => b["Total Deaths"] - a["Total Deaths"]);

  // Color scale based on death toll
  const color = d3.scaleLinear()
    .domain([0, d3.max(data, d => d["Total Deaths"])])
    .range(["#ffb3b3", "#cc0000"]);// light to dark red

  // X scale
  const x = d3.scaleBand()
    .domain(data.map(d => d.Country))
    .range([0, width])
    .padding(0.2);

  // Y scale
  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d["Total Deaths"])])
    .nice()
    .range([height, 0]);

  // Add X axis
  svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
      .attr("transform", "rotate(-45)")
      .style("text-anchor", "end");

  // Add Y axis
  svg.append("g")
    .call(d3.axisLeft(y));

  // Tooltip interaction
  const mouseover = (event, d) => {
    tooltip
      .style("opacity", 1)
      .html(`
        <h3>${d.Country}</h3>
        <p><strong>Deaths:</strong> ${d["Total Deaths"].toLocaleString()}</p>
      `);
  };

  const mousemove = (event) => {
    tooltip
      .style("left", (event.pageX + 15) + "px")
      .style("top", (event.pageY - 40) + "px");
  };

  const mouseleave = () => {
    tooltip.style("opacity", 0);
  };

  // Add bars with tooltip events and color scale
  svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
      .attr("x", d => x(d.Country))
      .attr("y", d => y(d["Total Deaths"]))
      .attr("width", x.bandwidth())
      .attr("height", d => height - y(d["Total Deaths"]))
      .attr("fill", d => color(d["Total Deaths"]))
      .on("mouseover", mouseover)
      .on("mousemove", mousemove)
      .on("mouseleave", mouseleave);

  // Add chart title
  svg.append("text")
    .attr("x", width / 2 )
    .attr("y", -10)
    .style("text-anchor", "middle")
    .style("font-size", "20px")
    .text("WWII Deaths by Country");
});
