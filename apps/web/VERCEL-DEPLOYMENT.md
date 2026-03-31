# Deploying to Vercel

## Prerequisites

1. GitHub account with the `lms` repository
2. Vercel account (sign up at https://vercel.com)

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard:**
   - Visit https://vercel.com/new
   - Sign in with GitHub

2. **Import Your Repository:**
   - Click "Add New..." → "Project"
   - Select "Import Git Repository"
   - Choose `Isaiah-Ferguson/lms`
   - Click "Import"

3. **Configure Project Settings:**
   - **Framework Preset:** Next.js
   - **Root Directory:** `apps/web`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
   - **Install Command:** `npm install`

4. **Add Environment Variable:**
   - Click "Environment Variables"
   - Add: 
     - Name: `NEXT_PUBLIC_API_URL`
     - Value: `https://csalms.azurewebsites.net`
   - Click "Add"

5. **Deploy:**
   - Click "Deploy"
   - Wait for deployment to complete (2-3 minutes)

6. **Get Your URL:**
   - After deployment, you'll get a URL like: `https://lms-xyz.vercel.app`
   - Copy this URL - you'll need it for CORS configuration

### Option 2: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Navigate to web app
cd apps/web

# Login to Vercel
vercel login

# Deploy
vercel --prod

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name? lms-frontend (or your choice)
# - Directory? ./
# - Override settings? No
```

## After Deployment

### 1. Update Azure CORS Settings

Once deployed, update your API's CORS settings:

```bash
# Replace YOUR_VERCEL_URL with your actual Vercel URL
az webapp config appsettings set \
  --resource-group lms \
  --name CSALMS \
  --settings Frontend__Url=https://YOUR_VERCEL_URL.vercel.app
```

Or via Azure Portal:
- Go to: App Services → CSALMS → Configuration → Application settings
- Update `Frontend__Url` to your Vercel URL
- Click "Save"
- Restart the app service

### 2. Test Your Deployment

Visit your Vercel URL and test:
- Login functionality
- API calls to Azure backend
- File uploads to Azure Storage
- All major features

## Custom Domain (Optional)

To use a custom domain:

1. Go to Vercel Dashboard → Your Project → Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Update `Frontend__Url` in Azure to match your custom domain

## Troubleshooting

**CORS Errors:**
- Verify `Frontend__Url` in Azure matches your Vercel URL exactly
- Restart the Azure App Service after changing settings

**API Connection Issues:**
- Check that `NEXT_PUBLIC_API_URL` is set in Vercel environment variables
- Verify the API is accessible at https://csalms.azurewebsites.net

**Build Failures:**
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Verify TypeScript has no errors: `npm run build` locally
