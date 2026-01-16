CREATE TABLE locations (
    id SERIAL PRIMARY KEY,
    geom GEOMETRY(Point, 4326),
    timestamp TIMESTAMP,
    type TEXT
);