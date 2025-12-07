# DJ Slammer Deployment Guide

## Table of Contents
1. [Main App Deployment (Vercel)](#main-app-deployment-vercel)
2. [Backend Updates](#backend-updates)
3. [Audio File Optimization](#audio-file-optimization)
4. [Environment Configuration](#environment-configuration)
5. [Deployment Checklist](#deployment-checklist)

---

## Main App Deployment (Vercel)

### Why Vercel?

Vercel is the **recommended deployment platform** for DJ Slammer because:

- ✅ **Perfect for React/Vite**: Zero-config deployment
- ✅ **Static Asset CDN**: Fast global delivery for audio files
- ✅ **Excellent Performance**: Critical for low-latency audio responsiveness
- ✅ **Automatic HTTPS**: Required for Web Audio API in production
- ✅ **No Backend Required**: Current MVP is 100% client-side
- ✅ **Free Tier**: Generous limits (100GB bandwidth/month)
- ✅ **Preview Deployments**: Test every PR before merging
- ✅ **Easy Custom Domains**: djslammer.com setup is simple

### Initial Setup

✅ **Already Connected!**

The project is already connected to Vercel:
- **Vercel Project**: [clinton-reeves-projects/dj-slammer-app](https://vercel.com/clinton-reeves-projects/dj-slammer-app)
- **Auto-Deploy**: Every git push to main automatically deploys
- **Build Settings**: Already configured (Vite auto-detected)

**Current Configuration:**
```
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

**To Deploy Changes:**
1. Commit your changes: `git add . && git commit -m "Your message"`
2. Push to main: `git push origin main`
3. Vercel automatically builds and deploys
4. Check deployment status at https://vercel.com/clinton-reeves-projects/dj-slammer-app

### Vercel Configuration

Create `vercel.json` in project root:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "headers": [
    {
      "source": "/audio/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    },
    {
      "source": "/(.*)",
      "headers": [
        {
          "key": "X-Content-Type-Options",
          "value": "nosniff"
        },
        {
          "key": "X-Frame-Options",
          "value": "DENY"
        },
        {
          "key": "X-XSS-Protection",
          "value": "1; mode=block"
        }
      ]
    }
  ],
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### Custom Domain Setup

1. **Add Domain in Vercel**
   - Go to Project Settings → Domains
   - Add `djslammer.com` and `www.djslammer.com`

2. **Configure DNS** (at your domain registrar)
   ```
   Type: A
   Name: @
   Value: 76.76.21.21

   Type: CNAME
   Name: www
   Value: cname.vercel-dns.com
   ```

3. **Wait for Propagation** (5-30 minutes)
4. **HTTPS Auto-Enabled** (Let's Encrypt certificate)

### Deployment URLs

- **Current Vercel URL**: `https://dj-slammer-app-clinton-reeves-projects.vercel.app`
- **Vercel Dashboard**: [https://vercel.com/clinton-reeves-projects/dj-slammer-app](https://vercel.com/clinton-reeves-projects/dj-slammer-app)
- **Future Custom Domain**: `https://djslammer.com` (when configured)
- **Preview (PR)**: `https://dj-slammer-app-git-{branch}-clinton-reeves-projects.vercel.app`

---

## Audio File Optimization

### Why It Matters

Audio files are the largest assets in DJ Slammer. Optimization ensures:
- Fast load times (<2 seconds target)
- Lower bandwidth costs
- Better mobile performance
- Vercel free tier compliance

### Recommended Audio Format

**MP3 at 128kbps** - Best balance of quality and file size for learning

### Optimization Script

Install ffmpeg: `brew install ffmpeg` (Mac) or `apt-get install ffmpeg` (Linux)

Create `scripts/optimize-audio.sh`:
```bash
#!/bin/bash
# Optimize audio files for web deployment

for file in public/audio/*.{wav,mp3,m4a}; do
  if [ -f "$file" ]; then
    filename=$(basename "$file")
    name="${filename%.*}"

    echo "Optimizing $filename..."

    # Convert to MP3 at 128kbps (good quality, small size)
    ffmpeg -i "$file" \
      -codec:a libmp3lame \
      -b:a 128k \
      -ar 44100 \
      -ac 2 \
      "public/audio/${name}_optimized.mp3" \
      -y

    echo "✓ Created ${name}_optimized.mp3"
  fi
done

echo "All audio files optimized!"
```

Run: `chmod +x scripts/optimize-audio.sh && ./scripts/optimize-audio.sh`

### Target File Sizes

- **Demo track (3 min)**: ~2-3 MB @ 128kbps
- **Total for MVP (4 tracks)**: ~10-12 MB
- **Acceptable for Vercel**: Yes (well within limits)

---

## Environment Configuration

### Environment Variables

If needed, add in Vercel dashboard (Settings → Environment Variables):

```
# Future: Analytics tracking
VITE_ANALYTICS_ID=

# Future: Feature flags
VITE_ENABLE_PRACTICE_MODE=true
VITE_ENABLE_LESSON_SELECTOR=true

# Future: API endpoints (when backend is added)
VITE_API_URL=https://api.djslammer.com
```

Access in code:
```typescript
const analyticsId = import.meta.env.VITE_ANALYTICS_ID;
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] All audio files optimized (<3MB each)
- [ ] Test audio playback in production build (`npm run build && npm run preview`)
- [ ] Verify "Tap to enable audio" button works
- [ ] Test on multiple devices (desktop, tablet, phone)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari)
- [ ] Check console for errors (`npm run build`)
- [ ] Verify all tutorial steps work correctly
- [ ] Test highlighting system visibility
- [ ] Confirm professional aesthetic (no baby elements)

### Post-Deployment

- [ ] Test deployed site on real devices
- [ ] Verify audio files load quickly (<2 seconds)
- [ ] Check HTTPS is working (required for Web Audio API)
- [ ] Test mobile responsiveness
- [ ] Verify custom domain works (if configured)
- [ ] Check Vercel analytics for load times
- [ ] Monitor bandwidth usage (should stay under 100GB/month)
- [ ] Test browser autoplay policies work correctly

### Performance Monitoring

Check Vercel Analytics:
- **Lighthouse Score**: Aim for >90
- **Time to Interactive**: <2 seconds
- **First Contentful Paint**: <1 second
- **Bandwidth Usage**: Track monthly (upgrade if >80GB)

---

## Troubleshooting

### Audio Won't Play

**Symptom**: "Tap to enable audio" button doesn't work

**Solution**:
1. Check browser console for errors
2. Verify HTTPS is enabled (required for Web Audio API)
3. Test in incognito mode (browser extensions can block)
4. Check audio file paths are correct (`/audio/track.mp3`)

### Slow Load Times

**Symptom**: App takes >3 seconds to load

**Solutions**:
1. Optimize audio files (run optimization script)
2. Check Vercel analytics for bottlenecks
3. Verify CDN caching is working (check response headers)
4. Consider lazy-loading non-critical components

### Build Failures

**Symptom**: Deployment fails in Vercel

**Solutions**:
1. Run `npm run build` locally to see errors
2. Check Node version matches (18.x recommended)
3. Verify all dependencies are in `package.json`
4. Clear Vercel cache and redeploy

### Bandwidth Exceeded

**Symptom**: Vercel warns about bandwidth usage

**Solutions**:
1. Optimize audio files further (reduce bitrate)
2. Implement audio file lazy loading
3. Consider upgrade to Vercel Pro ($20/month)
4. Use external CDN for audio files (Cloudflare R2, AWS S3)

---

## Future: Scaling Beyond Vercel

When you need backend features (user accounts, progress tracking):

### Option 1: Vercel Serverless Functions
- Add API routes in `/api` directory
- Use Vercel KV or Upstash for database
- Keep frontend + backend on Vercel

### Option 2: Separate Backend
- Frontend: Vercel (static hosting)
- Backend: Railway, Fly.io, or Supabase
- Connect via API endpoints

### Option 3: Full-Stack Platform
- Migrate to Next.js on Vercel
- Use Vercel Postgres or Supabase
- Single platform for everything

---

# How to Deploy Backend Updates

## Files to Add to GitHub:

1. **Create `api` folder** in your repo
2. **Add these 2 files to the `api` folder:**
   - `save-response.js`
   - `get-responses.js`
3. **Add `admin.html`** to the root (same level as index.html)
4. **Update `index.html`** with the new showResults() function

## Quick Steps:

### Option 1: Upload via GitHub Web Interface
1. Go to https://github.com/clintoncreeves/dj-slammer-app
2. Click "Add file" → "Create new file"
3. Type `api/save-response.js` as filename (this creates the folder)
4. Paste the content from `/api/save-response.js`
5. Commit
6. Repeat for `api/get-responses.js`
7. Upload `admin.html`
8. Edit `index.html` to update the showResults() function

### Option 2: Use Terminal
```bash
cd ~/Downloads/dj-slammer-app-with-backend
git add .
git commit -m "Add backend to capture responses"
git push origin main
```

## After Deployment:

- Quiz still works at: `https://your-app.vercel.app`
- View responses at: `https://your-app.vercel.app/admin.html`
- Responses auto-save to your Upstash KV database
- Copy button still works as backup

## What Gets Saved:
- All 4 quiz answers
- Timestamp when submitted
- Unique response ID
- Accessible via admin dashboard

No configuration needed - it will automatically connect to your `upstash-kv-teal-yacht` database!
