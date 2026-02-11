# Gengar Agent Deployment Guide

This guide explains how to deploy the **Gengar Agent** (SNKRDUNK Scraper) to a public server so everyone can use it.

## Quick Start (Render.com)

We recommend using **Render** as it's easy to set up with Docker support.

1.  **Push to GitHub**: Ensure your latest code (including `Dockerfile`, `requirements.txt`) is pushed to your GitHub repository.
2.  **Create New Web Service**:
    *   Go to [dashboard.render.com](https://dashboard.render.com/)
    *   Click **New +** -> **Web Service**
    *   Connect your GitHub repository (`pkmonad-project`)
3.  **Configure Settings**:
    *   **Name**: `gengar-agent` (or similar)
    *   **Runtime**: **Docker** (Important!)
    *   **Instance Type**: Free (might be slow) or Starter (recommended for Selenium)
    *   **Environment Variables**:
        *   Add any necessary API keys (if you have them in `.env`)
4.  **Deploy**: Click **Create Web Service**.

## What Happens Next?

*   Render will build the Docker container (installing Python, Node.js, and Chrome).
*   It will start the server using `node psa-proxy-server.js`.
*   You will get a URL like `https://gengar-agent.onrender.com`.

## Connecting the Frontend

Once deployed, you need to update your frontend code to point to this new "On-Chain" URL.

1.  Open `assets/agents.js`.
2.  Find the `gengarAgent()` function.
3.  Update the fetch URL:
    ```javascript
    // assets/agents.js

    // OLD
    // const response = await fetch(`http://localhost:3000/api/snkrdunk/search?...`);

    // NEW (Replace with your actual Render URL)
    const response = await fetch(`https://gengar-agent.onrender.com/api/snkrdunk/search?${searchParams}`);
    ```
4.  Commit and push the frontend changes.

Now, when anyone visits your website, the Gengar Agent will run on the server, not their local machine! 🚀
