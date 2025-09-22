import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const D3BarChart = ({
  data,
  labels,
  title,
  color = "#10B981",
  height = 300,
  width = 500,
  showTooltip = true,
  animationDuration = 750
}) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || !labels || data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const margin = { top: 20, right: 30, bottom: 60, left: 60 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const xScale = d3.scaleBand()
      .domain(labels)
      .range([0, innerWidth])
      .padding(0.2);

    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data) || 1])
      .nice()
      .range([innerHeight, 0]);

    const container = svg
      .attr("width", width)
      .attr("height", height)
      .style("background", "white")
      .style("border-radius", "12px")
      .style("box-shadow", "0 4px 6px -1px rgba(0, 0, 0, 0.1)");

    const g = container
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Add gradient definition
    const gradient = svg.append("defs")
      .append("linearGradient")
      .attr("id", "barGradient")
      .attr("gradientUnits", "userSpaceOnUse")
      .attr("x1", 0).attr("y1", innerHeight)
      .attr("x2", 0).attr("y2", 0);

    gradient.append("stop")
      .attr("offset", "0%")
      .attr("stop-color", color)
      .attr("stop-opacity", 0.8);

    gradient.append("stop")
      .attr("offset", "100%")
      .attr("stop-color", color)
      .attr("stop-opacity", 1);

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

    // Add grid lines
    g.selectAll(".grid-line")
      .data(yScale.ticks())
      .enter()
      .append("line")
      .attr("class", "grid-line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", d => yScale(d))
      .attr("y2", d => yScale(d))
      .style("stroke", "#E5E7EB")
      .style("stroke-width", 1)
      .style("opacity", 0.7);

    // Add bars
    const bars = g.selectAll(".bar")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "bar")
      .attr("x", (d, i) => xScale(labels[i]))
      .attr("width", xScale.bandwidth())
      .attr("y", innerHeight)
      .attr("height", 0)
      .style("fill", "url(#barGradient)")
      .style("cursor", "pointer")
      .style("transition", "all 0.3s ease");

    // Animate bars
    bars.transition()
      .duration(animationDuration)
      .delay((d, i) => i * 100)
      .attr("y", d => yScale(d))
      .attr("height", d => innerHeight - yScale(d));

    // Add hover effects
    if (showTooltip) {
      bars
        .on("mouseover", function(event, d) {
          const index = bars.nodes().indexOf(this);
          d3.select(this)
            .style("opacity", 0.8)
            .style("transform", "translateY(-2px)");

          tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);

          tooltip.html(`<strong>${labels[index]}</strong><br/>Value: ${d}`)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
          d3.select(this)
            .style("opacity", 1)
            .style("transform", "translateY(0px)");

          tooltip.transition()
            .duration(500)
            .style("opacity", 0);
        });
    }

    // Add value labels on bars
    g.selectAll(".bar-label")
      .data(data)
      .enter()
      .append("text")
      .attr("class", "bar-label")
      .attr("x", (d, i) => xScale(labels[i]) + xScale.bandwidth() / 2)
      .attr("y", d => yScale(d) - 5)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("font-weight", "bold")
      .style("fill", "#374151")
      .style("opacity", 0)
      .text(d => d)
      .transition()
      .duration(animationDuration)
      .delay((d, i) => i * 100 + 500)
      .style("opacity", 1);

    // Cleanup function
    return () => {
      if (tooltip) {
        tooltip.remove();
      }
    };
  }, [data, labels, color, height, width, showTooltip, animationDuration]);

  if (!data || !labels || data.length === 0) {
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

export default D3BarChart;