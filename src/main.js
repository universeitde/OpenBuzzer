const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const JZZ = require('jzz');
const fs = require('fs');

// Config - MIDI Channel und Device Name
const DEVICE_NAME = "TimeBuzzer";
const CH_INPUT = 11; // 0xB
const CH_OUTPUT = 11; // 0xB

// LED Zonen - jede Zone hat ihre eigenen MIDI CCs für R, G, B
const ZONES = [
    { id: 0, r: 70, g: 71, b: 72 }, // Zone 1 (Links)
    { id: 1, r: 73, g: 74, b: 75 }, // Zone 2 (Mitte/Vorne)
    { id: 2, r: 76, g: 77, b: 78 }  // Zone 3 (Rechts)
];

// Globale State-Variablen
let mainWindow;
let midiOut = null;
let lastKnobVal = -1;
let isTouched = false;
let lastTouchState = false; // State-Änderungen tracken, damit wir kein Flickern bekommen
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

let config = {
    ledEnabled: false, // Standard: AUS
    mediaEnabled: false,
    brightness: 100, // 0-100
    globalSpeed: 100 // 10-200 (Prozent der Basis-Geschwindigkeit)
};

// Config laden beim Start
try {
    if (fs.existsSync(CONFIG_PATH)) {
        const data = fs.readFileSync(CONFIG_PATH);
        config = { ...config, ...JSON.parse(data) };
        console.log("Config geladen:", config);
    }
} catch (e) {
    console.error("Fehler beim Laden der Config:", e);
}

function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (e) {
        console.error("Fehler beim Speichern der Config:", e);
    }
}

let currentAnimInterval = null;

// LED Helper-Funktionen
function clamp(val) {
    // MIDI-Werte müssen zwischen 0 und 127 sein
    return Math.max(0, Math.min(127, Math.round(val)));
}

function setZone(zoneIdx, r, g, b) {
    if (!midiOut) return;
    const z = ZONES[zoneIdx];

    // Helligkeit anwenden
    const brightnessFactor = config.brightness / 100;
    const finalR = clamp(r * brightnessFactor);
    const finalG = clamp(g * brightnessFactor);
    const finalB = clamp(b * brightnessFactor);

    midiOut.control(CH_OUTPUT, z.r, finalR);
    midiOut.control(CH_OUTPUT, z.g, finalG);
    midiOut.control(CH_OUTPUT, z.b, finalB);
}

function setRGB(r, g, b) {
    if (!midiOut) return;
    // Alle Zonen auf die gleiche Farbe setzen
    ZONES.forEach((z, idx) => setZone(idx, r, g, b));
}

// Interaktive Animationen - werden bei Touch/Knob/Click getriggert
let interactionInterval = null;

function lerp(start, end, t) {
    // Lineare Interpolation zwischen zwei Werten
    return start + (end - start) * t;
}

function triggerInteraction(type) {
        if (!config.ledEnabled) return;
        stopAnimation(); // Aktive Animation stoppen
        if (interactionInterval) clearInterval(interactionInterval);

        let frame = 0;
        // Geschwindigkeit auch auf Interaktionen anwenden
        const speedFactor = (config.globalSpeed || 100) / 100;
        const interval = 25 / speedFactor;

        if (type === 'right') {
            // Smooth Wipe von Links nach Rechts
            interactionInterval = setInterval(() => {
                frame++;
                const pos = frame * 0.4; // Langsamere Progression für smoothness

                // Breitere Gradienten für weichen "Cloud"-Effekt
                const z1 = clamp(127 - Math.abs(pos - 1) * 35);
                const z2 = clamp(127 - Math.abs(pos - 3) * 35);
                const z3 = clamp(127 - Math.abs(pos - 5) * 35);

                setZone(0, z1, clamp(z1 * 0.3), 0); // Sanftes Orange
                setZone(1, z2, clamp(z2 * 0.3), 0);
                setZone(2, z3, clamp(z3 * 0.3), 0);

                if (frame > 40) { clearInterval(interactionInterval); setRGB(0, 0, 0); }
            }, interval);
        }
        else if (type === 'left') {
            // Smooth Wipe von Rechts nach Links
            interactionInterval = setInterval(() => {
                frame++;
                const pos = frame * 0.4;

                const z3 = clamp(127 - Math.abs(pos - 1) * 35);
                const z2 = clamp(127 - Math.abs(pos - 3) * 35);
                const z1 = clamp(127 - Math.abs(pos - 5) * 35);

                setZone(2, 0, z3, z3); // Sanftes Cyan
                setZone(1, 0, z2, z2);
                setZone(0, 0, z1, z1);

                if (frame > 40) { clearInterval(interactionInterval); setRGB(0, 0, 0); }
            }, interval);
        }
        else if (type === 'touch') {
            // Schneller Fade-In in Lila + subtiler Pulse
            interactionInterval = setInterval(() => {
                frame++;
                const t = Math.min(1, frame / (8 / speedFactor)); // Schneller: 8 Frames statt 10

                if (t < 1) {
                    // Fade in
                    const r = clamp(lerp(0, 90, t));
                    const g = 0;
                    const b = clamp(lerp(0, 127, t));
                    setRGB(r, g, b);
                } else {
                    // Sanfter Pulse während gehalten
                    const pulse = Math.sin((frame - (8 / speedFactor)) * 0.15 * speedFactor) * 15 + 112; // Pulse zwischen 97-127
                    setRGB(90, 0, clamp(pulse));
                }
            }, 20 / speedFactor);
        }
        else if (type === 'release') {
            // Schneller Fade Out
            interactionInterval = setInterval(() => {
                frame++;
                const t = Math.min(1, frame / (15 / speedFactor));
                const r = clamp(lerp(90, 0, t));
                const g = 0;
                const b = clamp(lerp(127, 0, t));
                setRGB(r, g, b);
                if (t >= 1) clearInterval(interactionInterval);
            }, 18 / speedFactor);
        }
        else if (type === 'click') {
            // Weißer Flash -> Fade zu Grün
            interactionInterval = setInterval(() => {
                frame++;
                if (frame < 5) {
                    setRGB(127, 127, 127); // Flash (helles Weiß im MIDI-Bereich)
                } else {
                    const t = Math.min(1, (frame - 5) / 20);
                    const r = clamp(lerp(127, 0, t));
                    const g = 127; // Bleibt grün
                    const b = clamp(lerp(127, 0, t));
                    setRGB(r, g, b);
                    if (t >= 1) {
                        clearInterval(interactionInterval);
                        setTimeout(() => { setRGB(0, 0, 0); }, 200 / speedFactor);
                    }
                }
            }, 20 / speedFactor);
        }
}

// Initialisierungs-Animation beim Start
let initAnimInterval = null;

function runInitialization() {
        if (initAnimInterval) clearInterval(initAnimInterval);

        // UI benachrichtigen
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('status', 'initializing');
        }

        let tick = 0;
        const TOTAL_DURATION = 300; // 7.5 Sekunden (300 * 25ms) für sanfteren Effekt
        const INTERVAL = 25;

        // Sanfter Pastell-Farbverlauf (weniger gesättigt, wärmer)
        const rainbow = (offset) => {
            const progress = tick / TOTAL_DURATION;
            const hue = (progress * 2 + offset) % 1; // Langsamere Farbverschiebung (2 Loops statt 3)
            const h = hue * 6;
            const x = 1 - Math.abs((h % 2) - 1);
            let r, g, b;
            if (h < 1) { r = 1; g = x; b = 0; }
            else if (h < 2) { r = x; g = 1; b = 0; }
            else if (h < 3) { r = 0; g = 1; b = x; }
            else if (h < 4) { r = 0; g = x; b = 1; }
            else if (h < 5) { r = x; g = 0; b = 1; }
            else { r = 1; g = 0; b = x; }

            // Sanftere Sättigung
            const softR = Math.floor(r * 100 + 27); // Basis-Wärme hinzufügen
            const softG = Math.floor(g * 100 + 27);
            const softB = Math.floor(b * 100 + 27);

            return [softR, softG, softB];
        };

        // Smooth cubic ease-in-out Helligkeitskurve
        const easeInOutCubic = (t) => {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const zoneBrightness = (zoneIdx) => {
            const progress = tick / TOTAL_DURATION;
            const stagger = zoneIdx * 0.15; // Weniger Stagger für zusammenhängenden Flow
            const localProgress = (progress - stagger) / 0.7; // Über 70% der Timeline verteilen
            if (localProgress < 0 || localProgress > 1) return 0;

            // Cubic easing für sehr smooth Fade
            return easeInOutCubic(Math.sin(localProgress * Math.PI));
        };

        initAnimInterval = setInterval(() => {
            tick++;

            if (tick <= TOTAL_DURATION) {
                ZONES.forEach((z, idx) => {
                    const brightness = zoneBrightness(idx) * 0.6; // Max 60% Helligkeit (sanfter)
                    const [r, g, b] = rainbow(idx * 0.1);
                    setZone(idx,
                        Math.floor(r * brightness),
                        Math.floor(g * brightness),
                        Math.floor(b * brightness)
                    );
                });
            } else if (tick <= TOTAL_DURATION + 80) {
                // Sanfter Fade Out zu warmem Aus
                const fadeProgress = (tick - TOTAL_DURATION) / 80;
                const fadeOut = 1 - easeInOutCubic(fadeProgress);
                ZONES.forEach((z, idx) => {
                    setZone(idx,
                        Math.floor(60 * fadeOut),
                        Math.floor(40 * fadeOut),
                        Math.floor(80 * fadeOut) // Sanfter Lila-Fade
                    );
                });
            } else {
                // Fertig
                clearInterval(initAnimInterval);
                initAnimInterval = null;
                setRGB(0, 0, 0);
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('status', 'ready');
                }
            }
        }, INTERVAL);
}

// Plugin-System für Animationen
const animPlugins = new Map();
const PLUGINS_DIR = path.join(__dirname, '../plugins/animations');

function loadAnimations() {
        if (!fs.existsSync(PLUGINS_DIR)) {
            console.log("Plugins-Verzeichnis nicht gefunden, erstelle es...");
            fs.mkdirSync(PLUGINS_DIR, { recursive: true });
            return;
        }

        const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'));
        files.forEach(file => {
            // welcome.js überspringen - ist jetzt built-in
            if (file === 'welcome.js') {
                console.log(`Überspringe built-in Animation: ${file}`);
                return;
            }

            const fullPath = path.join(PLUGINS_DIR, file);
            try {
                // Cache löschen für Hot-Reload
                delete require.cache[require.resolve(fullPath)];
                const anim = require(fullPath);
                const id = file.replace('.js', '');
                animPlugins.set(id, {
                    id,
                    name: anim.name || id,
                    interval: anim.interval || 50,
                    tick: anim.tick
                });
                console.log(`Animation geladen: ${anim.name || id} (${id})`);
            } catch (e) {
                console.error(`Fehler beim Laden der Animation ${file}:`, e);
            }
        });
}

function stopAnimation() {
    if (currentAnimInterval) {
        clearInterval(currentAnimInterval);
        currentAnimInterval = null;
    }
}

let activeAnimName = 'none';

function startAnimation(type) {
        stopAnimation();
        config.ledEnabled = false;

        // Plugins bei jedem Start neu laden für Hot-Reload
        // TODO: Vielleicht optional machen? Performance-Check?
        loadAnimations();

        const plugin = animPlugins.get(type);

        if (plugin) {
            let tick = 0;
            // Globale Geschwindigkeit anwenden
            const baseInterval = plugin.interval || 50;
            const speedFactor = (config.globalSpeed || 100) / 100; // 100->1.0, 200->2.0
            const realInterval = Math.max(10, baseInterval / speedFactor);

            console.log(`Starte ${type} @ ${realInterval.toFixed(1)}ms (Speed: ${config.globalSpeed}%)`);
            activeAnimName = type;

            currentAnimInterval = setInterval(() => {
                try {
                    // Plugin-Signatur: tick(ZONES, setZone, frame)
                    plugin.tick(ZONES, setZone, tick);
                    tick++;
                } catch (e) {
                    console.error(`Fehler in Animation ${type}:`, e);
                    stopAnimation();
                }
            }, realInterval);
        } else {
        console.warn(`Animation ${type} nicht gefunden!`);
    }
}

// MIDI-Logik
function startMidi() {
        JZZ().or(function () {
            console.log('MIDI-Engine kann nicht gestartet werden!');
        }).and(function () {
            const info = this.info();
            const inName = info.inputs.find(x => x.name.toLowerCase().includes(DEVICE_NAME.toLowerCase()))?.name;
            const outName = info.outputs.find(x => x.name.toLowerCase().includes(DEVICE_NAME.toLowerCase()))?.name;

            if (outName) {
                midiOut = this.openMidiOut(outName);
                console.log("MIDI Output geöffnet.");
            }

            if (inName) {
                this.openMidiIn(inName).connect(handleMidiMessage);
            }

            // UI benachrichtigen
            if (mainWindow) {
                mainWindow.webContents.send('status', {
                    connected: !!(inName && outName),
                    inName, outName
                });
            }
        });
}

// Media-Key Handler mit niedriger Latenz (Persistenter PowerShell-Prozess)
const { spawn } = require('child_process');
let psProc = null;

function initMediaKeys() {
        if (psProc) return;

        // Persistenten PowerShell-Prozess starten
        psProc = spawn('powershell', ['-NoProfile', '-Command', '-'], {
            stdio: ['pipe', 'ignore', 'ignore'], // Nur stdin brauchen wir
            windowsHide: true
        });

        // Bei unerwartetem Exit neu starten
        psProc.on('exit', () => { psProc = null; });
        psProc.on('error', () => { psProc = null; });

        // C# P/Invoke Definition einmalig injizieren
        const def = `Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class K { [DllImport("user32.dll")] public static extern void keybd_event(byte b, byte s, uint f, int e); }'`;
        psProc.stdin.write(def + "\n");
    }

    function sendMediaKey(vkCode) {
        if (!psProc) initMediaKeys();

        // Kommando direkt an laufenden Prozess senden
        // 0xB0=Next(176), 0xB1=Prev(177), 0xB3=Play(179)
        // keybd_event(vk, 0, 0, 0) -> Press
        // keybd_event(vk, 0, 2, 0) -> Release
        const cmd = `[K]::keybd_event(${vkCode},0,0,0); [K]::keybd_event(${vkCode},0,2,0)\n`;
        try {
            psProc.stdin.write(cmd);
        } catch (e) {
            // Wenn Pipe geschlossen, neu starten
            psProc = null;
            initMediaKeys();
        }
}

function handleMidiMessage(msg) {
        // setImmediate nutzen, um vom nativen MIDI-Callback-Thread zu entkoppeln
        setImmediate(() => {
            const status = msg[0] & 0xF0;
            const ch = msg[0] & 0x0F;
            const d1 = msg[1];
            const d2 = msg[2];

            if (ch !== CH_INPUT || status !== 0xB0) return;

            // RAW-Daten an UI senden für Visualisierung
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('midi-event', { cc: d1, val: d2 });
            }

            // --- LOGIK ---

            // KNOB (80)
            if (d1 === 80) {
                if (lastKnobVal === -1) { lastKnobVal = d2; return; }
                const delta = d2 - lastKnobVal;
                if (delta !== 0) {
                    let dir = delta > 0 ? 1 : -1;
                    // Wrap-around behandeln
                    if (delta < -64) dir = 1;
                    else if (delta > 64) dir = -1;

                    // Interaktive Animation (Richtung getauscht für korrekte Visualisierung)
                    if (config.ledEnabled) {
                        if (dir > 0) triggerInteraction('left');  // Rechts drehen -> visuell Rechts-nach-Links
                        else triggerInteraction('right'); // Links drehen -> visuell Links-nach-Rechts
                    }

                    // Media Control
                    if (config.mediaEnabled) {
                        if (dir > 0) sendMediaKey(0xB0); // Rechts = Next
                        else sendMediaKey(0xB1); // Links = Previous
                    }
                }
                lastKnobVal = d2;
            }
            // TOUCH (81) - Active Low
            else if (d1 === 81) {
                const touched = (d2 < 64);

                // Nur bei State-ÄNDERUNG Animation triggern, um Flickern zu vermeiden
                if (touched !== lastTouchState) {
                    lastTouchState = touched;
                    isTouched = touched;

                    if (config.ledEnabled) {
                        if (touched) triggerInteraction('touch');
                        else triggerInteraction('release');
                    }
                }
            }
            // CLICK (82)
            else if (d1 === 82) {
                const clicked = (d2 > 64);
                if (clicked) {
                    if (config.mediaEnabled) sendMediaKey(0xB3);
                    if (config.ledEnabled) triggerInteraction('click');
                }
            }
        }); // Ende setImmediate
}

// Electron App Setup
function createWindow() {
        mainWindow = new BrowserWindow({
            width: 700,
            height: 500,
            frame: false,
            transparent: true,
            resizable: true,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false,
                contextIsolation: true
            }
        });

        mainWindow.loadFile(path.join(__dirname, 'index.html'));

        mainWindow.webContents.on('did-finish-load', () => {
            mainWindow.webContents.send('status', 'connecting');
            mainWindow.webContents.send('config-updated', config);
            mainWindow.webContents.send('animations-list', Array.from(animPlugins.values()).map(p => ({ id: p.id, name: p.name })));

            // Initialisierung starten NACH dem Window ready ist
            if (midiOut) {
                runInitialization();
            }
        });
}

app.whenReady().then(() => {
    createWindow();
    initMediaKeys(); // PowerShell vorladen

    // App User Model ID für Windows setzen
    app.setAppUserModelId("com.openbuzzer.app");
    startMidi();
});

// Funktion zum Ausschalten aller LEDs
function turnOffAllLeds() {
    // Stoppe alle Animationen
    stopAnimation();
    if (interactionInterval) {
        clearInterval(interactionInterval);
        interactionInterval = null;
    }
    if (initAnimInterval) {
        clearInterval(initAnimInterval);
        initAnimInterval = null;
    }
    
    // Schalte alle Zonen aus
    if (midiOut) {
        setRGB(0, 0, 0);
        // Zusätzlich: Stelle sicher, dass wirklich alle Zonen aus sind
        ZONES.forEach((z, idx) => {
            setZone(idx, 0, 0, 0);
        });
    }
}

app.on('before-quit', (event) => {
    // LEDs vor dem Schließen ausschalten
    turnOffAllLeds();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        turnOffAllLeds();
        app.quit();
    }
});

// IPC Handler für Renderer-Kommunikation
ipcMain.on('set-config', (event, newConfig) => {
    config = { ...config, ...newConfig };
    saveConfig(); // Änderungen persistieren
    console.log("Config aktualisiert:", config);
});

ipcMain.on('manual-color', (event, rgb) => {
    stopAnimation(); // Aktive Animation stoppen
    // LED temporär überschreiben
    config.ledEnabled = false; // Auto-React deaktivieren
    setRGB(rgb.r, rgb.g, rgb.b);
});

ipcMain.on('enable-auto-led', () => {
    config.ledEnabled = true;
    stopAnimation();
});

ipcMain.on('start-anim', (event, type) => startAnimation(type));

ipcMain.on('get-animations', (event) => {
    // Falls leer (Renderer vor Main init geladen), versuchen zu laden
    if (animPlugins.size === 0) loadAnimations();

    const list = [];
    animPlugins.forEach((plugin, id) => {
        list.push({ id, name: plugin.name });
    });
    event.reply('animations-list', list);
});

// Autostart
ipcMain.on('get-autostart-config', (event) => {
    const settings = app.getLoginItemSettings();
    event.reply('autostart-config', settings.openAtLogin);
});

ipcMain.on('set-autostart-config', (event, enable) => {
    app.setLoginItemSettings({
        openAtLogin: enable,
        path: app.getPath('exe') // Optional, aber sicher
    });
});

ipcMain.on('set-brightness', (event, val) => {
    config.brightness = val;
    saveConfig();
    // TODO: Falls statische Farbe aktiv ist, könnte man hier neu anwenden
});

ipcMain.on('set-speed', (event, val) => {
    config.globalSpeed = val;
    saveConfig();
    // Aktive Animation neu starten, falls läuft
    if (activeAnimName && activeAnimName !== 'none') {
        startAnimation(activeAnimName);
    }
});

ipcMain.on('app-close', () => {
    turnOffAllLeds();
    app.quit();
});
ipcMain.on('app-minimize', () => mainWindow.minimize());
