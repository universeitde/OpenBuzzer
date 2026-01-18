module.exports = {
    name: "Welcome",
    interval: 25,
    tick: (zones, setZone, tick) => {
        // Total animation: ~12 seconds (480 ticks * 25ms)
        const TOTAL_DURATION = 480;
        const progress = tick / TOTAL_DURATION; // 0.0 to 1.0

        // Rainbow color generator (cycles through spectrum)
        const rainbow = (offset) => {
            const hue = (progress * 3 + offset) % 1; // 3 full cycles
            // HSV to RGB approximation for smooth rainbow
            const h = hue * 6;
            const x = 1 - Math.abs((h % 2) - 1);
            let r, g, b;
            if (h < 1) { r = 1; g = x; b = 0; }
            else if (h < 2) { r = x; g = 1; b = 0; }
            else if (h < 3) { r = 0; g = 1; b = x; }
            else if (h < 4) { r = 0; g = x; b = 1; }
            else if (h < 5) { r = x; g = 0; b = 1; }
            else { r = 1; g = 0; b = x; }
            return [Math.floor(r * 127), Math.floor(g * 127), Math.floor(b * 127)];
        };

        // Smooth brightness envelope for each zone (overlapping sine waves)
        // Zone activates in sequence with smooth fade in/out
        const zoneBrightness = (zoneIdx) => {
            // Stagger zones: Z0 starts at 0%, Z1 at 25%, Z2 at 50%
            const stagger = zoneIdx * 0.25;
            const localProgress = (progress - stagger) / 0.6; // Each zone active for 60% of total

            if (localProgress < 0 || localProgress > 1) return 0;

            // Sine curve for smooth fade in -> hold -> fade out
            return Math.sin(localProgress * Math.PI);
        };

        // Apply to all zones with cascading effect
        zones.forEach((z, idx) => {
            const brightness = zoneBrightness(idx);
            const [r, g, b] = rainbow(idx * 0.15); // Slight color offset per zone
            setZone(idx,
                Math.floor(r * brightness),
                Math.floor(g * brightness),
                Math.floor(b * brightness)
            );
        });

        // Stop animation after completion
        if (tick >= TOTAL_DURATION) {
            // Fade to idle purple
            const fadeOut = Math.max(0, 1 - ((tick - TOTAL_DURATION) / 100));
            zones.forEach((z, idx) => {
                setZone(idx, 0, 0, Math.floor(80 * fadeOut));
            });
        }
    }
};
