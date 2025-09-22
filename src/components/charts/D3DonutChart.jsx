import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';

const D3DonutChart = ({
  data,
  title,
  width = 350,
  height = 350,
  showTooltip = true,
  showCenterText = true,
  animationDuration = 750
}) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || Object.keys(data).length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const total = Object.values(data).reduce((sum, value) => sum + value, 0);
    if (total === 0) return;

    const margin = 40;
    const radius = Math.min(width, height) / 2 - margin;
    const innerRadius = radius * 0.6;

    const color = d3.scaleOrdinal()
      .domain(Object.keys(data))
      .range(["#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#06B6D4", "#F97316", "#EC4899"]);

    const container = svg
      .attr("width", width)
      .attr("height", height)
      .style("background", "white")
      .style("border-radius", "12px")
      .style("box-shadow", "0 4px 6px -1px rgba(0, 0, 0, 0.1)");

    const g = container
      .append("g")
      .attr("transform", `translate(${width / 2}, ${height / 2})`);

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

    // Prepare data for D3
    const pieData = Object.entries(data).map(([key, value]) => ({
      label: key,
      value: value,
      percentage: ((value / total) * 100).toFixed(1)
    }));

    const pie = d3.pie()
      .value(d => d.value)
      .sort((a, b) => b.value - a.value);

    const arc = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius);

    const arcHover = d3.arc()
      .innerRadius(innerRadius)
      .outerRadius(radius + 8);

    // Add gradient definitions
    const defs = svg.append("defs");
    Object.keys(data).forEach((key, index) => {
      const gradient = defs.append("radialGradient")
        .attr("id", `donut-gradient-${index}`)
        .attr("cx", "30%")
        .attr("cy", "30%");

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", d3.color(color(key)).brighter(0.3));

      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", color(key));
    });

    // Create donut slices
    const slices = g.selectAll(".slice")
      .data(pie(pieData))
      .enter()
      .append("g")
      .attr("class", "slice")
      .style("cursor", "pointer");

    // Add paths
    slices.append("path")
      .attr("d", arc)
      .style("fill", (d, i) => `url(#donut-gradient-${i})`)
      .style("stroke", "white")
      .style("stroke-width", 2)
      .style("transition", "all 0.3s ease")
      .each(function() {
        this._current = { startAngle: 0, endAngle: 0 };
      })
      .transition()
      .duration(animationDuration)
      .attrTween("d", function(d) {
        const interpolate = d3.interpolate(this._current, d);
        this._current = interpolate(0);
        return function(t) {
          return arc(interpolate(t));
        };
      });

    // Add center text
    if (showCenterText) {
      const centerGroup = g.append("g")
        .attr("class", "center-text")
        .style("text-anchor", "middle");

      centerGroup.append("text")
        .attr("y", -10)
        .style("font-size", "24px")
        .style("font-weight", "bold")
        .style("fill", "#1F2937")
        .style("opacity", 0)
        .text(total)
        .transition()
        .duration(animationDuration)
        .delay(500)
        .style("opacity", 1);

      centerGroup.append("text")
        .attr("y", 15)
        .style("font-size", "12px")
        .style("fill", "#6B7280")
        .style("opacity", 0)
        .text("Total")
        .transition()
        .duration(animationDuration)
        .delay(700)
        .style("opacity", 1);
    }

    // Add outer labels with lines
    slices.each(function(d, i) {
      const slice = d3.select(this);
      const angle = (d.startAngle + d.endAngle) / 2;
      const outerRadius = radius + 30;
      const lineRadius = radius + 10;

      // Only show labels for significant slices
      if (d.data.value > total * 0.05) {
        // Add line
        slice.append("line")
          .attr("x1", Math.sin(angle) * lineRadius)
          .attr("y1", -Math.cos(angle) * lineRadius)
          .attr("x2", Math.sin(angle) * outerRadius)
          .attr("y2", -Math.cos(angle) * outerRadius)
          .style("stroke", "#6B7280")
          .style("stroke-width", 1)
          .style("opacity", 0)
          .transition()
          .duration(animationDuration)
          .delay(1000 + i * 100)
          .style("opacity", 0.7);

        // Add label
        slice.append("text")
          .attr("x", Math.sin(angle) * outerRadius)
          .attr("y", -Math.cos(angle) * outerRadius)
          .attr("dy", "0.35em")
          .style("text-anchor", angle > Math.PI ? "end" : "start")
          .style("font-size", "11px")
          .style("font-weight", "500")
          .style("fill", "#374151")
          .style("opacity", 0)
          .text(`${d.data.label.replace(/([A-Z])/g, " $1").toLowerCase()} (${d.data.percentage}%)`)
          .transition()
          .duration(animationDuration)
          .delay(1000 + i * 100)
          .style("opacity", 1);
      }
    });

    // Add hover effects
    if (showTooltip) {
      slices
        .on("mouseover", function(event, data) {
          d3.select(this).select("path")
            .transition()
            .duration(200)
            .attr("d", arcHover)
            .style("opacity", 0.8);

          tooltip.transition()
            .duration(200)
            .style("opacity", 0.9);

          const label = data.data.label.replace(/([A-Z])/g, " $1").toLowerCase();
          tooltip.html(`
            <strong>${label.charAt(0).toUpperCase() + label.slice(1)}</strong><br/>
            Value: ${data.data.value}<br/>
            Percentage: ${data.data.percentage}%
          `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
          d3.select(this).select("path")
            .transition()
            .duration(200)
            .attr("d", arc)
            .style("opacity", 1);

          tooltip.transition()
            .duration(500)
            .style("opacity", 0);
        });
    }

    // Cleanup function
    return () => {
      if (tooltip) {
        tooltip.remove();
      }
    };
  }, [data, width, height, showTooltip, showCenterText, animationDuration]);

  if (!data || Object.keys(data).length === 0) {
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

export default D3DonutChart;