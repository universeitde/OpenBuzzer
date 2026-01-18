module.exports = {
    name: "Disco",
    interval: 60,
    tick: (zones, setZone, tick) => {
        // Random zones, Random colors
        zones.forEach((z, idx) => {
            if (Math.random() > 0.5) return; // Keep some updates skip for rhythm

            const r = Math.floor(Math.random() * 127);
            const g = Math.floor(Math.random() * 127);
            const b = Math.floor(Math.random() * 127);

            setZone(idx, r, g, b);
        });
    }
};
