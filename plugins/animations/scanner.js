module.exports = {
    name: "Scanner",
    interval: 30,
    tick: (zones, setZone, tick) => {
        const pos = (Math.sin(tick * 0.15) + 1) * 1; // 0 to 2 oscillating
        zones.forEach((z, idx) => {
            const dist = Math.abs(pos - idx);
            const val = Math.max(0, 127 - (dist * 150));
            setZone(idx, Math.floor(val), 0, 0);
        });
    }
};
