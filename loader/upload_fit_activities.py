from __future__ import division
import xml.etree.ElementTree as ET
import sys
import json
import os
import psycopg2
import datetime
from dotenv import load_dotenv
import os

load_dotenv()

dbname = os.getenv("DB_NAME")
dbuser = os.getenv("DB_USER")
dbpassword = os.getenv("DB_PASSWORD")

print("Connecting to database...")

# Database connection
conn = psycopg2.connect(
    database=dbname, user=dbuser, password=dbpassword, host="localhost", port="5432"
)
cur = conn.cursor()
cur.execute("SELECT COUNT(id)FROM locations;")
count = cur.fetchone()[0]
if count > 0:
    cur.execute("SELECT timestamp FROM locations ORDER BY timestamp DESC LIMIT 1;")
    last_timestamp = cur.fetchone()[0]
    print(f"Beginning count: {count}")
else:
    last_timestamp = None
    print("No previous data found, starting from scratch.")

# cur.execute(
#     # "CREATE TABLE locations (id SERIAL PRIMARY KEY, geom GEOMETRY(Point, 4326), timestamp TIMESTAMP, type TEXT, activity_id INTEGER)"
#     "CREATE TABLE locations (id SERIAL PRIMARY KEY, geom GEOMETRY(Point, 4326), timestamp TIMESTAMP, type TEXT)"
# )
print("Inserting data...")


def clean_tag(tag):
    return tag.split("}")[1] if "}" in tag else tag


added = 0

activity_id = 0
prev_timestamp = None
for filename in os.listdir("Activities"):
    if (
        last_timestamp is not None
        and datetime.datetime.strptime(filename[:19], "%Y-%m-%dT%H_%M_%S")
        < last_timestamp
    ):
        continue

    file_path = os.path.join("Activities", filename)
    with open(file_path, "r") as f:
        xml_data = f.read()

    namespace = {"": "http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2"}
    root = ET.fromstring(xml_data)

    # Find all Activity nodes
    activities = root.findall(".//Activity", namespace)

    # Loop through each Activity
    for activity in activities:
        activity_id += 1
        activity_type = activity.attrib.get("Sport", "Unknown")
        lat = lng = timestamp = None
        item_type = activity_type

        # Find all Trackpoint nodes within the current Activity's Lap/Track structure
        trackpoints = activity.findall(".//Trackpoint", namespace)

        # Loop through the Trackpoint nodes and print their details
        for trackpoint in trackpoints:
            for child in trackpoint:
                clean_child_tag = clean_tag(child.tag)
                if clean_child_tag == "Position":
                    latitude = trackpoint.find(".//LatitudeDegrees", namespace)
                    longitude = trackpoint.find(".//LongitudeDegrees", namespace)
                    if latitude is not None and longitude is not None:
                        lat, lng = latitude.text, longitude.text
                elif clean_child_tag == "Time":
                    timestamp = child.text
                if lat is not None and lng is not None and timestamp != prev_timestamp:
                    cur.execute(
                        "INSERT INTO locations (geom, timestamp, type) VALUES (ST_SetSRID(ST_MakePoint(%s, %s), 4326), %s, %s);",
                        (lat, lng, timestamp, item_type),
                    )
                    print("\rLocations written: %s" % (added), end="")
                    added += 1
                    prev_timestamp = timestamp

# print("\nDeleting duplicate points...")
# cur.execute(
#     "DELETE FROM locations WHERE ctid IN (SELECT ctid FROM (SELECT ctid, ROW_NUMBER() OVER (PARTITION BY geom ORDER BY ctid) AS row_num FROM locations WHERE geom IN (SELECT geom FROM locations GROUP BY geom HAVING COUNT(*) > 1)) AS subquery WHERE row_num > 1);"
# )

cur.execute("SELECT COUNT(id)FROM locations;")
print(f"\nFinal locations: {cur.fetchone()[0]}")


# Commit and close
conn.commit()
cur.close()
conn.close()

print("Data uploaded!")
