# Compliance Automation - Cron Job Setup Guide

## Quick Start

### 1. Install Dependencies
```bash
cd apps/smartpay-backend
npm install
```

### 2. Run Database Migration
```bash
npm run migrate
```

Or manually:
```bash
tsx scripts/runMigrations.ts
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

**Required Variables**:
```bash
# Database
DATABASE_URL=postgresql://...

# SendGrid (Email)
SENDGRID_API_KEY=your-key-here
SMTP_FROM_EMAIL=compliance@smartpay.na

# Twilio (SMS)
TWILIO_ACCOUNT_SID=your-sid
TWILIO_AUTH_TOKEN=your-token
TWILIO_PHONE_NUMBER=+264811234567

# BoN Configuration
BON_LICENSE_NUMBER=PSP-2024-001
BON_CONTACT_EMAIL=compliance@smartpay.na

# Trust Account
TRUST_ACCOUNT_BANK=First National Bank Namibia
TRUST_ACCOUNT_NUMBER=62000000000

# Enable Automation
ENABLE_COMPLIANCE_AUTOMATION=true
```

### 4. Seed Trust Account (First Time Only)
```sql
INSERT INTO trust_accounts (
  bank_name, 
  account_number, 
  is_primary, 
  bank_code,
  status
) VALUES (
  'First National Bank Namibia',
  '62000000000',
  true,
  'FNB',
  'ACTIVE'
);
```

### 5. Initialize Jobs in Your Server

Add to `src/index.ts`:

```typescript
import { initializeComplianceJobs } from './jobs';

// ... existing server setup ...

// Start compliance automation jobs
if (process.env.ENABLE_COMPLIANCE_AUTOMATION === 'true') {
  initializeComplianceJobs();
  console.log('✓ Compliance automation jobs initialized');
}

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
```

### 6. Start Your Server
```bash
npm run dev
```

You should see:
```
=============================================================
INITIALIZING COMPLIANCE AUTOMATION JOBS
=============================================================

[Jobs] Starting Trust Account Reconciliation Job...
[Reconciliation Job] Trust account reconciliation job scheduled
[Reconciliation Job] Next run: Daily at 00:30 Windhoek time

[Jobs] Starting KRI Collector Job...
[KRI Job] KRI collector job scheduled
[KRI Job] Next run: Daily at 01:00 Windhoek time

... (all 9 jobs initialized) ...

=============================================================
ALL COMPLIANCE JOBS INITIALIZED SUCCESSFULLY
=============================================================
```

---

## Manual Testing

### Test Each Job Individually

#### 1. Trust Account Reconciliation
```bash
# CLI method
tsx src/jobs/trust-reconciliation.ts

# API method
curl -X POST http://localhost:4000/api/v1/compliance/reconciliation/trigger
```

#### 2. KRI Collection
```bash
# CLI method
tsx src/jobs/kri-collector.ts

# API method
curl -X POST http://localhost:4000/api/v1/compliance/kri/collect
```

#### 3. Health Check
```bash
# CLI method
tsx src/jobs/uptime-monitor.ts

# API method
curl http://localhost:4000/health/detailed
```

#### 4. BoN Incident Processing
```bash
# CLI method
tsx src/jobs/bon-incident-reporter.ts
```

#### 5. View Job Schedule
```bash
tsx src/jobs/index.ts
```

---

## Cron Job Schedule

| Job | Schedule | Description |
|-----|----------|-------------|
| Trust Reconciliation | `30 0 * * *` | Daily at 00:30 |
| KRI Collection | `0 1 * * *` | Daily at 01:00 |
| Uptime Monitoring | `* * * * *` | Every 1 minute |
| Daily Uptime Summary | `55 23 * * *` | Daily at 23:55 |
| SLA Compliance Check | `0 8 * * 1` | Monday at 08:00 |
| BoN Incident Reporter | `15 * * * *` | Hourly at :15 |
| BoN Retry | `*/30 * * * *` | Every 30 minutes |
| BoN Overdue Check | `0 */4 * * *` | Every 4 hours |
| Notification Processing | `* * * * *` | Every 1 minute |

All times are in **Africa/Windhoek** timezone.

---

## Verify Jobs Are Running

### Check Logs
Look for these patterns in your server logs:

```
[Reconciliation Job] Starting daily trust account reconciliation...
[KRI Job] Collecting daily Key Risk Indicators...
[Uptime] Performing health check...
[BoN Reporter Job] Processing unreported incidents...
[Notifications] Processing pending alert notifications...
```

### Check Database
```sql
-- Check reconciliation runs
SELECT * FROM reconciliation_log 
ORDER BY reconciliation_date DESC 
LIMIT 7;

-- Check KRI collection
SELECT * FROM kri_metrics 
WHERE metric_date = CURRENT_DATE;

-- Check uptime monitoring
SELECT component, status, check_timestamp 
FROM system_uptime_metrics 
ORDER BY check_timestamp DESC 
LIMIT 20;

-- Check alerts
SELECT * FROM compliance_alerts 
WHERE resolved = false 
ORDER BY created_at DESC;
```

---

## Troubleshooting

### Jobs Not Running?

1. **Check server logs** - Are jobs being initialized?
2. **Verify .env** - Is `ENABLE_COMPLIANCE_AUTOMATION=true`?
3. **Check timezone** - Server should use Windhoek time
4. **Test manually** - Run jobs via CLI to isolate issues

### Emails Not Sending?

1. **Check SendGrid API key** - Is it valid?
2. **Check alert_notifications table** - Are notifications queued?
3. **Check logs** - Look for "[Email]" entries
4. **Test SendGrid** - Use their testing tools

### SMS Not Sending?

1. **Check Twilio credentials** - Are they correct?
2. **Phone number format** - Must be +264... format
3. **Twilio account** - Has credits?
4. **Test Twilio** - Use their testing tools

---

## Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start server with PM2
pm2 start dist/index.js --name smartpay-backend

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
```

### Using Docker

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

ENV NODE_ENV=production
ENV TZ=Africa/Windhoek

CMD ["node", "dist/index.js"]
```

### Using systemd

Create `/etc/systemd/system/smartpay-backend.service`:

```ini
[Unit]
Description=SmartPay Backend with Compliance Automation
After=network.target postgresql.service

[Service]
Type=simple
User=smartpay
WorkingDirectory=/opt/smartpay-backend
Environment=NODE_ENV=production
Environment=TZ=Africa/Windhoek
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:
```bash
sudo systemctl enable smartpay-backend
sudo systemctl start smartpay-backend
sudo systemctl status smartpay-backend
```

---

## Monitoring in Production

### Health Checks
```bash
# Basic health
curl https://api.smartpay.na/health

# Detailed health
curl https://api.smartpay.na/health/detailed

# Compliance dashboard
curl https://api.smartpay.na/api/v1/compliance/kri
```

### Log Monitoring
```bash
# PM2 logs
pm2 logs smartpay-backend

# systemd logs
journalctl -u smartpay-backend -f

# Docker logs
docker logs -f smartpay-backend
```

### Database Monitoring
```sql
-- Daily reconciliation health
SELECT 
  COUNT(*) as total_days,
  SUM(CASE WHEN is_compliant THEN 1 ELSE 0 END) as compliant_days,
  ROUND(AVG(compliance_percentage), 2) as avg_compliance
FROM reconciliation_log
WHERE reconciliation_date >= CURRENT_DATE - INTERVAL '30 days';

-- KRI health
SELECT 
  status,
  COUNT(*) as count
FROM kri_metrics
WHERE metric_date = CURRENT_DATE
GROUP BY status;

-- Uptime SLA
SELECT 
  component,
  ROUND(AVG(uptime_percentage), 2) as avg_uptime
FROM uptime_daily_summary
WHERE summary_date >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY component;
```

---

## Alerting

### Email Recipients
Configure in `.env`:
```bash
COMPLIANCE_EMAIL=compliance@smartpay.na
CFO_EMAIL=cfo@smartpay.na
CEO_EMAIL=ceo@smartpay.na
CTO_EMAIL=cto@smartpay.na
```

### SMS Recipients (Critical Only)
```bash
COMPLIANCE_SMS=+264811234567
CFO_SMS=+264XXXXXXXXX
```

### Slack Integration (Optional)
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

---

## Support

For issues or questions:
- **Technical**: george@buffrconnect.na
- **Compliance**: compliance@smartpay.na
- **Emergency**: +264811234567

---

## Additional Resources

- [Main Documentation](../../COMPLIANCE_AUTOMATION_IMPLEMENTATION.md)
- [API Endpoints](../../COMPLIANCE_AUTOMATION_IMPLEMENTATION.md#6-compliance-dashboard-api)
- [Database Schema](./migrations/012_compliance_automation.sql)
- [Environment Variables](../../COMPLIANCE_AUTOMATION_IMPLEMENTATION.md#9-environment-configuration)
