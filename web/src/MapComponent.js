import React, { useEffect, useRef, useState, useMemo } from "react";
import { DeckGL } from "@deck.gl/react";
import { ScatterplotLayer, LineLayer} from "@deck.gl/layers";
import { Map } from "react-map-gl/mapbox";
import OpacityControls from './OpacityControls';
import DateRangeSlider from "./DateRangeSlider";


const MAPBOX_TOKEN = process.env.MAPBOX_TOKEN;

export default function MapComponent() {
    const [startDate, setStartDate] = useState(new Date(1000000000000));
    const [endDate, setEndDate] = useState(new Date());
    const dateFilterStart = startDate.getTime();
    const dateFilterEnd = endDate.getTime();
    const [dateFilter, setDateFilter] = useState([dateFilterStart, dateFilterEnd]);

    const [pointSize, setPointSize] = useState(1);
    const [lineWidth, setLineWidth] = useState(1);
    const [mapStyle, setMapStyle] = useState("mapbox://styles/mapbox/dark-v11");
    const [data, setData] = useState({ geoData: [], roadsData: [] });

    const [viewState, setViewState] = useState({
        longitude: 25.5,
        latitude: 65,
        zoom: 10,
        pitch: 0,
        bearing: 0,
    });
    const [opacities, setOpacities] = useState({
        map: 1,
        points: 0,
        lines: 20
    });

    const mapRef = useRef();
    useEffect(() => {
        if (!mapRef.current) return;

        const map = mapRef.current;

        try {
            map.setPaintProperty('background', 'background-color', `rgba(0, 0, 0, ${opacities.map / 100})`);
            map.setPaintProperty('satellite', 'raster-opacity', opacities.map / 100);
        } catch (err) {
            console.warn("Error setting Mapbox opacity:", err);
        }
    }, [opacities.map]);

    useEffect(() => {
        let allGeoData = [];
        let currentPage = 1;
        const pageSize = 100000;

        const fetchTimestamps = async () => {
            const response = await fetch(`http://localhost:3001/timestamps`);
            const timestampData = await response.json();

            if (timestampData.length === 0) return;

            // setStartDate(new Date(timestampData['first_timestamp']));
            // setEndDate(new Date(timestampData['last_timestamp']));
            console.log(timestampData['first_timestamp']);
        };

        const fetchPage = async (page) => {
            const response = await fetch(`http://localhost:3001/locations?page=${page}&limit=${pageSize}`);
            const pageData = await response.json();

            if (pageData.length === 0) return;

            const enrichedData = pageData.map(d => ({
                ...d,
                message: new Date(d.timestamp).toLocaleString()
            }))

            allGeoData = [...allGeoData, ...enrichedData];

            setData((prev) => ({ ...prev, geoData: [...allGeoData] }));
            fetchPage(page + 1);
            console.log("page: ", page);
        };
        fetchTimestamps();
        fetchPage(currentPage);

    }, []);

    const handlePointSizeChange = (value) => {
        setPointSize(parseFloat(value));
    };

    const handleLineWidthChange = (value) => {
        setLineWidth(parseFloat(value));
    }
    const dotSize = Math.max(pointSize, (pointSize * 10000) / Math.pow(2, viewState.zoom));
    const MAX_DISTANCE = 0.0005;
    const MAX_TIME = 1000000;
    const remapValue = (value, minInput, maxInput, minOutput, maxOutput) => {
        const clampedValue = Math.max(minInput, Math.min(maxInput, value));

        const logMin = Math.log(minInput);
        const logMax = Math.log(maxInput);
        const logValue = Math.log(clampedValue);

        return maxOutput - ((logValue - logMin) / (logMax - logMin)) * (maxOutput - minOutput);
    };

    function getBearing(from, to) {
        const toRadians = deg => deg * Math.PI / 180;
        const toDegrees = rad => rad * 180 / Math.PI;

        const lat1 = toRadians(from[0]);
        const lon1 = toRadians(from[1]);
        const lat2 = toRadians(to[0]);
        const lon2 = toRadians(to[1]);

        const dLon = lon2 - lon1;

        const y = Math.sin(dLon) * Math.cos(lat2);
        const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

        let brng = Math.atan2(y, x);
        brng = toDegrees(brng);
        return (brng + 360) % 360; // normalize to 0-360
    }

    function hslToRgb(h, s, l) {
        s /= 100;
        l /= 100;

        const k = n => (n + h / 30) % 12;
        const a = s * Math.min(l, 1 - l);
        const f = n =>
            Math.round(255 * (l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))));

        return [f(0), f(8), f(4)];
    }

    const lines = useMemo(() => {
        if (!data?.geoData || data.geoData.length < 2) return [];

        const lineSegments = [];

        for (let i = 0; i < data.geoData.length - 1; i++) {
            const p1 = data.geoData[i].geojson.coordinates;
            const p2 = data.geoData[i + 1].geojson.coordinates;

            const dist = Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
            const timeDifference =
                new Date(data.geoData[i + 1].timestamp).getTime() -
                new Date(data.geoData[i].timestamp).getTime();

            const currentTimestamp = new Date(data.geoData[i].timestamp).getTime();
            if (
                timeDifference > 0 &&
                timeDifference < MAX_TIME &&
                dist < MAX_DISTANCE &&
                currentTimestamp >= dateFilter[0] &&
                currentTimestamp <= dateFilter[1]
            ) {
                lineSegments.push({
                    sourcePosition: [p1[1], p1[0]],
                    targetPosition: [p2[1], p2[0]],
                    bearing: getBearing([p1[1], p1[0]], [p2[1], p2[0]]),
                    dist,
                    timeDifference
                });
            }
        }

        return lineSegments;
    }, [data.geoData, dateFilter]);

    const lineLayer = useMemo(() => {
        return new LineLayer({
            id: "line-layer",
            data: lines,
            getSourcePosition: (d) => d.sourcePosition,
            getTargetPosition: (d) => d.targetPosition,
            getColor: (d) => {
                const degrees = d.bearing;
                const hue = degrees % 360;
                return hslToRgb(hue, 40, 50);
            },
            opacity: opacities.lines / 100,
            getWidth: (d) => remapValue(d.dist, 0.001, 0.1, 10, lineWidth),
            pickable: false,
            updateTriggers: {
                getWidth: lineWidth,
                opacity: opacities.lines,
            },
        });
    }, [lines, lineWidth, opacities.lines]);

    const scatterLayer = useMemo(() => {
        return new ScatterplotLayer({
            id: "scatterplot-layer",
            data: data.geoData,
            getPosition: (d) => [d.geojson.coordinates[1], d.geojson.coordinates[0]],
            getRadius: dotSize,
            getFillColor: (d) => {
                const t = d.type || 0;
                if (t === "Walking" || t === "Running") {
                    return [222, 111, 50];
                } else if (t === "Biking") {
                    return [150, 70, 222];
                } else {
                    return [200, 255, 120];
                }
            },
            opacity: opacities.points / 100,
            pickable: true,
            updateTriggers: {
                opacity: opacities.points
            },
            // onHover: updateTooltip,
        });
    }, [data.geoData, dotSize, opacities.points]);

    // const tooltip = document.createElement('div');
    // tooltip.style.position = 'absolute';
    // tooltip.style.zIndex = 1;
    // tooltip.style.pointerEvents = 'none';
    // document.body.append(tooltip);

    // function updateTooltip({ object, x, y }) {
    //     if (object) {
    //         tooltip.style.display = 'block';
    //         tooltip.style.left = `${x}px`;
    //         tooltip.style.top = `${y}px`;
    //         tooltip.innerText = object.message;
    //     } else {
    //         tooltip.style.display = 'none';
    //     }
    // }

    function getTooltip({ object }) {
        return object && object.message;
    }

    return (
        <DeckGL
            viewState={viewState}
            controller={true}
            layers={[lineLayer, scatterLayer]}
            onViewStateChange={({ viewState }) => setViewState(viewState)}
            getTooltip={getTooltip}
        >
            <Map
                mapboxAccessToken={MAPBOX_TOKEN}
                mapStyle={mapStyle}
                ref={mapRef}
                onLoad={(e) => {
                    mapRef.current = e.target;
                    console.log("Map loaded");
                }}

            />
            <OpacityControls
                map={mapRef.current}
                opacities={opacities}
                setOpacities={setOpacities}
                mapStyle={mapStyle}
                setMapStyle={setMapStyle}
                lineWidth={lineWidth}
                handleLineWidthChange={handleLineWidthChange}
                pointSize={pointSize}
                handlePointSizeChange={handlePointSizeChange}
            />
            <DateRangeSlider
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
                minDate={startDate.getTime()}
                maxDate={endDate.getTime()}
            />
        </DeckGL>
    );
}

