function viewport() {
  var e = window,
      a = 'inner';
  if (!('innerWidth' in window)) {
    a = 'client';
    e = document.documentElement || document.body;
  }
  return {
    width: e[a + 'Width'],
    height: e[a + 'Height']
  }
}

var width = viewport().width,
    height = viewport().height;

var zoom = d3.behavior.zoom()
    .on("zoom", redraw);
var svg = d3.select("body")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(zoom)
    .append("g");

// group
var root = svg.append("g");
var layouter = klay.d3kgraph()
      .size([width, height])
      .transformGroup(root)
      .options({
        layoutHierarchy: true,
        intCoordinates: true,
        direction: "DOWN",
        edgeRouting: "ORTHOGONAL",
        nodeLayering: "NETWORK_SIMPLEX",
        nodePlace: "BRANDES_KOEPF",
        fixedAlignment: "NONE",
        crossMin: "LAYER_SWEEP",
        algorithm: "de.cau.cs.kieler.klay.layered"
      });

// load data and render elements
d3.json("./hierarchy2.json", function(error, graph) {

  layouter.on("finish", function(d) {

    var nodes = layouter.nodes();
    var links = layouter.links(nodes);

    var linkData = root.selectAll(".link")
        .data(links, function(d) { return d.id; });

    // build the arrow.
    svg.append("svg:defs").selectAll("marker")
        .data(["end"])                 // define link/path types
      .enter().append("svg:marker")    // add arrows
        .attr("id", String)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 10)
        .attr("refY", 0)
        .attr("markerWidth", 3)        // marker settings
        .attr("markerHeight", 5)
        .attr("orient", "auto")
        .style("fill", "#999")
        .style("stroke-opacity", 0.6)  // arrowhead color
      .append("svg:path")
        .attr("d", "M0,-5L10,0L0,5");

    // add arrows
    var link = linkData.enter()
        .append("path")
        .attr("class", "link")
        .attr("d", "M0 0")
        .attr("marker-end", "url(#end)");

    // add edge labels
    linkData.enter()
        .append("text")
        .attr("x", function(d) { return d.targetPoint.x; })  // position edge labels
        .attr("y", function(d) { return d.targetPoint.y - 10; })
        .attr("text-anchor", "middle")
        .attr("font-size", "4px")
        .text(function(d) { return d.id; });

    var nodeData = root.selectAll(".node")
        .data(nodes,  function(d) { return d.id; });
    var node = nodeData.enter()
        .append("g")
        .attr("class", function(d) {
          if (d.children)
            return "node compound";
          else
            return "node leaf";
        });

    var atoms = node.append("rect")
        .attr("width", 10)
        .attr("height", 10);

    // add node labels
    node.append("text")
        .attr("x", 2.5)
        .attr("y", 6.5)
        .text(function(d) { return d.id; })
        .attr("font-size", "4px");

    // apply edge routes
    link.transition().attr("d", function(d) {
      var path = "";
      path += "M" + d.sourcePoint.x + " " + d.sourcePoint.y + " ";
        (d.bendPoints || []).forEach(function(bp, i) {
          path += "L" + bp.x + " " + bp.y + " ";
        });
      path += "L" + d.targetPoint.x + " " + d.targetPoint.y + " ";
      return path;
    });

    // apply node positions
    node.transition()
      .attr("transform", function(d) {
        return "translate(" + (d.x || 0) + " " + (d.y || 0) + ")"
    });

    atoms.transition()
      .attr("width", function(d) { return d.width; })
      .attr("height", function(d) { return d.height; });
  });

  layouter.kgraph(graph);
});

function redraw() {
  svg.attr("transform", "translate(" + d3.event.translate + ")"
                          + " scale(" + d3.event.scale + ")");
}