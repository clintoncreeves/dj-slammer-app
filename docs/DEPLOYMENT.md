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
