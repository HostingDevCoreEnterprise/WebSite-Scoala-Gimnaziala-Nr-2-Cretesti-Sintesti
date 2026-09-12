# Școala Gimnazială Nr. 2 Crețești

Official repository for the website of **Școala Gimnazială Nr. 2 Crețești**. This project provides a modern, responsive, and SEO-optimized web platform designed to improve communication between the school, students, parents, teachers, and the local community. The website centralizes institutional information, school news, educational projects, contact details, and administrative content in a secure and accessible environment.

## Features

* **Modern and Responsive User Interface:** Built with a premium, dynamic, and mobile-friendly design.
* **Content Management System (CMS):** Custom administrative dashboard to manage articles, announcements, teachers, committees, and site settings.
* **School Presentation Pages:** Dedicated sections for *Despre Școală*, *Viziune & Misiune*, *Conducere*, and *Elevi*.
* **Educational Projects & Partnerships:** Showcase for European funds (PNRR), national educational initiatives, and local community partnerships (Primăria Vidra, CJ Ilfov).
* **Media Optimized:** Automatic handling of modern web assets (converted `.HEIC` to `.jpeg`, `.MOV` to `.mp4` for maximum cross-browser compatibility).
* **Search Engine Optimization (SEO):** Structured data, dynamic metadata, and semantic HTML for high visibility.
* **Secure Authentication:** Secure session management for the admin portal.

## Technology Stack

* **Frontend:** HTML5, Vanilla CSS (Custom Design System), JavaScript, EJS (Embedded JavaScript templating)
* **Backend:** Node.js & Express.js
* **Database:** PostgreSQL (using `pg` driver)
* **Hosting:** Render (App) & Neon (Serverless Postgres)
* **Version Control:** Git & GitHub

## Project Structure

```text
.
├── public/           # Static assets (images, css, videos, fonts)
├── views/            # EJS Templates (public pages, admin portal, partials)
├── routes/           # Express routers (public, admin, api endpoints)
├── db/               # Database initialization schemas (schema.sql, seed.js)
├── middleware/       # Custom Express middleware (e.g., authentication)
├── migrate.js        # Script for database migrations/seeding
├── server.js         # Application entry point
└── package.json      # Project dependencies and scripts
```

## Getting Started

### 1. Clone the repository

```bash
git clone git@github.com:HostingDevCoreEnterprise/WebSite-Scoala-Gimnaziala-Nr-2-Cretesti.git
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the root directory and configure the required environment variables:

```env
NODE_ENV=development
DATABASE_URL=your_neon_postgres_connection_string
SESSION_SECRET=your_secure_session_secret
```

### 4. Initialize the Database

Run the migration script to set up the schema and seed the initial data:

```bash
node migrate.js
```

### 5. Start the server

```bash
npm run dev
# or
node server.js
```

## Production Deployment

The production application is deployed using:

* **Hosting:** Render
* **Database:** Neon PostgreSQL

A detailed deployment guide is available in `DEPLOYMENT_GUIDE.md`.

## Security

Sensitive information such as API keys, database credentials, and session secrets must never be committed to the repository. Environment-specific configuration should be stored securely using environment variables or a secret manager.

## License

This repository contains the source code for the official website of **Școala Gimnazială Nr. 2 Crețești**. Unless otherwise specified, all rights are reserved.
