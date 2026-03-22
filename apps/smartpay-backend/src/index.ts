/**
 * Smartpay Backend API Server
 * Express.js server with TypeScript
 * Location: backend/src/index.ts
 */
import './preload-env';
import express, { Request, Response, NextFunction } from 'express';
import { healthCheck } from './lib/db';
import { securityHeaders, corsMiddleware, requestLogger } from './middleware/securityHeaders';
import { standardRateLimiter } from './middleware/rateLimiter';
import { initializeDataLayer, shutdownDataLayer } from './lib/agentContext';
import { withApiVersionHeader, withLegacyApiDeprecation } from './middleware/apiVersionHeaders';
import v1Router, { legacyApiRouter } from './routes/v1';
import { setupSecurityLegacyRoutes } from './security';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(securityHeaders);
app.use(corsMiddleware);
app.use(requestLogger);
app.use(standardRateLimiter);
app.use(withApiVersionHeader);

// Health check endpoints
app.get('/health', async (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'smartpay-backend',
    version: '1.0.0'
  });
});

app.get('/health/db', async (_req: Request, res: Response) => {
  try {
    const isHealthy = await healthCheck();
    
    if (isHealthy) {
      res.status(200).json({
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        status: 'error',
        database: 'disconnected',
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      database: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Root endpoint
app.get('/', (_req: Request, res: Response) => {
  res.json({
    name: 'Smartpay Backend API',
    version: '1.0.0',
    description: 'Backend API server for Smartpay Agentic Banking Copilot',
    documentation: '/api/docs',
    health: '/health',
    api: {
      canonicalBase: '/api/v1',
      legacyBase: '/api',
      headers: {
        apiVersion: 'API-Version: 1 on all /api/* responses',
        deprecation:
          'Deprecation + Warning + Link on legacy /api/* (excluding /api/v1/*) and legacy security roots',
      },
    },
    endpoints: {
      mobile: '/api/v1',
      mobileAuth: '/api/v1/auth',
      mobileHealth: '/api/v1/health',
      sendMoney: '/api/v1/send-money',
      cashOut: '/api/v1/cash-out/*',
      vouchers: '/api/v1/vouchers',
      loans: '/api/v1/loans',
      groups: '/api/v1/groups',
      proofOfLife: '/api/v1/user/profile',
      usersPin: '/api/v1/users/pin',
      usersVerifyPin: '/api/v1/users/verify-pin',
      incidents: '/api/v1/incidents',
      agents: {
        nearest: '/api/v1/agents/nearest',
        atmsNearby: '/api/v1/atms/nearby',
        locationsNampost: '/api/v1/locations/nampost',
        search: '/api/v1/agents/search',
        byRegion: '/api/v1/agents/region/:region',
        byCode: '/api/v1/agents/:agentCode',
      },
      copilot: '/api/v1/copilot',
      copilotHealth: '/api/v1/copilot/health',
      copilotTools: '/api/v1/copilot/tools',
      knowledgeSearch: '/api/v1/copilot/knowledge/search',
      knowledgeTopics: '/api/v1/copilot/knowledge/topics',
      complianceDocs: '/api/v1/compliance/docs',
      complianceValidation: '/api/v1/compliance/validate-limits',
      complianceViolations: '/api/v1/compliance/violations',
      complianceFees: '/api/v1/compliance/estimate-fees',
      complianceAlerts: '/api/v1/compliance/security-alert',
      complianceThresholds: '/api/v1/compliance/fraud-thresholds',
      complianceKRI: '/api/v1/compliance/kri-metrics',
      complianceConfig: '/api/v1/compliance/config',
      kycStatus: '/api/v1/kyc/status',
      kycSubmit: '/api/v1/kyc/submit',
      kycUploadDocuments: '/api/v1/kyc/upload-documents',
      buffr: '/api/v1/buffr',
      buffrHealth: '/api/v1/buffr/health',
      buffrCashOut: '/api/v1/buffr/cash-out',
      buffrWebhooks: '/api/v1/buffr/webhooks',
      obs: '/api/v1/obs',
      obsConsents: '/api/v1/obs/consents',
      obsAis: '/api/v1/obs/ais',
      obsPis: '/api/v1/obs/pis',
      obsBon: '/api/v1/obs/bon',
      obsMock: '/api/v1/obs/mock',
      security: {
        fraud: '/api/v1/security/fraud',
        auth: '/api/v1/security/auth',
        audit: '/api/v1/security/audit',
        payments: '/api/v1/security/payments',
        legacyFraud: '/api/fraud',
        legacyAuth: '/api/auth',
        legacyAudit: '/api/audit',
        legacyPayments: '/api/payments',
      }
    }
  });
});

// API v1 (canonical) + legacy /api/* alias (same router tree; deprecation headers on legacy)
setupSecurityLegacyRoutes(app, { wrap: withLegacyApiDeprecation });
app.use('/api/v1', v1Router);
app.use('/api', withLegacyApiDeprecation, legacyApiRouter);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: 'The requested endpoint does not exist',
    timestamp: new Date().toISOString()
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : err.message,
    timestamp: new Date().toISOString()
  });
});

// Start server
if (require.main === module) {
  const server = app.listen(PORT, async () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 Smartpay Backend API Server                     ║
║                                                       ║
║   Environment: ${process.env.NODE_ENV || 'development'}                              ║
║   Port:        ${PORT}                                    ║
║   Database:    ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}                            ║
║   Version:     1.0.0                                  ║
║                                                       ║
║   Health:      http://localhost:${PORT}/health          ║
║   Copilot:     http://localhost:${PORT}/api/v1/copilot    ║
║   API Docs:    http://localhost:${PORT}/api/docs        ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
    `);
    
    // Verify database connection on startup
    try {
      const isHealthy = await healthCheck();
      if (isHealthy) {
        console.log('✅ PostgreSQL connection verified');
      } else {
        console.warn('⚠️  PostgreSQL connection failed - check DATABASE_URL');
      }
    } catch (err) {
      console.error('❌ PostgreSQL health check error:', err);
    }
    
    // Initialize data layer (LanceDB + DuckDB) - OPTIONAL
    console.log('\n🔧 Initializing data layer...');
    try {
      await initializeDataLayer();
      console.log('✅ Data layer initialized (LanceDB + DuckDB)');
      console.log('   → Knowledge base ready for RAG queries');
      console.log('   → Analytics engine ready for DuckDB queries\n');
    } catch (err) {
      console.warn('⚠️  Data layer initialization skipped (optional for Buffr integration)');
      console.warn('   Error:', err instanceof Error ? err.message : 'Unknown error');
      console.log('   → Backend will run without DuckDB/LanceDB');
      console.log('   → Buffr integration will work normally\n');
    }
  });
  
  // Graceful shutdown
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    server.close(async () => {
      console.log('HTTP server closed');
      
      try {
        await shutdownDataLayer();
        console.log('Data layer shutdown complete');
      } catch (err) {
        console.error('Error during data layer shutdown:', err);
      }
      
      process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  };
  
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;
