const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // Status messages
    onStatus: (callback) => ipcRenderer.on('status', (event, msg) => callback(msg)),
    // Scan Status
    onScanStatus: (callback) => ipcRenderer.on('scan-status', (event, status) => callback(status)),
    // Config
    onConfigUpdated: (callback) => ipcRenderer.on('config-updated', (event, config) => callback(config)),
    onMidi: (callback) => ipcRenderer.on('midi-event', (e, v) => callback(v)),
    setConfig: (cfg) => ipcRenderer.send('set-config', cfg),
    // Live Control
    setManualColor: (rgb) => ipcRenderer.send('manual-color', rgb),
    setBrightness: (val) => ipcRenderer.send('set-brightness', val),
    setSpeed: (val) => ipcRenderer.send('set-speed', val),
    startAnim: (type) => ipcRenderer.send('start-anim', type),
    enableAutoLed: () => ipcRenderer.send('enable-auto-led'),
    getAutostart: () => ipcRenderer.send('get-autostart-config'),
    setAutostart: (enable) => ipcRenderer.send('set-autostart-config', enable),
    onAutostart: (cb) => ipcRenderer.on('autostart-config', (e, v) => cb(v)),
    getAnimations: () => ipcRenderer.send('get-animations'),
    onAnimationsList: (cb) => ipcRenderer.on('animations-list', (e, l) => cb(l)),
    close: () => ipcRenderer.send('app-close'),
    minimize: () => ipcRenderer.send('app-minimize')
});
