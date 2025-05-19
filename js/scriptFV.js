// Global variables
let inductionData = [];
let warPeriodsData = [];
let casualtyData = [];
let currentSort = "chronological";

// Color scales for both visualizations
const heatmapColorScale = d3.scaleSequential().interpolator(d3.interpolateYlOrRd);
const barColorScale = d3.scaleLinear().range(["red", "#990000"]);

// War information
const warInfo = {
    "World War I": {
        description: "First global conflict involving over 70 million military personnel.",
        key_events: "U.S. entered April 1917, fighting ended with Armistice on November 11, 1918.",
        casualties: "116,516 U.S. military deaths"
    },
    "World War II": {
        description: "Largest and deadliest conflict in human history.",
        key_events: "U.S. entered after Pearl Harbor attack (Dec 7, 1941), ended in 1945.",
        casualties: "405,399 U.S. military deaths"
    },
    "Korean War": {
        description: "Conflict between North Korea (with China and Soviet support) and South Korea (with UN support).",
        key_events: "Began June 25, 1950, armistice signed July 27, 1953.",
        casualties: "36,574 U.S. military deaths"
    },
    "Vietnam War": {
        description: "Cold War-era proxy war in Vietnam, Laos, and Cambodia.",
        key_events: "Major U.S. involvement from 1965-1973, ended with fall of Saigon in 1975.",
        casualties: "58,220 U.S. military deaths"
    },
    "Persian Gulf War": {
        description: "War waged by coalition forces against Iraq following invasion of Kuwait.",
        key_events: "Operation Desert Storm began Jan 17, 1991, ended Feb 28, 1991.",
        casualties: "383 U.S. military deaths"
    },
    "Global War on Terror": {
        description: "Ongoing international military campaign following 9/11 attacks.",
        key_events: "Began with Afghanistan invasion in 2001, expanded to Iraq in 2003.",
        casualties: "Over 7,000 U.S. military deaths in all operations"
    },
    "Civil War": {
        description: "War fought between northern and southern states of the U.S.",
        key_events: "Lasted from 1861 to 1865, ended with Confederate surrender.",
        casualties: "Approximately 620,000 military deaths"
    },
    "Spanish-American War": {
        description: "Conflict between the United States and Spain in 1898.",
        key_events: "Began April 21, 1898, ended with Treaty of Paris on Dec 10, 1898.",
        casualties: "2,446 U.S. military deaths (385 battle deaths)"
    },
    "Mexican Border War": {
        description: "Series of military engagements along the Mexico–U.S. border.",
        key_events: "Military operations from 1910-1919 during Mexican Revolution.",
        casualties: "Approximately 35 U.S. military deaths"
    }
};

// Initialize the visualizations
function init() {
    // Load all data files in parallel
    Promise.all([
        d3.csv("data/Inductions.csv"),
        d3.csv("data/Conflict.csv"),
        d3.csv("data/casualties.csv")
    ]).then(([inductionsRaw, conflictsRaw, casualtiesRaw]) => {
        console.log("All data loaded successfully");
        
        // Process the data
        inductionData = processInductionData(inductionsRaw);
        warPeriodsData = processWarPeriodsData(conflictsRaw);
        casualtyData = processCasualtyData(casualtiesRaw);
        
        // Create both visualizations
        createHeatmap(inductionData, warPeriodsData);
        createBarChart(casualtyData);
        
        // Set up event listeners for the bar chart controls
        setupEventListeners();
    }).catch(error => {
        console.error("Error loading data:", error);
    });
}

// Set up event listeners for interactive elements
function setupEventListeners() {
 
    d3.select("#war-filter").on("change", function() {
        createBarChart(casualtyData);
    });
    

    d3.select("#sort-button").on("click", function() {
        if (currentSort === "chronological") {
            currentSort = "totalDeaths";
            d3.select(this).text("Sort Chronologically");
        } else {
            currentSort = "chronological";
            d3.select(this).text("Sort by Total Deaths");
        }
        createBarChart(casualtyData);
    });
}


function processInductionData(data) {
    return data.map(d => ({
        Year: d.Year,
        inductionCount: parseInt(d["Number of Inductions"].replace(/,/g, ""), 10)
    }));
}

function processWarPeriodsData(data) {
    return data.map(d => ({
        War: d.War,
        Start: parseInt(d["Start Year"], 10),
        End: parseInt(d["End Year"], 10),
        Inductions: parseInt(d.Inductions.replace(/,/g, ""), 10)
    }));
}

function processCasualtyData(data) {
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

    return processedData;
}


function createHeatmap(inductionData, warData) {
    console.log("Creating heatmap");
    
   
    d3.select("#heatmap").selectAll("*").remove();
    
   
    const margin = { top: 30, right: 30, bottom: 60, left: 100 };
    const width = 950 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    // Create SVG element
    const svg = d3.select("#heatmap")
        .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom)
        .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

    
    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,0)`)
        .call(d3.axisTop(d3.scaleLinear().range([0, width]))
            .tickSize(-height)
            .tickFormat(""));

    svg.append("g")
        .attr("class", "grid")
        .attr("transform", `translate(0,0)`)
        .call(d3.axisLeft(d3.scaleLinear().range([0, height]))
            .tickSize(-width)
            .tickFormat(""));

    
    const heatmapData = [];
    warData.forEach(war => {
        const warYears = inductionData
            .filter(d => parseInt(d.Year) >= war.Start && parseInt(d.Year) <= war.End)
            .map(d => ({
                war: war.War,
                year: d.Year,
                inductionCount: d.inductionCount
            }));
        heatmapData.push(...warYears);
    });

    const allYears = [...new Set(inductionData.map(d => d.Year))];
    const wars = warData.map(d => d.War);
    const maxInductions = d3.max(inductionData, d => d.inductionCount);
    heatmapColorScale.domain([0, maxInductions]);

    // Scales
    const xScale = d3.scaleBand()
        .domain(allYears)
        .range([0, width])
        .padding(0.005);

    const yScale = d3.scaleBand()
        .domain(wars)
        .range([0, height])
        .padding(0.02);

    // X-axis
    svg.append("g")
        .attr("class", "axis")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(xScale)
            .tickValues(xScale.domain().filter((d, i) => i % 2 === 0)))
        .selectAll("text")
            .attr("transform", "rotate(-45)")
            .attr("text-anchor", "end")
            .attr("dx", "-.8em")
            .attr("dy", ".15em")
            .attr("class", "year-label");

    // Y-axis
    svg.append("g")
        .attr("class", "axis")
        .call(d3.axisLeft(yScale))
        .selectAll("text")
            .attr("class", "war-label");

    // Tooltip
    const tooltip = d3.select("#tooltip-heatmap");

  
    svg.selectAll(".cell")
        .data(heatmapData)
        .enter()
        .append("rect")
            .attr("class", "cell")
            .attr("x", d => xScale(d.year))
            .attr("y", d => yScale(d.war))
            .attr("width", xScale.bandwidth())
            .attr("height", yScale.bandwidth())
            .attr("fill", "#fff") // Start blank
        .transition()
            .delay((_, i) => i * 15) // Staggered effect
            .duration(3000)
            .attr("fill", d => heatmapColorScale(d.inductionCount));

    // Tooltip handlers (after transition)
    svg.selectAll(".cell")
        .on("mouseover", function(event, d) {
            const formattedNumber = new Intl.NumberFormat().format(d.inductionCount);
            
            // Find the war's total induction data
            const warData = warPeriodsData.find(w => w.War === d.war);
            const totalWarInductions = warData ? warData.Inductions : "Unknown";
            
            // Get additional war info
            const info = warInfo[d.war] || { 
                description: "Military conflict.", 
                key_events: "Information unavailable.",
                casualties: "Information unavailable."
            };
            
            // Calculate percentage of yearly inductions to total war inductions
            const percentage = warData ? ((d.inductionCount / warData.Inductions) * 100).toFixed(1) : "N/A";
            
            // Build rich tooltip content
            let tooltipContent = `
                <div class="tooltip-header">
                    <strong>${d.war} (${d.year})</strong>
                </div>
                <div class="tooltip-body">
                    <p><strong>Inductions:</strong> ${formattedNumber}</p>
                    <p><strong>Percentage of War Total:</strong> ${percentage}%</p>
                    <p><strong>Description:</strong> ${info.description}</p>
                    <p><strong>Key Events:</strong> ${info.key_events}</p>
                    <p><strong>Casualties:</strong> ${info.casualties}</p>
                </div>
            `;
            
            tooltip.style("display", "block")
                .html(tooltipContent)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");

            d3.select(this)
                .style("stroke", "#000")
                .style("stroke-width", "2px");
        })
        .on("mouseout", function() {
            // tooltip.style("opacity", "0");
            d3.select(this)
                .style("stroke", "white")
                .style("stroke-width", "1px");
        });

    // Create legend for heatmap
    createHeatmapLegend(maxInductions);
}

function createHeatmapLegend(maxValue) {
    d3.select("#heatmap-legend").selectAll("*").remove();

    const legendWidth = 400;
    const legendHeight = 60;

    const legendSvg = d3.select("#heatmap-legend")
        .append("svg")
        .attr("width", legendWidth)
        .attr("height", legendHeight);

    // Add title
    legendSvg.append("text")
        .attr("x", legendWidth / 2)
        .attr("y", 10)
        .attr("text-anchor", "middle")
        .attr("font-size", "14px")
        .attr("font-weight", "bold")
        .attr("fill", "#333")
        .text("Color Scale: Inductions by Year");

    const defs = legendSvg.append("defs");
    const linearGradient = defs.append("linearGradient")
        .attr("id", "linear-gradient")
        .attr("x1", "0%").attr("y1", "0%")
        .attr("x2", "100%").attr("y2", "0%");

    linearGradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", heatmapColorScale(0));

    linearGradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", heatmapColorScale(maxValue));

    legendSvg.append("rect")
        .attr("width", legendWidth - 100)
        .attr("height", 15)
        .attr("x", 50)
        .attr("y", 25)
        .style("fill", "url(#linear-gradient)");

    const legendScale = d3.scaleLinear()
        .domain([0, maxValue])
        .range([0, legendWidth - 100]);

    legendSvg.append("g")
        .attr("transform", `translate(50,40)`)
        .call(d3.axisBottom(legendScale)
            .tickFormat(d => d3.format(",.0f")(d))
            .ticks(5));
}


function createBarChart(data) {
    console.log("Creating bar chart");
    
    
    d3.select("#barchart").selectAll("*").remove();

    const selectedFilter = d3.select("#war-filter").property("value");

    
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

    const margin = { top: 40, right: 70, bottom: 60, left: 220 };
    const width = 950 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    // Create SVG element
    const svg = d3.select("#barchart")
        .append("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .append("g")
        .attr("transform", `translate(${margin.left}, ${margin.top})`);

    // Set up scales
    const x = d3.scaleLinear()
        .domain([0, d3.max(filteredData, d => d.totalDeaths)])
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(filteredData.map(d => d.war))
        .range([0, height])
        .padding(0.3);

    
    barColorScale.domain([0, 150000]); 
    // Create tooltip
    const tooltip = d3.select("#tooltip-barchart")
        .style("opacity", 0);

    // Create bars with animation
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
                    .attr("fill", d => d.totalDeaths > 150000 ? "#990000" : "red")
                    .on("mouseover", function(event, d) {
                        d3.select(this).attr("fill", "#cc0000");
                        tooltip.transition().duration(200).style("opacity", 0.9);
                        tooltip.html(`<strong>${d.war}</strong><br>Total Deaths: ${d.totalDeaths.toLocaleString()}`)
                            .style("left", (event.pageX + 10) + "px")
                            .style("top", (event.pageY - 28) + "px");
                    })
                    .on("mouseout", function(event, d) {
                        d3.select(this).attr("fill", d.totalDeaths > 150000 ? "#990000" : "red");
                        tooltip.transition().duration(500).style("opacity", 0);
                    });

                barEnter.transition()
                    .duration(3000)
                    .attr("width", d => x(d.totalDeaths));

                return barEnter;
            },
            update => update.transition()
                .duration(3000)
                .attr("y", d => y(d.war))
                .attr("width", d => x(d.totalDeaths))
        );

   
    svg.selectAll(".label")
        .data(filteredData, d => d.war)
        .join(
            enter => {
                const textEnter = enter.append("text")
                    .attr("class", "label")
                    .attr("x", 5)
                    .attr("y", d => y(d.war) + y.bandwidth() / 2 + 5)
                    .style("fill", "#333")
                    .style("font-size", "14px")
                    .text(0);

                textEnter.transition()
                    .duration(3000)
                    .attr("x", d => x(d.totalDeaths) + 5)
                    .tween("text", function(d) {
                        const i = d3.interpolate(0, d.totalDeaths);
                        return function(t) {
                            this.textContent = Math.round(i(t)).toLocaleString();
                        };
                    });

                return textEnter;
            },
            update => update.transition()
                .duration(3000)
                .attr("y", d => y(d.war) + y.bandwidth() / 2 + 5)
                .attr("x", d => x(d.totalDeaths) + 5)
                .tween("text", function(d) {
                    const i = d3.interpolateNumber(parseInt(this.textContent.replace(/,/g, "")) || 0, d.totalDeaths);
                    return function(t) {
                        this.textContent = Math.round(i(t)).toLocaleString();
                    };
                })
        );

  
    svg.append("g")
        .attr("class", "y-axis")
        .style("font-size", "12px")
        .call(d3.axisLeft(y));

    svg.append("g")
        .attr("class", "x-axis")
        .attr("transform", `translate(0, ${height})`)
        .style("font-size", "12px")
        .call(d3.axisBottom(x).ticks(5).tickFormat(d3.format(",.0f")));

  
    svg.append("text")
        .attr("class", "axis-label")
        .attr("x", width / 2)
        .attr("y", height + 40)
        .style("font-size", "14px")
        .text("Total Deaths");
}


document.addEventListener("DOMContentLoaded", init);