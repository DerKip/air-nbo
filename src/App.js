import React, { useRef, useEffect, useState } from "react";
import "./App.css";
import mapboxgl from "!mapbox-gl"; // eslint-disable-line import/no-webpack-loader-syntax
import axios from "axios";
import Header from "./Header";
import Legend from "./legend";

mapboxgl.accessToken = process.env.ACCESS_TOKEN;

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng] = useState(36.82);
  const [lat] = useState(-1.29);
  const [zoom] = useState(11.5);
  const measurementsRef = useRef([]);
  const [selectedMarker, setSelectedMarker] = useState(null);

  useEffect(() => {
    const markerColors = {
      Green: "#4FCA57",
      Yellow: "#F7ea00",
      Orange: "#F59636",
      Red: "#F53636",
      Purple: "#B836F5",
      Maroon: "Maroon",
    };
    const DEVICE_ID = process.env.DEVICE_ID;
    const TOKEN = process.env.TOKEN;
    axios
      .get(
        `https://api.airqo.net/api/v2/devices/measurements/airqlouds/${DEVICE_ID}?token=${TOKEN}`
      )
      .then((res) => {
        if (res.data.success) {
          const measurements = res.data.measurements.map((item) => ({
            device: item.device,
            time: item.time,
            pm2_5: item.pm2_5.value,
            siteDetails: {
              formatted_name: item.siteDetails.formatted_name,
              approximate_latitude: item.siteDetails.approximate_latitude,
              approximate_longitude: item.siteDetails.approximate_longitude,
            },
            aqi_color: item.aqi_color,
            aqi_category: item.aqi_category,
            aqi_color_name: item.aqi_color_name,
          }));
          measurementsRef.current = measurements;

          if (map.current) return;
          map.current = new mapboxgl.Map({
            container: mapContainer.current,
            style: "mapbox://styles/mapbox/light-v10",
            center: [lng, lat],
            zoom: zoom,
          });
          // Navigation Control
          map.current.addControl(
            new mapboxgl.NavigationControl({ showCompass: true }),
            "top-right"
          );

          measurementsRef.current.forEach((measurement) => {
            const markerColor =
              markerColors[measurement.aqi_color_name] || "grey";
            const marker = new mapboxgl.Marker({
              color: markerColor,
            })
              .setLngLat([
                measurement.siteDetails.approximate_longitude,
                measurement.siteDetails.approximate_latitude,
              ])
              .addTo(map.current);

            const measurementTime = new Date(measurement.time);
            const currentTime = new Date();

            const timeDifference = currentTime - measurementTime;

            const minutesAgo = Math.floor(timeDifference / (1000 * 60));
            const hoursAgo = Math.floor(minutesAgo / 60);

            // Determine whether to display minutes or hours
            const timeAgo =
              hoursAgo > 0
                ? `${hoursAgo} ${hoursAgo === 1 ? "hour" : "hours"} ago`
                : `${minutesAgo} ${
                    minutesAgo === 1 ? "minute" : "minutes"
                  } ago`;

            let lastRefreshed = document.getElementById("last-refreshed");
            lastRefreshed.innerHTML = measurementTime.toLocaleTimeString(); // Display the last refreshed time in legend

            const popup = new mapboxgl.Popup().setHTML(
              `
              <h3>${measurement.siteDetails.formatted_name}</h3>
              <p class="last-refreshed">Last Refreshed : ${timeAgo}</p>
              <div style = "background-color : ${markerColor}; padding:12px; font-size:large; color: #333;">
                <span class="pm25-label">PM<sub>2.5</sub> : </span>
                <span class="pm25-value">${measurement.pm2_5.toFixed(
                  4
                )} </span> µg/m3
              </div>
              <p class="pm25-value">AQI Category: ${
                measurement.aqi_category
              }</p>
            `
            );

            marker.setPopup(popup);
            marker.getElement().addEventListener("click", () => {
              popup.addTo(map.current);
              if (selectedMarker) {
                selectedMarker.getPopup().remove();
              }
              setSelectedMarker(marker);
            });
          });
        }
      })
      .catch((error) => {
        console.log("Error fetching data", error);
      });
  }, [lng, lat, zoom, selectedMarker]);

  return (
    <div>
      <div className="sidebar">
        Longitude: {lng} | Latitude: {lat} | Zoom: {zoom}
      </div>
      <Header />
      <div ref={mapContainer} className="map-container" />

      <Legend />
    </div>
  );
}

export default App;
