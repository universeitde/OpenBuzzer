module.exports = {
    name: "Plasma",
    interval: 40,
    tick: (zones, setZone, tick) => {
        zones.forEach((z, idx) => {
            const r = Math.floor(Math.sin(tick * 0.05 + idx) * 63 + 64);
            const g = 0;
            const b = Math.floor(Math.sin(tick * 0.08 + idx * 2) * 63 + 64);
            setZone(idx, r, g, b);
        });
    }
};
