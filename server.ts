import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // API Routes
  app.get("/api/weather", async (req, res) => {
    try {
      const { lat, lon } = req.query;
      if (!lat || !lon) {
        return res.status(400).json({ error: "Missing lat or lon" });
      }

      const apiKey = (req.headers["x-weather-api-key"] as string) || (req.query.weatherKey as string) || process.env.OPENWEATHERMAP_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "OPENWEATHERMAP_API_KEY is missing. Please add it in .env on your VPS or in the Admin Panel." 
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

      const apiKey = (req.headers["x-windy-api-key"] as string) || (req.query.windyKey as string) || process.env.WINDY_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ 
          error: "WINDY_API_KEY is missing. Please add it in .env on your VPS or in the Admin Panel." 
        });
      }

      // Fetch multiple pages (up to 150 webcams within 250km) to find all active live streams
      const offsets = [0, 50, 100];
      const fetchPromises = offsets.map(offset => {
        const url = `https://api.windy.com/webcams/api/v3/webcams?nearby=${lat},${lon},250&limit=50&offset=${offset}&include=player,location,images`;
        return fetch(url, {
          headers: {
            "x-windy-api-key": apiKey,
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
          }
        }).then(r => r.ok ? r.json() : null).catch(() => null);
      });

      const results = await Promise.all(fetchPromises);
      const liveWebcams: any[] = [];
      const seenIds = new Set<number>();

      for (const data of results) {
        if (data && Array.isArray(data.webcams)) {
          for (const cam of data.webcams) {
            if (cam.player && (cam.player.live || cam.player.day) && !seenIds.has(cam.webcamId)) {
              seenIds.add(cam.webcamId);
              liveWebcams.push(cam);
            }
          }
        }
      }

      // STRICT RULE: Sort webcams so that active live streams (cam.player.live) ALWAYS come first!
      liveWebcams.sort((a, b) => {
        const aIsLive = (a.player && a.player.live) ? 1 : 0;
        const bIsLive = (b.player && b.player.live) ? 1 : 0;
        return bIsLive - aIsLive;
      });

      res.json({ webcams: liveWebcams });
    } catch (error: any) {
      console.error("Windy API error:", error);
      res.status(500).json({ error: "Failed to fetch webcams data" });
    }
  });

  app.get("/api/stream-url", async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "Missing webcam id" });
      }

      const response = await fetch(`https://webcams.windy.com/webcams/stream/${id}`, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      if (response.ok) {
        const html = await response.text();
        
        // Match specific iframe or video source tags, EXCLUDING js, css, images
        const iframeMatch = html.match(/<iframe[^>]+src=["']([^"']+)["']/i);
        const videoMatch = html.match(/<source[^>]+src=["']([^"']+)["']/i) || html.match(/(https?:\/\/[^\s"']+\.(?:m3u8|mp4)[^\s"']*)/i);

        const candidate = iframeMatch ? iframeMatch[1] : (videoMatch ? videoMatch[1] : null);

        if (candidate && !candidate.includes('.js') && !candidate.includes('.css')) {
          let streamUrl = candidate.replace(/&#x3D;/g, '=').replace(/&amp;/g, '&');
          if (streamUrl.startsWith('//')) {
            streamUrl = 'https:' + streamUrl;
          }
          if (streamUrl.startsWith('http://')) {
            streamUrl = streamUrl.replace('http://', 'https://');
          }
          return res.json({ streamUrl });
        }
      }
      res.json({ streamUrl: null });
    } catch (error: any) {
      console.error("Stream URL extraction error:", error);
      res.json({ streamUrl: null });
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
