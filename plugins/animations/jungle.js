module.exports = {
    name: "Jungle",
    interval: 70,
    tick: (zones, setZone, tick) => {
        // Jungle Pulse: Deep Green -> Bright Yellow/Lime

        const pulse = (Math.sin(tick * 0.1) + 1) / 2; // 0..1

        zones.forEach((z, idx) => {
            // Offset pulse slightly per zone
            // Actually jungle feels better if it breathes together mostly, maybe rippling

            // Green is always dominant
            const g = 80 + (47 * pulse);

            // Red brings the Yellow/Lime tint
            const r = 60 * pulse;

            const b = 0;

            setZone(idx, Math.floor(r), Math.floor(g), Math.floor(b));
        });
    }
};
