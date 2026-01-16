import React, { useEffect, useRef } from "react";

const MAP_STYLES = {
    Dark: "mapbox://styles/mapbox/dark-v11",
    Light: "mapbox://styles/mapbox/light-v11",
    Satellite: "mapbox://styles/mapbox/satellite-v9",
};

export default function OpacityControls({ map, opacities, setOpacities, mapStyle, setMapStyle, pointSize, handlePointSizeChange, lineWidth, handleLineWidthChange }) {
    const panelRef = useRef(null);

    const handleChange = (layer, value) => {
        setOpacities(prev => ({ ...prev, [layer]: parseInt(value) }));
    };

    const handleMapStyleChange = (e) => {
        setMapStyle(e.target.value);
    };

    useEffect(() => {
        const panel = panelRef.current;

        if (!panel || !map) return;

        const disableMapInteractions = () => {
            map.dragPan.disable();
            map.scrollZoom.disable();
            map.boxZoom.disable();
            map.doubleClickZoom.disable();
        };

        const enableMapInteractions = () => {
            map.dragPan.enable();
            map.scrollZoom.enable();
            map.boxZoom.enable();
            map.doubleClickZoom.enable();
        };

        // Prevent map from seeing these pointer events
        const stopPointerEvent = (e) => {
            e.stopPropagation();
        };

        panel.addEventListener("pointerenter", disableMapInteractions);
        panel.addEventListener("pointerleave", enableMapInteractions);
        panel.addEventListener("pointerdown", stopPointerEvent);
        panel.addEventListener("pointermove", stopPointerEvent);
        panel.addEventListener("wheel", stopPointerEvent);

        return () => {
            panel.removeEventListener("pointerenter", disableMapInteractions);
            panel.removeEventListener("pointerleave", enableMapInteractions);
            panel.removeEventListener("pointerdown", stopPointerEvent);
            panel.removeEventListener("pointermove", stopPointerEvent);
            panel.removeEventListener("wheel", stopPointerEvent);
        };
    }, [map]);

    return (
        <div
            ref={panelRef}
            style={{
                position: "absolute",
                top: 10,
                right: 10,
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                padding: "1rem",
                borderRadius: "8px",
                color: "white",
                zIndex: 1000,
                userSelect: "none",
                pointerEvents: "auto",
                touchAction: "none" // Important to block pinch-zoom on touch devices
            }}
        >
            <div>
                <label>Map Opacity: </label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={opacities.map}
                    onChange={e => handleChange("map", e.target.value)}
                />
            </div>
            <div>
                <label>Lines Opacity: </label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={opacities.lines}
                    onChange={e => handleChange("lines", e.target.value)}
                />
            </div>
            <div>
                <label>Lines Width: </label>
                <input
                    type="range"
                    min="0.2"
                    max="5"
                    step="0.2"
                    value={lineWidth}
                    onChange={(e) => handleLineWidthChange(e.target.value)}
                />
            </div>
            <div>
                <label>Points Opacity: </label>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={opacities.points}
                    onChange={e => handleChange("points", e.target.value)}
                />
            </div>
            <div>
                <label>Points Size: </label>
                <input
                    type="range"
                    min="0.2"
                    max="10"
                    step="0.2"
                    value={pointSize}
                    onChange={(e) => handlePointSizeChange(e.target.value)}
                />
            </div>
            <div style={{ marginTop: "1rem" }}>
                <label>Map Style:</label>
                <select value={mapStyle} onChange={handleMapStyleChange}>
                    {Object.entries(MAP_STYLES).map(([label, value]) => (
                        <option key={value} value={value}>{label}</option>
                    ))}
                </select>
            </div>
        </div>
    );
}