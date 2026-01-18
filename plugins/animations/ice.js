module.exports = {
    name: "Ice",
    interval: 80,
    tick: (zones, setZone, tick) => {
        // Cold Ice Shimmer: White/Blue/Cyan

        zones.forEach((z, idx) => {
            const t = tick * 0.1 + idx;
            // Base Blue
            const b = 100 + Math.sin(t) * 27;
            // Green for Cyan tint
            const g = 80 + Math.cos(t * 1.5) * 40;
            // Red for White highlights
            const r = Math.max(0, Math.sin(t * 2.3) * 100);

            setZone(idx, Math.floor(r), Math.floor(g), Math.floor(b));
        });
    }
};
