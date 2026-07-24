import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API Routes
  app.get("/api/weather", async (req, res) => {
    try {
      const { lat, lon } = req.query;
      if (!lat || !lon) {
        return res.status(400).json({ error: "Missing lat or lon" });
      }

      const apiKey = process.env.OPENWEATHERMAP_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "OPENWEATHERMAP_API_KEY is missing in environment variables. Please configure it in the Secrets panel." 
        });
      }

      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      const response = await fetch(url);
      
      if (!response.ok) {
        const errorData = await response.text();
        return res.status(response.status).json({ error: `OpenWeatherMap API error: ${errorData}` });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Weather API error:", error);
      res.status(500).json({ error: "Failed to fetch weather data" });
    }
  });

  app.get("/api/webcams", async (req, res) => {
    try {
      const { lat, lon } = req.query;
      if (!lat || !lon) {
        return res.status(400).json({ error: "Missing lat or lon" });
      }

      const apiKey = process.env.WINDY_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "WINDY_API_KEY is missing in environment variables. Please configure it in the Secrets panel." 
        });
      }

      // Trying the nearby parameter for Windy Webcams API v3
      // Radius is 250km, limit to 50 webcams to increase chances of finding a live one
      const url = `https://api.windy.com/webcams/api/v3/webcams?nearby=${lat},${lon},250&limit=50&include=player,location,images`;
      
      const response = await fetch(url, {
        headers: {
          "x-windy-api-key": apiKey
        }
      });
      
      if (!response.ok) {
        const errorData = await response.text();
        return res.status(response.status).json({ error: `Windy API error: ${errorData}` });
      }

      const data = await response.json();
      res.json(data);
    } catch (error: any) {
      console.error("Windy API error:", error);
      res.status(500).json({ error: "Failed to fetch webcams data" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // For Express 4.x we use '*' instead of '*all'
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
