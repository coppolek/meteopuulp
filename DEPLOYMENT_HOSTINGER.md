# Guida Completa all'Installazione su VPS Hostinger tramite Docker

Questa guida passo-passo ti spiegherà come installare e configurare l'applicazione **Meteo & Live Webcams** su una VPS Hostinger utilizzando Docker e Docker Compose.

---

## 📋 Requisiti Prerequisiti
1. **VPS Hostinger** con sistema operativo **Ubuntu 22.04 LTS** o **Ubuntu 24.04 LTS** (o Debian).
2. Accesso **SSH** alla tua VPS con utente `root` o utente con permessi `sudo`.
3. Le tue chiavi API:
   - `WINDY_API_KEY` (da Windy Webcams)
   - `OPENWEATHERMAP_API_KEY` (da OpenWeatherMap)
   - `GEMINI_API_KEY` (opzionale se utilizzi funzioni AI)
4. *(Opzionale)* Un **nome di dominio** con record **A** puntato all'indirizzo IP pubblico della VPS.

---

## Passo 1: Connessione SSH alla VPS Hostinger
Apri il terminale del tuo computer (o la console Web di Hostinger) e connettiti alla VPS:

```bash
ssh root@IP_DELLA_TUA_VPS
```

---

## Passo 2: Installare Docker e Docker Compose sulla VPS
Esegui questi comandi per installare Docker e Docker Compose Plugin:

```bash
# Aggiorna i pacchetti di sistema
sudo apt update && sudo apt upgrade -y

# Installa pacchetti richiesti
sudo apt install -y curl ca-certificates gnupg lsb-release

# Aggiungi la chiave GPG ufficiale di Docker
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Aggiungi il repository Docker
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Installa Docker Engine, CLI e Docker Compose
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verifica l'installazione
docker --version
docker compose version
```

---

## Passo 3: Caricare i File dell'Applicazione sulla VPS
Puoi trasferire la cartella del progetto sulla tua VPS tramite **Git**, **SFTP** (es. FileZilla) o un semplice file zip.

### Opzione A: Tramite Git (Consigliato)
Sulla VPS:
```bash
cd /var/www/
git clone <URL_DEL_TUO_REPOSITORY_GIT> live-webcams
cd live-webcams
```

### Opzione B: Creare una cartella ed inserire i file manualmente
```bash
mkdir -p /var/www/live-webcams
cd /var/www/live-webcams
```

Assicurati che la cartella contenga:
- `Dockerfile`
- `docker-compose.yml`
- `.dockerignore`
- `package.json`
- `server.ts`
- `src/`
- `vite.config.ts`

---

## Passo 4: Creare il File di Ambiente `.env`
Nella cartella del progetto (`/var/www/live-webcams`), crea il file `.env`:

```bash
nano .env
```

Incolla le tue chiavi e configurazioni:

```env
PORT=3300
NODE_ENV=production

# Le tue chiavi API
WINDY_API_KEY=la_tua_windy_api_key
OPENWEATHERMAP_API_KEY=la_tua_openweathermap_api_key
GEMINI_API_KEY=la_tua_gemini_api_key
```

Salva con `CTRL + O`, premi `INVIO`, e esci con `CTRL + X`.

---

## Passo 5: Avviare l'Applicazione con Docker
Compila l'immagine e avvia il container in background:

```bash
docker compose up -d --build
```

### Verificare che l'applicazione stia funzionando
```bash
# Controlla lo stato dei container
docker compose ps

# Visualizza i log in tempo reale
docker compose logs -f
```

L'applicazione sarà ora raggiungibile all'indirizzo `http://IP_DELLA_TUA_VPS:3300`.

---

## Passo 6: Configurare Nginx e Certbot SSL HTTPS (Opzionale ma Consigliato)
Per rendere l'app visibile su porta 80/443 con un dominio personalizzato e un certificato SSL HTTPS gratuito:

### 1. Installa Nginx e Certbot sulla VPS
```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

### 2. Configura Nginx come Reverse Proxy
Crea il file di configurazione per il tuo dominio (sostituisci `il-tuo-dominio.com` con il tuo dominio effettivo):

```bash
sudo nano /etc/nginx/sites-available/live-webcams
```

Aggiungi questa configurazione:

```nginx
server {
    listen 80;
    server_name il-tuo-dominio.com www.il-tuo-dominio.com;

    location / {
        proxy_pass http://localhost:3300;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Attiva il sito e riavvia Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/live-webcams /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3. Ottieni il Certificato SSL HTTPS Gratuito con Certbot
```bash
sudo certbot --nginx -d il-tuo-dominio.com -d www.il-tuo-dominio.com
```

Segui le istruzioni a schermo. Ora la tua app sarà completamente funzionante in **HTTPS** sicuro su `https://il-tuo-dominio.com`!

---

## 🔄 Comandi Utili per la Gestione

- **Riavviare l'applicazione**:
  ```bash
  docker compose restart
  ```
- **Vedere i log**:
  ```bash
  docker compose logs -f --tail=100
  ```
- **Fermare i container**:
  ```bash
  docker compose down
  ```
- **Aggiornare il codice e ricompilare**:
  ```bash
  git pull
  docker compose up -d --build
  ```
