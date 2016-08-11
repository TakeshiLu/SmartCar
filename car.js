var app = require('express')();
var bodyParser = require('body-parser');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var five = require("johnny-five");
var board  = new five.Board({
	port : "/dev/ttyACM0",
	repl : false
});

var lockLed, unlockLed, engineLed; //鎖定燈, 解鎖燈, 發動燈
var ledObject = {
	lockLedState : "on",
	unlockLedState : "off",
	engineLedState : "off",

};
var engineButton, returnButton;
var engineRelay;
var renter;
var socketForuse;
var isTimeout=true,isReturn=true;

server.listen(process.env.PORT || 1337, function(){
	console.log('listening on *:1337');
});

app.get('/', function (req, res) {
	res.sendfile(__dirname + '/index.html');
});
board.on("ready", function() {
	console.log ("board ready");

	lockLed = new five.Led(11);
	engineLed = new five.Led(12);
	unlockLed = new five.Led(13);

	engineButton = new five.Button(10);
	
	returnButton = new five.Button(9);


	engineRelay = new five.Relay(8);

	// init
	lockLed.on();
	engineLed.off();
	unlockLed.off();
	engineRelay.off();
	


	io.on('connection', function (socket) {
		socketForuse = socket;
		socket.emit('news', 'hi');
		socket.on('event_renting', function (data) {
			renter = data["renter"];
			var mSec = data["mSec"];
			console.log(renter)
			console.log(mSec)


			if (!isNaN(mSec)) { //如果mSec是時間(數字)
				socket.emit('news', 'TRUE'); //ACK
				//可以收到時間要做甚麼

				//解鎖
				unlockLed.on();
				ledObject.unlockLedState = "on";
				lockLed.off();
				ledObject.lockLedState = "off";

				isTimeout = false;
				isReturn = false;

				if (ledObject.unlockLedState === "on") {
					setTimeout(function() {
						//時間到要做甚麼
						console.log("Timeout")

						//鎖定
						unlockLed.off();
						ledObject.unlockLedState = "off";
					
						lockLed.on();
						ledObject.lockLedState = "on";

						//歸還
						//if(!isReturn)
							//returnGogoro(socketForuse);

						isTimeout = true;

						
					}, parseInt(mSec));
				}
			} else {
				socket.emit('news', 'FALSE'); //ACK
			}
		});
	});

	//引擎按鈕
	engineButton.on("press", function() {
		console.log("Press engineButton");

		if (ledObject.engineLedState === "off") {
			if(ledObject.unlockLedState === "on"){
				engineRelay.on();
				engineLed.on();
				ledObject.engineLedState = "on";
				console.log("Button on");
			}
		} else if (ledObject.engineLedState === "on"){
			engineRelay.off();
			engineLed.off();
			ledObject.engineLedState = "off";
			console.log("Button off");
			
			//時間到時自動還車
			if(isTimeout){
				returnGogoro(socketForuse);
				isReturn = true;
			}
		}
    	
	});

	//歸還按鈕
	returnButton.on("press", function() {
		console.log("Press returnButton");

		if(!isReturn&&ledObject.engineLedState === "off"){
			//鎖定
			unlockLed.off();
			ledObject.unlockLedState = "off";
					
			lockLed.on();
			ledObject.lockLedState = "on";

			//歸還
			returnGogoro(socketForuse);
			isReturn = true;
		}
	});

});

// socke.io-client

function returnGogoro(socket) {
	var io_client = require('socket.io-client');

	socket = io_client.connect('http://192.168.43.173:1916');

	socket.emit('return gogoro', {renter:renter});

	console.log("func_retun");


	// // 監聽 連線建立
	// socket.on('server connecting', function(data) {
	// 	console.log(data);
	// 	socket.emit('return gogoro', {id:"4270C2F2-42EB-4223-98A1-D86F8838ECC6"})
 //  	});
	// // 監聽 還車回報
	// socket.on('server reply', function(data){
	// 	console.log(data);
	// })
}


