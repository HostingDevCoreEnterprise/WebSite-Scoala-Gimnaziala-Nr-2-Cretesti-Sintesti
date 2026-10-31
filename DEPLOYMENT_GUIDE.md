# Deployment Guide (Render & Aiven / Neon)

This guide walks you through deploying the Node.js/Express application to **Render** for hosting and **Aiven** (or **Neon**) for the PostgreSQL database.

## 1. Setup the Database on Aiven (or Neon)
1. Create a PostgreSQL service on [Aiven.io](https://aiven.io/) (or [Neon.tech](https://neon.tech/)).
2. Copy the **Service URI / Connection String** (Postgres URL). It will look something like:
   `postgres://avnadmin:password@hostname:port/defaultdb?sslmode=require`
3. Copy this Connection String, you will need it for the Render configuration.

## 2. Push Your Code to GitHub
1. Make sure all your code is committed:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   ```
2. Push your code to a repository on your GitHub account.

## 3. Deploy to Render
1. Go to [Render.com](https://render.com/) and create an account (you can log in with GitHub).
2. Click **New** and select **Web Service**.
3. Connect your GitHub account and select your repository from the list.
4. Fill in the following details:
   - **Name**: Choose a name for your service (e.g., `scoala-website`).
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node migrate.js && node server.js` (This ensures migrations run automatically on startup).
   - **Instance Type**: Free
5. Scroll down to **Advanced** and click **Add Environment Variable**. Add the following:
   - `DATABASE_URL` : Paste the Connection String from Aiven/Neon here.
   - `SESSION_SECRET` : Put a secure random string here (e.g., `super-secret-key-12345`).
   - `NODE_ENV` : `production`
6. Click **Create Web Service**. Render will now build and deploy your app.

## 4. Run Database Migrations on Render
Because we set the Start Command to `node migrate.js && node server.js`, the database tables will be created automatically when the deployment finishes successfully. You do not need to run migrations manually.

## 5. Keeping the App & Database Online (Preventing Render Sleep and Aiven Inactivity Power-Off)
Both Render free tier (spins down after 15 min of no web traffic) and Aiven free tier (powers down if there are extended periods with no queries) can go to sleep when inactive.

To keep **BOTH** running 24/7 without shutting down:
1. Go to a free uptime monitoring service like [UptimeRobot](https://uptimerobot.com/) or [cron-job.org](https://cron-job.org/).
2. Create a free account.
3. Add a new monitor (HTTP(s) type).
4. Enter your web service's health endpoint:
   `https://scoala-website.onrender.com/health`
5. Set the monitoring interval to **every 5 minutes** (or **every 10 minutes**).
6. Save the monitor.

**How this keeps both online:**
- Hitting the URL every 5–10 minutes prevents Render from ever sleeping.
- Every hit to `/health` directly executes a lightweight query (`SELECT 1`) on the Aiven database, resetting Aiven's inactivity timer so it never powers off.
- In addition, the application has an internal background keep-alive worker (`db/keepAlive.js`) that periodically pings PostgreSQL while the server is active.

## 6. Domain Configuration (Optional)
1. In your Render dashboard, select your web service and go to the **Settings** tab.
2. Scroll down to **Custom Domains** and click **Add Custom Domain**.
3. Enter your domain (e.g., `scoalacretesti.ro`) and follow the DNS configuration instructions provided by Render to verify it.

## Important Notes
- **Images/Uploads**: Render has an ephemeral file system on the Free tier. Images added directly through the code (like the first article images) will work fine because they are in the GitHub repo. If you add an admin panel later with image uploads, you will need to set up a cloud storage bucket (like AWS S3 or Cloudinary) for those uploads, or attach a persistent Disk in Render (which requires a paid plan).
- **SSL**: Render automatically provisions SSL (HTTPS) for both the `.onrender.com` subdomain and your custom domains.
