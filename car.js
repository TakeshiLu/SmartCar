var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var five = require("johnny-five");

var board  = new five.Board({
	//port : "/dev/ttyACM0",
	port : "COM4",
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
var timer;

var isTimeout=true,isReturn=true;

server.listen(process.env.PORT || 1337, function(){
	console.log('listening on *:1337');
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

			console.log("renter: "+renter);
			console.log("time(ms): "+mSec);


			if (!isNaN(mSec)) { //如果mSec是時間(數字)
				socket.emit('news', 'ok'); //ACK
				//收到時間要做甚麼

				unlock();
				startTheEngine();

				isTimeout = false;
				isReturn = false;

				timer = setTimeout(function() {//時間到要做甚麼
					console.log("Timeout")
					lock();
					isTimeout = true;
				}, parseInt(mSec));
			} else {
				socket.emit('news', 'time format error'); //ACK
			}
		});
	});


	//引擎按鈕
	engineButton.on("press", function() {
		console.log("Press engineButton");
		if (ledObject.engineLedState === "off") {
			if(ledObject.unlockLedState === "on"){
				startTheEngine();
				console.log("Button on");
			}
		}else if (ledObject.engineLedState === "on"){
			stopTheEngine();
			console.log("Button off");
			
			//時間到時自動還車
			if(isTimeout){
				// returnGogoro(socket);
				returnGogoro(socketForuse);
			}
		}
	});

	//歸還按鈕
	returnButton.on("press", function() {
		console.log("Press returnButton");
		if(!isReturn&&ledObject.engineLedState === "off"){
			lock();
			// returnGogoro(socket);
			returnGogoro(socketForuse);
			clearTimeout(timer);
		}
	});

	function lock(){//鎖定
		unlockLed.off();
		ledObject.unlockLedState = "off";
					
		lockLed.on();
		ledObject.lockLedState = "on";
	}

	function unlock(){//解鎖
		unlockLed.on();
		ledObject.unlockLedState = "on";

		lockLed.off();
		ledObject.lockLedState = "off";
	}
	
	function startTheEngine(){//發動引擎
		engineRelay.on();
		engineLed.on();
		ledObject.engineLedState = "on";
	}
	
	function stopTheEngine(){//熄火
		engineRelay.off();
		engineLed.off();
		ledObject.engineLedState = "off";
	}

	function returnGogoro(socket) {
		console.log("func_return");
		socket.emit('return gogoro', {renter:renter});
		isReturn = true;
	}
});
