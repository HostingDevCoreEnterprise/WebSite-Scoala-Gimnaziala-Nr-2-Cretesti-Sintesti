# Deployment Guide (Render & Neon)

This guide walks you through deploying the Node.js/Express application to **Render** for hosting and **Neon** for the PostgreSQL database.

## 1. Setup the Database on Neon
1. Go to [Neon.tech](https://neon.tech/) and create an account.
2. Create a new project. You can name it `scoala-db` or similar.
3. Once the project is created, Neon will give you a **Connection String** (Postgres URL). It will look something like this:
   `postgresql://username:password@ep-cool-butterfly-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require`
4. Copy this Connection String, you will need it for the Render configuration.

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
   - `DATABASE_URL` : Paste the Connection String from Neon here.
   - `SESSION_SECRET` : Put a secure random string here (e.g., `super-secret-key-12345`).
   - `NODE_ENV` : `production`
6. Click **Create Web Service**. Render will now build and deploy your app.

## 4. Run Database Migrations on Render
Because we set the Start Command to `node migrate.js && node server.js`, the database tables will be created automatically when the deployment finishes successfully. You do not need to run migrations manually.

## 5. Keeping the App Online (Uptime Bot)
Render's free tier spins down web services after 15 minutes of inactivity. To prevent the website from going to sleep and causing slow load times for visitors:
1. Go to an uptime monitoring service like [UptimeRobot](https://uptimerobot.com/) or [cron-job.org](https://cron-job.org/).
2. Create a free account.
3. Add a new monitor (HTTP(s) type).
4. Enter the URL of your Render web service (e.g., `https://scoala-website.onrender.com`).
5. Set the monitoring interval to **every 10 minutes** or **every 14 minutes** (to hit it before the 15-minute timeout).
6. Save the monitor. This will keep your Render service active 24/7.

## 6. Domain Configuration (Optional)
1. In your Render dashboard, select your web service and go to the **Settings** tab.
2. Scroll down to **Custom Domains** and click **Add Custom Domain**.
3. Enter your domain (e.g., `scoalacretestisintesti.ro`) and follow the DNS configuration instructions provided by Render to verify it.

## Important Notes
- **Images/Uploads**: Render has an ephemeral file system on the Free tier. Images added directly through the code (like the first article images) will work fine because they are in the GitHub repo. If you add an admin panel later with image uploads, you will need to set up a cloud storage bucket (like AWS S3 or Cloudinary) for those uploads, or attach a persistent Disk in Render (which requires a paid plan).
- **SSL**: Render automatically provisions SSL (HTTPS) for both the `.onrender.com` subdomain and your custom domains.
