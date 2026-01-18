module.exports = {
    name: "Matrix",
    interval: 30, // Fast
    tick: (zones, setZone, tick) => {
        // Digital Rain: Random Green Drops
        // We simulate a 'falling' effect by randomly brightening a zone and fading others

        // Randomly ignite a zone occasionally
        if (Math.random() < 0.1) {
            const targetZone = Math.floor(Math.random() * 3);
            setZone(targetZone, 0, 127, 0); // Bright Green
        }

        // Fade all zones
        zones.forEach((z, idx) => {
            // Need to read current logic? Since we don't have state readback easily here without keeping internal state,
            // we will simulate by checking tick modulo.

            // Actually, we can just oscillate zones randomly to keep it stateless and simple.
            // Or better: Just use perl noise-like random flicker.

            const flicker = Math.random() * 127;
            // Weighted towards dark
            const val = Math.pow(Math.random(), 3) * 127;

            // Occasional bright glitch
            if (val > 100) {
                setZone(idx, 0, 127, 0);
            } else {
                setZone(idx, 0, Math.floor(val), 0);
            }
        });
    }
};
