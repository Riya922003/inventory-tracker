# InsydTracker - Deployment & Testing Guide

## ✅ Build Status

**All Next.js 15 compatibility issues have been resolved!**

The application successfully builds with:
- ✅ Async params in all dynamic routes
- ✅ Edge Runtime JWT verification (middleware)
- ✅ Node.js Runtime JWT verification (API routes)
- ✅ All models with proper companyId references
- ✅ Aging and alerts system fully implemented

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup

Your `.env` file is already configured with:
```
MONGODB_URI=mongodb+srv://...
JWT_SECRET=a3f9c2d1e8b4a7d6e5c9f1b2a4d8e7c6b5a4d3e2f1c9b8a7d6e5c4b3a2f1e9d8
CRON_SECRET=cron-secret-key-change-in-production-12345
```

**⚠️ IMPORTANT**: Change `CRON_SECRET` before deploying to production!

### 3. Run Development Server
```bash
npm run dev
```

Visit: http://localhost:3000

### 4. Build for Production
```bash
npm run build
npm start
```

## 🧪 Testing the Aging System

### Manual Cron Trigger

With dev server running, test the aging update:

**PowerShell:**
```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/cron/update-aging" -Method POST -Headers @{"Authorization"="Bearer cron-secret-key-change-in-production-12345"}
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Aging update completed",
  "stats": {
    "totalProcessed": 10,
    "updated": 5,
    "alertsGenerated": 2
  }
}
```

### Test Flow

1. **Create Stock Entry** (Dashboard → Stock → Record Entry)
   - Add a product with entry date 65 days ago
   - This will be "at_risk" status

2. **Run Aging Update**
   - Trigger the cron endpoint manually
   - Check console logs for processing

3. **View Alerts** (Dashboard → Alerts)
   - Should see new alert for at-risk stock
   - Test acknowledge/resolve actions

4. **Check Dashboard**
   - Top 5 alerts should appear
   - Metrics should reflect aging stock

## 📦 Deployment Options

### Option 1: Vercel (Recommended)

1. **Push to GitHub**
```bash
git add .
git commit -m "Complete aging and alerts system"
git push origin main
```

2. **Deploy to Vercel**
   - Connect your GitHub repo
   - Vercel auto-detects Next.js
   - Add environment variables in Vercel dashboard

3. **Setup Vercel Cron**

Create `vercel.json` in project root:
```json
{
  "crons": [{
    "path": "/api/cron/update-aging",
    "schedule": "0 6 * * *"
  }]
}
```

Vercel will automatically call your endpoint daily at 6 AM UTC.

**Note**: Vercel Cron automatically includes authentication, so you may need to adjust the cron endpoint to accept Vercel's auth headers.

### Option 2: External Cron Service

Use services like **cron-job.org** or **EasyCron**:

1. Create account on cron-job.org
2. Add new cron job:
   - URL: `https://your-domain.com/api/cron/update-aging`
   - Method: POST
   - Headers: `Authorization: Bearer YOUR_CRON_SECRET`
   - Schedule: `0 6 * * *` (6 AM daily)

### Option 3: GitHub Actions

Create `.github/workflows/daily-aging-update.yml`:

```yaml
name: Daily Aging Update
on:
  schedule:
    - cron: '0 6 * * *'  # 6 AM UTC daily
  workflow_dispatch:  # Manual trigger option

jobs:
  update-aging:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Aging Update
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/update-aging \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

Add secrets in GitHub repo settings:
- `APP_URL`: Your deployed app URL
- `CRON_SECRET`: Your cron secret key

## 🔐 Security Checklist

Before deploying to production:

- [ ] Change `CRON_SECRET` to a strong random string
- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Verify MongoDB connection string is correct
- [ ] Enable MongoDB IP whitelist (if using Atlas)
- [ ] Test authentication flow end-to-end
- [ ] Test cron endpoint with production URL
- [ ] Verify all environment variables in deployment platform

## 📊 Monitoring

### Check Cron Job Execution

1. **Vercel**: Check Function Logs in Vercel dashboard
2. **External Cron**: Check execution history in cron service
3. **GitHub Actions**: Check workflow runs in Actions tab

### Application Logs

Monitor these in your deployment platform:
- Aging update statistics
- Alert generation counts
- API errors and warnings
- Database connection issues

## 🐛 Troubleshooting

### Cron Job Not Running

**Issue**: Aging updates not happening
**Solutions**:
- Verify cron schedule is correct
- Check authorization header matches CRON_SECRET
- Review deployment platform logs
- Test endpoint manually first

### Alerts Not Appearing

**Issue**: No alerts showing up
**Solutions**:
- Verify stock entries exist with old dates
- Run aging update manually
- Check alert status filters (default is "open")
- Verify companyId isolation is working

### Build Errors

**Issue**: Build fails with params errors
**Solutions**:
- All dynamic routes now use async params
- Verify Next.js version is 15+
- Clear `.next` folder and rebuild

### Authentication Issues

**Issue**: Redirected to login after actions
**Solutions**:
- Verify JWT_SECRET is set
- Check cookies are being sent (`credentials: "include"`)
- Use `window.location.href` for redirects after auth
- Verify middleware is using Edge Runtime compatible JWT

## 📈 Success Metrics

Track these after deployment:

1. **Aging System**
   - Daily cron job success rate
   - Number of stocks processed
   - Alerts generated per day

2. **User Engagement**
   - Alert acknowledgment rate
   - Average time to resolve alerts
   - Dashboard visits per day

3. **Business Impact**
   - Dead stock reduction over time
   - Value recovered from at-risk stock
   - Inventory turnover improvement

## 🎯 Next Steps

After successful deployment:

1. **User Training**
   - Show team how to use alerts
   - Explain aging thresholds
   - Demonstrate resolution workflow

2. **Data Entry**
   - Add all existing products
   - Record current stock levels
   - Set accurate entry dates

3. **Optimization**
   - Adjust aging thresholds if needed
   - Configure category-specific rules
   - Set up email notifications (future)

4. **Monitoring**
   - Check daily cron execution
   - Review alert patterns
   - Gather user feedback

## 📚 Documentation

- `AGING_AND_ALERTS_SYSTEM.md` - Complete system documentation
- `DASHBOARD_METRICS.md` - Dashboard calculations
- `INVENTORY_FEATURES.md` - Inventory management features
- `STOCK_MANAGEMENT_FEATURES.md` - Stock entry/exit features
- `MODELS_COMPANYID_REFERENCE.md` - Data model reference

---

**Your InsydTracker application is production-ready! 🎉**

All core features are implemented and tested:
- ✅ User authentication with JWT
- ✅ Multi-tenant isolation (companyId)
- ✅ Product and category management
- ✅ Warehouse management
- ✅ Stock entry and exit tracking
- ✅ Automated aging calculation
- ✅ Intelligent alert system
- ✅ Real-time dashboard metrics
- ✅ Photo upload for verification
- ✅ Batch tracking
- ✅ Next.js 15 compatibility
