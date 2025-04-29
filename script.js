let processedData = [];
let currentSort = "chronological";

function init() {
    d3.csv("data/casualties.csv").then(data => {
        processedData = processData(data);
        createVis(processedData);
        
        d3.select("#filter").on("change", function() {
            createVis(processedData);
        });

        d3.select("#sortButton").on("click", function() {
            if (currentSort === "chronological") {
                currentSort = "totalDeaths";
            } else {
                currentSort = "chronological";
            }
            createVis(processedData);
        });
    });
}

function processData(data) {
    const processedData = [];
    let currentWar = null;

    data.forEach(d => {
        if (d["War or Conflict"].trim() !== "") {
            currentWar = d["War or Conflict"];
        }

        if (d["Branch of Service"].trim() === "Army") {
            processedData.push({
                war: currentWar,
                timePeriod: d["Time period"],
                branch: d["Branch of Service"],
                numberServing: +d["Number Serving"] || 0,
                totalDeaths: +d["Total Deaths"] || 0,
                battleDeaths: +d["Battle Deaths"] || 0,
                otherDeaths: +d["Other Deaths"] || 0
            });
        }
    });

    processedData.sort((a, b) => a.totalDeaths - b.totalDeaths);
    return processedData;
}

function createVis(data) {
    d3.select("#chart").selectAll("*").remove();

    const selectedFilter = d3.select("#filter").property("value");

    let filteredData = data;

    if (selectedFilter === "before1950") {
        filteredData = data.filter(d => {
            const year = parseInt(d.timePeriod.split("-")[0]);
            return year < 1950;
        });
    } else if (selectedFilter === "after1950") {
        filteredData = data.filter(d => {
            const year = parseInt(d.timePeriod.split("-")[0]);
            return year >= 1950;
        });
    }

    if (currentSort === "totalDeaths") {
        filteredData = filteredData.sort((a, b) => b.totalDeaths - a.totalDeaths);
    } else {
        filteredData = filteredData.sort((a, b) => {
            const yearA = parseInt(a.timePeriod.split("-")[0]);
            const yearB = parseInt(b.timePeriod.split("-")[0]);
            return yearA - yearB;
        });
    }

    const margin = { top: 60, right: 100, bottom: 100, left: 300 }; // Increased margins for more space
    const width = 1200 - margin.left - margin.right; // Increased width for the chart
    const height = 600 - margin.top - margin.bottom; // Increased height for the chart

    const svg = d3.select("#chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.totalDeaths)])
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(filteredData.map(d => d.war))
        .range([0, height])
        .padding(0.3);

    const colorScale = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.totalDeaths)])
        .range(["#ffcccc", "#990000"]);

    const tooltip = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("font-size", "14px") // Tooltip font size
        .style("padding", "8px");

    // Bars
    svg.selectAll(".bar")
        .data(filteredData, d => d.war)
        .join(
            enter => {
                const barEnter = enter.append("rect")
                    .attr("class", "bar")
                    .attr("x", 0)
                    .attr("y", d => y(d.war))
                    .attr("height", y.bandwidth())
                    .attr("width", 0)
                    .attr("fill", d => colorScale(d.totalDeaths))
                    .on("mouseover", function(event, d) {
                        d3.select(this).attr("fill", "#cc0000");
                        tooltip.transition().duration(200).style("opacity", 0.9);
                        tooltip.html(`<strong>${d.war}</strong><br>Total Deaths: ${d.totalDeaths}`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function(event, d) {
                        d3.select(this).attr("fill", colorScale(d.totalDeaths));
                        tooltip.transition().duration(500).style("opacity", 0);
                    });

                barEnter.transition()
                    .duration(1000)
                    .attr("width", d => x(d.totalDeaths));

                return barEnter;
            },
            update => update.transition()
                .duration(1000)
                .attr("y", d => y(d.war))
                .attr("width", d => x(d.totalDeaths))
        );

    // Numbers (growing labels)
    svg.selectAll(".label")
        .data(filteredData, d => d.war)
        .join(
            enter => {
                const textEnter = enter.append("text")
                    .attr("class", "label")
                    .attr("x", 5)
                    .attr("y", d => y(d.war) + y.bandwidth() / 2 + 5)
                    .style("fill", "#333")
                    .style("font-size", "16px")  // Adjusted font size for better balance
                    .text(0);

                textEnter.transition()
                    .duration(10000)
                    .attr("x", d => x(d.totalDeaths) + 1)
                    .tween("text", function(d) {
                        const i = d3.interpolate(0, d.totalDeaths);
                        return function(t) {
                            this.textContent = Math.round(i(t));
                        };
                    });

                return textEnter;
            },
            update => update.transition()
                .duration(1000)
                .attr("y", d => y(d.war) + y.bandwidth() / 2 + 5)
                .attr("x", d => x(d.totalDeaths) + 5)
                .tween("text", function(d) {
                    const i = d3.interpolateNumber(+this.textContent, d.totalDeaths);
                    return function(t) {
                        this.textContent = Math.round(i(t));
                    };
                })
        );

    // Axes
    svg.append("g")
        .attr("class", "y-axis")
        .style("font-size", "16px")  // Adjusted font size for axis labels
        .call(d3.axisLeft(y));

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .style("font-size", "16px")  // Adjusted font size for axis labels
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(".2s")));

    // X Axis Label
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 60)
        .style("font-size", "18px")  // Adjusted font size for axis label
        .text("Total Deaths");
}

document.addEventListener("DOMContentLoaded", init);
