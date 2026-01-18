module.exports = {
    name: "Volcano",
    interval: 40,
    tick: (zones, setZone, tick) => {
        // Magma: Red base, random Orange/Yellow heat bursts

        zones.forEach((z, idx) => {
            // Base Heat (Red)
            let r = 100 + Math.random() * 27;
            let g = 0;
            let b = 0;

            // Random Heat Spike
            if (Math.random() < 0.3) {
                // Add Orange/Yellow
                g = Math.random() * 80;
            }

            setZone(idx, Math.floor(r), Math.floor(g), Math.floor(b));
        });
    }
};
