"use strict";
var webSocketsServerPort = process.env.PORT || 5000;
var yahooFinance = require('yahoo-finance');
var webSocketServer = require('websocket').server;
var http = require('http');
var fs = require('fs');
var html = fs.readFileSync('index.html');
var css = fs.readFileSync('socket.css');
var js = fs.readFileSync('sockets.js');

var clients= [];
var stockList = [];

var server = http.createServer(function(request, response) {
     if(request.url.indexOf('.js') != -1){ 
        response.writeHead(200, {'Content-Type': 'text/javascript'});
        response.end(js);
    }
    if(request.url.indexOf('.css') != -1){ 
        response.writeHead(200, {'Content-Type': 'text/css'});
        response.end(css);
    }
    response.writeHead(200, {'Content-Type': 'text/html'});
    response.end(html);
});

server.listen(webSocketsServerPort, function() {
    console.log("listening " + webSocketsServerPort);
});

var wsServer = new webSocketServer({
     httpServer: server
});

wsServer.on('request', function(request) {
    console.log(' Connection from ' + request.origin);
    
    if (request.origin.split(':')[1] === '//soirana-stock-charts.herokuapp.com'){
        var connection = request.accept(null, request.origin); 
        var index = clients.push(connection) - 1;

        connection.on('message', function(message) {
        if (message.utf8Data === 'startME'){
          clients[index].sendUTF(JSON.stringify({
            raw: stockList,
            start: true
          }));
          return;
        }
        
        if (message.utf8Data.split('-')[0] === 'remove'){
          var compRemoved = message.utf8Data.split('-')[1];
          for (var i = 0; i < stockList.length; i++) {
            if (compRemoved === stockList[i].short){

              break;
            }
          }
          if (i !== stockList.length) {
            var removeInd = i;
            stockList.splice(removeInd, 1);
            for (var i=0; i < clients.length; i++) {
              clients[i].sendUTF(JSON.stringify({
                raw: stockList,
                start: true
              }));
            }
          }
          return;
        }
        var symbol = message.utf8Data.toUpperCase();
        var today = new Date();
        var dateString= today.getFullYear() +"-"+padd((today.getMonth()+1))+"-"+padd(today.getDate());

        yahooFinance.historical({
                  symbol: symbol,
                  from: '2015-01-01',
                  to: dateString,
                  period: 'd' 
                }, function (err, quotes) {
            yahooFinance.snapshot({
                symbol: symbol,
                fields: [ 'j1', 'n', 'x'] 
                }, function (error, snapshot) {
                  
                  if(snapshot.name){
                    var dataBack = {
                      short: snapshot.symbol,
                      name: snapshot.name,
                      stockexchange: snapshot.stockExchange,
                      raw : quotes,
                      start : false
                    };
                    stockList.push(dataBack);
                    for (var i=0; i < clients.length; i++) {
                      clients[i].sendUTF(JSON.stringify(dataBack));
                    }
                  }
             });
        });
      });
   
    connection.on('close', function(connection) {
        clients.splice(index, 1);
        }
    );
}
});

function padd(number){
  if (number<10){
    number = "0"+number;
  }
  return number;
}