# Deployment Guide (Railway & Neon)

This guide walks you through deploying the Node.js/Express application to **Railway** for hosting and **Neon** for the PostgreSQL database.

## 1. Setup the Database on Neon
1. Go to [Neon.tech](https://neon.tech/) and create an account.
2. Create a new project. You can name it `scoala-db` or similar.
3. Once the project is created, Neon will give you a **Connection String** (Postgres URL). It will look something like this:
   `postgresql://username:password@ep-cool-butterfly-123456.eu-central-1.aws.neon.tech/neondb?sslmode=require`
4. Copy this Connection String, you will need it for the Railway configuration.

## 2. Push Your Code to GitHub
1. Make sure all your code is committed:
   ```bash
   git add .
   git commit -m "Ready for deployment"
   ```
2. Push your code to a repository on your GitHub account.

## 3. Deploy to Railway
1. Go to [Railway.app](https://railway.app/) and create an account (you can log in with GitHub).
2. Click **New Project** and select **Deploy from GitHub repo**.
3. Select your repository from the list.
4. **Before deploying**, Railway will ask if you want to add variables. Click **Add Variables**.
5. Add the following environment variables:
   - `DATABASE_URL` : Paste the Connection String from Neon here.
   - `SESSION_SECRET` : Put a secure random string here (e.g., `super-secret-key-12345`).
   - `NODE_ENV` : `production`
6. Click **Deploy**.

## 4. Run Database Migrations on Railway
Because this is the first deployment, you need to create the database tables.
1. Once the deployment finishes, go to the **Variables** tab or the **Deployments** tab in Railway.
2. In Railway, you can access a terminal/shell for your running container. Go to **Command Palette** (Ctrl+K or Cmd+K) -> **Execute Command** (or just use the built-in terminal).
3. Alternatively, you can temporarily change the **Start Command** in Railway settings to:
   `node migrate.js && node server.js`
   This will ensure migrations run automatically on startup.
4. Wait for the app to restart, and your database will be populated with the correct tables (`users`, `articles`, etc.).

## 5. Domain Configuration (Optional)
1. In your Railway project, click on your service and go to the **Settings** tab.
2. Under **Networking**, click **Generate Domain** to get a free `.up.railway.app` domain.
3. If you have a custom domain (`scoalacretestisintesti.ro`), click **Custom Domain** and follow the DNS configuration instructions provided by Railway.

## Important Notes
- **Images/Uploads**: Railway has an ephemeral file system by default. Images added directly through the code (like the first article images) will work fine because they are in the GitHub repo. If you add an admin panel later with image uploads, you will need to set up a cloud storage bucket (like AWS S3 or Cloudinary) for those uploads, or attach a persistent Volume in Railway.
- **SSL**: Railway automatically provisions SSL (HTTPS) for your domains.
