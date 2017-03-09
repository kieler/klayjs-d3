
var content = document.getElementById("container");
var width = content.clientWidth;
var height = Math.max(400, window.innerHeight - content.clientHeight);

var zoom = d3.behavior.zoom()
    .on("zoom", redraw);
var svg = d3.select("#content")
    .append("svg")
    .attr("width", width)
    .attr("height", height)
    .call(zoom)
    .append("g");

// specify different layout options
var options = {
    auto: {
      borderSpacing: 20,
      algorithm: "de.cau.cs.kieler.klay.layered",
      spacing: 20,
      intCoordinates: true,
      direction: "RIGHT",
      edgeRouting: "ORTHOGONAL"
    }
};

// define an arrow head
svg.append("svg:defs")
     .append("svg:marker")
      .attr("id", "end")
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

var labelPosition = function(node) {
  if (!node.labels || node.labels.length < 1) return {x: 0, y: 0};
  var label = node.labels[0];
  return { x: label.x, y: label.y };
};

// group
var root = svg.append("g");
var layouter = klay.d3kgraph()
      .size([width, height])
      .transformGroup(root)
      .options(options.auto);

var layoutGraph;

// load data and render elements
d3.json("./node_labels.json", function(error, graph) {
  layoutGraph = graph;
  
  layouter.on("finish", function(d) {

    var nodes = layouter.nodes();
    var links = layouter.links(nodes);
    
    // #1 add the nodes' groups
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
    
    // add representing boxes for nodes
    var box = node.append("rect")
        .attr("class", "atom")
        .attr("width", 0)
        .attr("height", 0);

    // add node labels
    node.append("text")
        .text(function(d) { return d.id; })
        .attr("class", "label")
        .attr("font-size", "4px");

 
    // #2 add paths with arrows for the edges
    var linkData = root.selectAll(".link")
        .data(links, function(d) { return d.id; });
    var link = linkData.enter()
        .append("path")
        .attr("class", "link")
        .attr("d", "M0 0")
        .attr("marker-end", "url(#end)");

    // #3 update positions of all elements

    // node positions
    nodeData.transition()
      .attr("transform", function(d) {
        return "translate(" + (d.x || 0) + " " + (d.y || 0) + ")";
    });
    // node sizes
    nodeData.select(".atom")
        .transition()
        .attr("width", function(d) { return d.width; })
        .attr("height", function(d) { return d.height; });
    // labels
    nodeData.select(".label")
      .transition()
      .attr("x", function(d) { return labelPosition(d).x; })
      .attr("y", function(d) { return labelPosition(d).y; });
  
    // edge routes
    linkData.transition().attr("d", function(d) {
      var path = "";
      if (d.sourcePoint && d.targetPoint) {
        path += "M" + d.sourcePoint.x + " " + d.sourcePoint.y + " ";
          (d.bendPoints || []).forEach(function(bp, i) {
            path += "L" + bp.x + " " + bp.y + " ";
          });
        path += "L" + d.targetPoint.x + " " + d.targetPoint.y + " ";
      }
      return path;
    });

  });

  // start an initial layout
  layouter.kgraph(graph);
});

function redraw() {
  svg.attr("transform", "translate(" + d3.event.translate + ")"
                          + " scale(" + d3.event.scale + ")");
}

function getRadioValue(fieldname) {
  var vals = document.getElementsByName(fieldname);
  for (var i = 0; i < vals.length; i++) {
     if (vals[i].checked) {
       return vals[i].value;
     }
  }
	return "";
}

function layout() {
  layouter.options(options.auto)
          .kgraph(layoutGraph);
}

function update() {
  var io = getRadioValue("io");
	var v = getRadioValue("vert");
  var h = getRadioValue("hori");
  var nlp = io + " " + v + " " + h;
	
	layoutGraph.children.forEach(function(c) {
	  c.properties["nodeLabelPlacement"] = nlp;
	});
	
	layout();
}
  
// initial layout
layout();