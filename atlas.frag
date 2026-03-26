precision mediump float;

varying vec2 vTexCoord;
uniform sampler2D uTexture;
uniform vec4 uSubRect; 
uniform vec2 uRepeat;
uniform vec4 uColor;
uniform vec2 uTexSize; 
uniform vec2 uWrapMode; // NOVITÀ: [1.0 = Ripeti (Fract), 0.0 = Blocca (Clamp)]

void main() {
    vec2 repeated = vTexCoord * uRepeat;
    vec2 localUV;
    
    // Assegniamo il comportamento indipendente per X e Y
    localUV.x = (uWrapMode.x > 0.5) ? fract(repeated.x) : clamp(repeated.x, 0.0, 1.0);
    localUV.y = (uWrapMode.y > 0.5) ? fract(repeated.y) : clamp(repeated.y, 0.0, 1.0);
    
    // Calcolo della posizione sull'atlas
    vec2 atlasUV = uSubRect.xy + (localUV * uSubRect.zw);
    
    // Barriera di contenimento assoluta (l'inset di mezzo pixel)
    vec2 halfPixel = 0.5 / uTexSize;
    vec2 minBounds = uSubRect.xy + halfPixel;
    vec2 maxBounds = uSubRect.xy + uSubRect.zw - halfPixel;
    atlasUV = clamp(atlasUV, minBounds, maxBounds);
    
    // Il parametro -100.0 spegne l'anti-aliasing dei mipmap (se supportato)
    gl_FragColor = texture2D(uTexture, atlasUV, -100.0) * uColor;
}