
let mioFont;
let textBuffer;

let trackerFill = undefined;
let trackerStroke = undefined;

let spriteSheet;
let atlasImage;

let atlasShaders = [];

let passoNormale;
let passoMetallo;
let suonoSalto;

let materialePestato = 'terra';

const originalFill = p5.prototype.fill;
p5.prototype.fill = function(...args) {
    trackerFill = args; // Salviamo i valori
    return originalFill.apply(this, args); // Eseguiamo il vero comando
};

const originalNoFill = p5.prototype.noFill;
p5.prototype.noFill = function() {
    trackerFill = undefined;
    return originalNoFill.apply(this);
};

const originalStroke = p5.prototype.stroke;
p5.prototype.stroke = function(...args) {
    trackerStroke = args;
    return originalStroke.apply(this, args);
};

const originalNoStroke = p5.prototype.noStroke;
p5.prototype.noStroke = function() {
    trackerStroke = undefined;
    return originalNoStroke.apply(this);
};

function preload() {
    mioFont = loadFont('font/arial.ttf'); 
    atlasImage = loadImage('sprite/sprite_sheet.png', img => {
        // Imposta i filtri della texture WebGL direttamente
        img.canvas.getContext('2d').imageSmoothingEnabled = false;
    });
    atlasShaders.push([loadShader('atlas.vert', 'clamp_clamp.frag'), loadShader('atlas.vert', 'clamp_wrap.frag')]);
    atlasShaders.push([loadShader('atlas.vert', 'wrap_clamp.frag'), loadShader('atlas.vert', 'wrap_wrap.frag')]);

    passoNormale = loadSound('suoni/passo_normale.mp3');
    passoMetallo = loadSound('suoni/passo_metallo.mp3');
    suonoSalto = loadSound('suoni/salto.mp3');
}
function setup() {
    const W = 1350, H = 585;
    createCanvas(W, H, WEBGL);
    frameRate(FRAME_RATE);
    setupComandi();
    caricaPiattaforme();
    ellipseMode(CORNER);
    textFont(mioFont);
    
    textBuffer = createGraphics(W, H);
    textBuffer.textFont(mioFont);
    textBuffer.fill(0);
    transizionaSchermata('menù');

    textureMode(NORMAL);

}

function vittoria(){
    console.log(spartito);
    alert(tempoDaMostrare(tempo));
}

function tempoDaMostrare(t){
    const secondiTotali = (t * 1/FRAME_RATE);
    const minuti = floor(secondiTotali/60);
    const secondi = floor((secondiTotali - (minuti*60)) * 1000)/1000;
    return minuti + ':' + (secondi < 10 ? '0' : '') + secondi;
}

let lunghezzaFrame = 1/FRAME_RATE;
let mostraMorto = 0;
let schermata = 'menù';

let tempo = 0;
let lagFrames = 0;
function disegnaGioco(){
    if(comandi.RESET.stato === ATTIVATO){
        transizionaSchermata("gioco");
    }

    push();

    //scale(0.18, 0.18);
    //translate((-camera.x + width/2)*0.1, (-camera.y + height/2)*0.1 + 120);
    translate(-camera.x + width/2, -camera.y + height/2);
    
    if(mostraMorto === 0){
        lagFrames += floor(deltaTime/1000*FRAME_RATE);
        const lagFramesLocal = lagFrames;
        const inizioFrame = millis();
        for(let i=0; i<max(1, lagFramesLocal) && millis() < inizioFrame + MAX_LAG; i++){
            aggiornaComandi(tempo, PILOTATO);
            muoviCamera(lunghezzaFrame);
            muoviOggetti(lunghezzaFrame);
            muoviVelocini(lunghezzaFrame);
            tempo++;
            lagFrames = max(0, lagFrames-1);
            if(PILOTATO)break;
        }
    } else {
        mostraMorto--;
        if(mostraMorto === 0){
            resettaVelocini();
            velocini.vx = 0;
            velocini.vy = 0;
            velocini.x = velocini.rinascita.x;
            velocini.y = velocini.rinascita.y;
        }
    }

    for(let i=sveglie.length-1; i>=0; i--){
        const sveglia = sveglie[i];
        sveglia.t--;
        if(sveglia.t <= 0){
            sveglia.azione();
            if(sveglie.includes(sveglia))
                sveglie.splice(sveglie.indexOf(sveglia), 1);
        }
    }

    disegnaCollisori();

    for (let i = 0; i < causatori.length; i++) {
        if(causatori[i].disegno){
            causatori[i].disegno();
        }
    }

    if(velocini.stato.has("scatto"))fill(0, 255, 0);
    else if(velocini.stato.has("cooldown_scatto"))fill(255, 255, 0);
    else if(velocini.stato.has("rotolata")) fill(0, 0, 255);
    else fill(255, 0, 0);
    if(velocini.stato.has("rotolata")) circle(velocini.x, velocini.y, velocini.w);
    else disegnaPersonaggio(velocini.x - 1, velocini.y - 6, 24, 48);


    pop();

    if(mostraMorto > 0){
        textBuffer.fill(200, 0, 0);
        textBuffer.textSize(50);
        textBuffer.text("SEI MORTO", (width - textBuffer.textWidth("SEI MORTO")) / 2, 100);
    }

    textBuffer.fill(200, 0, 0);
    textBuffer.textSize(20);
    textBuffer.text(tempoDaMostrare(tempo), 60, 20);

    
}

let contPersonaggio=0;
function disegnaPersonaggio(x, y, w, h) {
    push();
    const atlasShader = atlasShaders[0][0];
    shader(atlasShader);
    
    // 1. Calcolo dell'indice della colonna (frame dello sprite)
    let col = (contPersonaggio % 4 + (velocini.stato.has("abbassato") ? 5 : 0));
    if (velocini.stato.has("PW_saltomuro")) {
        if (velocini.stato.has("pareteDX") || velocini.stato.has("pareteSX")) {
            col = (velocini.stato.has("abbassato") ? 9 : 4);
        }
    }

    const ATLAS_W = atlasImage.width;
    const ATLAS_H = atlasImage.height;

    const PERS_W = 24;
    const PERS_H = 48;

    // 2. Setup delle uniform per lo shader
    // Assumendo Atlas 240x132 e sprite 24x48
    let sw = PERS_W / ATLAS_W; 
    let sh = PERS_H / ATLAS_H; 
    let sx = (col * PERS_W) / ATLAS_W; 
    const personaggioRect = [sx, 0.0, sw, sh];
    
    atlasShader.setUniform('uTexture', atlasImage);
    atlasShader.setUniform('uSubRect', personaggioRect);
    atlasShader.setUniform('uRepeat', [1, 1]);
    atlasShader.setUniform('uIsSprite', 1); 
    atlasShader.setUniform('uTexSize', [ATLAS_W, ATLAS_H]); 

    // Gestione colore (Tint) via shader
    if (velocini.stato.has("scatto")) {
        atlasShader.setUniform('uColor', [0, 1, 0, 1]);
    } else {
        atlasShader.setUniform('uColor', [0, 0, 0, 1]); 
    }

    // 3. Posizionamento e Geometria
    translate(x + w/2, y + h/2); 
    
    // Orientazione
    if (velocini.orientazione === "sinistra" || (velocini.stato.has("PW_saltomuro") && velocini.stato.has("pareteSX"))) {
        scale(-1, 1);
    }
    
    // Inclinazione dinamica basata sulla velocità
    const velRatio = MAX_VELOCITA / abs(velocini.pavimentoVx - velocini.vx);
    if ((velocini.stato.has("atterrato") || velocini.stato.has("cadenteDaPoco")) && velRatio < 1.5) {
        shearX(-QUARTER_PI / 6 / velRatio);
    }

    rect(-w/2, -h/2, w, h);

    pop();
    resetShader();

    // Aggiornamento animazione (spostato fuori per pulizia)
    if ((velocini.stato.has("atterrato") || velocini.stato.has("cadenteDaPoco")) && tempo % (4 * floor(velRatio)) === 0) {
        contPersonaggio++;
        if(col === 3 || col === 8){
            suonaPasso();
        }
    }
}

function suonaPasso(volume = 0.5){
    materialePestato === 'terra' ? suonaRandom(passoNormale, 5, volume, 0.2) : suonaRandom(passoMetallo, 5, volume, 0.2);
}

function suonaRandom(suono, occorrenze, volume, durata) {
    let indiceCasuale = floor(random(occorrenze));
    let tempoInizio = indiceCasuale * durata;

    if (!suono.isPlaying()) {
        suono.stop();
        suono.play(0, 1, volume);
        suono.jump(tempoInizio);
        setTimeout(() => suono.stop(), (durata - 0.05) * 1000);
    }
}

let menuIndex = 0;
let bindIndex = 0;
let comandoSelezionato = undefined;
let bindSelezionato = undefined;
let eliminaComando = false;
let nuovoBind = undefined;
let tempoRichiestaNuovoBind = undefined;
function disegnaMenu(){

    aggiornaComandi();
    fill(0);
    textBuffer.fill(0);
    textBuffer.textSize(30);
    const listaComandi = [];
    const PLUS = '+'.charCodeAt(0);
    for (const [key, value] of Object.entries(comandi)) {
        listaComandi.push(value);
    }
    if(comandoSelezionato){
        if(bindSelezionato){
            if(bindSelezionato !== PLUS){
                if(comandi.MENU.stato === DISATTIVATO){
                    bindSelezionato = undefined;
                    eliminaComando = false;
                } else {
                    if(comandi.DX.stato === DISATTIVATO || comandi.SX.stato === DISATTIVATO){
                        eliminaComando = !eliminaComando;
                    }
                    if(comandi.CONFERMA.stato === DISATTIVATO){
                        if(eliminaComando){
                            comandoSelezionato.binds.splice(comandoSelezionato.binds.indexOf(bindSelezionato), 1);
                            if(bindIndex === comandoSelezionato.binds.length)
                                bindIndex--;
                        }
                        bindSelezionato = undefined;
                        eliminaComando = false;
                    }
                }
            }
        } else {
            if(comandi.MENU.stato === DISATTIVATO){
                comandoSelezionato = undefined;
            } else {
                if(bindIndex !== comandoSelezionato.binds.length && comandi.DX.stato === DISATTIVATO){
                    bindIndex++;
                }
                if(bindIndex !== 0 && comandi.SX.stato === DISATTIVATO){
                    bindIndex--;
                }
                if(comandi.CONFERMA.stato === DISATTIVATO){
                    bindSelezionato = [...comandoSelezionato.binds, PLUS][bindIndex];
                    if(comandoSelezionato.binds.length === 1 && bindSelezionato !== PLUS)
                        bindSelezionato = undefined;
                }
            }
        }
    }
    else{
        if(menuIndex !== listaComandi.length-1 && comandi.GIU.stato === DISATTIVATO){
            menuIndex++;
        }
        if(menuIndex !== 0 && comandi.SU.stato === DISATTIVATO){
            menuIndex--;
        }
        if(comandi.CONFERMA.stato === DISATTIVATO){
            bindIndex = 0;
            comandoSelezionato = listaComandi[menuIndex];
        }
        if(comandi.MENU.stato === DISATTIVATO){
            transizionaSchermata('gioco');
        }
    }

    listaComandi.forEach((comando, index) => {
        if(comandoSelezionato){
            if(comandoSelezionato === comando){
                textBuffer.fill(0);
            }
            else{
                textBuffer.fill(150);
            }
        }
        if(menuIndex === index){
            textBuffer.stroke(255, 0, 0);
        }
        else{
            textBuffer.noStroke();
        }
        textBuffer.text(comando.nome, 100, 40*(index+1));
    });

    textBuffer.noStroke();
    listaComandi.forEach((comando, index1) => {
        if(comandoSelezionato === comando){
            fill(0);
            textBuffer.fill(0);
        } else {
            fill(150);
            textBuffer.fill(150);
        }
        let spazio = width / 3;
        [...comando.binds, PLUS].forEach((bind, index2) => {
            if(comandoSelezionato === comando){
                if(!bindSelezionato || bindSelezionato === bind){
                    fill(0);
                    textBuffer.fill(0);
                }
                else{
                    fill(150);
                    textBuffer.fill(150);
                }
            }
            if(comandoSelezionato === comando && bindIndex === index2){
                stroke(255, 0, 0);
                textBuffer.stroke(255, 0, 0);
            } else{
                noStroke();
                textBuffer.noStroke();
            }
            spazio += disegnaPulsante(bind, spazio, 40*(index1+1)) + 30;
        })
    });

    if(bindSelezionato){
        fill(0);
        noStroke();
        textBuffer.fill(0);
        textBuffer.noStroke();
        const altezzaLinea = 40*(listaComandi.length + 2);
        if(bindSelezionato === PLUS){
            if(!tempoRichiestaNuovoBind){
                tempoRichiestaNuovoBind = millis();
            }
            if(tasti.size > 0)
                nuovoBind = Array.from(tasti).pop();

            navigator.getGamepads().forEach((controller, contrIndex) => {
                if(controller){
                    controller.axes.forEach((axis, axisIndex) => {
                        if(abs(axis) > 0.4){
                            nuovoBind = [contrIndex, "axis", axisIndex, sign(axis)];
                        }
                    })
                    controller.buttons.forEach((button, buttonIndex) => {
                        if(button.pressed){
                            nuovoBind = [contrIndex, buttonIndex];
                        }
                    })
                }
            });
            if(6000 + tempoRichiestaNuovoBind - millis() < 0){
                tempoRichiestaNuovoBind = undefined;
                bindSelezionato = undefined;
                if(nuovoBind && !bindsIncludes(comandoSelezionato.binds, nuovoBind)){
                    comandoSelezionato.binds.push(nuovoBind);
                }
                nuovoBind = undefined;
            }   
            else{
                textBuffer.text('Premere un pulsante per aggiungerlo ', 100, altezzaLinea);
                disegnaPulsante(nuovoBind, 100 + textWidth('Premere un pulsante per aggiungerlo '), altezzaLinea);
                textBuffer.text('Tempo rimanente ' + floor((6000 + tempoRichiestaNuovoBind - millis())/1000), 100, altezzaLinea + 40);
            }
        } else {
            fill(0);
            textBuffer.fill(0);
            textBuffer.text('Eliminare ', 100, altezzaLinea);
            const spazio1 = textBuffer.textWidth('Eliminare ');
            const spazio2 = disegnaPulsante(bindSelezionato, 100 + spazio1, altezzaLinea);
            textBuffer.text(' da ' + comandoSelezionato.nome + '?', 100 + spazio1 + spazio2, altezzaLinea);
            if(eliminaComando){
                stroke(255, 0, 0);
                textBuffer.stroke(255, 0, 0);
            }
            else{
                stroke(0);
                textBuffer.stroke(0);
            }
            textBuffer.text('Sì', width/2, altezzaLinea);
            if(eliminaComando){
                stroke(0);
                textBuffer.stroke(0);
            }
            else{
                stroke(255, 0, 0);
                textBuffer.stroke(255, 0, 0);
            }
            textBuffer.text('No', width/2 + 60, altezzaLinea);
        }   
    }
}

function sign(num){
    return num > 0 ? 1 : (num === 0 ? 0 : -1);
}

function bindsIncludes(binds, bind){
    if(!bind.length)
        return binds.includes(bind);
    else{
        for(let i=0; i< binds.length; i++){
            presentBind = binds[i];
            if(presentBind.length === bind.length){
                let includes = true;
                for(let j=0; j<bind.length; j++){
                    if(bind[j] !== presentBind[j]){
                        includes = false;
                        break;
                    }
                }
                if(includes)
                    return true;
            }
        }
    }
    return false;
}

const pulsanteDim = 20;
function disegnaPulsante(pulsante, x, y){
    if(!pulsante)
        return 0;
    
    const coloreFill = trackerFill;
    const coloreStroke = trackerStroke;

    if(!pulsante.length){
        const testo = traduciCodiceTastiera(pulsante);
        textBuffer.text(testo, x, y);
        return textBuffer.textWidth(testo);
    }
    push();
    translate(0, 8);
    textBuffer.push();
    textBuffer.translate(0, 4);
    switch(pulsante.length){
        case 2:
            const u = pulsanteDim / 3;
            const startX = x;
            const startY = y - pulsanteDim / 3;
            switch(pulsante[1]){
                case 0:
                    circle(x, y - pulsanteDim/3, pulsanteDim/3); //SX
                    circle(x + 2/3*pulsanteDim, y - pulsanteDim/3, pulsanteDim/3); //DX
                    circle(x + pulsanteDim/3, y - pulsanteDim*2/3, pulsanteDim/3); //SU
                    circle(x + pulsanteDim/3, y, pulsanteDim/3); //GIU
                    fill(255);
                    circle(x + pulsanteDim/3 + 1, y + 1, pulsanteDim/3 - 2);
                    break;
                case 1:
                    circle(x, y - pulsanteDim/3, pulsanteDim/3);
                    circle(x + 2/3*pulsanteDim, y - pulsanteDim/3, pulsanteDim/3);
                    circle(x + pulsanteDim/3, y - pulsanteDim*2/3, pulsanteDim/3);
                    circle(x  + pulsanteDim/3, y, pulsanteDim/3);
                    fill(255);
                    circle(x + 2/3*pulsanteDim + 1, y - pulsanteDim/3 + 1, pulsanteDim/3 - 2);
                    break;
                case 2:
                    circle(x, y - pulsanteDim/3, pulsanteDim/3);
                    circle(x + 2/3*pulsanteDim, y - pulsanteDim/3, pulsanteDim/3);
                    circle(x + pulsanteDim/3, y - pulsanteDim*2/3, pulsanteDim/3);
                    circle(x + pulsanteDim/3, y, pulsanteDim/3);
                    fill(255);
                    circle(x + 1, y - pulsanteDim/3 + 1, pulsanteDim/3 - 2);
                    break;
                case 3:
                    circle(x, y - pulsanteDim/3, pulsanteDim/3);
                    circle(x + 2/3*pulsanteDim, y - pulsanteDim/3, pulsanteDim/3);
                    circle(x + pulsanteDim/3, y - pulsanteDim*2/3, pulsanteDim/3);
                    circle(x + pulsanteDim/3, y, pulsanteDim/3);
                    fill(255);
                    circle(x + pulsanteDim/3 + 1, y - pulsanteDim*2/3 + 1, pulsanteDim/3 - 2);
                    break;
                case 4:
                    rect(x, y - pulsanteDim/4, pulsanteDim, pulsanteDim/2, 3);
                    textBuffer.fill(255);
                    textBuffer.textSize(10);
                    textBuffer.text("L", x + pulsanteDim/2.5, y + 1);
                    break;
                case 5:
                    rect(x, y - pulsanteDim/4, pulsanteDim, pulsanteDim/2, 3);
                    textBuffer.fill(255);
                    textBuffer.textSize(10);
                    textBuffer.text("R", x + pulsanteDim/2.8, y + 1);
                    break;
                case 6:
                    rect(x, y - pulsanteDim/2, pulsanteDim, pulsanteDim, 3);
                    textBuffer.fill(255);
                    textBuffer.textSize(10);
                    textBuffer.text("L", x + pulsanteDim/2.5, y + 1);
                    break;
                case 7:
                    rect(x, y - pulsanteDim/2, pulsanteDim, pulsanteDim, 3);
                    textBuffer.fill(255);
                    textBuffer.textSize(10);
                    textBuffer.text("R", x + pulsanteDim/2.8, y + 1);
                    break;
                case 8:
                    rect(x + pulsanteDim/4, y - pulsanteDim/4, pulsanteDim/2, pulsanteDim/2, 1);
                    textBuffer.fill(255);
                    textBuffer.textSize(10);
                    textBuffer.text("L", x + pulsanteDim/2.5, y + 1);
                    break;
                case 9:
                    rect(x + pulsanteDim/4, y - pulsanteDim/4, pulsanteDim/2, pulsanteDim/2, 1);
                    textBuffer.fill(255);
                    textBuffer.textSize(10);
                    textBuffer.text("R", x + pulsanteDim/2.8, y + 1);
                    break;
                case 10:
                    circle(x, y - pulsanteDim/1.8, pulsanteDim);
                    textBuffer.fill(255);
                    textBuffer.noStroke();
                    textBuffer.textSize(20);
                    textBuffer.text("L", x + 4, y);
                    break;
                case 11:
                    circle(x, y - pulsanteDim/1.8, pulsanteDim);
                    textBuffer.fill(255);
                    textBuffer.noStroke();
                    textBuffer.textSize(20);
                    textBuffer.text("R", x + 3, y);
                    break;
                case 12:
                    beginShape();
                        vertex(startX + u, startY - u); 
                        vertex(startX + 2*u, startY - u);  
                        vertex(startX + 2*u, startY);     
                        vertex(startX + 3*u, startY);       
                        vertex(startX + 3*u, startY + u);   
                        vertex(startX + 2*u, startY + u);   
                        vertex(startX + 2*u, startY + 2*u); 
                        vertex(startX + u, startY + 2*u); 
                        vertex(startX + u, startY + u); 
                        vertex(startX, startY + u);      
                        vertex(startX, startY);          
                        vertex(startX + u, startY);         
                    endShape(CLOSE);
                    fill(255);
                    square(x + pulsanteDim/3 + 1, y - pulsanteDim*2/3 + 1, pulsanteDim/3 - 2);
                    break;
                case 13:
                    beginShape();
                        vertex(startX + u, startY - u); 
                        vertex(startX + 2*u, startY - u);  
                        vertex(startX + 2*u, startY);     
                        vertex(startX + 3*u, startY);       
                        vertex(startX + 3*u, startY + u);   
                        vertex(startX + 2*u, startY + u);   
                        vertex(startX + 2*u, startY + 2*u); 
                        vertex(startX + u, startY + 2*u); 
                        vertex(startX + u, startY + u); 
                        vertex(startX, startY + u);      
                        vertex(startX, startY);          
                        vertex(startX + u, startY);         
                    endShape(CLOSE);
                    fill(255);
                    square(x + pulsanteDim/3 + 1, y + 1, pulsanteDim/3 - 2);
                    break;
                case 14:
                    beginShape();
                        vertex(startX + u, startY - u); 
                        vertex(startX + 2*u, startY - u);  
                        vertex(startX + 2*u, startY);     
                        vertex(startX + 3*u, startY);       
                        vertex(startX + 3*u, startY + u);   
                        vertex(startX + 2*u, startY + u);   
                        vertex(startX + 2*u, startY + 2*u); 
                        vertex(startX + u, startY + 2*u); 
                        vertex(startX + u, startY + u); 
                        vertex(startX, startY + u);      
                        vertex(startX, startY);          
                        vertex(startX + u, startY);         
                    endShape(CLOSE);
                    fill(255);
                    square(x + 1, y - pulsanteDim/3 + 1, pulsanteDim/3 - 2);
                    break;
                case 15:
                    beginShape();
                        vertex(startX + u, startY - u); 
                        vertex(startX + 2*u, startY - u);  
                        vertex(startX + 2*u, startY);     
                        vertex(startX + 3*u, startY);       
                        vertex(startX + 3*u, startY + u);   
                        vertex(startX + 2*u, startY + u);   
                        vertex(startX + 2*u, startY + 2*u); 
                        vertex(startX + u, startY + 2*u); 
                        vertex(startX + u, startY + u); 
                        vertex(startX, startY + u);      
                        vertex(startX, startY);          
                        vertex(startX + u, startY);         
                    endShape(CLOSE);
                    fill(255);
                    square(x + 2/3*pulsanteDim + 1, y - pulsanteDim/3 + 1, pulsanteDim/3 - 2);
                    break;
                case 16:
                    rect(x + pulsanteDim/4, y - pulsanteDim/4, pulsanteDim/2, pulsanteDim/2, 1);
                    textBuffer.fill(255);
                    textBuffer.textSize(10);
                    textBuffer.text("C", x + pulsanteDim/2.5, y + 1);
                    break;
            }
            break;
        case 4:
            circle(x, y - pulsanteDim/1.8, pulsanteDim);
            textBuffer.textSize(15);
            if(pulsante[2] === 0 || pulsante[2] === 2){
                if(pulsante[3] === 1){
                    textBuffer.text("▷", x + pulsanteDim*1.1, y);
                } else {
                    textBuffer.text("◁", x - pulsanteDim/2, y);
                }
            } else {
                if(pulsante[3] === 1){
                    textBuffer.text("▽", x + 5, y + pulsanteDim/1.4);
                } else {
                    textBuffer.text("△", x + 5, y - pulsanteDim/1.4);
                }
            }
            textBuffer.fill(255);
            textBuffer.textSize(20);
            switch(pulsante[2]){
                case 0:
                case 1:
                    textBuffer.text("L", x + 4, y);
                    break;
                default:
                    textBuffer.text("R", x + 3, y);
            }
            textBuffer.textSize(30);
            break;
    }
    pop();
    textBuffer.pop();
    textBuffer.textSize(30);
    if(coloreFill){
        fill(...coloreFill);
        textBuffer.fill(...coloreFill);
    }
    if(coloreStroke){
        stroke(...coloreStroke);
        textBuffer.stroke(...coloreStroke);
    }

    return pulsante.length === 4 ? pulsanteDim * 1.5: pulsanteDim;
}

function traduciCodiceTastiera(codice){
    switch(codice){
        case UP_ARROW:
            return ' ↑';
        break;
        case DOWN_ARROW:
            return ' ↓';
        break;
        case LEFT_ARROW:
            return '←';
        break;
        case RIGHT_ARROW:
            return '→';
        break;
        case SHIFT:
            return 'SHIFT';
        break;
        case CONTROL:
            return 'CTRL';
        break;
        case ENTER:
            return 'ENTER';
        break;
        case ESCAPE:
            return 'ESC';
        break;
        case BACKSPACE:
            return 'BACK';
        break;
        case 32:
            return 'SPACE';
        break;
        default:
            return char(codice);
    }
}

function transizionaSchermata(nuovoStato){
    schermata = nuovoStato;

    switch(schermata){
        case 'gioco':
            //resetta il gioco
            tempo = 0;
            textBuffer.textAlign(LEFT, CENTER);
            textAlign(LEFT, CENTER);
            if(!PILOTATO)
                spartito = [];
            break;
        case 'menù':
            textBuffer.textAlign(LEFT, CENTER);
            textAlign(LEFT, CENTER);
            menuIndex = 0;
            bindIndex = 0;
            comandoSelezionato = undefined;
            bindSelezionato = undefined;
            eliminaComando = false;
            nuovoBind = undefined;
            break;
    }
}

function draw() {

    textBuffer.clear();
    
    push();
    translate(-width / 2, -height / 2);
    background(255);

    switch(schermata){
        case 'gioco':
            disegnaGioco();
            break;
        case 'menù':
            disegnaMenu();
            break;
    }

    pop();
    texture(textBuffer);
    noStroke(); 
    plane(textBuffer.width, textBuffer.height);

}

let clicked = false;
function mouseClicked() {
  clicked = true;
}

function disegnaTexture(collisore){
    
    if('disegno' in collisore){
        collisore.disegno();
        return;
    }
    const ATLAS_W = atlasImage.width;
    const ATLAS_H = atlasImage.height;
    // TERRENO (Erba sopra) - Misura dove si trova nello spritesheet
    const TERRENO_X = 0;   // Inizio X dell'erba
    const TERRENO_Y = 100;   // Inizio Y dell'erba
    const TERRENO_W = 16;  // Larghezza dell'erba
    const TERRENO_H = 16;  // Altezza dell'erba (ex terreno.height)

    // TERRENO PROFONDO (Terra sotto)
    const PROFONDO_X = 0;  
    const PROFONDO_Y = 116; 
    const PROFONDO_W = 16; 
    const PROFONDO_H = 16; 

    // Calcolo preventivo dei rettangoli UV (0.0 -> 1.0)
    const uvTerreno = [TERRENO_X / ATLAS_W, TERRENO_Y / ATLAS_H, TERRENO_W / ATLAS_W, TERRENO_H / ATLAS_H];
    const uvProfondo = [PROFONDO_X / ATLAS_W, PROFONDO_Y / ATLAS_H, PROFONDO_W / ATLAS_W, PROFONDO_H / ATLAS_H];

    if('h' in collisore){
        const atlasShader = atlasShaders[1][0];
        shader(atlasShader);
        atlasShader.setUniform('uTexture', atlasImage);
        atlasShader.setUniform('uColor', [1, 1, 1, 1]);
        atlasShader.setUniform('uIsSprite', 0.0); 
        atlasShader.setUniform('uTexSize', [ATLAS_W, ATLAS_H]);  
        const dh = min(collisore.h, TERRENO_H);
        
        const ripetizioneX = collisore.w / TERRENO_W;
        const ripetizioneY = dh / TERRENO_H; 
        
        atlasShader.setUniform('uSubRect', uvTerreno);
        atlasShader.setUniform('uRepeat', [ripetizioneX, ripetizioneY]);

        rect(collisore.x, collisore.y, collisore.w, dh);
        resetShader();

        if(collisore.h > TERRENO_H){
            const repDeepX = collisore.w / PROFONDO_W;
            const repDeepY = (collisore.h - dh) / PROFONDO_H;
            const atlasShader = atlasShaders[1][1];
            shader(atlasShader);
            atlasShader.setUniform('uTexture', atlasImage);
            atlasShader.setUniform('uColor', [1, 1, 1, 1]);
            atlasShader.setUniform('uIsSprite', 0.0); 
            atlasShader.setUniform('uSubRect', uvProfondo);
            atlasShader.setUniform('uRepeat', [repDeepX, repDeepY]);
            atlasShader.setUniform('uTexSize', [ATLAS_W, ATLAS_H]); 
            rect(collisore.x, collisore.y + dh, collisore.w, collisore.h - dh);
        }
    } else {
        let atlasShader = atlasShaders[1][1];
        shader(atlasShader);
        atlasShader.setUniform('uTexture', atlasImage);
        atlasShader.setUniform('uColor', [1, 1, 1, 1]);
        atlasShader.setUniform('uIsSprite', 0.0); 
        atlasShader.setUniform('uSubRect', uvProfondo);
        atlasShader.setUniform('uRepeat', [1.0, 1.0]);
        atlasShader.setUniform('uTexSize', [ATLAS_W, ATLAS_H]); 
        beginShape();
            collisore.vertici.forEach(vertice => {
                vertex(vertice.x + collisore.x, vertice.y + collisore.y,
                    (vertice.x + collisore.x) / PROFONDO_W, (vertice.y + collisore.y) / PROFONDO_H);
            });
        endShape();

        resetShader();
        atlasShader = atlasShaders[1][0];
        shader(atlasShader);
        atlasShader.setUniform('uTexture', atlasImage);
        atlasShader.setUniform('uColor', [1, 1, 1, 1]);
        atlasShader.setUniform('uIsSprite', 0.0); 
        atlasShader.setUniform('uSubRect', uvTerreno);
        atlasShader.setUniform('uRepeat', [1.0, 1.0]);
        atlasShader.setUniform('uTexSize', [ATLAS_W, ATLAS_H]); 
        noStroke();           // Impedisce al bug delle linee di rompere il batch
        
        texture(atlasImage);
        shader(atlasShader);
        // 1. INIZIAMO IL MEGA-BATCH UNA VOLTA SOLA
        beginShape(QUADS); 

        collisore.vertici.forEach((vertice, indice) => {
            const prossimo = collisore.vertici[(indice + 1) % collisore.vertici.length];
            
            if (vertice.x > prossimo.x) {
                const oltre = collisore.vertici[(indice + 2) % collisore.vertici.length];
                const precedente = collisore.vertici[(indice + collisore.vertici.length - 1) % collisore.vertici.length];
                const angolo = atan2(vertice.y - prossimo.y, vertice.x - prossimo.x);
                const dist = sqrt(sq(vertice.y - prossimo.y) + sq(vertice.x - prossimo.x));
                
                let verticeOltre = rimappaVertice(prossimo.x, prossimo.y, oltre.x, oltre.y, -angolo);
                verticeOltre.x *= TERRENO_H / verticeOltre.y;
                let verticePrecedente = rimappaVertice(prossimo.x, prossimo.y, precedente.x, precedente.y, -angolo);
                verticePrecedente.x = (verticePrecedente.x - dist) * TERRENO_H / verticePrecedente.y + dist;

                // --- INIZIO MATEMATICA MANUALE (Bypass di translate e rotate) ---
                
                // Valori di traslazione globale (il centro del nostro sistema locale)
                const tx = prossimo.x + collisore.x;
                const ty = prossimo.y + collisore.y;
                
                // Pre-calcoliamo seno e coseno per la rotazione
                const cosA = cos(angolo);
                const sinA = sin(angolo);

                // Funzione interna per ruotare e traslare un punto locale nel mondo globale
                const applicaTrasformazione = (localX, localY) => {
                    return {
                        x: (localX * cosA) - (localY * sinA) + tx,
                        y: (localX * sinA) + (localY * cosA) + ty
                    };
                };

                // Definiamo i 4 vertici LOCALI (quelli che prima mettevi in vertex)
                const lx0 = 0;
                const ly0 = 0;
                
                const lx1 = max(0, verticeOltre.x);
                const ly1 = TERRENO_H;
                
                const lx2 = min(dist, verticePrecedente.x);
                const ly2 = TERRENO_H;
                
                const lx3 = dist;
                const ly3 = 0;

                // Trasformiamoli in vertici GLOBALI usando la nostra formula
                const p0 = applicaTrasformazione(lx0, ly0);
                const p1 = applicaTrasformazione(lx1, ly1);
                const p2 = applicaTrasformazione(lx2, ly2);
                const p3 = applicaTrasformazione(lx3, ly3);

                // --- FINE MATEMATICA MANUALE ---

                // Ora mandiamo i punti calcolati direttamente alla scheda video!
                // Le UV (gli ultimi due parametri) rimangono identiche perché dipendono dalla distanza locale
                vertex(p0.x, p0.y, 0, 0);
                vertex(p1.x, p1.y, max(0, verticeOltre.x) / TERRENO_W, 1);
                vertex(p2.x, p2.y, min(dist, verticePrecedente.x) / TERRENO_W, 1);
                vertex(p3.x, p3.y, dist / TERRENO_W, 0);
            } 
        });

        // 2. FINE DEL MEGA-BATCH (Disegna tutto l'erba del poligono in un millisecondo)
        endShape();
    }
    resetShader();
}

function rimappaVertice(ox, oy, vx, vy, angolo){
    const x = vx-ox, y = vy-oy, cs = cos(angolo), sn = sin(angolo);
    return {
        x: x*cs - y*sn,
        y: x*sn + y*cs
    }
}

function disegnaCollisori(){

    const mousePos = [mouseX + camera.x - width/2, mouseY + camera.y - height/2];
    const textPos = [200 + camera.x - width/2, 100 + camera.y - height/2];

    const disegna = (collisore) => {
        let texturabile = false;
        if(collisore.rompibile)fill(255, 200, 120);
        else if(collisore.colore)
            fill(collisore.colore);
        else
            texturabile = true;
        if(haColliso(mousePos[0], mousePos[1], collisore)){
            if(clicked)
                navigator.clipboard.writeText('x: ' + collisore.x + ', y: ' + collisore.y);
            fill(255, 0, 0);
            if('h' in collisore)
                text(collisore.x + ' ' + collisore.y, textPos[0], textPos[1]);
            else
                text((collisore.x + collisore.vertici[0].x) + ' ' + (collisore.y + collisore.vertici[0].y), textPos[0], textPos[1]);
        }
        if('percorso' in collisore && 'h' in collisore && !collisore.rompibile){
            const latoSegnale = 10;
            fill(200);
            rect(collisore.x, collisore.y, collisore.w, collisore.h);
            if(collisore.mobile){
                fill(255, 0, 0);
            } else {
                fill(0);
            }
            square(collisore.x + (collisore.w - latoSegnale) / 2, collisore.y + (collisore.h - latoSegnale) / 2, latoSegnale);
        }
        else if(texturabile)
            disegnaTexture(collisore);
        else if('h' in collisore)
            rect(collisore.x, collisore.y, collisore.w, collisore.h);
        else {
            beginShape();
            collisore.vertici.forEach(vertice => {
                vertex(vertice.x + collisore.x, vertice.y + collisore.y);
                    //(vertice.x + collisore.x) / terrenoProfondo.width, (vertice.y + collisore.y) / terrenoProfondo.height);
            })
            endShape();
        }
    }

    const collisoriCalcolati = new Set();
    const collisoriPrimopiano = new Set();
    const minIndiceX = floor((camera.x - width/2) / LARGHEZZA) + CONFINI_MAPPA.x;
    const maxIndiceX = floor((camera.x + width/2) / LARGHEZZA) + CONFINI_MAPPA.x;
    const minIndiceY = floor((camera.y - height/2) / ALTEZZA) + CONFINI_MAPPA.y;
    const maxIndiceY = floor((camera.y + height/2) / ALTEZZA) + CONFINI_MAPPA.y;

    for (let x = minIndiceX; x <= maxIndiceX; x++) {
        for (let y = minIndiceY; y <= maxIndiceY; y++) {
            let index = x + "_" + y;
            if(index in quadranti){
                for (let i = quadranti[index].length-1; i >= 0; i--) {
                    let collisore = quadranti[index][i];
                    if(!collisoriCalcolati.has(collisore) && !('effetto' in collisore)){
                        collisoriCalcolati.add(collisore);
                        if(collisore.primopiano){
                            collisoriPrimopiano.add(collisore);
                        } else {
                            disegna(collisore);
                        }
                    }
                }
            }
        }
    }
    collisoriPrimopiano.forEach(collisore => disegna(collisore));
    clicked = false;
}