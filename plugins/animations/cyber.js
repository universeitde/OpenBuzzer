module.exports = {
    name: "Cyber",
    interval: 35,
    tick: (zones, setZone, tick) => {
        // Cyberpunk: Alternating Neon Pink and Cyan
        // With random glitches

        const glitch = Math.random() < 0.1;

        zones.forEach((z, idx) => {
            const offset = idx;
            // Use bitwise for sharp transitions
            const signal = Math.floor((tick * 0.2) + offset) % 2;

            if (glitch) {
                setZone(idx, 127, 127, 127); // White flash
            } else if (signal === 0) {
                // Neon Pink (127, 0, 80)
                setZone(idx, 127, 0, 80);
            } else {
                // Neon Cyan (0, 127, 127)
                setZone(idx, 0, 127, 127);
            }
        });
    }
};
