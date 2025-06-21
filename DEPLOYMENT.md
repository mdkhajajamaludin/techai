# 🚀 Namtech AI Assistant - Deployment Guide

## Quick Deploy Options

### 1. Vercel (Recommended) ⭐

**Why Vercel?**
- Built for Next.js
- Automatic deployments
- Excellent free tier
- Global CDN
- Easy environment variable management

**Steps:**
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and sign up
3. Click "New Project" → Import from GitHub
4. Add environment variables in project settings:
   ```
   A4F_API_KEY=ddc-a4f-b1f27279dbae42939275111fc1923be5
   GOOGLE_AI_API_KEY=your_gemini_key
   E2B_API_KEY=your_e2b_key
   NEXT_PUBLIC_SITE_URL=your-app.vercel.app
   ```
5. Deploy! 🎉

### 2. Netlify

**Steps:**
1. Build the app: `npm run build`
2. Go to [netlify.com](https://netlify.com)
3. Drag and drop the `out` folder
4. Add environment variables in site settings

### 3. Railway

**Steps:**
1. Go to [railway.app](https://railway.app)
2. Connect GitHub repository
3. Add environment variables
4. Deploy automatically

## Environment Variables Required

```bash
# Essential
A4F_API_KEY=ddc-a4f-b1f27279dbae42939275111fc1923be5
GOOGLE_AI_API_KEY=your_gemini_api_key
E2B_API_KEY=your_e2b_api_key

# Optional
NEXT_PUBLIC_SITE_URL=your-domain.com
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

## Custom Domain Setup

1. **Vercel**: Project Settings → Domains → Add your domain
2. **Netlify**: Site Settings → Domain Management → Add custom domain
3. Update DNS records as instructed by the platform

## Performance Tips

- Enable caching for static assets
- Use CDN for global distribution
- Monitor API usage and costs
- Set up error tracking (Sentry)

## Security Checklist

- ✅ API keys in environment variables (not in code)
- ✅ CORS properly configured
- ✅ Rate limiting enabled
- ✅ HTTPS enforced
- ✅ No sensitive data in client-side code

## Monitoring

- Set up uptime monitoring
- Monitor API usage and costs
- Track user analytics (PostHog)
- Set up error alerts

## Troubleshooting

**Common Issues:**
- **Dependency conflicts**: Fixed with compatible versions (ai@3.4.33, openai@4.104.0)
- **Build failures**: Check Node.js version compatibility
- **API errors**: Verify environment variables
- **CORS issues**: Check API endpoint configurations
- **Performance**: Optimize images and enable caching

**Vercel Deployment Issues:**
- If you get npm dependency conflicts, the `.npmrc` file should resolve them
- Make sure you're using the correct package versions as specified in package.json

**Support:**
- Check deployment logs
- Verify environment variables
- Test API endpoints individually
- Monitor browser console for errors
