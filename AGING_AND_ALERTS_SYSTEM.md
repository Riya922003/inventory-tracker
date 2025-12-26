# Aging & Alerts System - Core Intelligence Layer

## 🎯 **The Differentiator**

This is what transforms InsydTracker from a basic inventory app into an **intelligent inventory management system**. The aging tracking and automated alerts provide proactive insights that save money and prevent losses.

## ✅ Implemented Features

### 1. **Automated Aging Calculation**

#### Daily Cron Job (`/api/cron/update-aging`)
Runs daily at 6 AM to:
- Calculate age for all stock entries
- Update stock status (healthy → at_risk → dead)
- Generate alerts for status changes
- Track aging trends

#### Aging Logic:
```typescript
Age (days) = (Today - Entry Date) / (24 hours)

Status Rules:
- age < 60 days  → healthy
- age >= 60 days → at_risk
- age >= 90 days → dead
```

#### What Gets Updated:
- `stock.ageInDays` - Current age in days
- `stock.status` - Current health status
- Alerts generated when status changes

### 2. **Alert Model**

Complete alert tracking with:

#### Alert Types:
- **dead_inventory**: Stock that's been idle for 90+ days
- **aging**: Stock approaching dead status (60-89 days)
- **low_stock**: Below reorder level (future)
- **expiry_warning**: Approaching expiry date (future)

#### Severity Levels:
- **Critical**: Immediate action required (dead stock)
- **Warning**: Preventive action needed (aging stock)
- **Info**: Informational alerts

#### Alert Status Flow:
```
Open → Acknowledged → Resolved
  ↓
Dismissed
```

#### Alert Data:
- Product and warehouse information
- Age, quantity, and value
- Specific recommendations
- Who acknowledged/resolved
- Resolution notes

### 3. **Alerts Page** (`/dashboard/alerts`)

Comprehensive alert management with:

#### Summary Cards:
- Critical alerts count (red)
- Warning alerts count (orange)
- Info alerts count (blue)

#### Filters:
- **Status**: Open, Acknowledged, Resolved, Dismissed, All
- **Type**: Dead Inventory, Aging, Low Stock, Expiry
- **Severity**: Critical, Warning, Info
- **Warehouse**: Filter by location

#### Alert Cards:
- Severity icon and badge
- Status badge
- Product and warehouse info
- Age and value metadata
- Quick actions (View, Acknowledge, Dismiss)

#### Detail Modal:
- Full alert information
- Detailed recommendation
- Product and warehouse details
- Metadata (age, quantity, value)
- Action buttons (Acknowledge, Resolve, Dismiss)

### 4. **Alert Actions**

#### Acknowledge:
- Mark alert as seen
- Track who acknowledged
- Timestamp the acknowledgment
- Alert stays visible but marked

#### Resolve:
- Mark issue as fixed
- Add resolution notes
- Track who resolved
- Timestamp the resolution
- Alert moves to resolved status

#### Dismiss:
- Remove from active view
- No action taken
- Can still be viewed in "Dismissed" filter

## API Endpoints

### Cron Job API

#### POST `/api/cron/update-aging`
**Purpose**: Daily aging calculation and alert generation

**Authentication**: Bearer token (CRON_SECRET)

**Headers**:
```
Authorization: Bearer {CRON_SECRET}
```

**Process**:
1. Fetch all stock entries
2. Calculate age for each
3. Determine new status
4. Update stock records
5. Generate alerts for status changes
6. Return statistics

**Response**:
```typescript
{
  success: true
  message: "Aging update completed"
  stats: {
    totalProcessed: number
    updated: number
    alertsGenerated: number
  }
}
```

**Cron Schedule**: Daily at 6:00 AM
```
0 6 * * * (cron expression)
```

### Alerts API

#### GET `/api/alerts`
**Purpose**: List all alerts with filters

**Query Parameters**:
- `status`: open | acknowledged | resolved | dismissed | all
- `type`: dead_inventory | aging | low_stock | expiry_warning
- `severity`: critical | warning | info
- `warehouseId`: Filter by warehouse

**Response**:
```typescript
{
  success: true
  alerts: Alert[]
  grouped: {
    critical: Alert[]
    warning: Alert[]
    info: Alert[]
  }
  total: number
  counts: {
    critical: number
    warning: number
    info: number
  }
}
```

#### GET `/api/alerts/[id]`
**Purpose**: Get single alert details

**Response**:
```typescript
{
  success: true
  alert: {
    ...alertData
    productId: { name, sku, unitPrice }
    warehouseId: { name, address }
    stockId: { batchId, quantityAvailable, ageInDays }
    acknowledgedBy: { name, email }
    resolvedBy: { name, email }
  }
}
```

#### PATCH `/api/alerts/[id]`
**Purpose**: Update alert status

**Body**:
```typescript
{
  action: "acknowledge" | "resolve" | "dismiss"
  notes?: string  // For resolve action
}
```

**Response**:
```typescript
{
  success: true
  message: "Alert {action}d successfully"
  alert: UpdatedAlert
}
```

## Business Intelligence

### What the System Provides:

#### 1. **Proactive Monitoring**
- Automatic detection of aging stock
- No manual checking required
- Daily updates ensure accuracy

#### 2. **Financial Protection**
- Identify dead stock before it's too late
- Calculate exact value at risk
- Prevent further losses

#### 3. **Actionable Insights**
- Specific recommendations per alert
- Prioritized by severity
- Warehouse-specific actions

#### 4. **Accountability**
- Track who acknowledged alerts
- Record resolution actions
- Audit trail for decisions

#### 5. **Trend Analysis**
- See which products age quickly
- Identify problematic warehouses
- Optimize purchasing decisions

## Alert Generation Logic

### When Alerts Are Created:

```typescript
Stock Status Change:
  healthy → at_risk  → Generate WARNING alert
  at_risk → dead     → Generate CRITICAL alert
  healthy → dead     → Generate CRITICAL alert

Alert Content:
  Title: "{Status} Alert: {Product Name}"
  Message: Quantity, age, warehouse, value
  Recommendation: Specific action based on status
  Metadata: Age, quantity, value for tracking
```

### Alert Deduplication:

- Check for existing open/acknowledged alerts
- Don't create duplicate alerts for same stock
- Only generate when status actually changes

## Setup Instructions

### 1. **Environment Variables**

Add to `.env`:
```
CRON_SECRET=your-secure-random-string-here
```

### 2. **Cron Job Setup**

#### Option A: Vercel Cron (Recommended for Vercel deployments)

Create `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/update-aging",
    "schedule": "0 6 * * *"
  }]
}
```

#### Option B: External Cron Service

Use services like:
- **cron-job.org**
- **EasyCron**
- **GitHub Actions**

Setup:
```bash
curl -X POST https://your-domain.com/api/cron/update-aging \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Schedule: Daily at 6:00 AM

#### Option C: GitHub Actions

Create `.github/workflows/daily-aging-update.yml`:
```yaml
name: Daily Aging Update
on:
  schedule:
    - cron: '0 6 * * *'  # 6 AM UTC daily
  workflow_dispatch:  # Manual trigger

jobs:
  update-aging:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger Aging Update
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/update-aging \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

### 3. **Testing the Cron Job**

Manual trigger for testing:
```bash
curl -X POST http://localhost:3000/api/cron/update-aging \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Performance Considerations

### Optimizations:
- Batch updates (not individual saves)
- Single query to fetch all stocks
- In-memory calculations
- Efficient status comparison
- Alert deduplication

### Scalability:
- Handles thousands of stock entries
- O(n) complexity
- No nested queries
- Suitable for production use

### Monitoring:
- Console logs for each run
- Statistics returned (processed, updated, alerts)
- Error handling and reporting

## Future Enhancements

### Planned Features:
- [ ] Configurable aging thresholds per category
- [ ] Email notifications for critical alerts
- [ ] SMS alerts for urgent issues
- [ ] Slack/Teams integration
- [ ] Alert escalation (if not acknowledged in X days)
- [ ] Bulk alert actions
- [ ] Alert analytics and trends
- [ ] Predictive alerts (ML-based)
- [ ] Custom alert rules
- [ ] Alert templates

### Advanced Intelligence:
- [ ] Seasonal aging patterns
- [ ] Category-specific thresholds
- [ ] Warehouse-specific rules
- [ ] Product velocity tracking
- [ ] Automatic reorder suggestions
- [ ] Price optimization recommendations
- [ ] Supplier performance alerts

## Integration Points

### Current:
- Dashboard shows top 5 alerts
- Alerts page for full management
- Stock status reflects aging
- Company-isolated data

### Future:
- Email digest (daily summary)
- Push notifications (mobile app)
- Webhook integrations
- API for external systems
- Export alerts to CSV/PDF
- Calendar integration for follow-ups

## Business Value

### ROI Metrics:

1. **Time Saved**
   - No manual aging checks
   - Automated monitoring 24/7
   - Instant alert generation

2. **Money Saved**
   - Early detection prevents losses
   - Proactive action on at-risk stock
   - Optimized liquidation timing

3. **Decision Quality**
   - Data-driven recommendations
   - Prioritized by severity
   - Historical tracking

4. **Operational Efficiency**
   - Centralized alert management
   - Clear action items
   - Accountability tracking

## Success Metrics

Track these KPIs:
- Average time to acknowledge alerts
- Alert resolution rate
- Dead stock reduction over time
- Value recovered from at-risk stock
- Alert accuracy (false positives)
- User engagement with alerts

---

**This aging and alerts system is the core differentiator that makes InsydTracker a truly intelligent inventory management solution, not just a basic tracking app.**
