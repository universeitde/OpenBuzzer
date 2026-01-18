module.exports = {
    name: "Wave",
    interval: 40,
    tick: (zones, setZone, tick) => {
        const pos = (tick * 0.2) % 3;
        zones.forEach((z, idx) => {
            let dist = Math.abs(pos - idx);
            if (dist > 1.5) dist = Math.abs(dist - 3);

            const brightness = Math.max(0, 127 - (dist * 100));

            setZone(idx, 0, Math.floor(brightness), Math.floor(brightness * 0.8));
        });
    }
};
