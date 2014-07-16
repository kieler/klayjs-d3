/*! klayjs-d3 - v0.1.0 - 2014-07-16
 */
var klay = (function () {
  "use strict";
  
  var worker;
  var defaultOptions = {
    "intCoordinates": true,
    "algorithm": "de.cau.cs.kieler.klay.layered",
    "layoutHierarchy": true,
    "spacing": 20,
    "borderSpacing": 20,
    "edgeSpacingFactor": 0.2,
    "inLayerSpacingFactor": 2.0,
    "nodePlace": "BRANDES_KOEPF",
    "nodeLayering": "NETWORK_SIMPLEX",
    "edgeRouting": "POLYLINE",
    "crossMin": "LAYER_SWEEP",
    "direction": "RIGHT"
  };
  var cleanArray = function(array) {
    for (var i = 0; i < array.length; i++) {
      if (array[i] === null || array[i] === undefined) {
        array.splice(i, 1);
        i--;
      }
    }
    return array;
  };

  return {
    // Initialize the layouter as a WebWorker
    init: function (params) {
      // Set up some properties
      var callback, workerScript;
      if ("onSuccess" in params) {
        callback = params.onSuccess;
      } else {
        callback = console.log;
      }
      if ("workerScript" in params) {
        workerScript = params.workerScript;
      } else {
        workerScript = "klay-worker.js";
      }
      // Start the WebWorker
      worker = new Worker(workerScript);
      // Register a listener to default WebWorker event, calling
      // 'callback' when layout succeeds
      worker.addEventListener('message', function (e) {
        callback(e.data);
      }, false);
      
      return this;
    },

    // Layout a given graph, the result will be sent by the WebWorker
    // when done and will be made accessible by the callback defined
    // in init
    layout: function (params) {
      var graph, options, portInfo, direction, encodedGraph;
      
      if ("graph" in params) {
        graph = params.graph;
      } else {
        return;
      }
      if ("options" in params) {
        options = params.options;
      } else {
        options = defaultOptions;
      }
      if ("direction" in params) {
        direction = params.direction;
      } else {
        direction = "RIGHT";
      }
      // If portInfo is a parameter, encode the graph as KGraph first
      if ("portInfo" in params) {
        portInfo = params.portInfo;
        encodedGraph = this.nofloToKieler(graph, portInfo, direction);
      } else {
        encodedGraph = graph;
      }
      
      worker.postMessage({
        "graph": encodedGraph,
        "options": options
      });
    },

    nofloToKieler: function (graph, portInfo, direction) {
      // Default direction is left to right
      direction = direction || 'RIGHT';
      var portConstraints = 'FIXED_POS';
      // Default port and node properties
      var portProperties = {
        inportSide: 'WEST',
        outportSide: 'EAST',
        width: 10,
        height: 10
      };
      if (direction === 'DOWN') {
        portProperties.inportSide = 'NORTH';
        portProperties.outportSide = 'SOUTH';
      }
      var nodeProperties = {
        width: 72,
        height: 72
      };
      // Start KGraph building
      var kGraph = {
        id: graph.name,
        children: [], 
        edges: []
      };
      // Encode nodes
      var nodes = graph.nodes;
      var idx = {};
      var countIdx = 0;
      var nodeChildren = nodes.map(function (node) {
        var inPorts = portInfo[node.id].inports;
        var inPortsKeys = Object.keys(inPorts);
        var inPortsTemp = inPortsKeys.map(function (key) {
          return {
            id: node.id + '_' + key,
            width: portProperties.width,
            height: portProperties.height,
            x: portInfo[node.id].inports[key].x - portProperties.width,
            y: portInfo[node.id].inports[key].y
          };
        });
        var outPorts = portInfo[node.id].outports;
        var outPortsKeys = Object.keys(outPorts);
        var outPortsTemp = outPortsKeys.map(function (key) {
          return {
            id: node.id + '_' + key,
            width: portProperties.width,
            height: portProperties.height,
            x: portInfo[node.id].outports[key].x,
            y: portInfo[node.id].outports[key].y
          };
        });

        var kChild = {
          id: node.id,
          labels: [{text: node.metadata.label}],
          width: nodeProperties.width,
          height: nodeProperties.height,
          ports: inPortsTemp.concat(outPortsTemp),
          properties: {
            'portConstraints': portConstraints
          }
        };
        idx[node.id] = countIdx++;
        return kChild;
      });

      // Graph i/o to kGraph nodes
      var inports = graph.inports;
      var inportsKeys = Object.keys(inports);
      var inportChildren = inportsKeys.map(function(key){
        var inport = inports[key];
        var tempId = "inport:::"+key;
        // Inports just has only one output port
        var uniquePort = {
          id: inport.port,
          width: portProperties.width,
          height: portProperties.height,
          properties: {
            'de.cau.cs.kieler.portSide': portProperties.outportSide
          }
        };
        
        var kChild = {
          id: tempId, 
          labels: [{text: key}],
          width: nodeProperties.width, 
          height: nodeProperties.height,
          ports: [uniquePort],
          properties: {
            'portConstraints': portConstraints,
            "de.cau.cs.kieler.klay.layered.layerConstraint": "FIRST_SEPARATE"
          }
        };
        idx[tempId] = countIdx++;
        return kChild;
      });
      var outports = graph.outports;
      var outportsKeys = Object.keys(outports);
      var outportChildren = outportsKeys.map(function(key){
        var outport = outports[key];
        var tempId = "outport:::"+key;
        // Outports just has only one input port
        var uniquePort = {
          id: outport.port,
          width: portProperties.width,
          height: portProperties.height,
          properties: {
            'de.cau.cs.kieler.portSide': portProperties.inportSide
          }
        };

        var kChild = {
          id: tempId, 
          labels: [{text: key}],
          width: nodeProperties.width, 
          height: nodeProperties.height,
          ports: [uniquePort],
          properties: {
            'portConstraints': portConstraints,
            "de.cau.cs.kieler.klay.layered.layerConstraint": "LAST_SEPARATE"
          }
        };
        idx[tempId] = countIdx++;
        return kChild;
      });

      // Combine nodes, inports, outports to one array
      kGraph.children = nodeChildren.concat(inportChildren, outportChildren);

      // Encode edges (together with ports on both edges and already
      // encoded nodes)
      var currentEdge = 0;
      var edges = graph.edges;
      edges.map(function (edge) {
        if (edge.data !== undefined) {
          return;
        }
        var source = edge.from.node;
        var sourcePort = edge.from.port;
        var target = edge.to.node;
        var targetPort = edge.to.port;
        kGraph.edges.push({
          id: 'e' + currentEdge++, 
          source: source,
          sourcePort: source + '_' + sourcePort,
          target: target,
          targetPort: target + '_' + targetPort
        });
      });
      
      // Graph i/o to kGraph edges
      var inportEdges = inportsKeys.map(function (key) {
        var inport = inports[key];
        var source = "inport:::"+key;
        var sourcePort = key;
        var target = inport.process;
        var targetPort = inport.port;
        var inportEdge = {
          id: 'e' + currentEdge++,
          source: source,
          sourcePort: source + '_' + sourcePort,
          target: target,
          targetPort: target + '_' + targetPort
        };
        return inportEdge;
      });
      var outportEdges = outportsKeys.map(function (key) {
        var outport = outports[key];
        var source = outport.process;
        var sourcePort = outport.port;
        var target = "outport:::"+key;
        var targetPort = key;
        var outportEdge = {
          id: 'e' + currentEdge++,
          source: source,
          sourcePort: source + '_' + sourcePort,
          target: target,
          targetPort: target + '_' + targetPort
        };
        return outportEdge;
      });

      // Combine edges, inports, outports to one array
      kGraph.edges = kGraph.edges.concat(inportEdges, outportEdges);
      
      // Encode groups
      var groups = graph.groups;
      var countGroups = 0;
      // Mark the nodes already in groups to avoid the same node in many groups
      var nodesInGroups = [];
      groups.map(function (group) {
        // Create a node to use as a subgraph
        var node = {
          id: 'group' + countGroups++, 
          children: [], 
          edges: []
        };
        // Build the node/subgraph
        group.nodes.map(function (n) {
          var nodeT = kGraph.children[idx[n]];
          if (nodeT === null) {
            return;
          }
          if (nodesInGroups.indexOf(nodeT) >= 0) {
            return;
          }
          nodesInGroups.push(nodeT);
          node.children.push(nodeT);
          node.edges.push(kGraph.edges.filter(function (edge) {
            if (edge) {
              if ((edge.source === n) || (edge.target === n)) {
                return edge;
              }
            }
          })[0]);
          node.edges = cleanArray(node.edges);

          // Mark nodes inside the group to be removed from the graph
          kGraph.children[idx[n]] = null;

        });
        // Mark edges too
        node.edges.map(function (edge) {
          if (edge) {
            kGraph.edges[parseInt(edge.id.substr(1), 10)] = null;
          }
        });
        // Add node/subgraph to the graph
        kGraph.children.push(node);
      });

      // Remove the nodes and edges from the graph, just preserve them
      // inside the subgraph/group
      kGraph.children = cleanArray(kGraph.children);
      kGraph.edges = cleanArray(kGraph.edges);

      return kGraph;
    }
  }
})();

var klay;
(function (klay) {

  // check if web worker is available
  if (typeof window.Worker !== "function") {
    window.alert("WebWorker not supported by browser.");
    return {};
  }

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
    
    /** the layouter instance */
    layouter = klay.init({
      onSuccess: function(kgraph) {
        if (kgraph.id) {
          graph = kgraph;
          applyLayout(kgraph);
        } else {
          console.log(kgraph); // error
        }
      },
      workerScript: workerScriptPath + "/klayjs-worker.js"
    }); 
    
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
          "options": options
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
          "options": options
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
      
      var toAbsolutePositionsEdges = function(n, nodeMap) {
        // edges
        (n.edges || []).forEach(function (e) {
          var srcNode = nodeMap[e.source].parent || {};
          if (e.sourcePoint) {
            e.sourcePoint.x += srcNode.x || 0;
            e.sourcePoint.y += srcNode.y || 0;
          }
          if (e.targetPoint) {
            e.targetPoint.x += srcNode.x || 0; 
            e.targetPoint.y += srcNode.y || 0;
          }
          (e.bendPoints || []).map(function (bp) {
            return { x: bp.x + (srcNode.x || 0), 
                     y: bp.y + (srcNode.y || 0)};
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


  // during initial execution, remember the path of 
  // this script as we expect the worker script to be
  // in the same directory
  var workerScriptPath = function() {
    var scriptTag = document.getElementsByTagName('script');
    scriptTag = scriptTag[scriptTag.length - 1]; 
    var scriptPath = scriptTag.src; 
    var scriptFolder = scriptPath.substr(0, scriptPath.lastIndexOf( '/' ) + 1);
    return scriptFolder;
  }();

  return klay;
})(klay || (klay = {}));