var connection= {};
var Main =  React.createClass({
	focus: function(){
	    if (this.refs.searcher.value === 'Stock code') {
    		  this.refs.searcher.value = "";
    	}
  	},
 	 blur: function(){
    	if (this.refs.searcher.value === '') {
    	  this.refs.searcher.value = "Stock code";
    	}
	},
	componentDidMount: function() {
 		var self = this;
 		key.filter = function (event){
  			var tagName = (event.target || event.srcElement).tagName;
  			return !(tagName == 'SELECT' || tagName == 'TEXTAREA');
		};
  		key('enter', function(){
  			self.add()});
		window.WebSocket = window.WebSocket || window.MozWebSocket;
    	if (!window.WebSocket) {
    		alert('Browser does not support WebSockets.');
			$('.brick').hide();
			return;
		} 
		var host = location.origin.replace(/^http/, 'ws')
		connection = new WebSocket(host);

		connection.onopen = function () {
			connection.send('startME');
    	  
	    };

		connection.onerror = function (error) {
			alert('Server not working');
		};

		connection.onmessage = function (message) {
			message= JSON.parse(message.data);
			
			if (message.start){
				self.setState({array: message.raw});	
				return;
			}
			var listas= self.state.array.slice();
			listas.push(message);
			self.setState({array: listas});
	
		};

		setInterval(function() {
    	    if (connection.readyState !== 1) {
        	    alert('Connection error');
        	}
    	}, 5000);
	},

	getInitialState: function(){
     return {array: this.props.stocks}
 	},
 	add: function(){
 		if (this.refs.searcher.value){
 		var listas = this.state.array.slice();
 		for (var i = 0; i < listas.length; i++) {
 			if (listas[i].short === this.refs.searcher.value.toUpperCase()){
 				return;
 			}
 		}
 		connection.send(this.refs.searcher.value);
 		this.refs.searcher.value = ""; 
 		
 	}
 	},
 	handleRemove: function(ind){
 		var listas= this.state.array.slice();
 		var removeMessage = "remove-"+listas[ind].short;
 		
 		listas.splice(ind, 1);
		if (listas.length === 0) {
			 $("#hide").addClass("hidden");
		}
		connection.send(removeMessage);

 	},

	render: function(){
		
		if (this.state.array.length>0){
		drawLines(this.state.array);
		}
		
		return 	<div>
					{this.state.array.map((listValue, index)=>{
						if (listValue.name) {
						return 	<div key = {index}>
									<div className="brick"  >
									<h4>{listValue.name + 'stockexchange: '+ listValue.stockexchange}</h4>
									<button className = 'remover' onClick={()=> this.handleRemove(index)}>X</button>
									</div>

								</div>
							} else{
								return;
							}
					})}
					<div className="brick" >
						<h5>Syncs in realtime across users</h5>
						<input ref = "searcher" type="text" onFocus = {this.focus} onBlur={this.blur} defaultValue= "Stock code"></input>
						<button onClick= {this.add}>Add</button>
					</div>					
				</div>
	}
});


ReactDOM.render(<Main stocks = {[]} />,
 document.querySelector("#main") );


function drawLines(arr){
	d3.select('svg')
		.selectAll("*").remove();    	

	var colors = ['red', 'blue', 'green', 'yellow', 'black', 'orange', 'cyan', 'crimson','navy', 'lime']
	var ymaxes = [];
	for (var i = 0; i < arr.length; i++) {
		ymaxes.push(d3.max(arr[i].raw, function(d){return d.close}))
	}
	
	var ymax =d3.max(ymaxes);
	var sample = arr[0].raw;
    

    var timeFormat = d3.time.format('%Y-%m-%dT%H:%M:%S');

    var xmin = timeFormat.parse(sample[0].date.slice(0, 19)).getTime();
    var xmax = timeFormat.parse(sample[sample.length-1].date.slice(0,19)).getTime();
    

	var margin = {top: 20, right: 50, bottom: 50, left: 50},
    width = 950 - margin.left - margin.right,
    height = 400 - margin.top - margin.bottom;

    var grapher = d3.select("#graphicer")
    	.attr("width", width + margin.left + margin.right)
    	.attr("height", height + margin.top + margin.bottom)
    	.append("g")
    	.attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  	d3.select("#hide")
	  .classed("hidden", false);


    var xScale = d3.scale.linear()
        .range([0, width])
        .domain([xmin, xmax]) ;
    var yScale = d3.scale.linear()
        .range([height, 0])
        .domain([0, ymax]);

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom")
        .tickValues(xScale.domain())
        .tickFormat(function(d) { 
           var timer = new Date();
	       timer.setTime(d);
	       var returnLine= timer.getFullYear() + "-";
	       if (timer.getMonth()<9) {
	       	returnLine += "0"+(timer.getMonth() + 1) + "-";
	       } else{
	       	returnLine += (timer.getMonth() + 1) + "-";
	       }
	       if (timer.getDate()<10) {
	       	returnLine += "0"+timer.getDate();
	       } else{
	       	returnLine += timer.getDate();
	       }
    	  return returnLine});

    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left");

    grapher.append("g")
        .attr("class","axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    grapher.append("g")
        .attr("class","axis")
        .call(yAxis);

    var lineGen = d3.svg.line()
        .x(function(d) {
                return xScale(timeFormat.parse(d.date.slice(0,19)).getTime());
        })
        .y(function(d) {
                return yScale(d.close);
        })
         .interpolate("basis");

    var div = d3.select("body").append("div")   
    	.attr("class", "tooltip")               
    	.style("opacity", 0);

    
	arr.forEach(function(d, i) {
    	grapher.append('path')
        	.attr('d', lineGen(d.raw))
        	.attr('stroke', colors[i % 10])
           	.attr('stroke-width', 2)
        	.attr('fill', 'none');

        	 grapher.selectAll("dot")	
		        .data(d.raw)			
    				.enter().append("circle")								
        				.attr("r", 5)
        				.style("opacity", 0)		
        				.attr("cx", function(d) { return xScale(timeFormat.parse(d.date.slice(0,19)).getTime()); })		 
        				.attr("cy", function(d) { return yScale(d.close); })		
        				.on("mouseover", function(d) {
        					d3.select(this).style("opacity", 0.9);	
            					div.transition()		
                				.duration(200)		
                				.style("opacity", .9);		
            					div.html(d.symbol+"<br>Closed at: "+(Math.round(( d.close + 0.00001) * 100) / 100)+"<br> in "+d.date.slice(0,10))	
                					.style("left", (d3.event.pageX) + "px")		
                					.style("top", (d3.event.pageY - 50) + "px");	
            							})					
        				.on("mouseout", function(d) {
        						d3.select(this).style("opacity", 0);			
            					div.transition()		
            	   					.duration(500)		
    		            			.style("opacity", 0);	
        						});




});

     

};