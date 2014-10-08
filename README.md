KLayJS-D3
===

A bridge between [KLayJS][klayjs] 
and [D3.js](http://d3js.org/).

KLayJS is a layer-based layout algorithm that is especially suited for
node-link diagrams with an inherent direction and ports 
(explicit attachment points on a node's border).

Installation
===
Either download the library from the `dist` folder or install using `npm` or `bower`.
```bash
bower install klayjs-d3
```
```bash
npm install klayjs-d3
```

Usage
===

If used within the browser include the library as follows. 
You have the option to use a _web worker_ by adding a `-ww` suffix to 
the library's name. See the documentation of [KLayJS][klayjs]
for further information on the web worker.
```html
<script type="text/javascript" src="klayjs-d3.min.js"></script>
<!-- or using web worker:
  <script type="text/javascript" src="klayjs-d3-ww.min.js"></script>
-->
```

There are two options to use the bridge. For simple, flat graphs you can 
use the library as you are used from D3. In case your graph is 
hierarchical (i.e. nodes can contain nodes), you have to use our
[JSON KGraph][jsonkgraph] format.

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


[klayjs]: https://github.com/OpenKieler/klayjs
[wiki-klay]: http://rtsys.informatik.uni-kiel.de/confluence/display/KIELER/KLay+Layered
[wiki-layopts]: http://rtsys.informatik.uni-kiel.de/confluence/display/KIELER/KLay+Layered+Layout+Options
[jsonkgraph]: http://rtsys.informatik.uni-kiel.de/confluence/display/KIELER/JSON+Graph+Format
[klayjs-d3]: https://github.com/OpenKieler/klayjs-d3
[d3js]: http://d3js.org/