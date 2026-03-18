function gamepadHandler(event, connecting) {
  const gamepad = event.gamepad;
  if (connecting) {
    controllers[gamepad.index] = gamepad;
  } else {
    delete controllers[gamepad.index];
  }
}

function buttonPressed(b) {
    if(b === null)
        return false;
    if (typeof(b) === "object") {
        return b.pressed; // binary 
    }
    return b > 0.4; // analog value
}

function eventiController(){
    window.addEventListener("gamepadconnected", function(e) {
        gamepadHandler(e, true);      
    });

	window.addEventListener("gamepaddisconnected", function(e) {
        gamepadHandler(e, false);
    }); 
}