# DJ Slammer App

A DJ learning experience app for kids, starting with surveys to understand user needs.

## 📁 Project Structure

```
dj-slammer-app/
├── public/              # Frontend files
│   ├── index.html       # Home page
│   ├── tanner-survey.html
│   ├── parent-survey.html
│   ├── admin.html       # Admin dashboard
│   ├── css/            # Stylesheets (future)
│   ├── js/             # Client-side scripts (future)
│   └── assets/         # Images, fonts, etc (future)
├── api/                # Serverless API endpoints
│   ├── save-response.js
│   ├── get-responses.js
│   ├── save-parent-response.js
│   └── get-parent-responses.js
├── docs/               # Documentation
│   ├── DEPLOYMENT.md
│   └── PARENT_SURVEY_DEPLOYMENT.md
└── .vercel/            # Vercel deployment config
```

## 🚀 Quick Start

1. **Local Development**
   ```bash
   # Install Vercel CLI if needed
   npm i -g vercel
   
   # Run locally
   vercel dev
   ```

2. **Deploy**
   ```bash
   vercel --prod
   ```

## 🔗 Links

- **Live App**: [Your Vercel URL]
- **Admin Dashboard**: `/admin.html`

## 🛠 Tech Stack

- **Frontend**: HTML, CSS, JavaScript (vanilla)
- **Backend**: Vercel Serverless Functions
- **Database**: Upstash KV (Redis)
- **Hosting**: Vercel

## 📝 Current Features

- Home page with survey links
- Tanner's survey (4 questions about app vision)
- Parent survey (4 questions about setup/experience)
- Admin dashboard to view responses
- Backend API to save/retrieve responses

## 🎯 Next Steps

- Extract CSS into separate files
- Extract JavaScript into modules
- Add more interactive DJ features
- Build the actual DJ learning app based on survey feedback
