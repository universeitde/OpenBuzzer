module.exports = {
    name: "Fire",
    interval: 60,
    tick: (zones, setZone, tick) => {
        zones.forEach((z, idx) => {
            const r = 100 + Math.random() * 27;
            const g = Math.random() * 40;
            const b = 0;
            setZone(idx, Math.floor(r), Math.floor(g), 0);
        });
    }
};
