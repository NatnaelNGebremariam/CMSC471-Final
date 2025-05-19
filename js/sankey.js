const margin = { top: 50, right: 30, bottom: 60, left: 30 };
const width = document.getElementById("chart").clientWidth - margin.left - margin.right;
const height = 400;
const {sankey, sankeyLinkHorizontal} = d3;

const svg = d3.select('#vis3')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .append('g')
    .attr('transform',`translate(${margin.left},${margin.top})`);

    
function init() {
    d3.csv("data/ww2_dataset.csv", d => {
        return {
            Country: d.Country?.trim(),
            Totalpopulation: d.Totalpopulation,
            Civiliandeaths: d.Civiliandeaths,
            Militarywounded: d.Militarywounded,
            Militarydeaths: d.Militarydeaths
        };
    }).then(data => {
        const filteredData = data.filter(d =>
            d.Country === "United States" || d.Country === "Soviet Union"
        );
        createVis(filteredData);
    });
}

function createVis(data) {
    const nodes = new Map();
    const links = [];

    const cleanNumber = (label, val) => {
        const cleaned = (val || "").split("to")[0].replace(/[^0-9.]/g, "");
        const num = parseFloat(cleaned);
        if (isNaN(num)) {
            return 0;
        }
        return num;
    };

    data.forEach(d => {
        const country = d.Country;
        const totalPop = cleanNumber("Totalpopulation", d.Totalpopulation);
        const civDeaths = cleanNumber("Civiliandeaths", d.Civiliandeaths);
        const milDeaths = cleanNumber("Militarydeaths", d.Militarydeaths);
        const milWounded = cleanNumber("Militarywounded", d.Militarywounded);

        if (!country || totalPop === 0) {
            return;
        }

        const affected = civDeaths + milDeaths + milWounded;
        const unaffected = Math.max(0, totalPop - affected);
        const totalDeath = civDeaths + milDeaths;

        const node = name => {
            if (!nodes.has(name)) nodes.set(name, { name });
            return name;
        };

        const nCountry = node(`Country: ${country.toLocaleString()}`);
        const nTotal = node(`Total Population: ${totalPop.toLocaleString()}`);
        const nCiv = node(`Civilian Deaths: ${civDeaths.toLocaleString()}`);
        const nMilW = node(`MW: ${milWounded.toLocaleString()}`);
        const nMilD = node(`MD: ${milDeaths.toLocaleString()}`);
        const nUnaffected = node(`Unaffected: ${unaffected.toLocaleString()}`);
        const nTotalDeath = node(`Total Deaths: ${totalDeath.toLocaleString()}`);

// Level 0: Country to Total Population
links.push({ source: nCountry, target: nTotal, value: totalPop });

// Level 1: Total Population to each outcome
links.push({ source: nTotal, target: nCiv, value: civDeaths });
links.push({ source: nTotal, target: nMilW, value: milWounded });
links.push({ source: nTotal, target: nUnaffected, value: unaffected });

// Level 2: Civilian and military flows into Total Deaths
links.push({ source: nCiv, target: nTotalDeath, value: civDeaths });
links.push({ source: nMilW, target: nMilD, value: milWounded });

// Level 3: Military Deaths flow into Total Deaths
links.push({ source: nMilD, target: nTotalDeath, value: milDeaths });

        
       
    });

    const sankeyLayout = d3.sankey()
        .nodeWidth(20)
        .nodePadding(30)
        .extent([[0, 0], [width - margin.left - margin.right, height - margin.top - margin.bottom]]);

    const sankeyData = {
        nodes: Array.from(nodes.values()),
        links: links.map(l => ({
            source: Array.from(nodes.keys()).indexOf(l.source),
            target: Array.from(nodes.keys()).indexOf(l.target),
            value: l.value
        }))
    };

    const { nodes: layoutNodes, links: layoutLinks } = sankeyLayout(sankeyData);
    const color = d3.scaleOrdinal(d3.schemeTableau10);

    // Draw the links
    svg.append("g")
        .selectAll("path")
        .data(layoutLinks)
        .join("path")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke", d => color(d.source.name))
        .attr("stroke-width", d => Math.max(1, d.width))
        .style("fill", "none")
        .style("opacity", 0.5);

    // Draw the nodes
    svg.append("g")
        .selectAll("rect")
        .data(layoutNodes)
        .join("rect")
        .attr("x", d => d.x0)
        .attr("y", d => d.y0)
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .style("fill", d => color(d.name))
        .style("stroke", "#000");

    // Draw the labels
    svg.append("g")
        .selectAll("text")
        .data(layoutNodes)
        .join("text")
        .attr("x", d => d.x0 < width / 2 ? d.x1 + 5 : d.x0 - 5)
        .attr("y", d => (d.y0 + d.y1) / 2)
        .attr("dy", "0.35em")
        .attr("text-anchor", d => d.x0 < width / 2 ? "start" : "end")
        .text(d => d.name);
}
window.addEventListener('load', init);

