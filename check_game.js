const fs = require('fs');
const c = fs.readFileSync('html5game/BLANK GAME.js', 'utf8');

// The key fact:
// _yK1 tries: ["webgl","experimental-webgl","moz-webgl","webkit-3d"]
// These are all WebGL 1 context names - NOT webgl2
// 
// _Z6:2 in _D6 doesn't mean "WebGL 2 version" - it's the render mode
// Let's verify: what does _EF3=-2 vs _EF3=0 vs _EF3=3 mean?
// case -2: shows _sG3 ("WebGL is required" message) → BLACK SCREEN IS THIS!
// case 0: loading
// case 3: main game loop

// So the black screen is: WebGL context failed to initialize
// _ZC3(canvas) returns false
// Since _Z6==2 (not 1), it doesn't set _JC2=true for 2D fallback
// _EF3 is set to -2 by default if JC2 is true... wait:
// if (_JC2){_EF3=-2} else {..._EF3=0}

// So IF WebGL init fails and _Z6==2:
//   - _JC2 is NOT set to true (only when _Z6==1)  
//   - but _cr = canvas.getContext('2d') is still called
//   - _EF3 = 0 (not -2!)
// WAIT: let me re-read the init code more carefully

const posInit = c.indexOf('_JC2=false;_CF=[]');
console.log('Init section:');
console.log(c.substring(posInit, posInit + 600));
