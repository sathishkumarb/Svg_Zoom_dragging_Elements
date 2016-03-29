var radius = 40;

window.states = [
    { x : 43, y : 67, label : "first" },
    { x : 340, y : 150, label : "second" },
    { x : 200, y : 250, label : "third" },
    { x : 300, y : 320, label : "fourth" },
    { x : 50, y : 250, label : "fifth" },
    { x : 90, y : 170, label : "last" }
]

window.svg = d3.select("body")
.selectAll("div.a")
.append("svg")
.attr("viewBox", "0 0 " + 1000 + " " + 1000 )
.attr("preserveAspectRatio", "xMinYMin")
.attr("id", "cir")
.attr("width", "960px")
.attr("height", "500px");
 

var gStates = svg.selectAll( "g.state").data( states);

var gState = gStates.enter().append( "g")
    .attr({
        "transform" : function( d) {
            return "translate("+ [d.x,d.y] + ")";
        },
        'class'     : 'state' 
    })
    .call(d3.behavior.zoom().on("zoom", rescale))
;

var drag = d3.behavior.drag()
.on("drag", function( d, i) {
    var selection = d3.selectAll( '.selected');

    if( selection[0].indexOf( this)==-1) {
        selection.classed( "selected", false);
        selection = d3.select( this);
        selection.classed( "selected", true);
    } 

    selection.attr("transform", function( d, i) {
        d.x += d3.event.dx;
        d.y += d3.event.dy;
        return "translate(" + [ d.x,d.y ] + ")"
    })
        // reappend dragged element as last 
        // so that its stays on top 
    this.parentNode.appendChild( this);
    d3.event.sourceEvent.stopPropagation();
});
gState.call( drag);



gState.append( "circle")
    .attr({
        r       : radius + 4,
        class   : 'outer'
    })
;
gState.append( "circle")
    .attr({
        r       : radius,
        class   : 'inner'
    })
    .on( "click", function( d, i) {
        var e = d3.event,
            g = this.parentNode,
            isSelected = d3.select( g).classed( "selected");

        if( !e.ctrlKey) {
            d3.selectAll( 'g.selected').classed( "selected", false);
        }
        
        d3.select( g).classed( "selected", !isSelected);

            // reappend dragged element as last 
            // so that its stays on top 
        g.parentNode.appendChild( g);
    })
    .on("mouseover", function(){
        d3.select(this).style( "fill", "aliceblue");
    })
    .on("mouseout", function() { 
        d3.select(this).style("fill", "white");
    });
;        

gState.append( "text")
    .attr({
        'text-anchor'   : 'middle',
        y               : 4
    })
    .text( function( d) {
        return d.label;
    })
;

gState.append( "title")
    .text( function( d) {
        return d.label;
    })
;

svg
.on( "mousedown", function() {
    if( !d3.event.ctrlKey) {
        d3.selectAll( 'g.selected').classed( "selected", false);
    }

    var p = d3.mouse( this);

    svg.append( "rect")
    .attr({
        rx      : 6,
        ry      : 6,
        class   : "selection",
        x       : p[0],
        y       : p[1],
        width   : 0,
        height  : 0
    })
})
.on( "mousemove", function() {
    var s = svg.select( "rect.selection");

    if( !s.empty()) {
        var p = d3.mouse( this),
            d = {
                x       : parseInt( s.attr( "x"), 10),
                y       : parseInt( s.attr( "y"), 10),
                width   : parseInt( s.attr( "width"), 10),
                height  : parseInt( s.attr( "height"), 10)
            },
            move = {
                x : p[0] - d.x,
                y : p[1] - d.y
            }
        ;

        if( move.x < 1 || (move.x*2<d.width)) {
            d.x = p[0];
            d.width -= move.x;
        } else {
            d.width = move.x;       
        }

        if( move.y < 1 || (move.y*2<d.height)) {
            d.y = p[1];
            d.height -= move.y;
        } else {
            d.height = move.y;       
        }
       
        s.attr( d);

            // deselect all temporary selected state objects
        d3.selectAll( 'g.state.selection.selected').classed( "selected", false);

        d3.selectAll( 'g.state >circle.inner').each( function( state_data, i) {
            if( 
                !d3.select( this).classed( "selected") && 
                    // inner circle inside selection frame
                state_data.x-radius>=d.x && state_data.x+radius<=d.x+d.width && 
                state_data.y-radius>=d.y && state_data.y+radius<=d.y+d.height
            ) {

                d3.select( this.parentNode)
                .classed( "selection", true)
                .classed( "selected", true);
            }
        });
    }
})
.on( "mouseup", function() {
       // remove selection frame
    svg.selectAll( "rect.selection").remove();

        // remove temporary selection marker class
    d3.selectAll( 'g.state.selection').classed( "selection", false);
})
.on( "mouseout", function() {
    if( d3.event.relatedTarget.tagName=='HTML') {
            // remove selection frame
        svg.selectAll( "rect.selection").remove();

            // remove temporary selection marker class
        d3.selectAll( 'g.state.selection').classed( "selection", false);
    }
});


// rescale g
function rescale() {
  trans=d3.event.translate;
  scale=d3.event.scale;

  gState.attr("transform",
      "translate(" + trans + ")"
      + " scale(" + scale + ")");
}

// function dragstarted(d) {
//   d3.event.sourceEvent.stopPropagation();
  
//   d3.select(this).classed("dragging", true);
//   force.start();
// }

// function dragged(d) {
  
//   d3.select(this).attr("cx", d.x = d3.event.x).attr("cy", d.y = d3.event.y);
  
// }

// function dragended(d) {
  
//   d3.select(this).classed("dragging", false);
// }