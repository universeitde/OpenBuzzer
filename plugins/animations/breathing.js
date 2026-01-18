module.exports = {
    name: "Breathing",
    interval: 50,
    tick: (zones, setZone, tick) => {
        // Human Breathing Rhythm (approx 4-5s per breath)
        // Sine wave mapped to relaxed white/warm color

        const t = tick * 0.05;
        const brightness = (Math.sin(t) + 1) / 2; // 0..1

        // Warm White (255, 200, 150) -> Scaled to 127
        const r = Math.floor(127 * brightness);
        const g = Math.floor(100 * brightness);
        const b = Math.floor(70 * brightness);

        zones.forEach((z, idx) => setZone(idx, r, g, b));
    }
};
