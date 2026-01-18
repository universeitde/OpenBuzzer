module.exports = {
    name: "Toxic",
    interval: 60,
    tick: (zones, setZone, tick) => {
        // Toxic Ooze: Green base with Purple bubbles

        zones.forEach((z, idx) => {
            const t = tick * 0.1 + idx;
            // Base Green
            let g = 80 + Math.sin(t) * 40;
            // Occasional Purple bubble
            let r = 0;
            let b = 0;

            // Sim bubble
            const bubble = Math.sin(t * 3);
            if (bubble > 0.8) {
                // Purple takes over
                r = 100;
                b = 127;
                g = 20;
            }

            setZone(idx, Math.floor(r), Math.floor(g), Math.floor(b));
        });
    }
};
