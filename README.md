# Chatwoot on Railway - One-Click Deploy

🚀 Deploy Chatwoot to Railway with one click. Just connect your GitHub repo and Railway will automatically:
- Create Postgres database
- Create Valkey (Redis) service  
- Deploy Chatwoot web service
- Configure all environment variables
- Run database migrations
- Start Chatwoot automatically

## 🎯 Quick Deploy

### Step 1: Fork/Clone this Repository

```bash
git clone https://github.com/ascespade/chatwoot-hybrid-1764267988118.git
cd chatwoot-hybrid-1764267988118
```

### Step 2: Deploy to Railway

1. Go to [Railway](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose this repository
5. Railway will automatically:
   - Detect `Dockerfile` and `railway.toml`
   - Create services (Postgres, Valkey, Chatwoot)
   - Set environment variables
   - Deploy and start Chatwoot

### Step 3: Add Database Services

After Railway creates the project:

1. Click **"New"** → **"Database"** → **"Postgres"**
2. Click **"New"** → **"Database"** → **"Valkey"** (Redis)

### Step 4: Configure Environment Variables

Railway will automatically set:
- `DATABASE_URL` from Postgres service
- `REDIS_URL` from Valkey service

You need to set manually:
- `SECRET_KEY_BASE` - Generate with: `openssl rand -hex 64`
- `FRONTEND_URL` - Your Railway app URL (e.g., `https://your-app.up.railway.app`)

### Step 5: Run Migrations

After first deploy, run migrations:

```bash
railway run bundle exec rails db:chatwoot_prepare
```

Or use Railway Dashboard → Service → Shell → Run command

## 🔄 Auto-Deploy

Every time you push to GitHub:
- Railway automatically detects changes
- Rebuilds the Docker image
- Redeploys the service
- No manual steps needed!

## 📁 Project Structure

```
.
├── Dockerfile          # Chatwoot Docker configuration
├── railway.toml        # Railway deployment config
├── railway.json        # Railway JSON config (alternative)
├── .dockerignore       # Files to ignore in Docker build
└── README.md          # This file
```

## 🔧 Configuration

All configuration is in `railway.toml`. Railway automatically:
- Detects Dockerfile
- Sets build commands
- Configures start command
- Links services (Postgres, Valkey)

## 📝 Environment Variables

Required variables (set in Railway Dashboard):

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | Auto-set from Postgres | `postgres://...` |
| `REDIS_URL` | Auto-set from Valkey | `redis://...` |
| `SECRET_KEY_BASE` | Rails secret key | `openssl rand -hex 64` |
| `FRONTEND_URL` | Your app URL | `https://app.up.railway.app` |
| `RAILS_ENV` | Environment | `production` |

## 🚀 Features

- ✅ One-click deploy from GitHub
- ✅ Automatic service creation
- ✅ Auto environment variable linking
- ✅ Auto-redeploy on git push
- ✅ Production-ready configuration
- ✅ Free tier compatible

## 📚 Resources

- [Railway Docs](https://docs.railway.app)
- [Chatwoot Docs](https://www.chatwoot.com/docs)
- [Railway Discord](https://discord.gg/railway)

## 🆘 Troubleshooting

### Service not starting?
- Check logs: `railway logs`
- Verify environment variables are set
- Ensure Postgres and Valkey are running

### Database connection failed?
- Verify `DATABASE_URL` is set correctly
- Check Postgres service is running
- Run migrations: `bundle exec rails db:chatwoot_prepare`

### Redis connection failed?
- Verify `REDIS_URL` is set correctly
- Check Valkey service is running

## 📄 License

MIT
