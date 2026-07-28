import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs/promises";
import { cities } from "./src/data/cities";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Read Firebase config to get project and db info for ads.txt
  let firebaseProjectId = "";
  let firestoreDbId = "";
  try {
    const configData = await fs.readFile(path.join(process.cwd(), "firebase-applet-config.json"), "utf8");
    const config = JSON.parse(configData);
    firebaseProjectId = config.projectId;
    firestoreDbId = config.firestoreDatabaseId || "(default)";
  } catch (e) {
    console.warn("Could not read firebase-applet-config.json for ads.txt route");
  }

  // ads.txt route
  app.get("/ads.txt", async (req, res) => {
    const hardcodedAdsTxt = "google.com, pub-5738943819550045, DIRECT, f08c47fec0942fa0";
    try {
      if (!firebaseProjectId) {
        return res.type("text/plain").send(hardcodedAdsTxt);
      }
      const url = `https://firestore.googleapis.com/v1/projects/${firebaseProjectId}/databases/${firestoreDbId}/documents/app_settings/config`;
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        const adsTxtContent = data.fields?.adsTxtContent?.stringValue || "";
        res.type("text/plain").send(adsTxtContent ? `${hardcodedAdsTxt}\n${adsTxtContent}` : hardcodedAdsTxt);
      } else {
        res.type("text/plain").send(hardcodedAdsTxt);
      }
    } catch (e) {
      console.error("Error fetching ads.txt", e);
      res.type("text/plain").send(hardcodedAdsTxt);
    }
  });

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

      const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;
      const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`;

      const [weatherRes, forecastRes] = await Promise.all([
        fetch(weatherUrl),
        fetch(forecastUrl)
      ]);
      
      if (!weatherRes.ok) {
        const errorData = await weatherRes.text();
        return res.status(weatherRes.status).json({ error: `OpenWeatherMap API error: ${errorData}` });
      }

      const weatherData = await weatherRes.json();

      let dailyForecasts = [];
      if (forecastRes.ok) {
        const forecastData = await forecastRes.json();
        const list = forecastData.list || [];
        const dailyMap = new Map();
        
        const tzOffset = forecastData.city?.timezone || 0;
        
        for (const item of list) {
            const localDate = new Date((item.dt + tzOffset) * 1000);
            const dateStr = localDate.toISOString().split('T')[0];
            
            if (!dailyMap.has(dateStr)) {
                dailyMap.set(dateStr, {
                    date: dateStr,
                    dt: item.dt,
                    temp_min: item.main.temp_min,
                    temp_max: item.main.temp_max,
                    icon: item.weather[0].icon.replace('n', 'd'), // Prefer day icons for daily forecast
                    description: item.weather[0].description,
                });
            } else {
                const day = dailyMap.get(dateStr);
                day.temp_min = Math.min(day.temp_min, item.main.temp_min);
                day.temp_max = Math.max(day.temp_max, item.main.temp_max);
                
                const hour = localDate.getUTCHours();
                if (hour >= 11 && hour <= 15) {
                    day.icon = item.weather[0].icon.replace('n', 'd');
                    day.description = item.weather[0].description;
                }
            }
        }
        
        const todayStr = new Date((Date.now() + tzOffset * 1000)).toISOString().split('T')[0];
        
        dailyForecasts = Array.from(dailyMap.values())
            .filter(d => d.date !== todayStr)
            .slice(0, 5);
            
        if (dailyForecasts.length < 5) {
            dailyForecasts = Array.from(dailyMap.values()).slice(1, 6);
        }
      }
      
      weatherData.forecast = dailyForecasts;
      res.json(weatherData);
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

      const latNum = parseFloat(lat as string);
      const lonNum = parseFloat(lon as string);

      const windyKey = (req.headers["x-windy-api-key"] as string) || (req.query.windyKey as string) || process.env.WINDY_API_KEY;
      const openWebcamDbKey = (req.headers["x-openwebcamdb-api-key"] as string) || (req.query.openWebcamDbKey as string) || process.env.OPENWEBCAMDB_API_KEY || "58|LmdLOrSyprVtGgmQR1KWyMMAmaniX9HcJqRYUy6nd617981b";

      const liveWebcams: any[] = [];
      const seenIds = new Set<string | number>();

      // 1. Query Windy API if key available
      if (windyKey) {
        try {
          const offsets = [0, 50, 100];
          const fetchPromises = offsets.map(offset => {
            const url = `https://api.windy.com/webcams/api/v3/webcams?nearby=${lat},${lon},250&limit=50&offset=${offset}&include=player,location,images`;
            return fetch(url, {
              headers: {
                "x-windy-api-key": windyKey,
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
              }
            }).then(r => r.ok ? r.json() : null).catch(() => null);
          });

          const results = await Promise.all(fetchPromises);
          for (const data of results) {
            if (data && Array.isArray(data.webcams)) {
              for (const cam of data.webcams) {
                if (cam.player && (cam.player.live || cam.player.day) && !seenIds.has(cam.webcamId)) {
                  seenIds.add(cam.webcamId);
                  liveWebcams.push({
                    ...cam,
                    provider: "Windy"
                  });
                }
              }
            }
          }
        } catch (e) {
          console.warn("Windy fetch warning:", e);
        }
      }

      // 2. Query OpenWebcamDB API (Public / Keyed)
      try {
        const owdbHeaders: Record<string, string> = {
          "User-Agent": "WorldLiveCamsApp/1.0",
          "Accept": "application/json"
        };
        if (openWebcamDbKey) {
          owdbHeaders["Authorization"] = `Bearer ${openWebcamDbKey}`;
        }

        const owdbUrl = `https://openwebcamdb.com/api/v1/webcams?per_page=2000`;
        const owdbRes = await fetch(owdbUrl, { headers: owdbHeaders, timeout: 8000 } as any);
        if (owdbRes.ok) {
          const owdbData = await owdbRes.json();
          const camsList = owdbData.data || [];
          if (Array.isArray(camsList)) {
            const nearbyCams = [];
            for (const cam of camsList) {
              const camLat = parseFloat(cam.latitude);
              const camLon = parseFloat(cam.longitude);
              if (isNaN(camLat) || isNaN(camLon)) continue;

              // Compute Haversine distance
              const R = 6371; // km
              const dLat = (camLat - latNum) * Math.PI / 180;
              const dLon = (camLon - lonNum) * Math.PI / 180;
              const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                        Math.cos(latNum * Math.PI / 180) * Math.cos(camLat * Math.PI / 180) *
                        Math.sin(dLon/2) * Math.sin(dLon/2);
              const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
              const dist = R * c;

              if (dist <= 150) {
                nearbyCams.push({ cam, dist });
              }
            }

            // Sort by distance and limit to top 20 to avoid excessive individual API requests
            nearbyCams.sort((a, b) => a.dist - b.dist);
            const topCams = nearbyCams.slice(0, 20);

            await Promise.all(topCams.map(async ({ cam }) => {
              const camId = `owdb_${cam.slug}`;
              if (!seenIds.has(camId)) {
                seenIds.add(camId);
                
                // Set a placeholder live stream URL so the frontend will call /api/stream-url
                // The actual stream_url will be fetched on demand.
                let liveStreamUrl = `https://openwebcamdb.com/webcams/${cam.slug}`;

                liveWebcams.push({
                  webcamId: camId,
                  title: cam.title || "Live Cam",
                  player: {
                    live: liveStreamUrl, 
                    day: ""
                  },
                  location: {
                    city: cam.city || "",
                    country: cam.country?.name || ""
                  },
                  images: {
                    current: {
                      thumbnail: cam.thumbnail_url || "",
                      preview: cam.thumbnail_url || ""
                    }
                  },
                  provider: "OpenWebcamDB",
                  slug: cam.slug
                });
              }
            }));
          }
        }
      } catch (e) {
        console.warn("OpenWebcamDB fetch error:", e);
      }

      // Check if no webcams found and neither key was provided
      if (liveWebcams.length === 0 && !windyKey && !openWebcamDbKey) {
        return res.status(500).json({
          error: "Nessuna chiave API configurata per Windy o OpenWebcamDB. Inserisci una chiave nell'Admin Panel o nel file .env della VPS."
        });
      }

      // STRICT RULE: Sort webcams so that active live streams (cam.player.live) ALWAYS come first!
      liveWebcams.sort((a, b) => {
        const aIsLive = (a.player && a.player.live) ? 1 : 0;
        const bIsLive = (b.player && b.player.live) ? 1 : 0;
        return bIsLive - aIsLive;
      });

      res.json({ webcams: liveWebcams });
    } catch (error: any) {
      console.error("Webcam API error:", error);
      res.status(500).json({ error: "Failed to fetch webcams data" });
    }
  });

  app.get("/api/stream-url", async (req, res) => {
    try {
      const { id } = req.query;
      if (!id) {
        return res.status(400).json({ error: "Missing webcam id" });
      }

      if (typeof id === 'string' && id.startsWith('owdb_')) {
        const slug = id.replace('owdb_', '');
        try {
          const openWebcamDbKey = (req.headers["x-openwebcamdb-api-key"] as string) || process.env.OPENWEBCAMDB_API_KEY || "58|LmdLOrSyprVtGgmQR1KWyMMAmaniX9HcJqRYUy6nd617981b";
          const owdbHeaders = { "Authorization": `Bearer ${openWebcamDbKey}` };
          const detailRes = await fetch(`https://openwebcamdb.com/api/v1/webcams/${slug}`, { headers: owdbHeaders, timeout: 3000 } as any);
          if (detailRes.ok) {
            const detailData = await detailRes.json();
            let liveStreamUrl = detailData.data?.stream_url || "";
            if (liveStreamUrl.includes("youtube.com/watch?v=")) {
              liveStreamUrl = liveStreamUrl.replace("watch?v=", "embed/");
            }
            if (liveStreamUrl) {
              return res.json({ streamUrl: liveStreamUrl });
            }
          }
        } catch (e) {
          console.warn(`Failed to fetch detail for owdb slug ${slug}`);
        }
        return res.json({ streamUrl: `https://openwebcamdb.com/webcams/${slug}` });
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
    app.use(express.static(distPath, { index: false })); // prevent express from serving index.html automatically
    // For Express 4.x we use '*' instead of '*all'
    app.get("*", async (req, res) => {
      try {
        let html = await fs.readFile(path.join(distPath, "index.html"), "utf8");
        
        // Inject Open Graph tags for city or default
        const cityId = req.query.city as string;
        let title = "puulp.it - World Live Cams & Weather";
        let description = "Guarda le migliori webcam live dal mondo con aggiornamenti meteo in tempo reale.";
        let imageUrl = "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1200";
        let url = `https://${req.get('host')}/`;

        if (cityId) {
          const city = cities.find(c => c.id === cityId);
          if (city) {
            title = `Guarda ${city.name} Live! - puulp.it`;
            description = `Guarda la webcam in diretta streaming da ${city.name}, ${city.country}.`;
            imageUrl = city.imageUrl.replace('w=300', 'w=1200');
            url = `https://${req.get('host')}/?city=${city.id}`;
          }
        }
        
        const metaTags = `
          <meta property="og:title" content="${title}">
          <meta property="og:description" content="${description}">
          <meta property="og:image" content="${imageUrl}">
          <meta property="og:url" content="${url}">
          <meta name="twitter:card" content="summary_large_image">
          <meta name="twitter:title" content="${title}">
          <meta name="twitter:description" content="${description}">
          <meta name="twitter:image" content="${imageUrl}">
        `;
        html = html.replace('</head>', `${metaTags}</head>`);
        
        res.send(html);
      } catch (err) {
        res.sendFile(path.join(distPath, "index.html"));
      }
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
