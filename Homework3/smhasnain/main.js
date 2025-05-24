// survey data for charts
let visualizationData = null;
// selected genres for interactions
let selectedGenres = new Set();

// get dimensions for a div
function getDimensions(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
        console.error(`Container with ID ${containerId} not found`);
        return { width: 800, height: 400, margin: { top: 40, right: 60, bottom: 60, left: 60 } };
    }

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
    window.addEventListener('resize', debounce(function () {
        document.getElementById('genre-chart').innerHTML = '';
        document.getElementById('scatter-plot').innerHTML = '';
        document.getElementById('parallel-plot').innerHTML = '';
        selectedGenres.clear(); // Clear selections on resize
        createVisualizations();
    }, 250));
}).catch(error => {
    console.error("Error loading data:", error);
});

// limit how often resize fires
function debounce(func, wait) {
    let timeout;
    return function () {
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

// Update visualizations based on selected genres with smooth transitions
function updateVisualizationsForSelection() {
    console.log("Updating visualizations for selection:", Array.from(selectedGenres)); // Debug log

    if (!visualizationData) return;

    // Update donut chart highlighting
    updateDonutChartSelection();

    // Update sankey diagram filtering  
    updateSankeyDiagramForSelection();

    // Update bar chart highlighting
    updateBarChartSelection();
}

// genre chart - bars for anxiety, depression, etc by genre
function createGenreChart(data, dims) {
    const { width, height, margin } = dims;

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

    // Add global click handler to close tooltips
    d3.select("body").on("click", function () {
        d3.selectAll(".tooltip").remove();
    });
}

// Update bar chart highlighting based on selection
function updateBarChartSelection() {
    d3.selectAll(".bar-genre")
        .transition()
        .duration(500)
        .attr("opacity", d => {
            if (selectedGenres.size === 0) return 1; // No selection, show all
            return selectedGenres.has(d.genre) ? 1 : 0.3; // Fade non-selected
        })
        .attr("stroke-width", d => selectedGenres.has(d.genre) ? 3 : 1)
        .attr("stroke", d => selectedGenres.has(d.genre) ? "#000" : "white");
}

// visualization 2: donut chart for genre distribution WITH FIXED SELECTION
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

    // add "other" for the rest
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

    // Create expanded arc for selection effect
    const expandedArc = d3.arc()
        .innerRadius(innerRadius)
        .outerRadius(outerRadius + 10);

    const arcs = pieGroup.selectAll("arc")
        .data(pie(genreData))
        .enter().append("g")
        .attr("class", "arc");

    // draw arcs with FIXED selection functionality
    const paths = arcs.append("path")
        .attr("class", "donut-slice")
        .attr("data-genre", d => d.data.genre)
        .attr("d", arc)
        .attr("fill", d => color(d.data.genre))
        .attr("stroke", "white")
        .style("stroke-width", "2px")
        .style("cursor", "pointer")
        .on("click", function (event, d) {
            event.stopPropagation(); // Prevent event bubbling

            const genre = d.data.genre;
            console.log("Clicked on genre:", genre); // Debug log

            // Show detailed stats tooltip on click
            const percent = (d.data.count / totalCount * 100).toFixed(1);

            // Remove any existing tooltips first
            d3.selectAll(".tooltip").remove();

            // Show detailed tooltip
            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("background", "rgba(0,0,0,0.9)")
                .style("color", "white")
                .style("padding", "15px")
                .style("border-radius", "8px")
                .style("pointer-events", "none")
                .style("font-size", "13px")
                .style("z-index", "1000")
                .style("border", "2px solid #fff");

            tooltip.html(`<strong>Genre: ${d.data.genre}</strong><br>Count: ${d.data.count}<br>Percentage: ${percent}%<br><br><em>Click elsewhere to close</em>`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");

            if (genre !== "Other") { // Don't allow selection of "Other"
                if (selectedGenres.has(genre)) {
                    selectedGenres.delete(genre);
                    console.log("Removed genre:", genre);
                } else {
                    selectedGenres.add(genre);
                    console.log("Added genre:", genre);
                }

                console.log("Current selections:", Array.from(selectedGenres));
                updateVisualizationsForSelection();

                // Immediate visual feedback for the clicked slice
                d3.select(this)
                    .transition()
                    .duration(300)
                    .attr("stroke-width", selectedGenres.has(genre) ? "4px" : "2px")
                    .attr("stroke", selectedGenres.has(genre) ? "#000" : "white");
            } else {
                console.log("Cannot select 'Other' category");
            }
        });

    // add % labels if big enough
    arcs.append("text")
        .attr("class", "slice-label")
        .attr("data-genre", d => d.data.genre)
        .attr("transform", d => {
            const [x, y] = arc.centroid(d);
            return `translate(${x * 1.1}, ${y * 1.1})`;
        })
        .attr("text-anchor", "middle")
        .attr("font-size", "12px")
        .style("pointer-events", "none") // Prevent labels from interfering with clicks
        .text(d => {
            const percent = (d.data.count / totalCount * 100).toFixed(1);
            return percent > 3 ? `${percent}%` : "";
        });

    // legend on right with FIXED selection functionality
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
            .attr("class", "legend-item")
            .attr("data-genre", d.genre)
            .attr("transform", `translate(${col * 100}, ${row * legendItemHeight})`)
            .style("cursor", d.genre !== "Other" ? "pointer" : "default")
            .on("click", function (event) {
                event.stopPropagation();

                if (d.genre !== "Other") {
                    console.log("Legend clicked for genre:", d.genre);

                    if (selectedGenres.has(d.genre)) {
                        selectedGenres.delete(d.genre);
                    } else {
                        selectedGenres.add(d.genre);
                    }

                    updateVisualizationsForSelection();

                    // Immediate visual feedback
                    d3.select(this)
                        .transition()
                        .duration(300)
                        .attr("opacity", selectedGenres.has(d.genre) ? 1 : 0.7);
                }
            })
            .on("mouseover", function () {
                if (d.genre !== "Other") {
                    d3.select(this)
                        .transition()
                        .duration(200)
                        .attr("opacity", 0.7);
                }
            })
            .on("mouseout", function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("opacity", selectedGenres.has(d.genre) ? 1 : 1);
            });

        legendRow.append("rect")
            .attr("width", 15)
            .attr("height", 15)
            .attr("fill", color(d.genre))
            .attr("stroke", "white")
            .attr("stroke-width", 1);

        legendRow.append("text")
            .attr("x", 20)
            .attr("y", 12)
            .text(d.genre)
            .style("font-size", "12px");
    });

    // Add selection instructions
    svg.append("text")
        .attr("x", 10)
        .attr("y", 30)
        .attr("font-size", "12px")
        .attr("fill", "#666")
        .text("Click slices or legend to select genres");

    // chart title
    svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", 15)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Distribution of Favorite Music Genres (Click to Select)");

    // Add global click handler to close tooltips
    d3.select("body").on("click", function () {
        d3.selectAll(".tooltip").remove();
    });
}

// Update donut chart highlighting based on selection - FIXED VERSION
function updateDonutChartSelection() {
    console.log("Updating donut chart selection"); // Debug log
    console.log("Selected genres:", Array.from(selectedGenres)); // Debug log

    // Update slice highlighting
    d3.selectAll(".donut-slice")
        .transition()
        .duration(500)
        .attr("opacity", d => {
            if (selectedGenres.size === 0) return 1;
            return selectedGenres.has(d.data.genre) ? 1 : 0.3;
        })
        .style("stroke-width", d => selectedGenres.has(d.data.genre) ? "4px" : "2px")
        .style("stroke", d => selectedGenres.has(d.data.genre) ? "#000" : "white");

    // Update label highlighting
    d3.selectAll(".slice-label")
        .transition()
        .duration(500)
        .attr("opacity", d => {
            if (selectedGenres.size === 0) return 1;
            return selectedGenres.has(d.data.genre) ? 1 : 0.4;
        })
        .style("font-weight", d => selectedGenres.has(d.data.genre) ? "bold" : "normal");

    // Update legend highlighting
    d3.selectAll(".legend-item")
        .transition()
        .duration(500)
        .attr("opacity", d => {
            if (selectedGenres.size === 0) return 1;
            return selectedGenres.has(d.genre) ? 1 : 0.4;
        });

    // Calculate total percentage of selected genres
    let totalSelectedCount = 0;
    let totalCount = 0;

    // Get data from the actual DOM elements
    d3.selectAll(".donut-slice").each(function (d) {
        totalCount += d.data.count;
        if (selectedGenres.has(d.data.genre)) {
            totalSelectedCount += d.data.count;
        }
    });

    console.log("Total count:", totalCount, "Selected count:", totalSelectedCount); // Debug log

    // Update selection status text with percentage
    let statusText;
    if (selectedGenres.size === 0) {
        statusText = "No genres selected";
    } else {
        const percentage = ((totalSelectedCount / totalCount) * 100).toFixed(1);
        statusText = `Selected: ${Array.from(selectedGenres).join(", ")} (${percentage}% of total)`;
    }

    console.log("Status text:", statusText); // Debug log

    // Update the specific status text by ID
    d3.select("#donut-status").text(statusText);
    console.log("Donut status element text set to:", statusText);
}

// visualization 3: sankey diagram WITH FILTERING based on selection
function createSankeyDiagram(data, dims) {
    const { width, height, margin } = dims;

    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select("#parallel-plot")
        .append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Function to create/update the Sankey diagram
    function updateSankey(filteredData) {
        // Clear existing content
        svg.selectAll("*").remove();

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

        if (nodes.length === 0 || links.length === 0) {
            // Show message when no data
            svg.append("text")
                .attr("x", innerWidth / 2)
                .attr("y", innerHeight / 2)
                .attr("text-anchor", "middle")
                .style("font-size", "16px")
                .style("fill", "#666")
                .text("No data available for selected genres");
            return;
        }

        const sankey = d3.sankey()
            .nodeId(d => d.id)
            .nodeWidth(15)
            .nodePadding(10)
            .extent([[0, 0], [innerWidth, innerHeight]]);

        const sankeyData = sankey({ nodes, links });

        const genreColor = d3.scaleOrdinal(d3.schemeCategory10);

        // draw links with smooth animation
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
            .attr("opacity", 0)
            .on("mouseover", function (event, d) {
                // Highlight link on hover
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("opacity", 0.8);

                // Show tooltip
                const tooltip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("position", "absolute")
                    .style("background", "rgba(0,0,0,0.8)")
                    .style("color", "white")
                    .style("padding", "10px")
                    .style("border-radius", "5px")
                    .style("pointer-events", "none")
                    .style("font-size", "12px");

                tooltip.html(`${d.source.name} → ${d.target.name}<br>Count: ${d.value}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("opacity", 0.5);
                d3.selectAll(".tooltip").remove();
            });

        // Animate links in
        link.transition()
            .duration(1000)
            .attr("opacity", 0.5);

        // draw nodes with animation
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
            .attr("opacity", 0)
            .on("mouseover", function (event, d) {
                // Highlight node
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("stroke-width", 3);

                // Show tooltip
                const tooltip = d3.select("body").append("div")
                    .attr("class", "tooltip")
                    .style("position", "absolute")
                    .style("background", "rgba(0,0,0,0.8)")
                    .style("color", "white")
                    .style("padding", "10px")
                    .style("border-radius", "5px")
                    .style("pointer-events", "none")
                    .style("font-size", "12px");

                tooltip.html(`${d.name}<br>Total: ${d.value}`)
                    .style("left", (event.pageX + 10) + "px")
                    .style("top", (event.pageY - 10) + "px");
            })
            .on("mouseout", function () {
                d3.select(this)
                    .transition()
                    .duration(200)
                    .attr("stroke-width", 1);
                d3.selectAll(".tooltip").remove();
            });

        // Animate nodes in
        node.selectAll("rect")
            .transition()
            .duration(800)
            .delay(200)
            .attr("opacity", 1);

        // Add node labels with animation
        const labels = node.append("text")
            .attr("x", d => d.x0 < innerWidth / 2 ? (d.x1 - d.x0) + 6 : -6)
            .attr("y", d => (d.y1 - d.y0) / 2)
            .attr("dy", ".35em")
            .attr("text-anchor", d => d.x0 < innerWidth / 2 ? "start" : "end")
            .text(d => d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name)
            .style("font-size", "10px")
            .style("font-weight", d => d.name.includes("(") ? "bold" : "normal")
            .attr("opacity", 0)
            .filter(d => (d.y1 - d.y0) >= 15); // Only show labels for large enough nodes

        labels.transition()
            .duration(600)
            .delay(400)
            .attr("opacity", 1);

        // Add selection indicator if genres are selected
        if (selectedGenres.size > 0) {
            svg.append("text")
                .attr("x", 10)
                .attr("y", 30)
                .attr("font-size", "12px")
                .attr("fill", "#666")
                .text(`Filtered by: ${Array.from(selectedGenres).join(", ")}`);
        }

        // chart title
        svg.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", -10)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("font-weight", "bold")
            .text("Music Genres and Depression Levels" + (selectedGenres.size > 0 ? " (Filtered)" : ""));
    }

    // Initial creation with all data
    const filteredData = data.filter(d =>
        d["Fav genre"] && d["Fav genre"] !== "" &&
        !isNaN(d.Depression) &&
        d.Depression >= 0 && d.Depression <= 10
    );

    updateSankey(filteredData);

    // Store reference for updates
    window.sankeyUpdate = function () {
        updateSankeyDiagramForSelection();
    };
}

// FIXED Sankey diagram update that preserves hover functionality
function updateSankeyDiagramForSelection() {
    if (!visualizationData) return;

    let filteredData = visualizationData.filter(d =>
        d["Fav genre"] && d["Fav genre"] !== "" &&
        !isNaN(d.Depression) &&
        d.Depression >= 0 && d.Depression <= 10
    );

    // If genres are selected, filter the data
    if (selectedGenres.size > 0) {
        filteredData = filteredData.filter(d => selectedGenres.has(d["Fav genre"]));
    }

    // Get dimensions for recreation
    const dims = getDimensions('focus2');
    const { width, height, margin } = dims;
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Get the SVG and clear it
    const svg = d3.select("#parallel-plot svg g");
    svg.selectAll("*").remove();

    if (filteredData.length === 0) {
        svg.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "#666")
            .text("No data available for selected genres");
        return;
    }

    // Recreate Sankey with the same logic as in createSankeyDiagram
    const getDepressionLevel = score => {
        if (score <= 3) return "Low (0-3)";
        if (score <= 7) return "Medium (4-7)";
        return "High (8-10)";
    };

    const genreCounts = {};
    filteredData.forEach(d => {
        genreCounts[d["Fav genre"]] = (genreCounts[d["Fav genre"]] || 0) + 1;
    });

    const topGenres = Object.entries(genreCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(d => d[0]);

    const processedData = filteredData.filter(d => topGenres.includes(d["Fav genre"]));

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

    if (nodes.length === 0 || links.length === 0) {
        svg.append("text")
            .attr("x", innerWidth / 2)
            .attr("y", innerHeight / 2)
            .attr("text-anchor", "middle")
            .style("font-size", "16px")
            .style("fill", "#666")
            .text("No data available for selected genres");
        return;
    }

    const sankey = d3.sankey()
        .nodeId(d => d.id)
        .nodeWidth(15)
        .nodePadding(10)
        .extent([[0, 0], [innerWidth, innerHeight]]);

    const sankeyData = sankey({ nodes, links });
    const genreColor = d3.scaleOrdinal(d3.schemeCategory10);

    // Create links with FULL hover functionality restored
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
        .attr("opacity", 0)
        .on("mouseover", function (event, d) {
            // Highlight link on hover
            d3.select(this)
                .transition()
                .duration(200)
                .attr("opacity", 0.8)
                .attr("stroke-width", d => Math.max(3, d.width + 2));

            // Show tooltip
            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("background", "rgba(0,0,0,0.8)")
                .style("color", "white")
                .style("padding", "10px")
                .style("border-radius", "5px")
                .style("pointer-events", "none")
                .style("font-size", "12px")
                .style("z-index", "1000");

            tooltip.html(`${d.source.name} → ${d.target.name}<br>Count: ${d.value}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function (event, d) {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("opacity", 0.5)
                .attr("stroke-width", d => Math.max(1, d.width));
            d3.selectAll(".tooltip").remove();
        });

    // Animate links in
    link.transition()
        .duration(800)
        .attr("opacity", 0.5);

    // Create nodes with FULL hover functionality restored
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
        .attr("opacity", 0)
        .on("mouseover", function (event, d) {
            // Highlight node
            d3.select(this)
                .transition()
                .duration(200)
                .attr("stroke-width", 3)
                .attr("opacity", 1);

            // Show tooltip
            const tooltip = d3.select("body").append("div")
                .attr("class", "tooltip")
                .style("position", "absolute")
                .style("background", "rgba(0,0,0,0.8)")
                .style("color", "white")
                .style("padding", "10px")
                .style("border-radius", "5px")
                .style("pointer-events", "none")
                .style("font-size", "12px")
                .style("z-index", "1000");

            tooltip.html(`${d.name}<br>Total: ${d.value}`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 10) + "px");
        })
        .on("mouseout", function () {
            d3.select(this)
                .transition()
                .duration(200)
                .attr("stroke-width", 1)
                .attr("opacity", 1);
            d3.selectAll(".tooltip").remove();
        });

    // Animate nodes in
    node.selectAll("rect")
        .transition()
        .duration(600)
        .delay(200)
        .attr("opacity", 1);

    // Add node labels with animation
    const labels = node.append("text")
        .attr("x", d => d.x0 < innerWidth / 2 ? (d.x1 - d.x0) + 6 : -6)
        .attr("y", d => (d.y1 - d.y0) / 2)
        .attr("dy", ".35em")
        .attr("text-anchor", d => d.x0 < innerWidth / 2 ? "start" : "end")
        .text(d => d.name.length > 15 ? d.name.substring(0, 15) + "..." : d.name)
        .style("font-size", "10px")
        .style("font-weight", d => d.name.includes("(") ? "bold" : "normal")
        .attr("opacity", 0)
        .style("pointer-events", "none") // Prevent labels from interfering with hover
        .filter(d => (d.y1 - d.y0) >= 15); // Only show labels for large enough nodes

    labels.transition()
        .duration(400)
        .delay(400)
        .attr("opacity", 1);

    // Add selection indicator
    if (selectedGenres.size > 0) {
        svg.append("text")
            .attr("x", 10)
            .attr("y", 30)
            .attr("font-size", "12px")
            .attr("fill", "#666")
            .text(`Filtered by: ${Array.from(selectedGenres).join(", ")}`);
    }

    // Update title
    svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", -10)
        .attr("text-anchor", "middle")
        .style("font-size", "16px")
        .style("font-weight", "bold")
        .text("Music Genres and Depression Levels" + (selectedGenres.size > 0 ? " (Filtered)" : ""));
}
