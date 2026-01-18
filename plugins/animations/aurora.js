module.exports = {
    name: "Aurora",
    interval: 60,
    tick: (zones, setZone, tick) => {
        // Northern Lights: Green -> Teal -> Purple flows

        zones.forEach((z, idx) => {
            const offset = idx * 1.5;
            const t = tick * 0.03 + offset;

            // Green is dominant but flows into blue/purple
            // R: Low, spikes when purple
            // G: High, dips when purple
            // B: Medium, varies

            const position = (Math.sin(t) + 1) / 2; // 0..1

            let r, g, b;

            if (position < 0.5) {
                // Green to Teal
                // pos 0: Green (0, 127, 0)
                // pos 0.5: Teal (0, 100, 100)
                const localP = position * 2; // 0..1
                r = 0;
                g = 100 + (27 * (1 - localP));
                b = 100 * localP;
            } else {
                // Teal to Purple
                // pos 0.5: Teal (0, 100, 100)
                // pos 1.0: Purple (80, 0, 127)
                const localP = (position - 0.5) * 2; // 0..1
                r = 80 * localP;
                g = 100 * (1 - localP);
                b = 100 + (27 * localP);
            }

            setZone(idx, Math.floor(r), Math.floor(g), Math.floor(b));
        });
    }
};
