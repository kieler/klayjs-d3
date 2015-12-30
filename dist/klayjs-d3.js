/*! klayjs-d3 version 0.3.4 build 201512301212*/
var klay;
(function (klay) {
  klay.d3adapter = function() {
    return init("adapter");
  };
  klay.d3kgraph = function() {
    return init("kgraph");
  };
  function init(type) {
    var d3klay = {},
    dispatch = d3.dispatch("finish"),
    // containers
    nodes = [],
    links = [],
    graph = {}, // internal (hierarchical graph)
    ports = function(n) {
      // by default the 'ports' field
      return n.ports || [];
    },
    labels = function(n) {
      return n.labels || [];
    },
    options = {},
    // dimensions
    width = 0,
    height = 0,
    defaultNodeSize = [10, 10],
    defaultPortSize = [4, 4],
    transformGroup,
    // kgraph properties that shall be copied
    kgraphKeys = [
      'x', 'y',
      'width', 'height',
      'sourcePoint', 'targetPoint',
      'properties'
    ].reduce(function(p, c) {p[c] = 1; return p;}, {}),
    // a function applied after each layout run
    applyLayout = function() {},
    // location of the klay.js script
    layouterScript = function() {
      var scripts = document.getElementsByTagName('script');
      for (var i = 0; i < scripts.length; ++i) {
        if (scripts[i].src.indexOf("klay.js") > -1) {
          return scripts[i].src;
        }
      }
      throw "klay.js library wasn't loaded!";
    },
    // the layouter instance
    layouter = {};
    // use a worker or not?
    if ('false' === 'true') {
      // check if web worker is available
      if (typeof window == 'undefined' || typeof window.Worker !== "function") {
        window.alert("WebWorker not supported by browser.");
        return {};
      }
      var worker = new Worker(layouterScript()),
      layouter = {
        layout: function(data) {
          worker.postMessage({
            graph: data.graph,
            options: data.options
          });
        }
      };
      worker.addEventListener('message', function (e) {
        graph = e.data;
        applyLayout(graph);
      }, false);
    } else {
      if (typeof module === "object" && module.exports) {
        layouter = require("klayjs");
      } else {
        // try to get from global scope, e.g. loaded by bower
        if (typeof $klay !== "undefined") {
          layouter = $klay;
        } else {
          throw "klay.js library wasn't loaded!"
        }
      }
    }
    /**
     * Setting the available area, the
     * positions of the layouted graph
     * are currently scaled down.
     */
    d3klay.size = function(size) {
      if (!arguments.length) return [width, height];
      width = size[0];
      height = size[1];
      return d3klay;
    };
    /**
     * Sets the group used to perform 'zoomToFit'.
     */
    d3klay.transformGroup = function(g) {
      if (!arguments.length) return transformGroup;
      transformGroup = g;
      return d3klay;
    };
    d3klay.options = function(opts) {
      if (!arguments.length) return options;
      options = opts;
      return d3klay;
    };
    /**
     * D3 Adaptor
     * Allows to use d3 in its known fashion.
     *   Ids are assigned to the specified
     *   nodes and links and a top level node
     *   is constructed.
     */
    if (type === "adapter") {
      /**
       * The nodes of the graph.
       */
      d3klay.nodes = function(ns) {
        if (!arguments.length) return nodes;
        nodes = ns;
        return d3klay;
      };
      /**
       * Accessor function to a node's ports.
       */
      d3klay.ports = function(ps) {
        if (!arguments.length) return ports;
        ports = ps;
        return d3klay;
      };
      /**
       * The links of the graph.
       */
      d3klay.links = function(es) {
        if (!arguments.length) return links;
        links = es;
        return d3klay;
      };
      d3klay.defaultNodeSize = function(dns) {
        if (!arguments.length) return defaultNodeSize;
        defaultNodeSize = dns;
        return d3klay;
      };
      d3klay.defaultPortSize = function(dps) {
        if (!arguments.length) return defaultPortSize;
        defaultPortSize = dps;
        return d3klay;
      };
      /**
       * Start the layout process.
       */
      d3klay.start = function() {
        // klay expects string identifiers
        nodes.forEach(function(n, i) {
          n.width = n.width || defaultNodeSize[0];
          n.height = n.height || defaultNodeSize[1];
          n.id = "" + (n.id || i);
          // ports
          n.ports = ports(n);
          n.ports.forEach(function(p) {
            p.width = p.width || defaultPortSize[0];
            p.height = p.height || defaultPortSize[1];
          });
          n.labels = labels(n);
        });
        links.forEach(function(l, i) {
          l.id = "" + (l.id || (i + nodes.length));
          l.source = "" + l.source;
          l.target = "" + l.target;
        });
        // alias applyLayout method
        applyLayout = d3_applyLayout;
        // start the layouter
        layouter.layout({
          "graph": {
            id: "root",
            children: nodes,
            edges: links
          },
          "options": options,
          "success": function(kgraph) {
            graph = kgraph;
            applyLayout(kgraph);
          },
          "error": function(e) {
            console.error(e);
          }
        });
        return d3klay;
      };
      /**
       * Apply layout for d3 style.
       * Copies properties of the layouted graph
       * back to the original nodes and links.
       */
      var d3_applyLayout = function(kgraph) {
        if (kgraph) {
          zoomToFit(kgraph);
          // assign coordinates to nodes
          kgraph.children.forEach(function(n) {
            var d3node = nodes[parseInt(n.id)];
            copyProps(n, d3node);
            (n.ports || []).forEach(function(p, i) {
              copyProps(p, d3node.ports[i]);
            });
            (n.labels || []).forEach(function(l, i) {
              copyProps(l, d3node.labels[i]);
            });
          });
          // edges
          kgraph.edges.forEach(function(e) {
            var l = links[parseInt(e.id) - nodes.length];
            copyProps(e, l);
            copyProps(e.source, l.source);
  	        copyProps(e.target, l.target);
            // make sure the bendpoint array is valid
            l.bendPoints = e.bendPoints || [];
          });
        }
        function copyProps(src, tgt, copyKeys) {
          var keys = kgraphKeys;
          if (copyKeys) {
            keys = copyKeys.reduce(function (p, c) {p[c] = 1; return p;}, {});
          }
          for (var k in src) {
            if (keys[k]) {
              tgt[k] = src[k];
            }
          }
        }
        // invoke the 'finish' event
        dispatch.finish({graph: kgraph});
      };
    }
    /*
     * KGraph
     * Allows to use the JSON KGraph format
     */
    if (type === "kgraph") {
      d3klay.nodes = function() {
        var queue = [graph],
            nodes = [],
            parent;
        // note that svg z-index is document order, literally
        while ((parent = queue.pop()) != null) {
          nodes.push(parent);
          (parent.children || []).forEach(function(c) {
            queue.push(c);
          });
        }
        return nodes;
      };
      d3klay.links = function(nodes) {
        return d3.merge(nodes.map(function(n) {
          return n.edges || [];
        }));
      };
      d3klay.kgraph = function(root) {
        applyLayout = d3_kgraph_applyLayout;
        // start the layouter
        layouter.layout({
          "graph": root,
          "options": options,
          "success": function(kgraph) {
            graph = kgraph;
            applyLayout(kgraph);
          },
          "error": function(e) {
            console.error(e);
          }
        });
        return d3klay;
      };
      /**
       * Apply layout for the kgraph style.
       * Converts relative positions to absolute positions.
       */
      var d3_kgraph_applyLayout = function(kgraph) {
        zoomToFit(kgraph);
        var nodeMap = {};
        // convert to absolute positions
        toAbsolutePositions(kgraph, {x: 0, y:0}, nodeMap);
        toAbsolutePositionsEdges(kgraph, nodeMap);
        // invoke the 'finish' event
        dispatch.finish({graph: kgraph});
      };
      var toAbsolutePositions = function(n, offset, nodeMap) {
        n.x = (n.x || 0) + offset.x;
        n.y = (n.y || 0) + offset.y;
        nodeMap[n.id] = n;
        // children
        (n.children || []).forEach(function(c) {
          c.parent = n;
          toAbsolutePositions(c, {x: n.x, y: n.y}, nodeMap);
        });
      };
      var isDescendant = function(node, child) {
        var parent = child.parent;
        while (parent) {
          if (parent == node) {
            return true;
          }
          parent = parent.parent;
        }
        return false;
      }
      var toAbsolutePositionsEdges = function(n, nodeMap) {
        // edges
        (n.edges || []).forEach(function (e) {
          // transform edge coordinates to absolute coordinates. Note that
          //  node coordinates are already absolute and that
          //  edge coordinates are relative to the source node's parent node
          //  (unless the target node is a descendant of the source node)
          var srcNode = nodeMap[e.source];
          var tgtNode = nodeMap[e.target];
          var relative = isDescendant(srcNode, tgtNode) ?
                          srcNode : srcNode.parent;
          var offset = {x: 0, y: 0};
          if (relative) {
            offset.x = relative.x;
            offset.y = relative.y;
          }
          // ... and apply it to the edge
          if (e.sourcePoint) {
            e.sourcePoint.x += offset.x || 0;
            e.sourcePoint.y += offset.y || 0;
          }
          if (e.targetPoint) {
            e.targetPoint.x += offset.x || 0;
            e.targetPoint.y += offset.y || 0;
          }
          (e.bendPoints || []).forEach(function (bp) {
            bp.x += offset.x;
            bp.y += offset.y;
          });
        });
        // children
        (n.children || []).forEach(function(c) {
          toAbsolutePositionsEdges(c, nodeMap);
        });
      };
    }
    /**
     * If a top level transform group is specified,
     * we set the scale such that the available
     * space is used to its maximum.
     */
    function zoomToFit(kgraph) {
      // scale everything so that it fits the specified size
      var scale = width / kgraph.width || 1;
      var sh = height / kgraph.height || 1;
      if (sh < scale) {
        scale = sh;
      }
      // if a transformation group was specified we
      // perform a 'zoomToFit'
      if (transformGroup) {
        transformGroup.attr("transform", "scale(" + scale + ")");
      }
    }
    // return the layouter object
    return d3.rebind(d3klay, dispatch, "on");
  }
  if (typeof module === "object" && module.exports) {
    module.exports = klay;
  }
  return klay;
})(klay || (klay = {}));