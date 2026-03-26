

function sign(x) {
    if (x == 0) return 0
    return x > 0 ? 1 : -1;
}

function minAbs(n1, n2) {
    if (abs(n1) <= abs(n2))
        return n1;
    return n2;
}

function maxAbs(n1, n2) {
    if (abs(n1) >= abs(n2))
        return n1;
    return n2;
}

const comandi = {};

const controllers = [];

let sveglie = [];

const ATTIVO = 0x1;
const ATTIVATO = 0x2;
const INATTIVO = 0x4;
const DISATTIVATO = 0x8;

let bufferComandi = [];

let checkpointAttivo = undefined;

function controllaBuffer(comando, condizione){
    for(let prevComandi of bufferComandi){
        if(prevComandi[comando].stato & condizione)
            return true;
    }
    return false;
}

function aggiornaBufferComandi(){
    let currComandi = [];

    for (const [key0, value0] of Object.entries(comandi)) {
        currComandi[key0] = {};
        for (const [key1, value1] of Object.entries(comandi[key0])) {
            currComandi[key0][key1] = value1;
        }
    }
    bufferComandi.unshift(currComandi);
    while(bufferComandi.length > LUNGHEZZA_BUFFER_COMANDI)
    {
        bufferComandi.pop();
    }
}

function ripristinaBufferComandi(){
    bufferComandi = [];
}

function setupComandi() {

    eventiController();
    
    comandi.SU = { binds: [UP_ARROW, "W".charCodeAt(0), [0, 12], [0, "axis", 1, -1]], stato: INATTIVO, nome:'SU' };
    comandi.GIU = { binds: [DOWN_ARROW, "S".charCodeAt(0), [0, 13], [0, "axis", 1, 1]], stato: INATTIVO, nome:'GIÙ' };
    comandi.SX = { binds: [LEFT_ARROW, "A".charCodeAt(0), [0, 14], [0, "axis", 0, -1]], stato: INATTIVO, nome:'SINISTRA' };
    comandi.DX = { binds: [RIGHT_ARROW, "D".charCodeAt(0), [0, 15], [0, "axis", 0, 1]], stato: INATTIVO, nome:'DESTRA' };
    comandi.SALTO = { binds: [UP_ARROW, "W".charCodeAt(0), " ".charCodeAt(0), [0, 0]], stato: INATTIVO, nome:'SALTO' };
    comandi.SCATTO = { binds: [SHIFT, [0, 1]], stato: INATTIVO, nome:'SCATTO' };
    comandi.ROTOLATA = { binds: [CONTROL, [0, 2]], stato: INATTIVO, nome:'ROTOLATA' };
    comandi.MENU = { binds: [ESCAPE, [0, 3]], stato: INATTIVO, nome:'MENÙ' };
    comandi.CONFERMA = { binds: [ENTER, [0, 0]], stato: INATTIVO, nome:'CONFERMA' };
    comandi.RESET = { binds: [BACKSPACE, [0, 4]], stato: INATTIVO, nome:'RESET' };

    /*comandi.SU = { binds: [UP_ARROW, "W".charCodeAt(0), [1, "axis", 1, -1]], stato: INATTIVO, nome:'SU' };
    comandi.GIU = { binds: [DOWN_ARROW, "S".charCodeAt(0), [0, 13], [1, "axis", 1, 1]], stato: INATTIVO, nome:'GIÙ' };
    comandi.SX = { binds: [LEFT_ARROW, "A".charCodeAt(0), [0, 14], [1, "axis", 0, -1]], stato: INATTIVO, nome:'SINISTRA' };
    comandi.DX = { binds: [RIGHT_ARROW, "D".charCodeAt(0), [0, 15], [1, "axis", 0, 1]], stato: INATTIVO, nome:'DESTRA' };
    comandi.SALTO = { binds: [UP_ARROW, "W".charCodeAt(0), " ".charCodeAt(0), [1, 0]], stato: INATTIVO, nome:'SALTO' };
    comandi.SCATTO = { binds: [SHIFT, [1, 1]], stato: INATTIVO, nome:'SCATTO' };
    comandi.ROTOLATA = { binds: [CONTROL, [1, 2]], stato: INATTIVO, nome:'ROTOLATA' };
    comandi.MENU = { binds: [ESCAPE, [1, 3]], stato: INATTIVO, nome:'MENÙ' };
    comandi.CONFERMA = { binds: [ENTER, [1, 0]], stato: INATTIVO, nome:'CONFERMA' };
    comandi.RESET = { binds: [BACKSPACE, [1, 4]], stato: INATTIVO, nome:'RESET' };*/
    
}

let spartito = [];

function aggiornaComandi(frame, pilotato) {

    const gamepads = navigator.getGamepads();
    let ultimoFrame = undefined;
    if(!pilotato && frame !== undefined){
        ultimoFrame = {
            frame: frame,
            comandi: []
        }
        spartito.push(ultimoFrame);
    }
    for (const [key, value] of Object.entries(comandi)) {

        let disattivato = value.stato & (INATTIVO | DISATTIVATO);

        if (value.stato & (ATTIVO | ATTIVATO))
            value.stato = DISATTIVATO;
        else
            value.stato = INATTIVO;

        if(pilotato){
            const nota = spartito.find(nota => nota.frame === frame);
            if(nota){
                if(nota.comandi.find(comando => comando === key)){
                    value.stato = disattivato ? ATTIVATO : ATTIVO;
                }
            }
        } else {
            for(let i = 0; i < value.binds.length; i++) {
                let bind = value.binds[i];
                
                if (typeof(bind) === "number" && tasti.has(bind)) {
                    value.stato = disattivato ? ATTIVATO : ATTIVO;
                    ultimoFrame?.comandi.push(key);
                    break;
                }
                if(typeof(bind) !== "number" && gamepads !== null &&
                    gamepads.length > bind[0] && gamepads[bind[0]]){
                    if(bind[1] !== "axis"){
                        if(gamepads[bind[0]].buttons && buttonPressed(gamepads[bind[0]].buttons[bind[1]])){
                            value.stato = disattivato ? ATTIVATO : ATTIVO;
                            ultimoFrame?.comandi.push(key);
                            break;
                        }
                    }
                    else{
                        if(gamepads[bind[0]].axes && buttonPressed(gamepads[bind[0]].axes[bind[2]] * bind[3])){
                            value.stato = disattivato ? ATTIVATO : ATTIVO;
                            ultimoFrame?.comandi.push(key);
                            break;
                        }
                    }
                }
            }
        }
    }
    if(ultimoFrame && ultimoFrame.comandi.length === 0){
        spartito.pop();
    }
    aggiornaBufferComandi();
}


let tasti = new Set();
function keyPressed() {
    tasti.add(keyCode);
}
function keyReleased() {
    tasti.delete(keyCode);
}

let collisori = [];

let causatori = [];

let quadranti = {};

function getCollIndice(posizione){
    return (floor(posizione.x / LARGHEZZA) + CONFINI_MAPPA.x) + "_" +
        (floor(posizione.y / ALTEZZA) + CONFINI_MAPPA.y);
}

function aggiungiOTogliCollisoreAQuadranti(collisore, aggiungi){
    let minX = Number.MAX_SAFE_INTEGER, maxX = Number.MIN_SAFE_INTEGER, 
    minY = Number.MAX_SAFE_INTEGER, maxY = Number.MIN_SAFE_INTEGER;
    if('h' in collisore){
        minX = collisore.x;
        maxX = collisore.x + collisore.w;
        minY = collisore.y;
        maxY = collisore.y + collisore.h;
    }else{
        for(let j=0; j<collisore.vertici.length; j++){
            minX = min(minX, collisore.vertici[j].x + collisore.x);
            maxX = max(maxX, collisore.vertici[j].x + collisore.x);
            minY = min(minY, collisore.vertici[j].y + collisore.y);
            maxY = max(maxY, collisore.vertici[j].y + collisore.y);
        }
    }
    for(let x = minX; x <= maxX; x+= LARGHEZZA/2){
        for(let y = minY; y <= maxY; y+= ALTEZZA/2){
            let key = getCollIndice({x: x, y: y});
            if(!(key in quadranti))
                quadranti[key] = [];
            if(aggiungi){
                if(!quadranti[key].includes(collisore)){
                    quadranti[key].push(collisore);
                }
            }
            else{
                if(quadranti[key].includes(collisore))
                    quadranti[key].splice(quadranti[key].indexOf(collisore), 1);
            }
        }
    }
}

function aggiungiCollisoreAQuadranti(collisore){
    aggiungiOTogliCollisoreAQuadranti(collisore, true);
}

function togliCollisoreAQuadranti(collisore){
    aggiungiOTogliCollisoreAQuadranti(collisore, false);
}


function caricaPiattaforme(){

    provaGenerica1();

    collisori.forEach((item, index) => {
        aggiungiCollisoreAQuadranti(item);
    });


    causatori.forEach((item, index) => {
        aggiungiCollisoreAQuadranti(item);
    });

}

function creaPulsante(x, y, w, h, f, c){
    let pulsanteGenBlocchi = { x: 0, y: 0, rompibile: false, mobile: false, colore: c,
        vertici : [{x:x, y:y+h}, {x:x+w, y:y+h}, {x:x+w-h, y:y}, {x:x+h, y:y}],
        percorso: [{x:0, y:0, t:0.3}, {x:0, y:h, t:null}],
        tocco: () => {
            if(velocini.y + velocini.h <= y+h){
                pulsanteGenBlocchi.mobile = true; 
                f(); 
                velocini.pulsante = pulsanteGenBlocchi; 
                velocini.indicePulsante = 3;
                return true;
            }
            return false;
        }
    };
    let dimPulsante = {x: pulsanteGenBlocchi.vertici[0].x, y: pulsanteGenBlocchi.vertici[0].y, 
        w: pulsanteGenBlocchi.vertici[1].x - pulsanteGenBlocchi.vertici[0].x,
        h: pulsanteGenBlocchi.vertici[0].y - pulsanteGenBlocchi.vertici[3].y
    };

    let resettaPulsanteBlocchi = () =>{
        
        pulsanteGenBlocchi.mobile = false;
        pulsanteGenBlocchi.t = 0;
        pulsanteGenBlocchi.vx = 0;
        pulsanteGenBlocchi.vy = 0;
        pulsanteGenBlocchi.x = 0;
        pulsanteGenBlocchi.y = 0;
    };
    causatori.push({x: dimPulsante.x - LARGHEZZA * 1.5, y: dimPulsante.y - dimPulsante.h - ALTEZZA *1.6, w: LARGHEZZA, h: dimPulsante.h + ALTEZZA * 2.6,
        effetto: resettaPulsanteBlocchi});
    causatori.push({x: dimPulsante.x + dimPulsante.w + LARGHEZZA / 2, y: dimPulsante.y - dimPulsante.h - ALTEZZA *1.6, w: LARGHEZZA, h: dimPulsante.h + ALTEZZA * 2.6,
        effetto: resettaPulsanteBlocchi});
    causatori.push({x: dimPulsante.x - LARGHEZZA / 2, y: dimPulsante.y - dimPulsante.h - ALTEZZA *1.6, w: dimPulsante.w + LARGHEZZA, h: ALTEZZA,
        effetto: resettaPulsanteBlocchi});
    causatori.push({x: dimPulsante.x - LARGHEZZA / 2, y: dimPulsante.y , w: dimPulsante.w + LARGHEZZA, h: ALTEZZA,
        effetto: resettaPulsanteBlocchi});
    collisori.push(pulsanteGenBlocchi);
}

function creaSpine(x, y, w, h, o = 'su'){
    let spine;
    if(o === 'su' || o==='giù'){
        spine = { x: 0, y: 0, rompibile: false, mobile: false,
            vertici: [{ x: x, y: o==='su' ? y+h+3 : y-3}, { x: x+w, y: o==='su' ? y+h+3 : y-3}],
            tocco: morte
        };
        for(let i=0; i<w/h; i++){
            spine.vertici.push({x: x+w - i*h, y: o==='su' ? y+h : y});
            spine.vertici.push({x: x+w - (i + 0.5)*h, y: o==='su' ? y : y+h});
        }
        spine.vertici.push({ x: x, y: o==='su' ? y+h : y});
        if(o==='giù')spine.vertici.reverse();
    } else {
        spine = { x: 0, y: 0, rompibile: false, mobile: false,
            vertici: [{ x: o==='sx' ? x+w+3 : x-3, y: y}, { x: o==='sx' ? x+w+3 : x-3, y: y+h}],
            tocco: morte
        };
        for(let i=0; i<h/w; i++){
            spine.vertici.push({x: o==='sx' ? x+w : x, y: y+h - i*w});
            spine.vertici.push({x: o==='sx' ? x : x+w, y:y+h - (i + 0.5)*w });
        }
        spine.vertici.push({ x: o==='sx' ? x+w : x, y: y});
        if(o==='dx')spine.vertici.reverse();
    }
    
    const ATLAS_W = atlasImage.width;
    const ATLAS_H = atlasImage.height;
    
    const SPINA_X = 0;   
    const SPINA_Y = 80;   
    const SPINA_W = 20;  
    const SPINA_H = 20; 
    const uvSpina = [SPINA_X / ATLAS_W, SPINA_Y / ATLAS_H, SPINA_W / ATLAS_W, SPINA_H / ATLAS_H];

    spine.disegno = () => {
        push();
            translate(x + spine.x + w/2, y + spine.y + h/2);
            let textureW = w;
            let textureH = h;
            switch(o){
                case 'giù':
                    rotate(PI);
                break;
                case 'sx':
                    rotate(-HALF_PI);
                    textureW = h;
                    textureH = w;
                break;
                case 'dx':
                    rotate(HALF_PI);
                    textureW = h;
                    textureH = w;
                break;
            }
            numSpine = floor(textureW / textureH);
            shader(atlasShader);
            atlasShader.setUniform('uTexture', atlasImage);
            atlasShader.setUniform('uColor', [1, 1, 1, 1]);
            atlasShader.setUniform('uIsSprite', 0.0); 
            atlasShader.setUniform('uSubRect', uvSpina);
            atlasShader.setUniform('uRepeat', [numSpine, 1]);
            atlasShader.setUniform('uTexSize', [ATLAS_W, ATLAS_H]); 
            atlasShader.setUniform('uWrapMode', [1.0, 0.0]); 
            rect(- textureW/2, - textureH/2, numSpine*textureH, textureH);
        pop();
        resetShader();
    }

    return spine;
}

function creaGeneraBlocchi(items){
    return () => items.forEach((item, index) => {
                    if(!collisori.includes(item))
                        collisori.push(item);
                    aggiungiCollisoreAQuadranti(item);
                });
}

function percorsoCircolare(x, y, r, t, phi, orario){
    const step = 1/FRAME_RATE;
    const sign = orario ? 1 : -1;
    const percorso = [];
    for(let dt=0; dt<t; dt+=step){
        percorso.push({x: x + r*cos((dt*TWO_PI/t + phi) * sign), y: y + r*sin((dt*TWO_PI/t + phi) * sign), t:step});
    }
    return percorso;
}


let ultimoCheckPointToccato = false;
function provaGenerica1(){
    
    velocini.rinascita = {x: 410 - LARGHEZZA/2, y: 1540 - ALTEZZA};
    causatori.push(creaCheckpoint({x: 360, y: 1440, w: 100, h: 100}, 410 - LARGHEZZA/2, 1540 - ALTEZZA));

    causatori.push({x: -100, y: 3100, w: 5300, h: 100, effetto: () => {morte();}});
    causatori.push({x: 100, y: 2860, w: 100, h: 100, effetto: () => {velocini.stato.add("PW_saltomuro");},
        disegno: () => {
            textSize(20);
            fill(255, 0, 0);
            text("Salto a muro", 150, 2910);
        }
    });
    causatori.push(creaCheckpoint({x: 200, y: 2860, w: 100, h: 100}, 250 - LARGHEZZA/2, 2960 - ALTEZZA));

    collisori.push({ x: 0, y: 0, w: 40, h: 3000, rompibile: false, mobile: false});
    collisori.push({ x: 220, y: 190, w: 40, h: 820, rompibile: false, mobile: false});
    collisori.push({ x: 260, y: 1540, w: 500, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 500, y: 1500, w: 40, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 720, y: 1580, w: 80, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 760, y: 1620, w: 40, h: 100, rompibile: false, mobile: false});
    collisori.push({ x: 800, y: 1680, w: 120, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 920, y: 1540, w: 40, h: 180, rompibile: false, mobile: false});
    collisori.push({ x: 960, y: 1540, w: 300, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 1260, y: 1540, w: 40, h: 300, rompibile: false, mobile: false});
    collisori.push({ x: 1180, y: 1800, w: 80, h: 40, rompibile: false, mobile: false});
    collisori.push(creaSpine(1100, 1520, 60, 20));


    collisori.push({ x: 40, y: 2960, w: 250, h: 40, rompibile: false, mobile: false});
    const bloccoMobileSaltoMuro = { x: 110, y: 2760, w: 60, h: 40, rompibile: false, mobile: false,
        percorso: [{x:110, y:2760, t:3}, {x:300, y:2760, t:3}, {x:110, y:2760, t:null}],
        tocco: () => {bloccoMobileSaltoMuro.mobile = true; return true;}
    };
    collisori.push(bloccoMobileSaltoMuro);
    collisori.push({ x: 40, y: 2870, w: 60, h: 90, rompibile: false, mobile: false});
    collisori.push({ x: 500, y: 2760, w: 100, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 220, y: 2700, w: 100, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 220, y: 2550, w: 1100, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 320, y: 2170, w: 40, h: 570, rompibile: false, mobile: false});
    collisori.push({ x: 100, y: 2420, w: 60, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 80, y: 2250, w: 80, h: 40, rompibile: false, mobile: true,
        percorso: [{x:80, y:2250, t:2}, {x:200, y:2280, t:2}]
    });
    collisori.push({ x: 260, y: 2130, w: 140, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 40, y: 2130, w: 100, h: 40, rompibile: false, mobile: false});
    causatori.push(creaCheckpoint({x: 40, y: 2030, w: 100, h: 100}, 80, 2090));
    collisori.push({ x: 40, y: 1730, w: 60, h: 40, rompibile: false, mobile: true,
        percorso: [{ x: 40, y: 1730, t:3}, { x: 40, y: 2000, t:3}]
    });
    collisori.push({ x: 40, y: 1690, w: 60, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 220, y: 2030, w: 40, h: 140, rompibile: false, mobile: false});
    collisori.push({ x: 260, y: 2030, w: 60, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 320, y: 1580, w: 40, h: 490, rompibile: false, mobile: false});
    collisori.push({ x: 130, y: 1850, w: 60, h: 40, rompibile: false, mobile: true,
        percorso: [{ x: 130, y: 1850, t:3}, { x: 130, y: 1570, t:3}]
    });
    collisori.push({ x: 220, y: 1300, w: 40, h: 280, rompibile: false, mobile: false});
    collisori.push(creaSpinaVolante(118,  1258,
         [{ x: 118, y: 1258, t:1}, { x: 118, y: 1258, t:2}, { x: 118, y: 1478, t:1}, { x: 118, y: 1478, t:2}]
    ));
    collisori.push({ x: 40, y: 1300, w: 60, h: 40, rompibile: false, mobile: false});
    collisori.push(creaSpinaVolante(58, 1168, 
        [{ x: 58, y: 1168, t: 1 }, { x: 58, y: 1168, t: 2 }, { x: 178, y: 1168, t: 1 }, { x: 178, y: 1168, t: 2 }]
    ));
    collisori.push({ x: 160, y: 970, w: 60, h: 40, rompibile: false, mobile: false});
    causatori.push(creaCheckpoint({x: 120, y: 870, w: 100, h: 100}, 190 - LARGHEZZA/2, 970 - ALTEZZA));
    const botola = { x: 40, y: 150, w: 220, h: 40, rompibile: false, mobile: false,
        percorso : [{x:40, y:150, t:2.1}, {x:260, y:150, t:7.5}, {x:40, y:150}]
    }
    collisori.push(botola);
    const bloccoMobileSaltoMuro2 = { x: 40, y: 850, w: 60, h: 40, rompibile: false, mobile: false,
        percorso : [{x:40, y:850, t:0.1}, {x:40, y:850, t:4.5}, {x:40, y:400, t:1}, {x:40, y:400, t:3}, {x:40, y:850, t:null}],
        tocco : () => {bloccoMobileSaltoMuro2.mobile = true; botola.mobile = true;}
    }
    collisori.push(bloccoMobileSaltoMuro2);
    collisori.push(creaSpinaVolante(48, 638));
    collisori.push(creaSpinaVolante(80, 638));
    
    
    collisori.push({ x: 260, y: 1350, w: 860, h: 40, rompibile: false, mobile: false});
    causatori.push(creaCheckpoint({x: 1020, y: 1250, w: 100, h: 100}, 1070 - LARGHEZZA/2, 1350 - ALTEZZA));
    const blocchiRotolata1 = [];
    const portaRotolataSaltoMuro = { x: 219.8, y: 1010, w: 40.4, h: 300, rompibile: true, mobile: false};
    collisori.push(portaRotolataSaltoMuro);
    blocchiRotolata1.push(portaRotolataSaltoMuro);
    blocchiRotolata1.push({ x: 580, y: 1200, w: 180, h: 40, rompibile: true, mobile: false});
    blocchiRotolata1.push({ x: 720, y: 1110, w: 40, h: 90, rompibile: true, mobile: false});
    blocchiRotolata1.push({ x: 889, y: 950, w: 41, h: 120, rompibile: true, mobile: false});
    blocchiRotolata1.push({ x: 409.8, y: 840, w: 50.2, h: 280, rompibile: true, mobile: false});
    
    creaPulsante(270, 1341, 180, 10, creaGeneraBlocchi(blocchiRotolata1));
    collisori.push({ x: 400, y: 1260, w: 100, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 500, y: 1200, w: 40, h: 100, rompibile: false, mobile: false});
    collisori.push({ x: 540, y: 1200, w: 40, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 620, y: 1070, w: 140, h: 40, rompibile: false, mobile: false});
    const ascensoreBlocchi = { x: 760, y: 1200, w: 60, h: 40, rompibile: false, mobile: false,
        percorso: [{ x: 760, y: 1200, t:2}, { x: 760, y: 1070, t:1}, { x: 760, y: 1200, t:null}],
        tocco: () => {ascensoreBlocchi.mobile = true; return true;}
    };
    collisori.push(ascensoreBlocchi);
    collisori.push({ x: 640.2, y: 980, w: 200, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 640, y: 940, w: 60, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 0, y: 0, rompibile: false, mobile: false,
        vertici: [{x: 700, y: 940}, {x: 700, y: 982}, {x: 840, y: 982}, {x: 840, y: 980}]
    });
    collisori.push({ x: 950, y: 1050, w: 60, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 410, y: 1120, w: 50, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 460, y: 840, w: 40, h: 320, rompibile: false, mobile: false});
    collisori.push({ x: 260, y: 780, w: 40, h: 120, rompibile: false, mobile: false});
    collisori.push({ x: 0, y: 0, rompibile: false, mobile: false,
        vertici: [{x: 260, y: 780}, {x: 280, y: 780}, {x: 270, y: 760}],
        tocco: morte
    });
    collisori.push({ x: 0, y: 0, rompibile: false, mobile: false,
        vertici: [{x: 280, y: 780}, {x: 300, y: 780}, {x: 290, y: 760}],
        tocco: morte
    });
    collisori.push({ x: 1010, y: 640, w: 40, h: 570, rompibile: false, mobile: false});
    collisori.push({ x: 294, y: 640, w: 716, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 1120, y: 250, w: 40, h: 1140, rompibile: false, mobile: false});
    collisori.push({ x: 260, y: 360, w: 800, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 260, y: 510, w: 264, h: 40, rompibile: true, mobile: false});
    collisori.push({ x: 514, y: 510, w: 606, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 260, y: 150, w: 830, h: 40, rompibile: false, mobile: false});
    causatori.push({ x: 1260, y: 40, w: 100, h: 110, effetto: () => {velocini.stato.add("PW_rotolata");},
        disegno: () => {
            textSize(20);
            fill(255, 0, 0);
            text("Rotolata", 1310, 95);
        }});
    causatori.push(creaCheckpoint({x: 1360, y: 40, w: 100, h: 110}, 1410 - LARGHEZZA/2, 150 - ALTEZZA));
    collisori.push({ x: 40, y: 0, w: 5000, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 1200, y: 150, w: 460, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 760, y: 250, w: 100, h: 40, rompibile: true, mobile: false});
    collisori.push({ x: 860, y: 272, w: 180, h: 18, rompibile: false, mobile: false});
    collisori.push(creaSpine(860, 252, 180, 20));
    collisori.push(creaSpine(400, 340, 120, 20));
    collisori.push({ x: 1040, y: 250, w: 80, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 1160, y: 365, w: 80, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 1411, y: 230, w: 40, h: 70, rompibile: false, mobile: false});
    collisori.push({ x: 1351, y: 230, w: 60, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 1411, y: 300, w: 199, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 1660, y: 150, w: 40, h: 190, rompibile: false, mobile: false});
    collisori.push({ x: 1610, y: 340, w: 50, h: 80, rompibile: false, mobile: true,
        percorso: [{ x: 1610, y: 340, t: 0.3}, { x: 1610, y: 340, t: 0.5}, { x: 1559, y: 340, t: 1.4}, { x: 1559, y: 340, t: 0.3}]
    });
    collisori.push({ x: 1665, y: 420, w: 100, h: 40, rompibile: false, mobile: true,
        percorso: [{ x: 1665, y: 420, t: 1.1}, { x: 1760, y: 420, t: 1.1}, { x: 1665, y: 420, t: 0.3}]
    });
    collisori.push({ x: 1960, y: 420, w: 60, h: 130, rompibile: false, mobile: false});
    const spineRetrattiliRot = creaSpine(1458, 285, 150, 15);
    collisori.push(spineRetrattiliRot);
    creaPulsante(1960, 411, 60, 10, () => {
        if(collisori.includes(spineRetrattiliRot)){
            collisori.splice(collisori.indexOf(spineRetrattiliRot), 1);
            togliCollisoreAQuadranti(spineRetrattiliRot);
            sveglie.push({t: FRAME_RATE * 5, azione: () => {collisori.push(spineRetrattiliRot); aggiungiCollisoreAQuadranti(spineRetrattiliRot);}});
        }
    });

    const ascensoreDashVersoRotSoffitto = { x: 1700, y: 150, w: 340, h: 60, rompibile: false, mobile: false,
        percorso: [{x: 1700, y: 150, t: 2}, {x: 1700, y: 0, t:1}, {x: 1700, y: 0, t:2}, {x: 1700, y: 150}],
    }
    collisori.push(ascensoreDashVersoRotSoffitto);
    collisori.push({ x: 1700, y: 290, w: 500, h: 40, rompibile: false, mobile: false});
    const ascensoreDashVersoRotPavimento = { x: 1700, y: 290, w: 120, h: 39, rompibile: false, mobile: false,
        percorso: [{x: 1700, y: 290, t: 2}, {x: 1700, y: 150, t:1}, {x: 1700, y: 150, t:2}, {x: 1700, y: 290}],
        tocco: () => {ascensoreDashVersoRotPavimento.mobile = true; ascensoreDashVersoRotSoffitto.mobile = true; return true;}
    };
    collisori.push(ascensoreDashVersoRotPavimento);
    collisori.push(creaSpine(1820, 270, 200, 20));
    collisori.push({ x: 2160, y: 290, w: 40, h: 1540, rompibile: false, mobile: false});
    collisori.push({ x: 2200, y: 360, w: 490, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 2690, y: 290, w: 40, h: 300, rompibile: false, mobile: false});
    collisori.push(creaSpine(2200, 346, 490, 14));
    causatori.push(creaCheckpoint({x: 2040, y: 150, w: 160, h: 140}, 2100, 290 - ALTEZZA));
    collisori.push({ x: 2730, y: 290, w: 2230, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 0, y: 0, rompibile: false, mobile: false,
        vertici: [{x: 3200, y: 270}, {x: 3165, y: 270}, {x: 3165, y: 295}, {x: 3300, y: 295}]
    });
    causatori.push({ x: 3110, y: 40, w: 100, h: 110, checkpoint: true,
        effetto: () => {velocini.rinascita = {x: 3140, y: 150 - ALTEZZA};}
    });
    collisori.push({ x: 0, y: 0, rompibile: false, mobile: false,
        vertici: [{x: 2730, y: 295}, {x: 3170, y: 295}, {x: 3170, y: 150}, {x: 3100, y: 150}]
    });
    collisori.push({ x: 0, y: 0, w: 120, h: 40, rompibile: false, mobile: true,
        percorso: [{ x: 3500, y: 150, t: 0.2}, { x: 3500, y: 150, t: 1}, { x: 3650, y: 150, t: 0.2}, { x: 3650, y: 150, t: 1}]
    });
    collisori.push({ x: 3960, y: 150, w: 70, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 3920, y: 150, w: 110, h: 140, rompibile: false, mobile: false});
    collisori.push({ x: 0, y: 0, rompibile: false, mobile: false,
        vertici: [{x: 4030, y: 150}, {x: 4030, y: 295}, {x: 4400, y: 295}]
    });
    
    const oppostoBlocchiRotolata2 = { x: 3100, y: 40, w: 40, h: 110, rompibile: true, mobile: false};
    collisori.push(oppostoBlocchiRotolata2);
    const blocchiRotolata2 = [];
    blocchiRotolata2.push({ x: 4495, y: 205, w: 230, h: 65, rompibile: true, mobile: false});
    blocchiRotolata2.push({ x: 0, y: 0, rompibile: true, mobile: false,
        vertici: [{x: 4700, y:81}, {x: 4700, y:150}, {x: 4845, y:150}, {x: 4845, y:270}, {x: 4885, y:270}, {x: 4885, y:81}]
    });
    blocchiRotolata2.push({ x: 4805, y: 150, w: 40, h: 120, rompibile: true, mobile: false});
    blocchiRotolata2.push({ x: 4610, y: 130, w: 60, h: 75, rompibile: true, mobile: false});
    collisori.push({ x: 4885, y: 0, w: 40, h: 180, rompibile: false, mobile: false});
    
    creaPulsante(3920, 136, 110, 15, () => {
        creaGeneraBlocchi(blocchiRotolata2)();
        if(collisori.includes(oppostoBlocchiRotolata2)){
            collisori.splice(collisori.indexOf(oppostoBlocchiRotolata2), 1);
            togliCollisoreAQuadranti(oppostoBlocchiRotolata2);
        }
    });
    collisori.push({ x: 4460, y: 270, w: 40, h: 20, rompibile: false, mobile: false});
    collisori.push(creaSpine(4500, 270, 380, 20));

    causatori.push(creaCheckpoint({x: 4910, y: 190, w: 100, h: 100}, 4910, 290 - ALTEZZA));
    collisori.push({ x: 5000, y: 40, w: 40, h: 2960, rompibile: false, mobile: false});
    collisori.push({ x: 0, y: 0, rompibile: false, mobile: false, 
        vertici: [{x: 5000, y: 461}, {x: 5000, y: 390}, {x: 4950, y: 390}, {x: 4800, y: 461}]
    });
    collisori.push({ x: 4540, y: 460, w: 460, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 4460, y: 330, w: 300, h: 40, rompibile: false, mobile: false});
    const pistoneDash = { x: 4420, y: 370, w: 40, h: 90, rompibile: true, mobile: false,
        percorso: [{x: 4420, y: 370, t:2}, {x: 4540, y: 370, t:2}, {x: 4420, y: 370}]
    };
    const spineRetrattiliDash = creaSpine(4580, 438, 220, 22);
    creaPulsante(4500, 450, 60, 11, () => {
        if(!collisori.includes(spineRetrattiliDash)){
            pistoneDash.mobile = true;
            collisori.push(spineRetrattiliDash);
            aggiungiCollisoreAQuadranti(spineRetrattiliDash);
            sveglie.push({t: FRAME_RATE * 1.9, azione: () => {
                collisori.splice(collisori.indexOf(spineRetrattiliDash), 1);
                togliCollisoreAQuadranti(spineRetrattiliDash);
            }});
        }
    });
    collisori.push(pistoneDash);
    collisori.push({ x: 4420, y: 330, w: 40, h: 830, rompibile: false, mobile: false});
    collisori.push({ x: 4760, y: 330, w: 40, h: 70, rompibile: false, mobile: false});

    collisori.push({ x: 4500, y: 460, w: 40, h: 250, rompibile: false, mobile: false});
    collisori.push({ x: 4620, y: 560, w: 40, h: 210, rompibile: false, mobile: false});
    collisori.push({ x: 4540, y: 900, w: 460, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 0, y: 0, rompibile: false, mobile: false, 
        vertici: [{x: 4600, y: 901}, {x: 5000, y: 901}, {x: 5000, y: 750}, {x: 4950, y: 750}]
    });
    collisori.push({ x: 0, y: 0, rompibile: false, mobile: false, 
        vertici: [{x: 4659, y: 560}, {x: 4659, y: 636}, {x: 4915, y: 636}]
    });
    collisori.push({ x: 4660, y: 635, w: 260, h: 40, rompibile: false, mobile: false});
    const ascensoreDoppioDash = { x: 4950, y: 770, w: 80, h: 40, rompibile: false, mobile: false,
        percorso: [{x: 4950, y: 770, t: 2.2}, {x: 4540, y: 770, t: 0.2}, {x: 4540, y: 770, t: 1}, {x: 4420, y: 770, t: 2}, {x: 4420, y: 570, t: 1}, {x: 4420, y: 570, t: 1}, {x: 4420, y: 770, t: 1.5}, {x: 4950, y: 770}]
    };
    const botolaDoppioDash = {x: 4540, y: 500, w: 80, h: 60, rompibile: false, mobile: false,
        percorso: [{x: 4540, y: 500, t: 0.5}, {x: 4510, y: 500, t: 1}, {x: 4540, y: 500}]
    };
    collisori.push(ascensoreDoppioDash);
    collisori.push(botolaDoppioDash);
    creaPulsante(4620, 550, 40, 11, () => {
        ascensoreDoppioDash.mobile = true;
        botolaDoppioDash.mobile = true;
    });
    collisori.push({x: 4460, y: 1000, w: 100, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 4800, y: 1000, w: 100, h: 40, rompibile: false, mobile: false});
    causatori.push(creaCheckpoint({x: 4800, y: 940, w: 100, h: 60}, 4850 - LARGHEZZA/2, 1000 - ALTEZZA));
    const ascensoreDashTutorial = {x: 4900, y: 1300, w: 100, h: 40, rompibile: false, mobile: false,
        percorso: [{x: 4900, y: 1300, t: 3}, {x: 4900, y: 1000, t: 1}, {x: 4900, y: 1000, t: 1}, {x: 4900, y: 1300}],
        tocco: () => {
            ascensoreDashTutorial.mobile = true;
            return true;
        }
    }
    collisori.push(ascensoreDashTutorial);
    const ascensoreRallentaScatto = {x: 4840, y: 1450, w: 160, h: 40, rompibile: false, mobile: false,
        percorso: [{x: 4840, y: 1450, t:7}, {x: 4840, y: 1850, t:1}, {x: 4840, y: 1850, t:7}, {x: 4840, y: 1450}],
        tocco: () => ascensoreRallentaScatto.mobile = true
    };
    const ostacoloRallentaScatto = {x: 4840, y: 2100, w: 160, h: 40, rompibile: false, mobile: false};
    const ostacoloRallentaScatto2 = {x: 4460, y: 2300, w: 160, h: 40, rompibile: false, mobile: false};
    collisori.push(ascensoreRallentaScatto);
    collisori.push(ostacoloRallentaScatto);
    collisori.push(ostacoloRallentaScatto2);
    collisori.push({x: 4420, y: 1380, w: 40, h: 1300, rompibile: false, mobile: false});
    collisori.push({x: 4460, y: 1450, w: 380, h: 40, rompibile: false, mobile: false});
    causatori.push(creaCheckpoint({x: 4460, y: 1350, w: 100, h: 100}, 4510 - LARGHEZZA/2, 1450 - ALTEZZA));
    collisori.push({x: 4370, y: 1300, w: 50, h: 120, rompibile: false, mobile: false});
    causatori.push({ x: 4370, y: 1200, w: 100, h: 100, effetto: () => {velocini.stato.add("PW_scatto");},
        disegno: () => {
            textSize(20);
            fill(255, 0, 0);
            text("Scatto", 4420, 1250);
        }});

    const ascensoreSpinatoSaltoMuro = {x: 4800, y: 1520, w: 40, h: 150, rompibile: false, mobile: false,
        percorso: [{x:4800, y:1520, t:3.5}, {x:4800, y:1850, t:7}]
    };
    const spinaSuAscensoreSpinato = creaSpine(4805, 1490, 30, 30);
    spinaSuAscensoreSpinato.percorso = [{x:0, y:0, t:3.5}, {x:0, y:330, t:7}];
    const spinaGiuAscensoreSpinato = creaSpine(4805, 1670, 30, 30, 'giù');
   spinaGiuAscensoreSpinato.percorso = [{x:0, y:0, t:3.5}, {x:0, y:330, t:7}];
    collisori.push(ascensoreSpinatoSaltoMuro);
    collisori.push(spinaSuAscensoreSpinato);
    collisori.push(spinaGiuAscensoreSpinato);

    collisori.push({x: 4580, y: 2100, w: 260, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 4460, y: 2600, w: 380, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 4820, y: 2600, w: 40, h: 200, rompibile: false, mobile: false});
    const schiacciatoreSaltoMuro = {x: 4550, y: 2140, w: 40, h: 400, rompibile: false, mobile: false,
        percorso: [{x: 4550, y: 2140, t:7}, {x: 4750, y: 2140, t:1}, {x: 4750, y: 2140, t:1}, {x: 4550, y: 2140}],
        tocco: () => {
            schiacciatoreSaltoMuro.mobile = true;
            ascensoreSpinatoSaltoMuro.mobile = true;
            spinaSuAscensoreSpinato.mobile = true;
            spinaGiuAscensoreSpinato.mobile = true;
        }
    };
    collisori.push(schiacciatoreSaltoMuro);


    creaPulsante(4700, 2945, 200, 16, () => {
        if(collisori.includes(ascensoreRallentaScatto)){
            collisori.splice(collisori.indexOf(ascensoreRallentaScatto), 1);
            togliCollisoreAQuadranti(ascensoreRallentaScatto);
        }
        if(collisori.includes(ostacoloRallentaScatto)){
            collisori.splice(collisori.indexOf(ostacoloRallentaScatto), 1);
            togliCollisoreAQuadranti(ostacoloRallentaScatto);
        }
        if(collisori.includes(ostacoloRallentaScatto2)){
            collisori.splice(collisori.indexOf(ostacoloRallentaScatto2), 1);
            togliCollisoreAQuadranti(ostacoloRallentaScatto2);
        }
    });
    collisori.push({x: 4700, y: 2960, w: 300, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 3360, y: 2960, w: 840, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 4100, y: 2660, w: 250, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 4350, y: 2660, w: 40, h: 150, rompibile: false, mobile: false});
    collisori.push({x: 4060, y: 2660, w: 40, h: 200, rompibile: false, mobile: false});
    collisori.push({x: 3940, y: 2500, w: 40, h: 310, rompibile: false, mobile: false});

    collisori.push(creaSpine(3360, 2941, 400, 20));
    collisori.push({x: 3320, y: 2750, w: 40, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 3280, y: 2600, w: 40, h: 340, rompibile: false, mobile: false});
    collisori.push({x: 3100, y: 2500, w: 40, h: 360, rompibile: false, mobile: false});
    collisori.push({x: 3140, y: 2500, w: 1280, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 3360, y: 2690, w: 20, h: 100, rompibile: false, mobile: false});
    collisori.push(creaSpine(3363, 2676, 14, 14));

    collisori.push({x: 2800, y: 3050, w: 450, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 0, y: 0, rompibile: false, mobile: false,
        vertici: [{x: 3100, y: 3051}, {x: 2800, y: 2950}, {x: 2800, y: 3051}]
    });
    causatori.push(creaCheckpoint({x: 3150, y: 2950, w: 100, h: 100}, 3200 - LARGHEZZA/2, 3050 - ALTEZZA));
    collisori.push({x: 2500, y: 2950, w: 300, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 2460, y: 2950, w: 40, h: 140, rompibile: false, mobile: false});
    const ascensoreDashVersoSaltoMuro = {x: 1760, y: 3050, w: 700, h: 40, rompibile: false, mobile: false,
        percorso: [{x: 1760, y: 3050, t: 1.5}, {x: 1760, y: 2950, t: 0.5}, {x: 1760, y: 2950, t: 5.5}, {x: 1760, y: 2500, t: 1}, {x: 1760, y: 3050}]
    };
    collisori.push(ascensoreDashVersoSaltoMuro);
    creaPulsante(2500, 2935, 100, 16, () => {ascensoreDashVersoSaltoMuro.mobile = true});
    collisori.push({x: 1910, y: 2850, w: 550, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 1760, y: 2700, w: 510, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 1910, y: 2500, w: 550, h: 40, rompibile: false, mobile: false});
    const rampaScattoVersoSaltoMuro1 = {x: 0, y: 0, rompibile: false, mobile: false,
        vertici: [{x: 2460, y: 2780}, {x: 2100, y: 2851}, {x: 2460, y: 2851}]
    };
    const rampaScattoVersoSaltoMuro2 = {x: 0, y: 0, rompibile: false, mobile: false,
        vertici: [{x: 1760, y: 2701}, {x: 2060, y: 2701}, {x: 1760, y: 2600}]
    };
    collisori.push(rampaScattoVersoSaltoMuro1);
    collisori.push(rampaScattoVersoSaltoMuro2);

    collisori.push(creaSpine(2340, 2831, 120, 20));
    collisori.push(creaSpine(1760, 2681, 220, 20));
    collisori.push(creaSpine(1760, 3031, 220, 20));

    creaPulsante(1550, 2485, 150, 16, () => {
        if(collisori.includes(rampaScattoVersoSaltoMuro1)){
            togliCollisoreAQuadranti(rampaScattoVersoSaltoMuro1);
            togliCollisoreAQuadranti(rampaScattoVersoSaltoMuro2);
            collisori.splice(collisori.indexOf(rampaScattoVersoSaltoMuro1), 1);
            collisori.splice(collisori.indexOf(rampaScattoVersoSaltoMuro2), 1);
        }
    });

    causatori.push(creaCheckpoint({x: 2200, y: 2400, w: 100, h: 100}, 2250 - LARGHEZZA/2, 2500 - ALTEZZA));

    collisori.push({x: 1720, y: 2500, w: 40, h: 590, rompibile: false, mobile: false});
    collisori.push({x: 2460, y: 2360, w: 40, h: 530, rompibile: false, mobile: false});
    collisori.push({x: 1450, y: 2360, w: 1010, h: 40, rompibile: false, mobile: false});

    collisori.push({x: 1550, y: 2500, w: 190, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 1450, y: 2650, w: 150, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 1570, y: 2800, w: 150, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 1450, y: 2950, w: 150, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 720, y: 3050, w: 1000, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 1410, y: 2360, w: 40, h: 630, rompibile: false, mobile: false});

    const ultimeSpineScattoVersoSaltoMuro = [];
    ultimeSpineScattoVersoSaltoMuro.push(creaSpine(1450, 2640, 140, 10));
    ultimeSpineScattoVersoSaltoMuro.push(creaSpine(1580, 2790, 140, 10));
    ultimeSpineScattoVersoSaltoMuro.push(creaSpine(1450, 2940, 140, 10));
    ultimeSpineScattoVersoSaltoMuro.forEach(spine => collisori.push(spine));

    creaPulsante(1470, 3035, 150, 16, () => {
        if(collisori.includes(ultimeSpineScattoVersoSaltoMuro[0]))
            ultimeSpineScattoVersoSaltoMuro.forEach(spine => {
                togliCollisoreAQuadranti(spine);
                collisori.splice(collisori.indexOf(spine), 1);
            });
    });


    
    collisori.push({ x: 2300, y: 1800, w: 40, h: 140, rompibile: false, mobile: false});
    collisori.push({ x: 2340, y: 1800, w: 490, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 2350, y: 1700, w: 40, h: 100, rompibile: true, mobile: false});
    collisori.push({ x: 2200, y: 1660, w: 290, h: 40, rompibile: false, mobile: false});
    causatori.push(creaCheckpoint({x: 2390, y: 1700, w: 100, h: 100}, 2440 - LARGHEZZA/2, 1800 - ALTEZZA));
    collisori.push({ x: 2450, y: 720, w: 40, h: 680, rompibile: false, mobile: false});
    const ascensoreRompibile = { x: 2200, y: 720, w: 150, h: 40, rompibile: true, mobile: false,
        percorso: [ {x: 2200, y: 720, t: 1}, {x: 2200, y: 1560, t: 1}, {x: 2200, y: 1560, t: 8.5}]
    };
    collisori.push(ascensoreRompibile);
    collisori.push({ x: 2350, y: 1560, w: 140, h: 40, rompibile: false, mobile: false});
    const piattaformaRompibileFinale = { x: 2450, y: 1400, w: 253, h: 40, rompibile: true, mobile: false};
    collisori.push(piattaformaRompibileFinale);
    collisori.push({ x: 2660, y: 1440, w: 40, h: 194, rompibile: false, mobile: false});
    collisori.push({ x: 2820, y: 1300, w: 40, h: 540, rompibile: false, mobile: false});
    collisori.push({ x: 2490, y: 1300, w: 340, h: 40, rompibile: false, mobile: false});
    creaPulsante(2490, 1783, 330, 18, () => {
        ascensoreRompibile.mobile = true;
        if(!collisori.includes(ascensoreRompibile)){
            aggiungiCollisoreAQuadranti(ascensoreRompibile);
            collisori.push(ascensoreRompibile);
        }
        if(!collisori.includes(piattaformaRompibileFinale)){
            aggiungiCollisoreAQuadranti(piattaformaRompibileFinale);
            collisori.push(piattaformaRompibileFinale);
        }
    });
    collisori.push(creaSpine(2200, 1650, 290, 10));
    collisori.push(creaSpine(2490, 1660, 10, 40, 'dx'));
    collisori.push(creaSpine(2650, 1440, 11, 187, 'sx'));

    causatori.push(creaCheckpoint({x: 2350, y: 620, w: 100, h: 100}, 2400 - LARGHEZZA/2, 720 - ALTEZZA));

    collisori.push({ x: 3240, y: 1640, w: 250, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 3440, y: 1500, w: 200, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 2860, y: 1400, w: 100, h: 100, rompibile: false, mobile: false});
    const portaleTop = { x: 2860, y: 1500, w: 340, h: 15, rompibile: false, mobile: false,
        percorso: [{ x: 3240, y: 1500, t: 4}, { x: 2860, y: 1500}]
    };
    collisori.push(portaleTop);
    const portaleBottom = { x: 2860, y: 1515, w: 340, h: 15, rompibile: false, mobile: false,
        percorso: [{ x: 2480, y: 1515, t: 4}, { x: 2860, y: 1515}]};
    collisori.push(portaleBottom);
    creaPulsante(2730, 1285, 100, 16, () => {
        if(!portaleTop.mobile){
            portaleTop.percorso.reverse();
            portaleTop.percorso[0].t = 4;
            portaleTop.percorso[1].t = undefined;
            portaleTop.mobile = true;
        }
        if(!portaleBottom.mobile){
            portaleBottom.percorso.reverse();
            portaleBottom.percorso[0].t = 4;
            portaleBottom.percorso[1].t = undefined;
            portaleBottom.mobile = true;
        }
    })
    collisori.push({ x: 2860, y: 1650, w: 100, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 3100, y: 1800, w: 100, h: 40, rompibile: false, mobile: false});

    causatori.push(creaCheckpoint({x: 3800, y: 1840, w: 100, h: 100}, 3850 - LARGHEZZA/2, 1940 - ALTEZZA));
    collisori.push({ x: 3680, y: 1380, w: 360, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 3640, y: 1380, w: 40, h: 160, rompibile: false, mobile: false});
    collisori.push({ x: 3900, y: 1560, w: 40, h: 200, rompibile: false, mobile: false});
    collisori.push(creaSpine(3908, 1536, 24, 24));
    collisori.push({ x: 4040, y: 1120, w: 40, h: 840, rompibile: false, mobile: false});
    
    collisori.push({ x: 4080, y: 1120, w: 340, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 3740, y: 720, w: 300, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 4120, y: 720, w: 300, h: 40, rompibile: false, mobile: false});
    const ultimoAscensore = { x: 4120, y: 1080, w: 300, h: 40, rompibile: false, mobile: false,
        percorso: [{ x: 4120, y: 1080, t: 8}, { x: 4120, y: 420, t: 3}, { x: 4120, y: 1080}],
        tocco: () => ultimoAscensore.mobile = true
    };
    collisori.push(ultimoAscensore);
    collisori.push({ x: 2800, y: 420, w: 1100, h: 40, rompibile: false, mobile: false});
    causatori.push(creaCheckpoint({x: 3800, y: 320, w: 100, h: 100}, 3850 - LARGHEZZA/2, 420 - ALTEZZA));
    collisori.push(creaSpine(3200, 330, 80, 10, 'giù'));
    collisori.push(creaSpine(3200, 410, 80, 10));
    
    collisori.push({ x: 2160, y: 1940, w: 2000, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 2350, y: 720, w: 110, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 2730, y: 550, w: 60, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 3240, y: 600, w: 310, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 3200, y: 600, w: 40, h: 1240, rompibile: false, mobile: false});
    collisori.push({ x: 3240, y: 1160, w: 460, h: 40, rompibile: false, mobile: false});
    collisori.push({ x: 3550, y: 600, w: 40, h: 450, rompibile: false, mobile: false});
    collisori.push({ x: 3700, y: 460, w: 40, h: 740, rompibile: false, mobile: false});
    
    collisori.push(creaSpine(3180, 680, 20, 80, 'sx'));

    let faseBoss = 0;
    const chiusuraBoss = { x: 3550, y: 600, w: 40, h: 450, rompibile: false, mobile: false,
        percorso: [{x: 3550, y: 600, t: 1}, {x: 3550, y: 710}]
    }
    collisori.push(chiusuraBoss);
    const primoAttacco = {  x: 3375, y: 700, w: 41, h: 40, rompibile: false, mobile: false, lineare: true, sfondo: true};
    const secondoAttacco = {  x: 3355, y: 700, w: 81, h: 130, rompibile: false, mobile: false, lineare: true, sfondo: true};
    const terzoAttacco = creaSpinaVolante(3216, 1130);
    const boss = { x: 3335, y: 640, w: 120, h: 200, rompibile: true, mobile: false, primopiano: true};
    const avanzaFaseBoss = (colpo = true) => {
        if(colpo){
            if(boss.colpito)return;
            boss.colpito = true;
        }
        faseBoss++;
        switch(faseBoss){
            case 1:
                if(collisori.includes(terzoAttacco)){
                    togliCollisoreAQuadranti(terzoAttacco);
                    collisori.splice(collisori.indexOf(terzoAttacco), 1);
                    terzoAttacco.mobile = false;
                }
                if(collisori.includes(secondoAttacco)){
                    togliCollisoreAQuadranti(secondoAttacco);
                    collisori.splice(collisori.indexOf(secondoAttacco), 1);
                    secondoAttacco.passato = true;
                    secondoAttacco.mobile = false;
                }
                if(!collisori.includes(primoAttacco)){
                    collisori.push(primoAttacco);
                    primoAttacco.passato = false;
                }
                togliCollisoreAQuadranti(primoAttacco);
                primoAttacco.x = 3375;
                primoAttacco.y = 700;
                primoAttacco.t = 0;
                primoAttacco.mobile = false;
                sveglie = [
                    {
                        t: FRAME_RATE * 1,
                        azione: () => {
                            primoAttacco.percorso = [
                                {x: 3375, y: 700, t: 1},
                                {x: velocini.x >= 3395 - LARGHEZZA/2 ? 3265 : 3480, y: 900},
                            ];
                            boss.colpito = false;
                            primoAttacco.t = 0;
                            primoAttacco.mobile = true;
                        }
                    },
                    {
                        t: FRAME_RATE * 2,
                        azione: () => drone(primoAttacco, 1160)
                    }
                ];
                break;
            case 3:
            case 2:
                if(faseBoss === 2){
                    if(collisori.includes(terzoAttacco)){
                        togliCollisoreAQuadranti(terzoAttacco);
                        collisori.splice(collisori.indexOf(terzoAttacco), 1);
                        terzoAttacco.mobile = false;
                    }
                }
                if(collisori.includes(primoAttacco)){
                    togliCollisoreAQuadranti(primoAttacco);
                    collisori.splice(collisori.indexOf(primoAttacco), 1);
                    primoAttacco.passato = true;
                }
                if(!collisori.includes(secondoAttacco)){
                    collisori.push(secondoAttacco);
                    secondoAttacco.passato = false;
                }
                togliCollisoreAQuadranti(secondoAttacco);
                secondoAttacco.x = 3355;
                secondoAttacco.y = 700;
                secondoAttacco.t = 0;
                secondoAttacco.mobile = false;
                sveglie = [
                    {
                        t: FRAME_RATE * 1,
                        azione: () => {
                            secondoAttacco.percorso = [
                                {x: 3355, y: 700, t: 1},
                                {x: velocini.x >= 3395 - LARGHEZZA/2 ? 3245 : 3460, y: 900},
                            ];
                            boss.colpito = false;
                            secondoAttacco.t = 0;
                            secondoAttacco.mobile = true;
                        }
                    },
                    {
                        t: FRAME_RATE * 2,
                        azione: () => drone(secondoAttacco, 1160)
                    }
                ];
                if(faseBoss === 3){
                    sveglie.push({
                        t: 1 * FRAME_RATE,
                        azione: () => {
                            terzoAttacco.percorso = velocini.x >= 3395 ? [{x: 3216, y: 1130, t: 3}, {x: 3550, y: 1130, t: 3}] : 
                                [{x: 3550, y: 1130, t: 3}, {x: 3216, y: 1130, t: 3}];
                            terzoAttacco.x = terzoAttacco.percorso[0].x;
                            terzoAttacco.y = terzoAttacco.percorso[0].y;
                            if(!collisori.includes(terzoAttacco)){
                                collisori.push(terzoAttacco);
                            }
                            terzoAttacco.t = 0;
                            terzoAttacco.mobile = true;
                        }
                    })
                }
                break;
            case 4:
                vittoria();
            
        }
    }
    collisori.push(boss);
    boss.rottura = avanzaFaseBoss;
    causatori.push({ x: 3345, y: 1060, w: 100, h: 100, effetto: () => {
        if(!ultimoCheckPointToccato){
            ultimoCheckPointToccato = true;
            fixedCamera = { x: 3395, y: 900};
            velocini.rinascita = {x: 3395 - LARGHEZZA/2, y: 1160 - ALTEZZA};
            faseBoss = 0;
            if(chiusuraBoss.y === 600)
                chiusuraBoss.mobile = true;
            avanzaFaseBoss(false);
        }
    }});


    collisori.push({x: 1560, y: 1790, w: 600, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 760, y: 1940, w: 960, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 1720, y: 1940, w: 40, h: 160, rompibile: false, mobile: false});
    collisori.push({x: 1760, y: 2050, w: 40, h: 150, rompibile: false, mobile: false});
    collisori.push({x: 1800, y: 2160, w: 160, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 1960, y: 2160, w: 40, h: 140, rompibile: false, mobile: false});
    collisori.push({x: 2000, y: 2260, w: 120, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 2120, y: 2110, w: 40, h: 250, rompibile: false, mobile: false});
    collisori.push({x: 2160, y: 2160, w: 540, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 2700, y: 2130, w: 40, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 2300, y: 2250, w: 560, h: 40, rompibile: false, mobile: false});
    const ascensoreLateraleVersoScatto = {x: 2160, y: 2030, w: 100, h: 40, rompibile: false, mobile: false,
        percorso: [{x: 2160, y: 2030, t: 5}, {x: 2360, y: 2030, t: 5}, {x: 2160, y: 2030}],
        tocco: () => ascensoreLateraleVersoScatto.mobile = true
    }
    collisori.push(ascensoreLateraleVersoScatto);
    collisori.push({x: 2460, y: 2030, w: 100, h: 40, rompibile: false, mobile: true,
        percorso: [{x: 2460, y: 2030, t: 5}, {x: 2560, y: 2030, t: 5}]
    });
    collisori.push({x: 2660, y: 2030, w: 40, h: 170, rompibile: false, mobile: false});
    
    collisori.push({x: 2780, y: 1940, w: 40, h: 650, rompibile: false, mobile: false});
    collisori.push({x: 2500, y: 2820, w: 600, h: 40, rompibile: false, mobile: false});
    const ascensoreVersoScattoAndata = {x: 2590, y: 2360, w: 100, h: 40, rompibile: false, mobile: false, toccato: false,
        percorso: [{x: 2590, y: 2750, t: 8}, {x: 2590, y: 2360}],
        tocco: () => {
            if(!ascensoreVersoScattoAndata.toccato && !ascensoreVersoScattoAndata.mobile){
                ascensoreVersoScattoAndata.percorso.reverse();
                ascensoreVersoScattoAndata.percorso[0].t = 5;
                ascensoreVersoScattoAndata.percorso[1].t = undefined;
                ascensoreVersoScattoAndata.mobile = true;
            }
            ascensoreVersoScattoAndata.toccato = true;
        },
        rilascio: () => {
            ascensoreVersoScattoAndata.toccato = false;
        }
    };
    collisori.push(ascensoreVersoScattoAndata);
    collisori.push(creaSpine(2500, 2800, 600, 20));
    const ascensoreVersoScattoRitorno = {x: 2910, y: 2750, w: 100, h: 40, rompibile: false, mobile: false, toccato: false,
        percorso: [{x: 2910, y: 2500, t: 8}, {x: 2910, y: 2750}],
        tocco: () => {
            if(!ascensoreVersoScattoRitorno.toccato && !ascensoreVersoScattoRitorno.mobile){
                ascensoreVersoScattoRitorno.percorso.reverse();
                ascensoreVersoScattoRitorno.percorso[0].t = 8;
                ascensoreVersoScattoRitorno.percorso[1].t = undefined;
                ascensoreVersoScattoRitorno.mobile = true;
            }
            ascensoreVersoScattoRitorno.toccato = true;
        },
        rilascio: () => {
            ascensoreVersoScattoRitorno.toccato = false;
        }
    };
    const gestioneAscensoriVersoScatto = (andata) => {
        ascensoreVersoScattoAndata.t = 0;
        ascensoreVersoScattoAndata.percorso = andata ? [{x: 2590, y: 2750, t: 8}, {x: 2590, y: 2360}] : [{x: 2590, y: 2360, t: 8}, {x: 2590, y: 2750}];
        ascensoreVersoScattoAndata.mobile = false;
        ascensoreVersoScattoAndata.toccato = false;
        togliCollisoreAQuadranti(ascensoreVersoScattoAndata);
        ascensoreVersoScattoAndata.y = andata ? 2360 : 2750;
        aggiungiCollisoreAQuadranti(ascensoreVersoScattoAndata);
        ascensoreVersoScattoRitorno.t = 0;
        ascensoreVersoScattoRitorno.percorso = andata ? [{x: 2910, y: 2500, t: 8}, {x: 2910, y: 2750}] : [{x: 2910, y: 2750, t: 8}, {x: 2910, y: 2500}];
        ascensoreVersoScattoRitorno.mobile = false;
        ascensoreVersoScattoRitorno.toccato = false;
        togliCollisoreAQuadranti(ascensoreVersoScattoRitorno);
        ascensoreVersoScattoRitorno.y = andata ? 2750 : 2500;
        aggiungiCollisoreAQuadranti(ascensoreVersoScattoRitorno);
    };
    causatori.push(creaCheckpoint({ x: 2300, y: 2260, w: 100, h: 100}, 2350 - LARGHEZZA/2, 2360 - ALTEZZA,
        () => gestioneAscensoriVersoScatto(true)
    ));
    causatori.push(creaCheckpoint({ x: 3200, y: 2350, w: 100, h: 150}, 3250 - LARGHEZZA/2, 2500 - ALTEZZA,
        () => gestioneAscensoriVersoScatto(false)
    ));
    collisori.push(ascensoreVersoScattoRitorno);
    collisori.push({x: 2820, y: 2310, w: 1400, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 3020, y: 2120, w: 1400, h: 40, rompibile: false, mobile: false});
    collisori.push(creaSpine(3450, 2480, 300, 20));
    collisori.push(creaSpine(3900, 2480, 100, 20));
    collisori.push(creaSpine(3900, 2350, 100, 20, 'giù'));
    collisori.push({x: 0, y: 0, rompibile: false, mobile: false,
        vertici: [{x: 4100, y: 2501}, {x: 4420, y: 2501}, {x: 4420, y: 2400}, {x: 4320, y: 2400}]
    });
    collisori.push(creaSpinaVolante(3700, 2286, [{x: 3700, y: 2286, t: 2}, {x: 4000, y: 2286, t: 2}]));
    collisori.push(creaSpinaVolante(3300, 2286, [{x: 3300, y: 2286, t: 2}, {x: 3600, y: 2286, t: 2}]));
    collisori.push({x: 0, y: 0, rompibile: false, mobile: false,
        vertici: [{x: 2820, y: 2311}, {x: 3140, y: 2311}, {x: 2920, y: 2210}, {x: 2820, y: 2210}]
    });
    for(let i=0; i<10; i++){
        collisori.push({x: 3220, y: 2090, w: 30, h: 30, rompibile: false, mobile: true, 
            percorso: [{x: 3220, y: 2090, t: 0.2}, {x: 3220, y: 2130, t: 8}, {x: 4020, y: 2130, t: 0.2}, {x: 4020, y: 2090, t: 8}],
            t: i*1.64
        });
    }
    const ascensoroneVersoScatto = {x: 4080, y: 2119, w: 340, h: 40, rompibile: false, mobile: false,
        percorso: [{x: 4080, y: 2119, t: 15}, {x: 4080, y: 1420, t: 1}, {x: 4080, y: 1420, t: 5}, {x: 4080, y: 2119}],
        tocco: () => ascensoroneVersoScatto.mobile = true
    };
    collisori.push(ascensoroneVersoScatto);
    
    collisori.push(creaSpinaVolante(4360, 1850));
    collisori.push(creaSpinaVolante(4260, 1750));
    collisori.push(creaSpinaVolante(4100, 1670));
    collisori.push(creaSpinaVolante(4300, 1600));
    collisori.push(creaSpinaVolante(4200, 1500));
    collisori.push(creaSpinaVolante(4100, 1380));

    const blocchiBlu = [];
    const blocchiRossi = [];
    const blocchiVerdi = [];
    causatori.push(creaCheckpoint({x: 1180, y: 1700, w: 80, h: 100}, 1220 - LARGHEZZA/2, 1800 - ALTEZZA));
    collisori.push({x: 1000, y: 1900, w: 100, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 360, y: 1680, w: 300, h: 40, rompibile: false, mobile: false});
    creaPulsante(360, 1670, 100, 11, () => {
        blocchiRossi.forEach(blocco => {
            if(collisori.includes(blocco)){
                collisori.splice(collisori.indexOf(blocco), 1);
                togliCollisoreAQuadranti(blocco);
            } else {
                collisori.push(blocco);
                aggiungiCollisoreAQuadranti(blocco);
            }
        });
    }, color(255, 0, 0))
    const rosso1 = {x: 1180, y: 1840, w: 40, h: 100, rompibile: false, mobile: false, colore: color(255, 0, 0)};
    blocchiRossi.push(rosso1);
    const blu1 = {x: 1220, y: 1840, w: 40, h: 100, rompibile: false, mobile: false, colore: color(0, 0, 255)};
    blocchiBlu.push(blu1);
    const verde1 = {x: 1260, y: 1840, w: 40, h: 100, rompibile: false, mobile: false, colore: color(0, 255, 0)};
    blocchiVerdi.push(verde1);
    const blu2 = {x: 660, y: 1940, w: 100, h: 40, rompibile: false, mobile: false, colore: color(0, 0, 255)};
    blocchiBlu.push(blu2);
    collisori.push(blu2);
    collisori.push({x: 540, y: 1940, w: 120, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 500, y: 1940, w: 40, h: 510, rompibile: false, mobile: false});
    collisori.push({x: 460, y: 2210, w: 40, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 360, y: 2310, w: 40, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 460, y: 2410, w: 40, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 360, y: 2510, w: 40, h: 40, rompibile: false, mobile: false});
    const blu3 = {x: 360, y: 2030, w: 41, h: 100, rompibile: false, mobile: false, colore: color(0, 0, 255)};
    blocchiBlu.push(blu3);
    creaPulsante(260, 2120, 100, 11, () => {
        blocchiVerdi.forEach(blocco => {
            if(collisori.includes(blocco)){
                collisori.splice(collisori.indexOf(blocco), 1);
                togliCollisoreAQuadranti(blocco);
            } else {
                collisori.push(blocco);
                aggiungiCollisoreAQuadranti(blocco);
            }
        });
    }, color(0, 255, 0));
    causatori.push(creaCheckpoint({x: 560, y: 2480, w: 100, h: 70}, 610 - LARGHEZZA/2, 2550 - ALTEZZA));
    const ascensoreVersoSaltoMuro = {x: 660, y: 2510, w: 100, h: 40, rompibile: false, mobile: false,
        percorso: [{x: 660, y: 2510, t: 5}, {x: 660, y: 2100, t: 0.5}, {x: 660, y: 2100, t: 5}, {x: 660, y: 1680, t: 0.5}, {x: 660, y: 1680, t: 5}, {x: 660, y: 2510}],
        tocco: () => ascensoreVersoSaltoMuro.mobile = true
    }
    collisori.push(ascensoreVersoSaltoMuro);
    collisori.push({x: 760, y: 2100, w: 40, h: 350, rompibile: false, mobile: false});
    collisori.push({x: 800, y: 2100, w: 700, h: 40, rompibile: false, mobile: false});
    const rosso2 = {x: 1500, y: 2100, w: 130, h: 100, rompibile: false, mobile: false, colore: color(255, 0, 0)};
    collisori.push(rosso2);
    blocchiRossi.push(rosso2);
    const verde2 = {x: 1630, y: 2100, w: 130, h: 40, rompibile: false, mobile: false, colore: color(0, 255, 0)};
    blocchiVerdi.push(verde2);
    causatori.push(creaCheckpoint({x: 1800, y: 2200, w: 160, h: 160}, 1880 - LARGHEZZA/2, 2360 - ALTEZZA));
    creaPulsante(2020, 2350, 100, 11, () => {
        blocchiBlu.forEach(blocco => {
            if(collisori.includes(blocco)){
                collisori.splice(collisori.indexOf(blocco), 1);
                togliCollisoreAQuadranti(blocco);
            } else {
                collisori.push(blocco);
                aggiungiCollisoreAQuadranti(blocco);
            }
        });
    }, color(0, 0, 255));
    collisori.push({x: 800, y: 2410, w: 400, h: 40, rompibile: false, mobile: false});
    const rosso3 = {x: 850, y: 2450, w: 40, h: 50, rompibile: false, mobile: false, colore: color(255, 0, 0)};
    blocchiRossi.push(rosso3);
    collisori.push(rosso3);
    const blu4 = {x: 850, y: 2500, w: 40, h: 50, rompibile: false, mobile: false, colore: color(0, 0, 255)};
    blocchiBlu.push(blu4);
    collisori.push(blu4);
    collisori.push({x: 600, y: 2640, w: 40, h: 200, rompibile: false, mobile: false});
    collisori.push({x: 640, y: 2800, w: 770, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 640, y: 2800, w: 770, h: 40, rompibile: false, mobile: false});
    const rosso4 = {x: 640, y: 2640, w: 230, h: 40, rompibile: false, mobile: false, colore: color(255, 0, 0)};
    blocchiRossi.push(rosso4);
    const blu5 = {x: 870, y: 2640, w: 230, h: 40, rompibile: false, mobile: false, colore: color(0, 0, 255)};
    blocchiBlu.push(blu5);
    const verde3 = {x: 1100, y: 2640, w: 230, h: 40, rompibile: false, mobile: false, colore: color(0, 255, 0)};
    blocchiVerdi.push(verde3);
    collisori.push({x: 1350, y: 2640, w: 20, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 1330, y: 2640, w: 20, h: 120, rompibile: false, mobile: false});
    collisori.push({x: 1390, y: 2740, w: 20, h: 60, rompibile: false, mobile: false});
    causatori.push(creaCheckpoint({x: 760, y: 1980, w: 100, h: 120}, 810 - LARGHEZZA/2, 2100 - ALTEZZA));
    collisori.push({x: 1410, y: 2260, w: 60, h: 100, rompibile: false, mobile: false});
    collisori.push({x: 910, y: 2260, w: 500, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 800, y: 2370, w: 80, h: 40, rompibile: false, mobile: false});
    const spinaCadente1 = creaSpine(1300, 2140, 20, 20, 'giù');
    spinaCadente1.percorso = [{x: 0, y: 0, t: 0.7}, {x: 0, y: 110, t: 2}, {x: 0, y: 0}];
    causatori.push({x: 1220, y: 2140, w: 180, h: 120, checkpoint: true, effetto: () => spinaCadente1.mobile = true});
    collisori.push(spinaCadente1);
    const spinaCadente2 = creaSpine(1100, 2140, 20, 20, 'giù');
    spinaCadente2.percorso = [{x: 0, y: 0, t: 0.7}, {x: 0, y: 110, t: 2}, {x: 0, y: 0}];
    causatori.push({x: 1020, y: 2140, w: 180, h: 120, checkpoint: true, effetto: () => spinaCadente2.mobile = true});
    collisori.push(spinaCadente2);
    collisori.push(creaSpine(1000, 2390, 100, 20));

    
    collisori.push({x: 1520, y: 1790, w: 40, h: 80, rompibile: false, mobile: false});
    collisori.push({x: 1480, y: 1830, w: 40, h: 40, rompibile: false, mobile: false});
    collisori.push(rendiMobileBiStabile({x: 1600, y: 1710, w: 100, h: 80, rompibile: false, mobile: false,
        percorso: [{x: 2060, y: 1710, t:6}, {x: 1600, y: 1710}]
    }));
    collisori.push({x: 1560, y: 1600, w: 500, h: 40, rompibile: false, mobile: false});
    causatori.push(creaCheckpoint({x: 1960, y: 1500, w: 100, h: 100}, 2010 - LARGHEZZA/2, 1600 - ALTEZZA));
    collisori.push({x: 1160, y: 1350, w: 360, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 1520, y: 1350, w: 40, h: 290, rompibile: false, mobile: false});
    collisori.push(rendiMobileMonoStabile({x: 1560, y: 1560, w: 100, h: 40, rompibile: false, mobile: false,
        percorso: [{x: 1560, y: 1560, t: 3}, {x: 1560, y: 1350, t: 1}, {x: 1560, y: 1350, t: 1}, {x: 1560, y: 1560}]
    }));
    collisori.push(rendiMobileBiStabile({x: 1560, y: 1350, w: 100, h: 100, rompibile: false, mobile: false,
        percorso: [{x: 2060, y: 1350, t: 2}, {x: 1560, y: 1350}]
    }));
    collisori.push({x: 1660, y: 620, w: 40, h: 730, rompibile: false, mobile: false});
    collisori.push({x: 1160, y: 1250, w: 100, h: 100, rompibile: false, mobile: false});
    causatori.push(creaCheckpoint({x: 1160, y: 1150, w: 100, h: 100}, 1210 - LARGHEZZA/2, 1250 - ALTEZZA));
    collisori.push(rendiMobileMonoStabile({x: 1300, y: 1130, w: 100, h: 40, rompibile: false, mobile: false,
        percorso: [{x: 1300, y: 1130, t: 2}, {x: 1500, y: 1130, t: 2}, {x: 1300, y: 1130}]
    }));
    collisori.push({x: 1600, y: 1040, w: 60, h: 40, rompibile: false, mobile: false});
    collisori.push(rendiMobileMonoStabile({x: 1500, y: 930, w: 100, h: 40, rompibile: false, mobile: false,
        percorso: [{x: 1500, y: 930, t: 2}, {x: 1200, y: 930, t: 2}, {x: 1500, y: 930}]
    }));
    collisori.push(rendiMobileMonoStabile({x: 1250, y: 830, w: 100, h: 40, rompibile: false, mobile: false,
        percorso: [{x: 1250, y: 830, t: 2}, {x: 1500, y: 830, t: 2}, {x: 1250, y: 830}]
    }));
    collisori.push(rendiMobileMonoStabile({x: 1600, y: 730, w: 60, h: 40, rompibile: false, mobile: false,
        percorso: [{x: 1600, y: 730, t: 3}, {x: 1600, y: 620, t: 2}, {x: 1600, y: 730}]
    }));
    collisori.push({x: 1160, y: 510, w: 800, h: 40, rompibile: false, mobile: false});
    collisori.push(creaSpine(1160, 490, 800, 20));
    collisori.push(rendiMobileBiStabile({x: 1600, y: 550, w: 140, h: 70, rompibile: false, mobile: false,
        percorso: [{x: 2060, y: 550, t: 4}, {x: 1600, y: 550}]
    }));
    collisori.push({x: 1700, y: 620, w: 400, h: 40, rompibile: false, mobile: false});
    const bloccaAscensoreVersoRotolamento1 = {x: 1930, y: 760, w: 230, h: 40, rompibile: true, mobile: false};
    collisori.push(bloccaAscensoreVersoRotolamento1);
    const bloccaAscensoreVersoRotolamento2 = {x: 2020, y: 420, w: 140, h: 40, rompibile: true, mobile: false};
    collisori.push(bloccaAscensoreVersoRotolamento2);
    collisori.push({x: 1890, y: 760, w: 40, h: 370, rompibile: false, mobile: false});
    collisori.push(rendiMobileMonoStabile({x: 2020, y: 460, w: 140, h: 40, rompibile: false, mobile: false,
        percorso: [{x: 2020, y: 460, t: 8}, {x: 2020, y: 1170, t: 12}, {x: 2020, y: 460}]
    }));
    collisori.push({x: 1700, y: 1310, w: 200, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 1900, y: 1210, w: 40, h: 140, rompibile: false, mobile: false});
    collisori.push({x: 1940, y: 1210, w: 150, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 2090, y: 1210, w: 40, h: 80, rompibile: false, mobile: false});
    collisori.push(creaSpine(2140, 1370, 20, 60, 'sx'));
    collisori.push({x: 1700, y: 900, w: 80, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 1810, y: 1000, w: 80, h: 40, rompibile: false, mobile: false});
    collisori.push({x: 1700, y: 1140, w: 80, h: 40, rompibile: false, mobile: false});
    creaPulsante(1700, 1290, 100, 21, () => {
        if(collisori.includes(bloccaAscensoreVersoRotolamento1)){
            collisori.splice(collisori.indexOf(bloccaAscensoreVersoRotolamento1), 1);
            togliCollisoreAQuadranti(bloccaAscensoreVersoRotolamento1);
        }
        if(collisori.includes(bloccaAscensoreVersoRotolamento2)){
            collisori.splice(collisori.indexOf(bloccaAscensoreVersoRotolamento2), 1);
            togliCollisoreAQuadranti(bloccaAscensoreVersoRotolamento2);
        }
    });
    collisori.push({x: 2100, y: 380, w: 60, h: 40, rompibile: false, mobile: false});
    causatori.push(creaCheckpoint({x: 2100, y: 330, w: 60, h: 50}, 2130 - LARGHEZZA/2, 380 - ALTEZZA));


    velocini.x = 300, velocini.y=1500;
    

    camera.x = velocini.x + velocini.w/2;
    camera.y = velocini.y + velocini.h/2;

}

function creaSpinaVolante(x, y, percorso){
    const spina = {x: x, y: y, rompibile: false, mobile: false, vertici: [
            {x: 0, y: 12},  {x: 8, y: 16},  {x: 12, y: 24}, {x: 16, y: 16},
            {x: 24, y: 12}, {x: 16, y: 8},  {x: 12, y: 0},  {x: 8, y: 8}
        ],
        disegno: () => {
            fill(200);
            beginShape();
            for(let i=0; i<spina.vertici.length; i++){
                vertex(spina.x + spina.vertici[i].x, spina.y + spina.vertici[i].y);
            }
            endShape();
        },
        tocco: morte
    };
    if(percorso){
        spina.percorso = percorso;
        spina.mobile = true;
    }
    return spina;
}

function creaCheckpoint(causatore, x, y, f){
    causatore.effetto = () => {
        velocini.rinascita = {x: x, y: y};
        checkpointAttivo = causatore;
        if(f)f();
    }

    const ATLAS_W = atlasImage.width;
    const ATLAS_H = atlasImage.height;

    const CHECKPOINT_W = 32;
    const CHECKPOINT_H = 32;

    causatore.disegno = () => {
        
        // Calcolo dell'offset (0 = spento, 1-2 = animazione attivo)
        const offset = checkpointAttivo === causatore ? (floor(tempo / 8) % 2 + 1) : 0;
        
        shader(atlasShader);
        texture(atlasImage);
        // Parametri Atlas (Assumendo larghezza 240px e altezza 132px)
        // Se i checkpoint sono sotto il personaggio (H=48), partono da Y=48
        const sw = CHECKPOINT_W / ATLAS_W; 
        const sh = CHECKPOINT_H / ATLAS_H; 
        const sx = (offset * CHECKPOINT_W) / ATLAS_W; 
        const sy = 48 / ATLAS_H; // Inizia dopo l'altezza del personaggio

        const checkpointRect = [sx, sy, sw, sh];
        
        atlasShader.setUniform('uTexture', atlasImage);
        atlasShader.setUniform('uSubRect', checkpointRect);
        atlasShader.setUniform('uRepeat', [1, 1]);
        atlasShader.setUniform('uColor', [1, 1, 1, 1]); 
        atlasShader.setUniform('uIsSprite', 1); 
        atlasShader.setUniform('uTexSize', [ATLAS_W, ATLAS_H]); 
        atlasShader.setUniform('uWrapMode', [0.0, 0.0]); 
    
        const posX = x + (LARGHEZZA - CHECKPOINT_W) / 2;
        const posY = y + ALTEZZA - CHECKPOINT_H;

        push();
        noStroke(); 
        translate(posX, posY);
        rect(0, 0, CHECKPOINT_W, CHECKPOINT_H); 
        pop();

        resetShader();
    }

    return causatore;
}

function rendiMobileMonoStabile(collisore){
    collisore.tocco = () => collisore.mobile = true;
    return collisore;
}

function rendiMobileBiStabile(collisore, t1, t2){
    let toccato = false;
    collisore.tocco = () => {
        if(!collisore.mobile && !toccato){
            collisore.percorso.reverse();
            for(let i=0; i<collisore.percorso.length-1; i++){
                const t = t1 ? (t1 === collisore.percorso[i+1].t ? t2 : t1) : collisore.percorso[i+1].t;
                collisore.percorso[i].t = t;
            }
            delete collisore.percorso[collisore.percorso.length - 1].t;
            collisore.mobile = true;
        }
        toccato = true;
    }
    collisore.rilascio = () => {
        toccato = false;
    }
    return collisore;
}


function drone(collisore, pavimento){
    if(!collisore.passato){
        const dist = abs(velocini.x + LARGHEZZA/2 - collisore.x - collisore.w/2);
        if(dist > collisore.w/2){
            const tempo = dist/150;
            collisore.t = 0;
            collisore.percorso = [
                {x: collisore.x, y: collisore.y, t: tempo},
                {x: velocini.x + (LARGHEZZA - collisore.w)/2 , y: collisore.y}
            ];
            collisore.mobile = true;
            sveglie.push({
                t: tempo * FRAME_RATE,
                azione: () => drone(collisore, pavimento)
            });
        } else {
            sveglie.push({
                t: 0.5 * FRAME_RATE,
                azione: () => {
                    if(abs(velocini.x + LARGHEZZA/2 - collisore.x - collisore.w/2) <= collisore.w/2){
                        collisore.t = 0;
                        collisore.percorso = [
                            {x: collisore.x, y: collisore.y, t: 1.2},
                            {x: collisore.x , y: pavimento - collisore.h, t: 1},
                            {x: collisore.x , y: pavimento - collisore.h, t: 1.5},
                            {x: collisore.x, y: collisore.y},
                        ];
                        collisore.mobile = true;
                        sveglie.push({
                            t: 4 * FRAME_RATE,
                            azione: () => {
                                drone(collisore, pavimento);
                            }
                        })
                    } else {
                        drone(collisore, pavimento);
                    }
                }
            })
        }
    }
    
}

function smoothMap(valore, valIni, valFine, obiettivoIni, obiettivoFine){
    let res = (valore - valIni)/(valFine - valIni);
    if(res <= 0.5)
        res = pow(res*2, 2) / 2;
    else
        res = 1-pow((2 * (res-1)), 2) / 2;
    return obiettivoIni + res * (obiettivoFine - obiettivoIni);
}

function muoviOggetti(deltaTime){
    for(let i=0; i<collisori.length; i++){
        let collisore = collisori[i];
        if(collisore.mobile){
            if(!('t' in collisore))
                collisore['t'] = 0;
            if(!('vx' in collisore))
                collisore['vx'] = 0;
            if(!('vy' in collisore))
                collisore['vy'] = 0;
            collisore.t += deltaTime;
            let j=0;
            let totale = 0;
            while(totale < collisore.t){
                if(j == collisore.percorso.length){
                    j = 0;
                    collisore.t -= totale;
                    totale = 0;
                }
                if(collisore.percorso[j].t == null){
                    collisore.mobile = false;
                    collisore.t = 0;
                    collisore.vx = 0;
                    collisore.vy = 0;
                    return;
                }
                totale += collisore.percorso[j].t;
                j++;
            }
            j--;
            let prossimo = (j+1) % collisore.percorso.length;
            togliCollisoreAQuadranti(collisore);
            let prevX = collisore.x, prevY = collisore.y;
            const tempoCurrStep = collisore.t - totale + collisore.percorso[j].t;
            const durataCurrStep = collisore.percorso[j].t;
            const ratioStep = tempoCurrStep/durataCurrStep;
            if(collisore.lineare){
                collisore.x = collisore.percorso[j].x + (collisore.percorso[prossimo].x - collisore.percorso[j].x) * ratioStep;
                collisore.y = collisore.percorso[j].y + (collisore.percorso[prossimo].y - collisore.percorso[j].y) * ratioStep;
            } else {
                collisore.x = smoothMap(tempoCurrStep, 0, durataCurrStep, collisore.percorso[j].x, collisore.percorso[prossimo].x);
                collisore.y = smoothMap(tempoCurrStep, 0, durataCurrStep, collisore.percorso[j].y, collisore.percorso[prossimo].y);
            }
            aggiungiCollisoreAQuadranti(collisore);
            collisore.vx = (collisore.x - prevX) / deltaTime;
            collisore.vy = (collisore.y - prevY) / deltaTime;
        }
    }
}