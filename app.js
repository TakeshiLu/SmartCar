var app = require('express')();
var bodyParser = require('body-parser');
var http = require('http').Server(app);
var io = require('socket.io')(http);


app.get('/',function(req, res){
	res.sendFile(__dirname + '/index.html');
});

// 當有client連上server
io.on('connection', function(socket){
	socket.emit("server connecting",'hello gogoro')

	//監聽：還車
	socket.on('return gogoro', function(data){
		console.log(data);
		socket.emit('server reply','Lock!');
	})
})


// 指定port
http.listen(process.env.PORT || 1916, function(){
	console.log('listening on 1916 port');
});
