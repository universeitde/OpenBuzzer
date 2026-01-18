module.exports = {
    name: "Candy",
    interval: 80,
    tick: (zones, setZone, tick) => {
        // Pastel Pink / Blue / Yellow rotation

        zones.forEach((z, idx) => {
            const phase = ((tick * 0.05) + (idx * 0.33)) % 1;

            let r, g, b;

            if (phase < 0.33) {
                // Pink
                r = 120; g = 60; b = 80;
            } else if (phase < 0.66) {
                // Baby Blue
                r = 50; g = 80; b = 120;
            } else {
                // Lemon
                r = 120; g = 120; b = 40;
            }

            // Apply soft fade transition?
            // Simple blocky transition is kinda "Candy" like

            setZone(idx, r, g, b);
        });
    }
};
