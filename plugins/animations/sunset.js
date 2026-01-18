module.exports = {
    name: "Sunset",
    interval: 80, // Slow, relaxed
    tick: (zones, setZone, tick) => {
        // Warm Sunset: Yellow -> Orange -> Red -> Pink

        zones.forEach((z, idx) => {
            const offset = idx * 0.8;
            const t = tick * 0.02 + offset;

            // Continuous warm shift
            const phase = (Math.sin(t) + 1) / 2; // 0..1 wave

            // R is always high for sunset
            const r = 100 + (27 * phase); // 100-127

            // G fades out as we go to red/pink
            // High G = Yellow, Low G = Red
            const g = 60 * Math.cos(t);
            // Clamp G to 0
            const finalG = Math.max(0, g);

            // B comes in for the 'Pink' phase later?
            // Let's make it simpler: R dominant. G varies. B varies.

            // Yellow (127, 100, 0) -> Red (127, 0, 0) -> Purple (100, 0, 80)

            // Create a complex gradient based on 't' wrapped
            const cycle = (t % (Math.PI * 2)) / (Math.PI * 2); // 0..1

            let displayR = 127;
            let displayG = 0;
            let displayB = 0;

            if (cycle < 0.5) {
                // Yellow -> Red
                // dry fade green down
                const local = cycle * 2; // 0..1
                displayG = 80 * (1 - local);
            } else {
                // Red -> Purple -> Red
                // ramp blue up then down
                const local = (cycle - 0.5) * 2; // 0..1
                displayB = 60 * Math.sin(local * Math.PI);
            }

            setZone(idx, Math.floor(displayR), Math.floor(displayG), Math.floor(displayB));
        });
    }
};
