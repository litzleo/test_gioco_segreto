

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
    comandi.ATTIVA_BLOCCHI = { binds: [CONTROL, [0, 2]], stato: INATTIVO, nome:'ATTIVA BLOCCHI' };
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

function keyPressed() {
    if (getAudioContext().state !== 'running') {
        userStartAudio();
    }
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

    quadranti = {};

    collisori = [];

    causatori = [];

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
            const atlasShader = atlasShaders[1][0];
            shader(atlasShader);
            atlasShader.setUniform('uTexture', atlasImage);
            atlasShader.setUniform('uColor', [1, 1, 1, 1]);
            atlasShader.setUniform('uIsSprite', 0.0); 
            atlasShader.setUniform('uSubRect', uvSpina);
            atlasShader.setUniform('uRepeat', [numSpine, 1]);
            atlasShader.setUniform('uTexSize', [ATLAS_W, ATLAS_H]); 
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
    
    /*velocini.rinascita = {x: 410 - LARGHEZZA/2, y: 1540 - ALTEZZA};
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
    collisori.push(creaSpine(1100, 1520, 60, 20));*/


    velocini.x = 300, velocini.y=1500;
    

    camera.x = velocini.x + velocini.w/2;
    camera.y = velocini.y + velocini.h/2;

    collisori.push({ x: 0, y: 1600, w: 1000, h: 40, mobile: false});
    collisori.push({ x: 400, y: 1500, w: 80, h: 40, mobile: false, scomparibile: true, scomparso: true});
    collisori.push({ x: 0, y: 0, vertici: [{x: 600, y: 1500}, {x: 600, y: 1580}, {x: 800, y: 1580}, {x: 700, y: 1500}], mobile: false, scomparibile: true, scomparso: true});
    velocini.stato.add("PW_attivaBlocchi");

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
        
        const atlasShader = atlasShaders[0][0];
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