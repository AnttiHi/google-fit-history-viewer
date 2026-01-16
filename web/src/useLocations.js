import { useState, useEffect } from "react";

export default function useLocations(bounds) {
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (!bounds) return;

    const fetchData = async () => {
      const response = await fetch(
        `http://localhost:5000/locations?minLng=${bounds.minLng}&minLat=${bounds.minLat}&maxLng=${bounds.maxLng}&maxLat=${bounds.maxLat}`
      );
      const data = await response.json();

      setLocations(data.map((d) => ({ ...d, geometry: d.geojson, type: d.type}))); // Convert GeoJSON
    };

    fetchData();
  }, [bounds]);

  return locations;
}