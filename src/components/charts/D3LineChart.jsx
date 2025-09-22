import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const D3LineChart = ({
  data,
  title,
  height = 300,
  width = 600,
  showTooltip = true,
  animationDuration = 1000,
  colors = ["#10B981", "#3B82F6", "#EF4444", "#8B5CF6"]
}) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || !data.labels || data.labels.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Prepare data
    const datasets = Object.entries(data).filter(([key]) => key !== 'labels');
    const allValues = datasets.flatMap(([, values]) => values);
    const maxValue = d3.max(allValues) || 1;

    const xScale = d3.scalePoint()
      .domain(data.labels)
      .range([0, innerWidth]);

    const yScale = d3.scaleLinear()
      .domain([0, maxValue])
      .nice()
      .range([innerHeight, 0]);

    const line = d3.line()
      .x((d, i) => xScale(data.labels[i]))
      .y(d => yScale(d))
      .curve(d3.curveCardinal);

    const container = svg
      .attr("width", width)
      .attr("height", height)
      .style("background", "white")
      .style("border-radius", "12px")
      .style("box-shadow", "0 4px 6px -1px rgba(0, 0, 0, 0.1)");

    const g = container
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tooltip
    let tooltip;
    if (showTooltip) {
      tooltip = d3.select("body").append("div")
        .style("position", "absolute")
        .style("background", "rgba(0, 0, 0, 0.8)")
        .style("color", "white")
        .style("padding", "8px 12px")
        .style("border-radius", "6px")
        .style("font-size", "12px")
        .style("pointer-events", "none")
        .style("opacity", 0)
        .style("z-index", 1000);
    }

    // Add gradient definitions
    const defs = svg.append("defs");
    datasets.forEach(([,], index) => {
      const gradient = defs.append("linearGradient")
        .attr("id", `area-gradient-${index}`)
        .attr("gradientUnits", "userSpaceOnUse")
        .attr("x1", 0).attr("y1", innerHeight)
        .attr("x2", 0).attr("y2", 0);

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colors[index % colors.length])
        .attr("stop-opacity", 0.1);

      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colors[index % colors.length])
        .attr("stop-opacity", 0.3);
    });

    // Add grid lines
    g.selectAll(".grid-line-y")
      .data(yScale.ticks())
      .enter()
      .append("line")
      .attr("class", "grid-line-y")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .style("stroke", "#E5E7EB")
      .style("stroke-width", 1)
      .style("opacity", 0.7);

    g.selectAll(".grid-line-x")
      .data(data.labels)
      .enter()
      .append("line")
      .attr("class", "grid-line-x")
      .attr("x1", d => xScale(d))
      .attr("x2", d => xScale(d))
      .attr("y1", 0)
      .attr("y2", innerHeight)
      .style("stroke", "#F3F4F6")
      .style("stroke-width", 1)
      .style("opacity", 0.5);

    // Add X axis
    g.append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#6B7280");

    // Add Y axis
    g.append("g")
      .call(d3.axisLeft(yScale).tickFormat(d3.format("d")))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#6B7280");

    // Add area under lines
    const area = d3.area()
      .x((d, i) => xScale(data.labels[i]))
      .y0(innerHeight)
      .y1(d => yScale(d))
      .curve(d3.curveCardinal);

    datasets.forEach(([, values], index) => {
      g.append("path")
        .datum(values)
        .attr("class", `area-${index}`)
        .attr("d", area)
        .style("fill", `url(#area-gradient-${index})`)
        .style("opacity", 0)
        .transition()
        .duration(animationDuration)
        .delay(index * 200)
        .style("opacity", 1);
    });

    // Add lines
    datasets.forEach(([, values], index) => {
      const path = g.append("path")
        .datum(values)
        .attr("class", `line-${index}`)
        .attr("d", line)
        .style("fill", "none")
        .style("stroke", colors[index % colors.length])
        .style("stroke-width", 3)
        .style("stroke-linecap", "round")
        .style("stroke-linejoin", "round");

      // Animate line drawing
      const totalLength = path.node().getTotalLength();
      path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(animationDuration)
        .delay(index * 200)
        .ease(d3.easeLinear)
        .attr("stroke-dashoffset", 0);
    });

    // Add dots
    datasets.forEach(([key, values], index) => {
      const circles = g.selectAll(`.dot-${index}`)
        .data(values)
        .enter()
        .append("circle")
        .attr("class", `dot-${index}`)
        .attr("cx", (d, i) => xScale(data.labels[i]))
        .attr("cy", d => yScale(d))
        .attr("r", 0)
        .style("fill", colors[index % colors.length])
        .style("stroke", "white")
        .style("stroke-width", 2)
        .style("cursor", "pointer");

      // Animate dots
      circles
        .transition()
        .duration(300)
        .delay((d, i) => animationDuration + index * 200 + i * 50)
        .attr("r", 5);

      // Add hover effects
      if (showTooltip) {
        circles
          .on("mouseover", function(event, d) {
            const pointIndex = circles.nodes().indexOf(this);
            d3.select(this)
              .transition()
              .duration(200)
              .attr("r", 8)
              .style("opacity", 0.8);

            tooltip.transition()
              .duration(200)
              .style("opacity", 0.9);

            tooltip.html(`
              <strong>${key.charAt(0).toUpperCase() + key.slice(1)}</strong><br/>
              ${data.labels[pointIndex]}: ${d}
            `)
              .style("left", (event.pageX + 10) + "px")
              .style("top", (event.pageY - 28) + "px");
          })
          .on("mouseout", function() {
            d3.select(this)
              .transition()
              .duration(200)
              .attr("r", 5)
              .style("opacity", 1);

            tooltip.transition()
              .duration(500)
              .style("opacity", 0);
          });
      }
    });

    // Add legend
    const legend = g.append("g")
      .attr("class", "legend")
      .attr("transform", `translate(${innerWidth - 150}, 20)`);

    datasets.forEach(([datasetKey], index) => {
      const legendRow = legend.append("g")
        .attr("transform", `translate(0, ${index * 20})`);

      legendRow.append("rect")
        .attr("width", 15)
        .attr("height", 3)
        .style("fill", colors[index % colors.length])
        .style("rx", 2);

      legendRow.append("text")
        .attr("x", 20)
        .attr("y", 6)
        .style("font-size", "12px")
        .style("fill", "#374151")
        .style("font-weight", "500")
        .text(datasetKey.charAt(0).toUpperCase() + datasetKey.slice(1));
    });

    // Cleanup function
    return () => {
      if (tooltip) {
        tooltip.remove();
      }
    };
  }, [data, height, width, showTooltip, animationDuration, colors]);

  if (!data || !data.labels || data.labels.length === 0) {
    return (
      <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
        <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
        <p className="text-gray-500 text-center py-8">No data available</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100">
      <h3 className="text-lg font-bold text-gray-800 mb-4">{title}</h3>
      <div className="flex justify-center">
        <svg ref={svgRef}></svg>
      </div>
    </div>
  );
};

export default D3LineChart;