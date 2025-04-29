document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, starting data load...");
    showLoadingState();
  
    // Error message display
    function showErrorMessage(message) {
      const container = document.querySelector(".chart-container");
      const errorDiv = document.createElement("div");
      errorDiv.style.color = "red";
      errorDiv.style.padding = "20px";
      errorDiv.style.textAlign = "center";
      errorDiv.innerHTML = `<strong>Error:</strong> ${message}<br>Check the console for more details.`;
      container.appendChild(errorDiv);
    }
  
    Promise.all([
      d3.csv("data/Inductions.csv")
        .then(data => {
          console.log("Inductions.csv loaded successfully:", data);
          return data.map(d => ({
            year: +d.Year,
            inductions: +d["Number of Inductions"].replace(/,/g, '')
          }));
        })
        .catch(error => {
          console.error("Error loading Inductions.csv:", error);
          showErrorMessage("Failed to load Inductions.csv");
          throw error;
        }),
      
      d3.csv("data/Conflict.csv")
        .then(data => {
          console.log("Conflict.csv loaded successfully:", data);
          return data.map(d => ({
            war: d.War,
            startYear: +d["Start Year"],
            endYear: +d["End Year"],
            color: getWarColor(d.War)
          }));
        })
        .catch(error => {
          console.error("Error loading Conflict.csv:", error);
          showErrorMessage("Failed to load Conflict.csv");
          throw error;
        })
    ])
    .then(([inductionsData, conflictsData]) => {
      console.log("All data loaded, processing...");
      if (inductionsData.length === 0 || conflictsData.length === 0) {
        throw new Error("One or both datasets are empty after processing");
      }
      processData(inductionsData, conflictsData);
      removeLoadingState();
    })
    .catch(error => {
      console.error("Error in data processing:", error);
      showErrorMessage("Error processing data: " + error.message);
      removeLoadingState();
    });
  });
  
  function showLoadingState() {
    const container = document.querySelector(".chart-container");
    const loadingDiv = document.createElement("div");
    loadingDiv.id = "loading-spinner";
    loadingDiv.innerHTML = `
      <div class="spinner"></div>
      <p>Loading data...</p>
    `;
    container.appendChild(loadingDiv);
  }
  
  function removeLoadingState() {
    const spinner = document.getElementById("loading-spinner");
    if (spinner) spinner.remove();
  }
  
  function getWarColor(warName) {
    const colorMap = {
      "Worl War I": "#8c510a",
      "World War I": "#8c510a",
      "Worl War II": "#d8b365",
      "World War II": "#d8b365",
      "Korean War": "#f6e8c3",
      "Vietnam War": "#c7eae5"
    };
    return colorMap[warName] || "#5ab4ac";
  }
  
  let yearlyData = [];
  let currentMode = "absolute";
  
  function processData(data, warPeriods) {
    console.log("Processing data...");
    yearlyData = [];
  
    data.forEach(d => {
      warPeriods.forEach(war => {
        if (d.year >= war.startYear && d.year <= war.endYear) {
          yearlyData.push({
            ...d,
            war: war.war,
            color: war.color
          });
        }
      });
    });
  
    if (yearlyData.length === 0) {
      console.error("No matching data found");
      document.querySelector(".chart-container").innerHTML += "<div style='color:red;padding:20px;'>No matching data found between inductions and wars.</div>";
      return;
    }
  
    calculateRelativePercentages();
    createHeatmap();
    createLegend();
    setupButtons();
    resetDetailPanel();
  }
  
  function calculateRelativePercentages() {
    const totalsByWar = {};
    yearlyData.forEach(d => {
      if (!totalsByWar[d.war]) totalsByWar[d.war] = 0;
      totalsByWar[d.war] += d.inductions;
    });
  
    yearlyData.forEach(d => {
      d.percentOfWar = (d.inductions / totalsByWar[d.war]) * 100;
    });
  }
  
  function setupButtons() {
    document.getElementById("btnAbsolute").addEventListener("click", () => {
      if (currentMode !== "absolute") {
        currentMode = "absolute";
        updateButtonState();
        updateHeatmap();
      }
    });
  
    document.getElementById("btnRelative").addEventListener("click", () => {
      if (currentMode !== "relative") {
        currentMode = "relative";
        updateButtonState();
        updateHeatmap();
      }
    });
  }
  
  function updateButtonState() {
    document.getElementById("btnAbsolute").classList.toggle('active', currentMode === 'absolute');
    document.getElementById("btnRelative").classList.toggle('active', currentMode === 'relative');
  }
  
  function getColorScale(data, field) {
    const maxVal = d3.max(data.map(d => d[field]));
    return d3.scaleSequential()
      .domain([0, maxVal])
      .interpolator(d3.interpolateYlOrRd);
  }
  
  function createHeatmap() {
    console.log("Creating heatmap...");
    
    const containerWidth = document.querySelector(".chart-container").clientWidth;
    const margin = { top: 50, right: 30, bottom: 60, left: 120 };
    const width = Math.min(containerWidth - 40, 800) - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;
  
    d3.select("#heatmap").selectAll("*").remove();
  
    const svg = d3.select("#heatmap")
      .append("svg")
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);
  
    const years = [...new Set(yearlyData.map(d => d.year))].sort((a, b) => a - b);
    const x = d3.scaleBand()
      .domain(years)
      .range([0, width])
      .padding(0.05);
  
    const wars = [...new Set(yearlyData.map(d => d.war))];
    const y = d3.scaleBand()
      .domain(wars)
      .range([0, height])
      .padding(0.05);
  
    const colorScale = getColorScale(yearlyData, currentMode === "absolute" ? "inductions" : "percentOfWar");
  
    svg.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")))
      .selectAll("text")
      .attr("transform", "rotate(-45)")
      .attr("dx", "-0.8em")
      .attr("dy", "0.15em")
      .style("text-anchor", "end");
  
    svg.append("g")
      .call(d3.axisLeft(y));
  
    // Grid lines
    svg.append("g")
      .attr("class", "grid")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickSize(-height).tickFormat(""))
      .select(".domain").remove();
  
    svg.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(""))
      .select(".domain").remove();
  
    // Cells with staggered animation
    svg.selectAll(".cell")
      .data(yearlyData)
      .enter()
      .append("rect")
      .attr("class", "cell")
      .attr("x", d => x(d.year))
      .attr("y", d => y(d.war))
      .attr("width", x.bandwidth())
      .attr("height", y.bandwidth())
      .attr("fill", d => colorScale(currentMode === "absolute" ? d.inductions : d.percentOfWar))
      .style("opacity", 0) // Start invisible
      .on("mouseover", function(event, d) {
        enhancedTooltip(event, d, this);
      })
      .on("mouseout", function() {
        hideTooltip();
      })
      .on("click", function(event, d) {
        const isSelected = d3.select(this).classed("selected");
        d3.selectAll(".cell").classed("selected", false);
  
        if (!isSelected) {
          d3.select(this).classed("selected", true);
          updateDetailPanel(d);
        } else {
          resetDetailPanel();
        }
      });
  
    // Staggered animation: fade cells in by war
    let delay = 0;
    const delayIncrement = 100; // ms between cells
    const warDelayIncrement = 300; // additional delay between war groups
    
    // Group data by war
    const warGroups = d3.group(yearlyData, d => d.war);
    
    // For each war, animate its cells
    wars.forEach(war => {
      const warData = warGroups.get(war) || [];
      
      warData.sort((a, b) => a.year - b.year).forEach((d, i) => {
        svg.selectAll(".cell")
          .filter(cell => cell.war === war && cell.year === d.year)
          .transition()
          .delay(delay + i * delayIncrement)
          .duration(400)
          .style("opacity", 1)
          .attr("transform", "scale(1.05)")
          .transition()
          .duration(200)
          .attr("transform", "scale(1)");
      });
      
      delay += (warData.length * delayIncrement) + warDelayIncrement;
    });
  }
  
  // Enhanced tooltip animation
  function enhancedTooltip(event, d, element) {
    const tooltip = d3.select("#tooltip");
    
    // Clear any existing transitions
    tooltip.transition();
    
    // Set content
    tooltip.html(`<h3>${d.year} - ${d.war}</h3>
      <p><strong>Inductions:</strong> ${d.inductions.toLocaleString()}</p>
      <p><strong>Percent of War:</strong> ${d.percentOfWar.toFixed(2)}%</p>`)
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 28) + "px")
      .style("transform", "translateY(10px)") // Start 10px down
      .style("opacity", 0); // Start invisible
    
    // Smooth fade-in with slight upward movement
    tooltip.transition()
      .duration(300)
      .style("opacity", 1)
      .style("transform", "translateY(0px)"); // Move up to final position
    
    // Highlight the cell
    d3.select(element)
      .classed("hover-highlight", true);
  }
  
  function hideTooltip() {
    // Smooth fade-out with slight downward movement
    d3.select("#tooltip").transition()
      .duration(500)
      .style("opacity", 0)
      .style("transform", "translateY(10px)");
    
    // Remove hover highlight
    d3.selectAll(".cell").classed("hover-highlight", false);
  }
  
  function updateHeatmap() {
    console.log("Updating heatmap to mode:", currentMode);
    const colorScale = getColorScale(yearlyData, currentMode === "absolute" ? "inductions" : "percentOfWar");
  
    // Enhanced animation when switching modes (Feature #1)
    d3.selectAll(".cell")
      .transition()
      .duration(750)
      .ease(d3.easeCubic)
      .attr("fill", d => colorScale(currentMode === "absolute" ? d.inductions : d.percentOfWar))
      // Add pop effect when switching modes
      .attr("transform", "scale(1.08)")
      .transition()
      .duration(300)
      .attr("transform", "scale(1)");
  
    d3.select(".subtitle").text(`Heatmap visualization of military inductions by year (${currentMode === "absolute" ? "absolute numbers" : "percentage of war total"})`);
    createLegend();
  
    // Animate the legend as well
    d3.select("#legend svg")
      .transition()
      .duration(300)
      .style("opacity", 0.7)
      .transition()
      .duration(300)
      .style("opacity", 1);
  }
  
  function createLegend() {
    const legendWidth = 300;
    const legendHeight = 40;
  
    d3.select("#legend").selectAll("*").remove();
  
    const colorScale = getColorScale(yearlyData, currentMode === "absolute" ? "inductions" : "percentOfWar");
  
    const svg = d3.select("#legend")
      .append("svg")
      .attr("width", legendWidth)
      .attr("height", legendHeight);
  
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%").attr("y1", "0%")
      .attr("x2", "100%").attr("y2", "0%");
  
    d3.range(0, 1.01, 0.1).forEach(val => {
      gradient.append("stop")
        .attr("offset", val * 100 + "%")
        .attr("stop-color", colorScale.interpolator()(val));
    });
  
    svg.append("rect")
      .attr("x", 0)
      .attr("y", 10)
      .attr("width", legendWidth)
      .attr("height", 20)
      .style("fill", "url(#legend-gradient)");
  
    const max = d3.max(yearlyData, d => currentMode === "absolute" ? d.inductions : d.percentOfWar);
  
    svg.append("text").attr("x", 0).attr("y", 8).text("0").style("font-size", "12px");
    svg.append("text").attr("x", legendWidth).attr("y", 8).text(currentMode === "absolute" ? max.toLocaleString() : max.toFixed(1) + "%").style("font-size", "12px").attr("text-anchor", "end");
    svg.append("text").attr("x", legendWidth/2).attr("y", 8).text(currentMode === "absolute" ? "Inductions" : "% of War Total").style("font-size", "14px").attr("text-anchor", "middle").style("font-weight", "bold");
  }
  
  function updateDetailPanel(data) {
    const panel = document.getElementById("detailPanel");
    panel.innerHTML = `
      <h3 class="detail-title">${data.year} - ${data.war}</h3>
      <p class="detail-text">
        During this year, there were <strong>${data.inductions.toLocaleString()}</strong> military inductions,
        representing <strong>${data.percentOfWar.toFixed(2)}%</strong> of all inductions during the ${data.war}.
      </p>
      <p class="detail-text">
        Click anywhere on the visualization to return to the overview.
      </p>
    `;
  
    // Animate the detail panel update
    d3.select("#detailPanel")
      .style("opacity", 0)
      .transition()
      .duration(400)
      .style("opacity", 1);
  }
  
  function resetDetailPanel() {
    const panel = document.getElementById("detailPanel");
  
    // Animate the reset
    d3.select("#detailPanel")
      .style("opacity", 0.7)
      .transition()
      .duration(400)
      .style("opacity", 1);
  }