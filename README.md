KLayJS-D3
===

A bridge between [KLayJS](http://rtsys.informatik.uni-kiel.de/confluence/x/6wOE) 
and [D3.js](http://d3js.org/).

KLayJS is a layer-based layout algorithm that is especially suited for
node-link diagrams with an inherent direction and ports 
(explicit attachment points on a node's border).

Build
===
```bash
npm install
bower install
grunt
```

Usage
===

Include the js file and make sure the `klayjs-worker.js` is accessible 
at the same path.
```html
<script type="text/javascript" src="../../dist/klayjs-d3.js"></script>
```

There are two options to use the bridge. For simple, flat graphs you can 
use the library as you are used from D3. In case your graph is 
hierarchical (i.e. nodes can contain nodes), you have to use our
[JSON KGraph Format](https://rtsys.informatik.uni-kiel.de/confluence/display/KIELER/JSON+Graph+Format).

As soon as the layout process finished a callback function is invoked.

D3-Style
---
```javascript
var graph = [d3loadjson()];
var layouter = klay.d3adapter()
  .size([width, height])
  .nodes(graph.nodes)
  .links(graph.links)
  .start();
  
[...]

var node = svg.selectAll(".node")
  .data(graph.nodes)
  .enter()
  .append("rect")
  .attr("class", "node");

layouter.on("finish", function() {
  // [apply positions]
});
```


KGraph
---

```javascript
var graph = [jsonKGrap()];
var layouter = klay.d3kgraph()
  .size([width, height])
  .kgraph(graph);  
  
[...]

layouter.on("finish", function() {
  var nodes = layouter.nodes();
  var links = layouter.links(nodes);
  
  svg.selectAll(".node")
    .data(nodes, function(d) {return d.id;})
    .enter()
    .append("rect")
    .attr("class", "node");
    
  // [apply positions]
});
```

Examples 
===

Running Examples:
- [Miserables](http://openkieler.github.io/klayjs-d3/examples/miserables/) (Data From D3 Force Example)
- [Ports](http://openkieler.github.io/klayjs-d3/examples/ports/)
- [Hierarchy](http://openkieler.github.io/klayjs-d3/examples/hierarchy/)

See the `examples` folder.

You can easily run the examples locally using node's http-server.
```bash
npm install -g http-server
http-server .
[open browser localhost:8080]
```
