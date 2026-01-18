const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const JZZ = require('jzz');
const fs = require('fs');

// --- CONFIG ---
const DEVICE_NAME = "TimeBuzzer";
const CH_INPUT = 11; // 0xB
const CH_OUTPUT = 11; // 0xB

// --- ZONES ---
const ZONES = [
    { id: 0, r: 70, g: 71, b: 72 }, // Zone 1 (Left)
    { id: 1, r: 73, g: 74, b: 75 }, // Zone 2 (Center/Front)
    { id: 2, r: 76, g: 77, b: 78 }  // Zone 3 (Right)
];

// State
let mainWindow;
let midiOut = null;
let lastKnobVal = -1;
let isTouched = false;
let lastTouchState = false; // Track state changes to prevent flicker
const CONFIG_PATH = path.join(app.getPath('userData'), 'config.json');

let config = {
    ledEnabled: false, // Default OFF
    mediaEnabled: false,
    brightness: 100, // 0-100
    globalSpeed: 100 // 10-200 (Percent of base speed)
};

// Load Config
try {
    if (fs.existsSync(CONFIG_PATH)) {
        const data = fs.readFileSync(CONFIG_PATH);
        config = { ...config, ...JSON.parse(data) };
        console.log("Config loaded:", config);
    }
} catch (e) {
    console.error("Failed to load config:", e);
}

function saveConfig() {
    try {
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    } catch (e) {
        console.error("Failed to save config:", e);
    }
}

let currentAnimInterval = null;

// --- LED HELPERS ---
function clamp(val) {
    return Math.max(0, Math.min(127, Math.round(val)));
}

function setZone(zoneIdx, r, g, b) {
    if (!midiOut) return;
    const z = ZONES[zoneIdx];

    // Apply Brightness
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
    // Set all zones
    ZONES.forEach((z, idx) => setZone(idx, r, g, b));
}

// --- INTERACTIVE ANIMATIONS ---
let interactionInterval = null;

function lerp(start, end, t) {
    return start + (end - start) * t;
}

function triggerInteraction(type) {
        if (!config.ledEnabled) return;
        stopAnimation(); // Stop any background loop
        if (interactionInterval) clearInterval(interactionInterval);

        let frame = 0;
        // Apply speed to interaction too
        const speedFactor = (config.globalSpeed || 100) / 100;
        const interval = 25 / speedFactor;

        if (type === 'right') {
            // SMOOTH WIPE Left -> Right
            interactionInterval = setInterval(() => {
                frame++;
                const pos = frame * 0.4; // Slower progression for smoothness

                // Wider gradients (35 instead of 75) for soft "cloud" wipe
                const z1 = clamp(127 - Math.abs(pos - 1) * 35);
                const z2 = clamp(127 - Math.abs(pos - 3) * 35);
                const z3 = clamp(127 - Math.abs(pos - 5) * 35);

                setZone(0, z1, clamp(z1 * 0.3), 0); // Soft Orange
                setZone(1, z2, clamp(z2 * 0.3), 0);
                setZone(2, z3, clamp(z3 * 0.3), 0);

                if (frame > 40) { clearInterval(interactionInterval); setRGB(0, 0, 0); }
            }, interval);
        }
        else if (type === 'left') {
            // SMOOTH WIPE Right -> Left
            interactionInterval = setInterval(() => {
                frame++;
                const pos = frame * 0.4;

                const z3 = clamp(127 - Math.abs(pos - 1) * 35);
                const z2 = clamp(127 - Math.abs(pos - 3) * 35);
                const z1 = clamp(127 - Math.abs(pos - 5) * 35);

                setZone(2, 0, z3, z3); // Soft Cyan
                setZone(1, 0, z2, z2);
                setZone(0, 0, z1, z1);

                if (frame > 40) { clearInterval(interactionInterval); setRGB(0, 0, 0); }
            }, interval);
        }
        else if (type === 'touch') {
            // Faster Fade In Purple + Subtle Pulse
            interactionInterval = setInterval(() => {
                frame++;
                const t = Math.min(1, frame / (8 / speedFactor)); // Faster: 8 frames instead of 10

                if (t < 1) {
                    // Fade in
                    const r = clamp(lerp(0, 90, t));
                    const g = 0;
                    const b = clamp(lerp(0, 127, t));
                    setRGB(r, g, b);
                } else {
                    // Gentle pulse while held
                    const pulse = Math.sin((frame - (8 / speedFactor)) * 0.15 * speedFactor) * 15 + 112; // Pulse between 97-127
                    setRGB(90, 0, clamp(pulse));
                }
            }, 20 / speedFactor); // Apply global speed
        }
        else if (type === 'release') {
            // Fast Fade Out
            interactionInterval = setInterval(() => {
                frame++;
                const t = Math.min(1, frame / (15 / speedFactor)); // Slightly faster
                const r = clamp(lerp(90, 0, t));
                const g = 0;
                const b = clamp(lerp(127, 0, t));
                setRGB(r, g, b);
                if (t >= 1) clearInterval(interactionInterval);
            }, 18 / speedFactor); // Apply global speed
        }
        else if (type === 'click') {
            // White Flash -> Fade Green
            interactionInterval = setInterval(() => {
                frame++;
                if (frame < 5) {
                    setRGB(127, 127, 127); // Flash (bright white in MIDI range)
                } else {
                    const t = Math.min(1, (frame - 5) / 20);
                    const r = clamp(lerp(127, 0, t));
                    const g = 127; // Stay green
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

// --- BUILT-IN INITIALIZATION ANIMATION ---
let initAnimInterval = null;

function runInitialization() {
        if (initAnimInterval) clearInterval(initAnimInterval);

        // Notify UI
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('status', 'initializing');
        }

        let tick = 0;
        const TOTAL_DURATION = 300; // 7.5 seconds (300 * 25ms) for gentler feel
        const INTERVAL = 25;

        // Soft pastel color flow (less saturated, warmer)
        const rainbow = (offset) => {
            const progress = tick / TOTAL_DURATION;
            const hue = (progress * 2 + offset) % 1; // Slower color shift (2 loops instead of 3)
            const h = hue * 6;
            const x = 1 - Math.abs((h % 2) - 1);
            let r, g, b;
            if (h < 1) { r = 1; g = x; b = 0; }
            else if (h < 2) { r = x; g = 1; b = 0; }
            else if (h < 3) { r = 0; g = 1; b = x; }
            else if (h < 4) { r = 0; g = x; b = 1; }
            else if (h < 5) { r = x; g = 0; b = 1; }
            else { r = 1; g = 0; b = x; }

            // Softer saturation
            const softR = Math.floor(r * 100 + 27); // Add base warmth
            const softG = Math.floor(g * 100 + 27);
            const softB = Math.floor(b * 100 + 27);

            return [softR, softG, softB];
        };

        // Smooth cubic ease-in-out brightness curve
        const easeInOutCubic = (t) => {
            return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        };

        const zoneBrightness = (zoneIdx) => {
            const progress = tick / TOTAL_DURATION;
            const stagger = zoneIdx * 0.15; // Less stagger for cohesive flow
            const localProgress = (progress - stagger) / 0.7; // Spread over 70% of timeline
            if (localProgress < 0 || localProgress > 1) return 0;

            // Cubic easing for VERY smooth fade
            return easeInOutCubic(Math.sin(localProgress * Math.PI));
        };

        initAnimInterval = setInterval(() => {
            tick++;

            if (tick <= TOTAL_DURATION) {
                ZONES.forEach((z, idx) => {
                    const brightness = zoneBrightness(idx) * 0.6; // Max 60% brightness (softer)
                    const [r, g, b] = rainbow(idx * 0.1);
                    setZone(idx,
                        Math.floor(r * brightness),
                        Math.floor(g * brightness),
                        Math.floor(b * brightness)
                    );
                });
            } else if (tick <= TOTAL_DURATION + 80) {
                // Gentle fade out to warm off
                const fadeProgress = (tick - TOTAL_DURATION) / 80;
                const fadeOut = 1 - easeInOutCubic(fadeProgress);
                ZONES.forEach((z, idx) => {
                    setZone(idx,
                        Math.floor(60 * fadeOut),
                        Math.floor(40 * fadeOut),
                        Math.floor(80 * fadeOut) // Soft purple fade
                    );
                });
            } else {
                // Done
                clearInterval(initAnimInterval);
                initAnimInterval = null;
                setRGB(0, 0, 0);
                if (mainWindow && !mainWindow.isDestroyed()) {
                    mainWindow.webContents.send('status', 'ready');
                }
            }
        }, INTERVAL);
}

// --- ANIMATIONS PLUGIN SYSTEM ---
const animPlugins = new Map();
const PLUGINS_DIR = path.join(__dirname, '../plugins/animations');

function loadAnimations() {
        if (!fs.existsSync(PLUGINS_DIR)) {
            console.log("Plugins directory not found, creating...");
            fs.mkdirSync(PLUGINS_DIR, { recursive: true });
            return;
        }

        const files = fs.readdirSync(PLUGINS_DIR).filter(f => f.endsWith('.js'));
        files.forEach(file => {
            // Skip welcome.js - it's now built-in
            if (file === 'welcome.js') {
                console.log(`Skipping built-in animation: ${file}`);
                return;
            }

            const fullPath = path.join(PLUGINS_DIR, file);
            try {
                delete require.cache[require.resolve(fullPath)];
                const anim = require(fullPath);
                const id = file.replace('.js', '');
                animPlugins.set(id, {
                    id,
                    name: anim.name || id,
                    interval: anim.interval || 50,
                    tick: anim.tick
                });
                console.log(`Loaded animation: ${anim.name || id} (${id})`);
            } catch (e) {
                console.error(`Failed to load animation ${file}:`, e);
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

        // Reload plugins on every start? Or just once? 
        // User said "without recompile", implying hot load or at least app restart.
        // Let's reload on every start for maximum "dev" feel, it's cheap.
        loadAnimations();

        const plugin = animPlugins.get(type);

        if (plugin) {
            let tick = 0;
            // Apply Global Speed
            const baseInterval = plugin.interval || 50;
            const speedFactor = (config.globalSpeed || 100) / 100; // 100->1.0, 200->2.0
            const realInterval = Math.max(10, baseInterval / speedFactor);

            console.log(`Starting ${type} @ ${realInterval.toFixed(1)}ms (Speed: ${config.globalSpeed}%)`);
            activeAnimName = type;

            currentAnimInterval = setInterval(() => {
                try {
                    // Pass a simpler setZone wrapper if needed, or raw
                    // We pass setZone directly. Plugins must match signature.
                    plugin.tick(ZONES, setZone, tick);
                    tick++;
                } catch (e) {
                    console.error(`Animation ${type} error:`, e);
                    stopAnimation();
                }
            }, realInterval);
        } else {
        console.warn(`Animation ${type} not found!`);
    }
}

// --- MIDI LOGIC ---
function startMidi() {
        JZZ().or(function () {
            console.log('Cannot start MIDI engine!');
        }).and(function () {
            const info = this.info();
            const inName = info.inputs.find(x => x.name.toLowerCase().includes(DEVICE_NAME.toLowerCase()))?.name;
            const outName = info.outputs.find(x => x.name.toLowerCase().includes(DEVICE_NAME.toLowerCase()))?.name;

            if (outName) {
                midiOut = this.openMidiOut(outName);
                console.log("MIDI Output opened.");
            }

            if (inName) {
                this.openMidiIn(inName).connect(handleMidiMessage);
            }

            // Notify UI
            if (mainWindow) {
                mainWindow.webContents.send('status', {
                    connected: !!(inName && outName),
                    inName, outName
                });
            }
        });
}

// LOW LATENCY Media Handler (Persistent PowerShell)
const { spawn } = require('child_process');
let psProc = null;

function initMediaKeys() {
        if (psProc) return;

        // Start persistent PowerShell process
        psProc = spawn('powershell', ['-NoProfile', '-Command', '-'], {
            stdio: ['pipe', 'ignore', 'ignore'], // Only need stdin
            windowsHide: true
        });

        // Handle unexpected exit
        psProc.on('exit', () => { psProc = null; });
        psProc.on('error', () => { psProc = null; });

        // Inject C# P/Invoke definition ONCE
        const def = `Add-Type -TypeDefinition 'using System.Runtime.InteropServices; public class K { [DllImport("user32.dll")] public static extern void keybd_event(byte b, byte s, uint f, int e); }'`;
        psProc.stdin.write(def + "\n");
    }

    function sendMediaKey(vkCode) {
        if (!psProc) initMediaKeys();

        // Send command directly to the running process
        // 0xB0=Next(176), 0xB1=Prev(177), 0xB3=Play(179)
        // keybd_event(vk, 0, 0, 0) -> Press
        // keybd_event(vk, 0, 2, 0) -> Release
        const cmd = `[K]::keybd_event(${vkCode},0,0,0); [K]::keybd_event(${vkCode},0,2,0)\n`;
        try {
            psProc.stdin.write(cmd);
        } catch (e) {
            // If pipe closed, restart
            psProc = null;
            initMediaKeys();
        }
}

function handleMidiMessage(msg) {
        // Use setImmediate to decouple from native MIDI callback thread
        setImmediate(() => {
            const status = msg[0] & 0xF0;
            const ch = msg[0] & 0x0F;
            const d1 = msg[1];
            const d2 = msg[2];

            if (ch !== CH_INPUT || status !== 0xB0) return;

            // Send RAW to UI for visualization
            if (mainWindow && !mainWindow.isDestroyed()) {
                mainWindow.webContents.send('midi-event', { cc: d1, val: d2 });
            }

            // --- LOGIC ---

            // KNOB (80)
            if (d1 === 80) {
                if (lastKnobVal === -1) { lastKnobVal = d2; return; }
                const delta = d2 - lastKnobVal;
                if (delta !== 0) {
                    let dir = delta > 0 ? 1 : -1;
                    if (delta < -64) dir = 1;
                    else if (delta > 64) dir = -1;

                    // Interactive Animation (Swapped for correct direction)
                    if (config.ledEnabled) {
                        if (dir > 0) triggerInteraction('left');  // Right turn -> visual Right-to-Left
                        else triggerInteraction('right'); // Left turn -> visual Left-to-Right
                    }

                    // Media Control
                    if (config.mediaEnabled) {
                        if (dir > 0) sendMediaKey(0xB0); // Right = Next
                        else sendMediaKey(0xB1); // Left = Previous
                    }
                }
                lastKnobVal = d2;
            }
            // TOUCH (81) - Active Low
            else if (d1 === 81) {
                const touched = (d2 < 64);

                // Only trigger animation on state CHANGE to prevent idle flicker
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
        }); // End setImmediate
}

// --- ELECTRON APP ---
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

            // Start initialization AFTER window is ready
            if (midiOut) {
                runInitialization();
            }
        });
}

app.whenReady().then(() => {
    createWindow();
    initMediaKeys(); // Pre-load PowerShell

    // Set App User Model ID for Windows
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

// --- IPC ---
ipcMain.on('set-config', (event, newConfig) => {
    config = { ...config, ...newConfig };
    saveConfig(); // Persist changes
    console.log("Config updated:", config);
});

ipcMain.on('manual-color', (event, rgb) => {
    stopAnimation(); // Stop any active animation
    // Override LED temporarily
    config.ledEnabled = false; // Disable auto-react
    setRGB(rgb.r, rgb.g, rgb.b);
});

ipcMain.on('enable-auto-led', () => {
    config.ledEnabled = true;
    stopAnimation();
});

ipcMain.on('start-anim', (event, type) => startAnimation(type));

ipcMain.on('get-animations', (event) => {
    // If empty (renderer loaded before main init), try loading
    if (animPlugins.size === 0) loadAnimations();

    const list = [];
    animPlugins.forEach((plugin, id) => {
        list.push({ id, name: plugin.name });
    });
    event.reply('animations-list', list);
});

// --- AUTOSTART ---
ipcMain.on('get-autostart-config', (event) => {
    const settings = app.getLoginItemSettings();
    event.reply('autostart-config', settings.openAtLogin);
});

ipcMain.on('set-autostart-config', (event, enable) => {
    app.setLoginItemSettings({
        openAtLogin: enable,
        path: app.getPath('exe') // Optional, safe to include
    });
});

ipcMain.on('set-brightness', (event, val) => {
    config.brightness = val;
    saveConfig();
    // If static color active, re-apply logic could go here if we tracked lastStaticRGB
});

ipcMain.on('set-speed', (event, val) => {
    config.globalSpeed = val;
    saveConfig();
    // Restart active animation if running
    if (activeAnimName && activeAnimName !== 'none') {
        startAnimation(activeAnimName);
    }
});

ipcMain.on('app-close', () => {
    turnOffAllLeds();
    app.quit();
});
ipcMain.on('app-minimize', () => mainWindow.minimize());
