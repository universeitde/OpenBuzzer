const connStatus = document.getElementById('connStatus');
const actionDisplay = document.getElementById('actionDisplay');

let lastKnobVal = -1;
let actionTimeout = null;
let isClicking = false;

// Helper: Zeige temporäre Aktion an
function showAction(text, color = "#fff") {
    actionDisplay.innerText = text;
    actionDisplay.style.color = color;

    // Nach Inaktivität zurück zu "Ready"
    if (actionTimeout) clearTimeout(actionTimeout);
    actionTimeout = setTimeout(() => {
        actionDisplay.innerText = "Ready";
        actionDisplay.style.color = "#888";
    }, 1000);
}

// Status-Updates empfangen
window.api.onStatus((status) => {
    if (status.connected) {
        connStatus.innerText = "● Connected to TimeBuzzer";
        connStatus.style.color = "#28a745"; // Bootstrap Green
        actionDisplay.innerText = "Ready";
    } else {
        connStatus.innerText = "○ Disconnected";
        connStatus.style.color = "#d9534f";
    }
});

// Status-Logik (im Hintergrund)
let isInitializing = false;

// Control Switches holen
const getSwitches = () => [
    document.getElementById('chkAutostart'),
    document.getElementById('chkLed'),
    document.getElementById('chkMedia')
];

window.api.onStatus((msg) => {
    // Status-Logik (nur im Hintergrund)
    if (msg === 'initializing') {
        isInitializing = true;
        getSwitches().forEach(sw => { if (sw) sw.disabled = true; });

    } else if (msg === 'ready') {
        isInitializing = false;
        getSwitches().forEach(sw => { if (sw) sw.disabled = false; });
    }
});

// MIDI-Events empfangen (Logik + Text-Update)
window.api.onMidi((msg) => {
    // CC 80 = Knob
    if (msg.cc === 80) {
        if (lastKnobVal !== -1) {
            let delta = msg.val - lastKnobVal;
            // Wrap-around behandeln (127->0 oder 0->127)
            if (delta < -64) delta += 128; // Wrapped right (0 -> 127 ist riesiger negativer Wert)
            else if (delta > 64) delta -= 128; // Wrapped left (127 -> 0 ist riesiger positiver Wert)

            if (delta > 0) showAction("Turning Right ⟳", "#a36be8");
            else if (delta < 0) showAction("Turning Left ⟲", "#a36be8");
        }
        lastKnobVal = msg.val;
    }
    // CC 81 = Touch (Idle=127, Touch=0)
    else if (msg.cc === 81) {
        if (isClicking) return; // Touch ignorieren wenn gerade geklickt wird

        const isTouched = (msg.val < 64);
        if (isTouched) showAction("Touched ⭘", "#0078d4");
    }
    // CC 82 = Click
    else if (msg.cc === 82) {
        const isClicked = (msg.val > 64);
        if (isClicked) {
            isClicking = true;
            showAction("Clicked ●", "#fff");
        } else {
            isClicking = false;
        }
    }
});

// Autostart-Logik
window.api.onAutostart((enabled) => {
    document.getElementById('chkAutostart').checked = enabled;
});

// Animation-Liste Logik
window.api.onAnimationsList((list) => {
    const grid = document.getElementById('animGrid');
    grid.innerHTML = ''; // Header löschen
    list.forEach(anim => {
        const btn = document.createElement('fluent-button');
        btn.innerText = anim.name;
        btn.onclick = () => playAnim(anim.id);
        // CSS für .anim-grid fluent-button ist bereits vorhanden
        grid.appendChild(btn);
    });
});

// Beim Start abfragen
window.api.getAutostart();
window.api.getAnimations();

function toggleAutostart() {
    const enabled = document.getElementById('chkAutostart').checked;
    window.api.setAutostart(enabled);
}

window.api.onConfigUpdated((config) => {
    if (config.ledEnabled !== undefined) document.getElementById('chkLed').checked = config.ledEnabled;
    if (config.mediaEnabled !== undefined) document.getElementById('chkMedia').checked = config.mediaEnabled;
});

// Settings-Logik
function updateConfig() {
    const config = {
        ledEnabled: document.getElementById('chkLed').checked,
        mediaEnabled: document.getElementById('chkMedia').checked
    };
    window.api.setConfig(config);
}

// Animation starten
function playAnim(type) {
    // TODO: Visuell LED-Checkbox deaktivieren?
    window.api.startAnim(type);
}

// Manuelle Farbe (Presets)
function updateColor(hex) {
    // Hex zu RGB konvertieren
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    sendColor(r, g, b);
}

// Manuelle Farbe (Hue Slider)
function updateHue(hue) {
    const h = parseInt(hue) / 360;
    const s = 1.0;
    const l = 0.5;

    // HSL zu RGB
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    sendColor(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));

    // Preview-Thumb-Farbe aktualisieren? Naja, ist weiß, passt schon.
    // Preset-Selection-State aktualisieren? (Optional)
}

function sendColor(r, g, b) {
    // 0-255 auf 0-127 für MIDI skalieren
    const mR = Math.floor(r / 2);
    const mG = Math.floor(g / 2);
    const mB = Math.floor(b / 2);
    window.api.setManualColor({ r: mR, g: mG, b: mB });
}

function updateBrightness(val) {
    window.api.setBrightness(parseInt(val, 10));
}

function updateSpeed(val) {
    window.api.setSpeed(parseInt(val, 10));
}
