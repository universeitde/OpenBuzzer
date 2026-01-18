module.exports = {
    name: "Rainbow",
    interval: 50,
    tick: (zones, setZone, tick) => {
        zones.forEach((z, idx) => {
            const t = tick * 0.1 + (idx * 0.5);
            const r = Math.floor(Math.sin(t) * 63 + 64);
            const g = Math.floor(Math.sin(t + 2) * 63 + 64);
            const b = Math.floor(Math.sin(t + 4) * 63 + 64);
            setZone(idx, r, g, b);
        });
    }
};
