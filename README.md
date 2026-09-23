# Global Quiz — Railway

This package turns `game.html` into a public web app with a shared global leaderboard.

## Architecture

Browser → Railway Node/Express server → PostgreSQL → shared leaderboard

The original visual design and quiz content are preserved. The old local/Claude database logic was replaced with a real HTTP API.

## Deploy on Railway

1. Create a GitHub repository and upload all files in this folder.
2. In Railway, create a new project and deploy the GitHub repository.
3. Add a PostgreSQL database to the same Railway project.
4. Make sure the web service receives the database connection variable (`DATABASE_URL`). Railway normally provides this when the database is linked to the service.
5. Deploy/redeploy the service.
6. Generate a public domain for the service from Railway's networking/domain settings.
7. Open the generated URL. Every student using that URL will use the same PostgreSQL leaderboard.

## Local test

```bash
npm install
npm start
```

Then open `http://localhost:3000`.

If `DATABASE_URL` is not set, the server uses temporary in-memory storage only. For a truly shared persistent leaderboard, connect PostgreSQL in Railway.

## Important

The quiz score is calculated in the browser, so this deployment gives you a shared global leaderboard but is not cheat-proof. For a high-security competition, scoring should be moved to the server.
