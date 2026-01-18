module.exports = {
    name: "Ocean",
    interval: 50,
    tick: (zones, setZone, tick) => {
        // Gentle ocean waves: Deep Blue <-> Aqua <-> Teal
        // Using multiple overlapping sine waves for organic feel

        zones.forEach((z, idx) => {
            // Offset each zone for wave effect
            const offset = idx * 2.5;
            const t = tick * 0.05 + offset;

            // Blue base (always high)
            const b = 80 + Math.sin(t) * 47; // 33-127

            // Green/Cyan swell
            const g = 30 + Math.sin(t * 0.7 + 1) * 30; // 0-60

            // Minimal Red
            const r = 0;

            setZone(idx, Math.floor(r), Math.floor(g), Math.floor(b));
        });
    }
};
