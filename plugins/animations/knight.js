module.exports = {
    name: "Knight",
    interval: 30, // Fast scan
    tick: (zones, setZone, tick) => {
        // Cylon Eye / KITT: Red dot moving back and forth

        // Map triangle wave to position 0..2
        // Period = 30 ticks?
        const cycle = 30;
        const phase = tick % cycle;
        let pos; // 0..2 float

        if (phase < cycle / 2) {
            // Forward 0 -> 2
            pos = (phase / (cycle / 2)) * 2;
        } else {
            // Back 2 -> 0
            pos = 2 - ((phase - cycle / 2) / (cycle / 2)) * 2;
        }

        zones.forEach((z, idx) => {
            // Distance from 'scan beam' center
            const dist = Math.abs(pos - idx);
            // Sharp falloff
            let brightness = Math.max(0, 1 - dist * 1.5);

            // Red only
            setZone(idx, Math.floor(127 * brightness), 0, 0);
        });
    }
};
