

let velocini = { x: -20, y: 430, w: LARGHEZZA, h: ALTEZZA, vx: 0, vy: 0, pavimentoVx: 0, pavimentoVy: 0,
     grav: GRAVITA, accel: ACCELERAZIONE, tempoCoyote: COYOTE, attr: ATTRITO,
     tempoSalto : MAX_DURATA_SALTO, frameSalto : 0, orientazione : "destra",
     frameParete : 0, frameScatto : 0, rinascita : {x: 0, y: -100},
     stato: new Set() };

let yAbbassata = ALTEZZA * (1 - ABBASSAMENTO);
let altezzaAbbassata = ALTEZZA * ABBASSAMENTO;

function haColliso(x, y, collisore, confini) {
    
    if('h' in collisore){
        let collisione = x >= collisore.x && x <= collisore.x + collisore.w &&
            y >= collisore.y && y <= collisore.y + collisore.h;

        if(collisione && confini){
            confini.minY = max(confini.minY, collisore.y);
            confini.minX = max(confini.minX, collisore.x);
            confini.maxY = min(confini.maxY, collisore.y + collisore.h);
            confini.maxX = min(confini.maxX, collisore.x + collisore.w);
        }
        return collisione;
    }

    let p = createVector(x, y);
    let totAngolo = 0;
    let bounds = {minX:null, minY:null, maxX:null, maxY:null};
    for(let i=0; i<collisore.vertici.length; i++){
        let A = {x: collisore.vertici[i].x + collisore.x, y:collisore.vertici[i].y + collisore.y};
        let B = {x: collisore.vertici[(i+1) % collisore.vertici.length].x + collisore.x, y:collisore.vertici[(i+1) % collisore.vertici.length].y + collisore.y};
        totAngolo += createVector(A.x, A.y).sub(p).angleBetween(createVector(B.x, B.y).sub(p));
        if(A.x < x && x < B.x){
            let t = (x-B.x)/(A.x-B.x)
            bounds.maxY = A.y*t + B.y*(1-t);
        } 
        else if(A.x > x && x > B.x){
            let t = (x-B.x)/(A.x-B.x)
            bounds.minY = A.y*t + B.y*(1-t);
        }
        if(A.y < y && y < B.y){
            let t = (y-B.y)/(A.y-B.y)
            bounds.minX = A.x*t + B.x*(1-t);
        } 
        else if(A.y > y && y > B.y){
            let t = (y-B.y)/(A.y-B.y)
            bounds.maxX = A.x*t + B.x*(1-t);
        }
    }
    
    if(abs(totAngolo) > 1 && confini){
        confini.minY = max(confini.minY, bounds.minY);
        confini.minX = max(confini.minX, bounds.minX);
        confini.maxY = min(confini.maxY, bounds.maxY);
        confini.maxX = min(confini.maxX, bounds.maxX);
        return true;
    }

    return false;
}


let prevDeltaVY = 0;
let inclinazione = 0;
let precedenteToccati = new Set();
function collisioni(deltaTime) {

    velocini.pavimentoVx = 0;
    velocini.pavimentoVy = 0;

    const NW = { x: velocini.x, y: velocini.y };
    const NE = { x: velocini.x + velocini.w, y: velocini.y };
    const CW = { x: velocini.x, y: velocini.y + velocini.h - ALTEZZA * 1 / 3  };
    const CE = { x: velocini.x + velocini.w, y: velocini.y + velocini.h - ALTEZZA * 1 / 3 };
    const SW = { x: velocini.x, y: velocini.y + velocini.h };
    const SC = { x: velocini.x + velocini.w / 2, y: velocini.y + velocini.h };
    const SE = { x: velocini.x + velocini.w, y: velocini.y + velocini.h };
    const fullN = { x: velocini.x + velocini.w/2, y: velocini.y + velocini.h - ALTEZZA};
    const partialN = { x: velocini.x + velocini.w / 2, y: velocini.y + velocini.h - altezzaAbbassata};
    const MuroCE = { x: velocini.x + velocini.w + VICINANZA_MURO, y: velocini.y + velocini.h - ALTEZZA * 1 / 3  };
    const MuroCW = { x: velocini.x - VICINANZA_MURO, y: velocini.y + velocini.h - ALTEZZA * 1 / 3  };
    const MuroNE = { x: velocini.x + velocini.w + VICINANZA_MURO, y: velocini.y};
    const MuroNW = { x: velocini.x - VICINANZA_MURO, y: velocini.y};


    let collisionePartialSALTO = false;
    let collisioneFullSALTO = false;
    let collisioneSX = false; let margineSX = velocini.x;
    let collisioneDX = false; let margineDX = velocini.x + velocini.w;
    let collisioneSALTO = false; let margineSALTO = velocini.y;
    let collisioneGIU = false; let margineGIU = velocini.y + velocini.h;
    let collisionePiedeSX = false;
    let collisionePiedeCX = false;
    let collisionePiedeDX = false;
    let collisioneSoloSX = false;
    let collisioneSoloDX = false;
    let collisioneLatoSX = false;
    let collisioneLatoDX = false;

    const collisoriCalcolati = new Set();

    let confini;

    const collisoriDaTogliere = new Set();

    const collisoriToccati = new Set();

    materialePestato = 'terra';

    for(let x = fullN.x - LARGHEZZA; x <= fullN.x + LARGHEZZA; x += LARGHEZZA/2){
        for(let y = velocini.y + velocini.h/2 - ALTEZZA; y <= velocini.y + velocini.h/2 + ALTEZZA; y += ALTEZZA/2){
            let index = getCollIndice({x: x, y: y});
            if(index in quadranti){
                for (let i = quadranti[index].length-1; i >= 0; i--) {

                    let collisore = quadranti[index][i];
                    
                    if(!collisoriCalcolati.has(collisore) && !(collisore.scomparibile && collisore.scomparso)){
                        
                        collisoriCalcolati.add(collisore);

                        if('effetto' in collisore){
                            if(haColliso(SC.x, velocini.y + velocini.h/2, collisore, null)){
                                if(!('attivato' in collisore)){
                                    collisore.effetto();
                                    collisore.attivato = true;
                                }
                            } else {
                                delete collisore.attivato;
                            }
                        } else {
                            if(!collisori.includes(collisore)){
                                quadranti[index].splice(i, 1);
                                continue;
                            }
                            confini = {minX:Number.MIN_SAFE_INTEGER, 
                                minY:Number.MIN_SAFE_INTEGER,
                                maxX:Number.MAX_SAFE_INTEGER,
                                maxY:Number.MAX_SAFE_INTEGER};

                            let collLatoSX = haColliso(CW.x, CW.y, collisore, confini);
                            collisioneLatoSX |= collLatoSX;
                            let collSX = haColliso(NW.x, NW.y, collisore, confini) || collLatoSX;
                            if (collSX) {
                                margineSX = max(confini.maxX, margineSX);
                                collisioneSX = true;
                                if('vx' in collisore && collisore.vx > velocini.vx && collLatoSX){
                                    velocini.vx = collisore.vx;
                                }
                            }

                            confini = {minX:Number.MIN_SAFE_INTEGER, 
                                minY:Number.MIN_SAFE_INTEGER,
                                maxX:Number.MAX_SAFE_INTEGER,
                                maxY:Number.MAX_SAFE_INTEGER};
                            let collLatoDX = haColliso(CE.x, CE.y, collisore, confini);
                            collisioneLatoDX |= collLatoDX;
                            let collDX = haColliso(NE.x, NE.y, collisore, confini) || collLatoDX;
                            if (collDX) {
                                margineDX = min(confini.minX, margineDX);
                                collisioneDX = true;
                                if('vx' in collisore && collisore.vx < velocini.vx && collLatoDX){
                                    velocini.vx = collisore.vx;
                                }
                            }

                            confini = {minX:Number.MIN_SAFE_INTEGER, 
                                minY:Number.MIN_SAFE_INTEGER,
                                maxX:Number.MAX_SAFE_INTEGER,
                                maxY:Number.MAX_SAFE_INTEGER};

                            let collGIU = (haColliso(SE.x, SE.y, collisore, confini) ||
                                haColliso(SC.x, SC.y, collisore, confini) ||
                                haColliso(SW.x, SW.y, collisore, confini)) &&
                                !(collSX ^ collDX);
                            if (collGIU) {
                                margineGIU = min(confini.minY, margineGIU);
                                collisioneGIU = true;
                                if('vertici' in collisore && velocini.pulsante !== collisore){
                                    for(let j=0; j<collisore.vertici.length; j++){
                                        let A = {x: collisore.vertici[j].x + collisore.x, y: collisore.vertici[j].y + collisore.y};
                                        let B = {x: collisore.vertici[(j+1) % collisore.vertici.length].x + collisore.x, y: collisore.vertici[(j+1) % collisore.vertici.length].y + collisore.y};
                                        if(A.x >= SC.x && SC.x >= B.x && A.x != B.x){
                                            inclinazione = (A.y - B.y) / (A.x - B.x);
                                            break;
                                        }
                                    }
                                } else {
                                    inclinazione = 0;
                                }
                                if('vx' in collisore)
                                    velocini.pavimentoVx = collisore.vx;
                                if('vy' in collisore)
                                    velocini.pavimentoVy = collisore.vy;
                                if(collisore.percorso){
                                    materialePestato = 'metallo';
                                }
                            }

                            confini = {minX:Number.MIN_SAFE_INTEGER, 
                                minY:Number.MIN_SAFE_INTEGER,
                                maxX:Number.MAX_SAFE_INTEGER,
                                maxY:Number.MAX_SAFE_INTEGER};
                            
                            let collPartialSALTO = haColliso(partialN.x, partialN.y, collisore, confini);
                            collisionePartialSALTO |= collPartialSALTO;
                            let collFullSALTO = haColliso(fullN.x, fullN.y, collisore, confini);
                            collisioneFullSALTO |= collFullSALTO;
                            let collSALTO = (velocini.stato.has("abbassato") ? collPartialSALTO : collFullSALTO);
                            if (collSALTO) {
                                margineSALTO = max(confini.maxY, margineSALTO);
                                collisioneSALTO = true;
                            }

                            let collPiedeSX = haColliso(SW.x, SW.y, collisore, confini);
                            let collPiedeCX = haColliso(SC.x, SC.y, collisore, confini);
                            let collPiedeDX = haColliso(SE.x, SE.y, collisore, confini);

                            collisionePiedeSX |= collPiedeSX;
                            collisionePiedeCX |= collPiedeCX;
                            collisionePiedeDX |= collPiedeDX;

                            let collMuroSX = haColliso(MuroCW.x, MuroCW.y, collisore, confini);
                            let collMuroDX = haColliso(MuroCE.x, MuroCE.y, collisore, confini);
                            let collSoloSX = haColliso(MuroNW.x, MuroNW.y, collisore, confini) || collMuroSX;
                            let collSoloDX = haColliso(MuroNE.x, MuroNE.y, collisore, confini) || collMuroDX;

                            collisioneSoloSX |= collSoloSX;
                            collisioneSoloDX |= collSoloDX;

                            let coll = collSoloSX || collSoloDX || collSALTO || collPiedeCX;
                            
                            if('tocco' in collisore){
                                if(coll || collPiedeSX || collPiedeDX){
                                    if(!('attivato' in collisore) || !collisore.attivato){
                                        collisore.attivato = collisore.tocco();
                                        collisoriToccati.add(collisore);
                                    }
                                } else {
                                    delete collisore.attivato;
                                }
                            } 
                        }
                    }
                }
            }
        }
    }

    precedenteToccati.forEach(collisore => {
        if('rilascio' in collisore && !collisoriToccati.has(collisore)){
            collisore.rilascio();
        }
    })


    precedenteToccati = collisoriToccati;

    
    collisoriDaTogliere.forEach(collisore => {
        togliCollisoreAQuadranti(collisore);
    });


    let deltaSpace = deltaTime * 200;

    if(collisioneLatoSX && collisioneLatoDX)
        velocini.stato.add("noMovimentoLaterale");
    else
        velocini.stato.delete("noMovimentoLaterale");

    if (collisioneSX && !(collisioneDX || collisioneSALTO)) {
        velocini.x = min(margineSX + 0.01, velocini.x + deltaSpace);
        velocini.vx = max(velocini.vx, 0);
    }
    if (collisioneDX && !(collisioneSX || collisioneSALTO)) {
        velocini.x = max(margineDX - velocini.w - 0.01, velocini.x - deltaSpace);
        velocini.vx = min(velocini.vx, 0);
    }

    if (collisioneSALTO) {
        velocini.y = min(margineSALTO, velocini.y + deltaSpace);
        velocini.vy = max(velocini.vy, 0);
    }

    if (collisioneGIU) {

        if(velocini.vy > -0.01){
            velocini.y = min(max(margineGIU - velocini.h, velocini.y - deltaSpace), 
                                margineGIU - (CE.y - velocini.y));
        }
    }
    
    if(collisionePiedeCX || (collisionePiedeSX && collisionePiedeDX) || collisioneGIU){
        const impatto = velocini.vy / MAX_CADUTA * 3;
        velocini.vy = min(velocini.vy, 0);

        if(velocini.frameSalto <= 0){
            if(!velocini.stato.has("atterrato"))
                suonaPasso(impatto);
            velocini.stato.add("atterrato");
        }
    }
    else if (velocini.stato.has("atterrato")) {
        velocini.stato.delete("atterrato");
        velocini.stato.add("cadenteDaPoco");
        velocini.tempoCoyote = COYOTE;
        if(!velocini.stato.has("scatto") && abs(velocini.vy) < FORZA_SALTO * 0.8){
            velocini.vy = velocini.vx * inclinazione;
            velocini.y += velocini.vy * deltaTime;
        }
    }

    if (collisioneFullSALTO && (collisionePiedeCX || (collisionePiedeSX && collisionePiedeDX))){
        if(collisionePartialSALTO){
            morte();
        }
        else{
            velocini.stato.add("abbassato");
            velocini.stato.add("incastrato");
            if(velocini.h != altezzaAbbassata){
                velocini.y += yAbbassata;
                velocini.h = altezzaAbbassata;
            }
        }
    }else{
        velocini.stato.delete("incastrato");
    }

    if(!collisionePiedeCX && !collisioneSALTO){
        if(collisioneSoloDX && !collisioneSX && !collisionePiedeSX){
            velocini.stato.add("pareteDX");
            velocini.frameParete = LUNGHEZZA_BUFFER_COMANDI;
        }

        if(collisioneSoloSX && !collisioneDX && !collisionePiedeDX){
            velocini.stato.add("pareteSX");
            velocini.frameParete = LUNGHEZZA_BUFFER_COMANDI;
        }
    }

    if(velocini.frameParete == 0){
        velocini.stato.delete("pareteDX");
        velocini.stato.delete("pareteSX");
    }
    
}

function muoviVelocini(deltaTime) {
    
    collisioni(deltaTime);

    let movLaterale = false;
    let modAria = 1;
    if(!velocini.stato.has("atterrato")){
        modAria = MODIFICATORE_IN_ARIA;
    }
    if(!velocini.stato.has("scatto")){
        

        if (controllaBuffer("SALTO", ATTIVATO | ATTIVO)) {
            if (controllaBuffer("SALTO", ATTIVATO) && (velocini.stato.has("atterrato") || velocini.stato.has("cadenteDaPoco"))) {
                salto();
            }
            else if (velocini.vy >= 0 || velocini.tempoSalto <= 0) {
                velocini.grav = GRAVITA;
            }
        }
        else {
            velocini.grav = GRAVITA;
        }
        if(velocini.stato.has("PW_saltomuro"))saltoAMuro();
        if (comandi.SALTO.stato == DISATTIVATO && velocini.vy < 0){
            velocini.vy = max(velocini.vy, velocini.vy / 
                map(velocini.vy, 0, -FORZA_SALTO, 1, 2));
        }

        if(velocini.stato.has("noMovimentoLaterale")){
            velocini.y -= ALTEZZA / 3;
        } else {
            if ((comandi.SX.stato & (ATTIVATO | ATTIVO)) && (comandi.DX.stato & (DISATTIVATO | INATTIVO))) {
                let acc = modAria * velocini.accel * deltaTime
                velocini.vx = max(velocini.vx - acc, -MAX_VELOCITA);
                if(velocini.vx > 0)
                    velocini.vx = max(velocini.vx - (velocini.stato.has("atterrato") ? MODIFICATORE_CAMBIO_DIREZIONE : MODIFICATORE_CAMBIO_DIREZIONE_IN_ARIA) * acc, -MAX_VELOCITA);
                movLaterale = true;
                velocini.orientazione = "sinistra";
            }
            if ((comandi.DX.stato & (ATTIVATO | ATTIVO)) && (comandi.SX.stato & (DISATTIVATO | INATTIVO))) {
                let acc = modAria * velocini.accel * deltaTime
                velocini.vx = min(velocini.vx + acc, MAX_VELOCITA);
                if(velocini.vx < 0)
                    velocini.vx = min(velocini.vx + (velocini.stato.has("atterrato") ? MODIFICATORE_CAMBIO_DIREZIONE : MODIFICATORE_CAMBIO_DIREZIONE_IN_ARIA) * acc, MAX_VELOCITA);
                movLaterale = true;
                velocini.orientazione = "destra";
            }
            //attrito
            if (velocini.stato.has("atterrato") && !movLaterale) {
                let segno = velocini.vx > velocini.pavimentoVx ? -1 : 1;
                velocini.vx += segno * min(deltaTime * velocini.attr, abs(velocini.pavimentoVx - velocini.vx));
            }
            if(velocini.stato.has("atterrato")){
                if(velocini.pavimentoVy > 0)
                    velocini.vy = velocini.pavimentoVy;
            }
        }

        
        if(velocini.stato.has("PW_scatto"))scatto();
        if(velocini.stato.has("PW_attivablocchi"))attivaBlocchi();
    }
    
    abbassamento();
    
    if(velocini.frameScatto == 0){
        if(velocini.stato.has("cooldown_scatto")){
            velocini.stato.delete("cooldown_scatto");
        }else if(velocini.stato.has("scatto")){
            velocini.stato.delete("scatto");
            velocini.stato.add("cooldown_scatto");
            velocini.frameScatto = COOLDOWN_SCATTO;
        }
    }

    let acc = velocini.grav * deltaTime / 2 * (comandi.GIU.stato & (ATTIVATO | ATTIVO) ? GRAVITA_DA_ABBASSATO : 1)
    velocini.vy += acc;
    velocini.vy = min(velocini.vy, MAX_CADUTA);
    if('pulsante' in velocini && velocini.pulsante != null){
        if(!velocini.pulsante.mobile || controllaBuffer("SALTO", ATTIVATO | ATTIVO))
            delete velocini.pulsante;
        else
            velocini.y = velocini.pulsante.vertici[velocini.indicePulsante].y + velocini.pulsante.y - velocini.h;
    }
    else if(!velocini.stato.has("scatto"))
        velocini.y += velocini.vy * deltaTime;
    velocini.vy += acc;
    velocini.x += velocini.vx * deltaTime;

    if(velocini.tempoSalto > 0)
        velocini.tempoSalto -= deltaTime;

    if (velocini.stato.has("cadenteDaPoco")) {
        velocini.tempoCoyote -= deltaTime;
        if (velocini.tempoCoyote <= 0) {
            velocini.stato.delete("cadenteDaPoco");
        }
    }
    velocini.frameParete = max(velocini.frameParete-1, 0);
    velocini.frameSalto = max(velocini.frameSalto-1, 0);
    velocini.frameScatto = max(velocini.frameScatto-1, 0);

}

function morte(){
    mostraMorto = DURATA_MORTE;
    ultimoCheckPointToccato = false;
    causatori.forEach(el => delete el.attivato);
    return true;
}

function abbassamento(){
    if (comandi.GIU.stato == ATTIVATO && !velocini.stato.has("abbassato")) {
        velocini.stato.add("abbassato");
        velocini.y += yAbbassata;
        velocini.h = altezzaAbbassata;
        
    } else if (comandi.GIU.stato != ATTIVO && velocini.stato.has("abbassato") && !velocini.stato.has("incastrato")){
        velocini.stato.delete("abbassato");
        velocini.y -= yAbbassata;
        velocini.h = ALTEZZA;
    }
}

function salto(){
    if(!velocini.stato.has("incastrato")){
        velocini.vy = -FORZA_SALTO;
        velocini.frameSalto = FRAME_IGNORA_SALTO;
        velocini.stato.delete("atterrato");
        velocini.stato.delete("cadenteDaPoco");
        velocini.grav = GRAVITA_SALTO;
        velocini.tempoSalto = MAX_DURATA_SALTO;
        suonaRandom(suonoSalto, 5, 0.5, 0.2);
    }
}

function saltoAMuro(){
    if(controllaBuffer("SALTO", ATTIVATO) && velocini.frameSalto <= 0)
        if(velocini.stato.has("pareteDX") || velocini.stato.has("pareteSX")){
            salto();
            velocini.tempoSalto = 0;
            velocini.frameSalto = 1;
            velocini.vx = FORZA_SALTO * (velocini.stato.has("pareteDX") ? -1 : 1);
            velocini.orientazione = velocini.stato.has("pareteDX") ? "sinistra" : "destra";
            velocini.stato.delete("pareteDX");
            velocini.stato.delete("pareteSX");
        }
}

function scatto(){
    if(comandi.SCATTO.stato == ATTIVATO && !velocini.stato.has("cooldown_scatto")){
        velocini.vx = (velocini.orientazione == "destra" ? 1 : -1) * VELOCITA_SCATTO;
        velocini.vy = 0;
        velocini.frameScatto = DURATA_SCATTO;
        velocini.stato.add("scatto");
    }
}

function attivaBlocchi(){
    if(comandi.ATTIVA_BLOCCHI.stato === ATTIVATO){
        for(collisore of collisori){
            if(collisore.scomparibile){
                collisore.scomparso = !collisore.scomparso;
            }
        }
    }
}

function resettaVelocini(){
    velocini.grav = GRAVITA;
    if(velocini.stato.has("abbassato")){
        velocini.stato.delete("abbassato");
        velocini.y -= yAbbassata;
        velocini.h = ALTEZZA;
    }
    if(velocini.stato.has("scatto"))
        velocini.stato.delete("scatto");
    velocini.frameSalto = 0;
    velocini.frameParete = 0;
    velocini.frameScatto = 0;
}