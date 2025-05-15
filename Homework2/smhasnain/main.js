// holds all the survey data for charts
let visualizationData = null;

// gets width/height/margins for a given div
function getDimensions(containerId) {
    const container = document.getElementById(containerId);
    const width = container.clientWidth - 40; // account for padding
    const height = container.clientHeight - 40;

    return {
        width: width,
        height: height,
        margin: {
            top: 40,
            right: 60,
            bottom: 60,
            left: 60
        }
    };
}

// load csv and prep it
d3.csv("data/mxmh_survey_results.csv").then(data => {
    // make num fields into nums
    data.forEach(d => {
        d.Age = +d.Age;
        d["Hours per day"] = +d["Hours per day"];
        d.Anxiety = +d.Anxiety;
        d.Depression = +d.Depression;
        d.Insomnia = +d.Insomnia;
        d.OCD = +d.OCD;
        d.BPM = +d.BPM;
    });

    console.log("Data loaded:", data[0]); // log first row
    visualizationData = data;

    // make all charts
    createVisualizations();

    // on resize, clear & redraw
    window.addEventListener('resize', debounce(function() {
        document.getElementById('genre-chart').innerHTML = '';
        document.getElementById('scatter-plot').innerHTML = '';
        document.getElementById('parallel-plot').innerHTML = '';
        createVisualizations();
    }, 250));
}).catch(error => {
    console.error("Error loading data:", error);
});

// limit how often resize fires
function debounce(func, wait) {
    let timeout;
    return function() {
        const context = this;
        const args = arguments;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}

// draws all 3 charts
function createVisualizations() {
    if (!visualizationData) return;

    createGenreChart(visualizationData, getDimensions('overview'));
    createDonutChart(visualizationData, getDimensions('focus1'));
    createSankeyDiagram(visualizationData, getDimensions('focus2'));
}

// genre chart - bars for anxiety, depression, etc by genre
function createGenreChart(data, dims) {
    const { width, height, margin } = dims;

    // make svg
    const svg = d3.select("#genre-chart")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // group by genre and calc avgs
    const genreGroups = d3.group(data, d => d["Fav genre"]);
    const genreData = Array.from(genreGroups, ([genre, values]) => ({
        genre,
        avgAnxiety: d3.mean(values, d => d.Anxiety),
        avgDepression: d3.mean(values, d => d.Depression),
        avgInsomnia: d3.mean(values, d => d.Insomnia),
        avgOCD: d3.mean(values, d => d.OCD)
    }));

    // keep valid genres and sort by depression
    const filteredGenreData = genreData
        .filter(d => d.genre && d.genre !== "")
        .sort((a, b) => b.avgDepression - a.avgDepression)
        .slice(0, 12);

    const x = d3.scaleBand()
        .domain(filteredGenreData.map(d => d.genre))
        .range([0, innerWidth])
        .padding(0.3);

    const y = d3.scaleLinear()
        .domain([0, d3.max(filteredGenreData, d =>
            Math.max(d.avgAnxiety, d.avgDepression, d.avgInsomnia, d.avgOCD)
        ) * 1.1])
        .range([innerHeight, 0]);

    // x axis
    svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .attr("transform", "translate(-10,0)rotate(-45)")
        .style("text-anchor", "end");

    // y axis
    svg.append("g").call(d3.axisLeft(y));

    // axis labels
    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + margin.bottom - 5)
        .text("Music Genre");

    svg.append("text")
        .attr("text-anchor", "middle")
        .attr("transform", "rotate(-90)")
        .attr("y", -margin.left + 20)
        .attr("x", -innerHeight / 2)
        .text("Mental Health Score (0-10)");

    const colors = {
        anxiety: "#FF9B54",
        depression: "#4A7B9D",
        insomnia: "#AC3931",
        ocd: "#57A773"
    };

    const barWidth = x.bandwidth() / 4;

    // make 4 bars per genre
    svg.selectAll(".bar-anxiety")
        .data(filteredGenreData)
        .enter().append("rect")
        .attr("class", "bar-anxiety")
        .attr("x", d => x(d.genre))
        .attr("y", d => y(d.avgAnxiety))
        .attr("width", barWidth)
        .attr("height", d => innerHeight - y(d.avgAnxiety))
        .attr("fill", colors.anxiety);

    svg.selectAll(".bar-depression")
        .data(filteredGenreData)
        .enter().append("rect")
        .attr("class", "bar-depression")
        .attr("x", d => x(d.genre) + barWidth)
        .attr("y", d => y(d.avgDepression))
        .attr("width", barWidth)
        .attr("height", d => innerHeight - y(d.avgDepression))
        .attr("fill", colors.depression);

    svg.selectAll(".bar-insomnia")
        .data(filteredGenreData)
        .enter().append("rect")
        .attr("class", "bar-insomnia")
        .attr("x", d => x(d.genre) + 2 * barWidth)
        .attr("y", d => y(d.avgInsomnia))
        .attr("width", barWidth)
        .attr("height", d => innerHeight - y(d.avgInsomnia))
        .attr("fill", colors.insomnia);

    svg.selectAll(".bar-ocd")
        .data(filteredGenreData)
        .enter().append("rect")
        .attr("class", "bar-ocd")
        .attr("x", d => x(d.genre) + 3 * barWidth)
        .attr("y", d => y(d.avgOCD))
        .attr("width", barWidth)
        .attr("height", d => innerHeight - y(d.avgOCD))
        .attr("fill", colors.ocd);

    // legend in top right
    const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 150}, 20)`);

    const legendItems = [
        { label: "Anxiety", color: colors.anxiety },
        { label: "Depression", color: colors.depression },
        { label: "Insomnia", color: colors.insomnia },
        { label: "OCD", color: colors.ocd }
    ];

    legendItems.forEach((item, i) => {
        const legendGroup = legend.append("g")
            .attr("transform", `translate(0, ${i * 20})`);

        legendGroup.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", item.color);

        legendGroup.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(item.label);
    });

    // title at top
    svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -margin.top / 2)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Mental Health Metrics by Favorite Music Genre");
}


// visualization 2: donut chart for genre distribution
function createDonutChart(data, dims) {
    const { width, height, margin } = dims;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // keep only rows w/ valid genre
    const filteredData = data.filter(d => d["Fav genre"] && d["Fav genre"] !== "");

    // count how many per genre
    const genreCounts = {};
    filteredData.forEach(d => {
        const genre = d["Fav genre"];
        genreCounts[genre] = (genreCounts[genre] || 0) + 1;
    });

    // convert to array and get top 8
    let genreData = Object.entries(genreCounts)
        .map(([genre, count]) => ({ genre, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);

    // add “other” for the rest
    const totalCount = filteredData.length;
    const topCount = genreData.reduce((sum, d) => sum + d.count, 0);
    if (topCount < totalCount) {
        genreData.push({ genre: "Other", count: totalCount - topCount });
    }

    const chartArea = innerWidth * 0.7;
    const outerRadius = Math.min(chartArea, innerHeight) / 2.5;
    const innerRadius = outerRadius * 0.5;

    const centerX = chartArea / 2;
    const centerY = innerHeight / 2;

    // make svg
    const svg = d3.select("#scatter-plot")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const pieGroup = svg.append("g")
        .attr("transform", `translate(${centerX}, ${centerY})`);

    const color = d3.scaleOrdinal()
        .domain(genreData.map(d => d.genre))
        .range(d3.schemeCategory10);

    const pie = d3.pie().value(d => d.count).sort(null);
    const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius);

    const arcs = pieGroup.selectAll("arc")
        .data(pie(genreData))
        .enter().append("g").attr("class", "arc");

    // draw arcs
    arcs.append("path")
        .attr("d", arc)
        .attr("fill", d => color(d.data.genre))
        .attr("stroke", "white")
        .style("stroke-width", "2px");

    // add % labels if big enough
    arcs.append("text")
        .attr("transform", d => {
            const [x, y] = arc.centroid(d);
            return `translate(${x * 1.1}, ${y * 1.1})`;
        })
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .text(d => {
            const percent = (d.data.count / totalCount * 100).toFixed(1);
            return percent > 3 ? `${percent}%` : "";
        });

    // legend on right
    const legendX = chartArea + 20;
    const legendY = centerY - (genreData.length * 10);

    const legend = svg.append("g")
        .attr("transform", `translate(${legendX}, ${legendY})`);

    const legendItemHeight = 20;
    const availableHeight = innerHeight - 40;
    const maxItemsInColumn = Math.floor(availableHeight / legendItemHeight);
    const needsColumns = genreData.length > maxItemsInColumn;

    genreData.forEach((d, i) => {
        const col = needsColumns ? Math.floor(i / maxItemsInColumn) : 0;
        const row = needsColumns ? i % maxItemsInColumn : i;

        const legendRow = legend.append("g")
            .attr("transform", `translate(${col * 100}, ${row * legendItemHeight})`);

        legendRow.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", color(d.genre));

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(d.genre);
    });

    // chart title
    svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Distribution of Favorite Music Genres");
}

// visualization 3: sankey diagram for genres vs depression levels
function createSankeyDiagram(data, dims) {
    const { width, height, margin } = dims;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // filter bad rows
    const filteredData = data.filter(d =>
        d["Fav genre"] && d["Fav genre"] !== "" &&
        !isNaN(d.Depression) &&
        d.Depression >= 0 && d.Depression <= 10
    );

    const svg = d3.select("#parallel-plot")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // bin depression scores
    const getDepressionLevel = score => {
        if (score <= 3) return "Low (0-3)";
        if (score <= 7) return "Medium (4-7)";
        return "High (8-10)";
    };

    // find top genres
    const genreCounts = {};
    filteredData.forEach(d => {
        genreCounts[d["Fav genre"]] = (genreCounts[d["Fav genre"]] || 0) + 1;
    });

    const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(d => d[0]);

    // keep only top genres
    const processedData = filteredData.filter(d => topGenres.includes(d["Fav genre"]));

    // make nodes and links
    const nodeMap = new Map();
    let nodeId = 0;
    const getNodeId = name => {
        if (!nodeMap.has(name)) nodeMap.set(name, nodeId++);
        return nodeMap.get(name);
    };

    const links = [];
    const linkMap = new Map();

    processedData.forEach(d => {
        const genre = d["Fav genre"];
        const level = getDepressionLevel(d.Depression);
        const key = `${genre}-${level}`;
        linkMap.set(key, (linkMap.get(key) || 0) + 1);
    });

    linkMap.forEach((value, key) => {
        const [source, target] = key.split('-');
        links.push({
            source: getNodeId(source),
            target: getNodeId(target),
            value
        });
    });

    const nodes = Array.from(nodeMap.entries())
        .map(([name, id]) => ({ id, name }))
        .sort((a, b) => a.id - b.id);

    const sankey = d3.sankey()
        .nodeId(d => d.id)
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[0, 0], [innerWidth, innerHeight]]);

    const sankeyData = sankey({ nodes, links });

    const genreColor = d3.scaleOrdinal(d3.schemeCategory10);

    // draw links
    const link = svg.append("g")
        .selectAll(".link")
        .data(sankeyData.links)
        .enter().append("path")
        .attr("class", "link")
        .attr("d", d3.sankeyLinkHorizontal())
        .attr("stroke-width", d => Math.max(1, d.width))
        .attr("stroke", d => {
            const sourceNode = sankeyData.nodes[d.source.index];
            return d3.color(genreColor(sourceNode.name)).brighter(0.5);
        })
        .attr("fill", "none")
        .attr("opacity", 0.5)
        .append("title")
        .text(d => `${d.source.name} → ${d.target.name}: ${d.value}`);

    // draw nodes
    const node = svg.append("g")
        .selectAll(".node")
        .data(sankeyData.nodes)
        .enter().append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x0}, ${d.y0})`);

    node.append("rect")
        .attr("height", d => d.y1 - d.y0)
        .attr("width", d => d.x1 - d.x0)
        .attr("fill", d => {
            if (d.name.includes("Low")) return "#57A773";
            if (d.name.includes("Medium")) return "#FFD166";
            if (d.name.includes("High")) return "#EF476F";
            return genreColor(d.name);
        })
        .attr("stroke", "#000")
        .append("title")
        .text(d => `${d.name}: ${d.value}`);

    node.append("text")
        .attr("x", d => d.x0 < innerWidth / 2 ? (d.x1 - d.x0) + 6 : -6)
        .attr("y", d => (d.y1 - d.y0) / 2)
        .attr("dy", ".35em")
        .attr("text-anchor", d => d.x0 < innerWidth / 2 ? "start" : "end")
        .text(d => d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name)
        .style("font-size", "10px")
        .style("font-weight", d => d.name.includes("(") ? "bold" : "normal")
        .filter(d => (d.y1 - d.y0) < 15)
        .remove();

    // chart title
    svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Relationship Between Music Genres and Depression Levels");
}
