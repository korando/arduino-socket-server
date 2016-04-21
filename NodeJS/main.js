var app = require('http').createServer(handler)
var io = require('socket.io')(app);
var fs = require('fs');
var clients = [];
var groups = {};
var groupCounts = 0;


//ADRUINO BOARD
// Dependancy upon Johnny-Five
var five = require("johnny-five");

// Set up references to Arduino Board and LED
var myBoard, myLed;

// Initialise Microcontroller 
myBoard = new five.Board();

// After successful initialisation of the board this code block will be run
myBoard.on("ready", function() {
   // Instantiate a LED Object (Arduino Uno has a LED attached to Pin 13)
   myLed = new five.Led(13);
   // Strobe the LED (ms)
   //myLed.strobe( 300 );
  // Add myLed to REPL (under name led)
  this.repl.inject({
    led: myLed
  });

});




//port thằng user truy cập vào
var server_port = process.env.OPENSHIFT_NODEJS_PORT || 3030

//ip thằng user truy cập vào
var server_ip_address = process.env.OPENSHIFT_NODEJS_IP || '192.168.19.24'
 
// tạo mới group code name
function getGroupCode(){
	groupCounts++;
	var t = ( "00000" + groupCounts);
	t = t.substr(t.length - 6);
	return "g" + t;
}

// remove một item trong một goup
function removeGroupItem(groupName, item){
	var s = groups[groupName];
	var indexRemoves = [];
	if (s != null) {
		// duyệt các item 
		for(var  i= s.length -1; i >= 0 ; i--) {
			if(s[i] == item) {
				indexRemoves.push(i); 		
			}
		}
		// remove
		for(var i = 0; i < indexRemoves.length; i++){
			s.splice(indexRemoves[i], 1);
		}
		if (s.length == 0) {
			groups[groupName] = null;
		}
	}
}

app.listen(server_port, server_ip_address, function () {
  console.log( "Listening on " + server_ip_address + ", server_port " + server_port )
});


function handler (req, res) {
  res.writeHead(200);
  res.end("hello");
}

io.on('connection', function (socket) {
	//clients.push(socket);
	console.log("connection " );
  socket.on('register', function () {
  	console.log("register");
  	// kiem tra scoket nay có group chua
  	if (socket.data_groupName != null) {
  		// nếu socket này có group ta cần remove nó ra khỏi group cũ
  		removeGroupItem(socket.data_groupName, socket);
  	}
  	var g = getGroupCode();
  	console.log("getGroupCode", g);
    groups[g] = [];
	groups[g].push(socket);
	socket.data_groupName = g;	
    socket.emit('onRegister', { data: g, errorCode : 0 });
  });
  socket.on('join', function (groupName) {
    console.log("join", groupName);
    if(groups[groupName] == null) {
    	socket.emit('onJoin', { error: "group not found", errorCode : 1 });
    }
    else {
    	var s = groups[groupName];
    	for(var  i= 0; i < s.length; i++){
     		s[i].emit('onJoinOther', { errorCode: 0 });   		
    	}
    	s.push(socket);
    	socket.emit('onJoin', { errorCode : 0 });
    }
    socket.data_groupName = groupName;	
  });
  socket.on('message', function (data) {
  	var s = groups[socket.data_groupName];
	if(socket.data_groupName != null && s != null){		
    	for(var  i= 0; i < s.length; i++){
    		if(s[i] != socket) {
     			s[i].emit('onMessage', { errorCode: 0, data: data }); 
          
          //listen to Arduino start event
          if (data.status=="arduino-start")  {
            myLed.on();   
          } else if (data.status!="arduino-start") {
            myLed.off();   
          }
            
            
     		}
    	}
	}
	else{
		socket.emit('onError', { error: "group not found", errorCode : 1 });
	}
  });    
  socket.on('disconnect', function () {
  	console.log("disconnect ", socket.data_groupName);
  	// remove nó ra khỏi group
	if(socket.data_groupName != null){		
		removeGroupItem(socket.data_groupName, socket);
	}
  });
});