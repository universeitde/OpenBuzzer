module.exports = {
    name: "Strobe",
    interval: 50,
    tick: (zones, setZone, tick) => {
        // Fast White Flash
        // Tick modulo 2 for very fast strobe
        if (tick % 2 === 0) {
            zones.forEach((z, idx) => setZone(idx, 127, 127, 127));
        } else {
            zones.forEach((z, idx) => setZone(idx, 0, 0, 0));
        }
    }
};
