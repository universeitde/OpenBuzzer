module.exports = {
    name: "Police",
    interval: 50,
    tick: (zones, setZone, tick) => {
        const phase = Math.floor(tick / 4) % 2;
        if (phase === 0) {
            setZone(0, 127, 0, 0);
            setZone(1, 0, 0, 0);
            setZone(2, 0, 0, 127);
        } else {
            setZone(0, 0, 0, 127);
            setZone(1, 127, 127, 127);
            setZone(2, 127, 0, 0);
        }
    }
};
