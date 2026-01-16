const express = require("express");
const { Pool } = require("pg");
const cors = require("cors");
require('dotenv').config();

const app = express();
app.use(cors());

app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on all interfaces");
});

const pool = new Pool({
    user: process.env.DB_USER,
    host: "db",
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: "5432",
});

let cachedTimestamps = {
    first_timestamp: null,
    last_timestamp: null
};

async function fetchTimestamps() {
    try {
        const result = await pool.query(`
            SELECT MIN(timestamp) AS first_timestamp, MAX(timestamp) AS last_timestamp
            FROM locations
        `);
        cachedTimestamps = {
            first_timestamp: result.rows[0]?.first_timestamp || null,
            last_timestamp: result.rows[0]?.last_timestamp || null
        };
        console.log("Timestamps fetched:", cachedTimestamps);
    } catch (err) {
        console.error("Error fetching timestamps:", err);
        cachedTimestamps = {
            first_timestamp: null,
            last_timestamp: null
        };
    }
}
console.log(process.env.DB_USER, process.env.DB_NAME, process.env.DB_PASSWORD);
fetchTimestamps();

app.get("/timestamps", async (req, res) => {
    try {
        res.json(cachedTimestamps);
    } catch (err) {
        console.error("Error serving timestamps:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

// Endpoint to get points within a bounding box
app.get("/locations", async (req, res) => {
    try {

        const { page = 1, limit = 100000 } = req.query; // Default to page 1, 1000 rows per request
        const offset = (page - 1) * limit;

        const result = await pool.query(`SELECT id, ST_AsGeoJSON(geom) AS geojson, timestamp, type FROM locations ORDER BY timestamp ASC, id ASC LIMIT $1 OFFSET $2`, [limit, offset]);

        console.log(`Query result: ${result.rows.length} rows found, page: ${page}`);

        // Format response properly
        const formattedData = result.rows.map(row => ({
            id: row.id,
            geojson: JSON.parse(row.geojson), // Convert GeoJSON string to object
            timestamp: row.timestamp, // Include timestamp in response
            type: row.type
        }));

        res.json(formattedData);
    } catch (err) {
        console.error("Database query error:", err);
        res.status(500).json({ error: "Internal Server Error" });
    }
});


app.listen(3001, () => console.log("Server running on port 3001"));

