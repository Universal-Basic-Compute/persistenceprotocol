import { NextResponse } from 'next/server';
import { API_BASE_URL, BLUEPRINT_ID, AVAILABLE_MODELS } from '../config';

/**
 * Maintenance endpoint that runs daily via cron job
 * Performs health checks and ensures all models are operational
 */
export async function GET() {
  try {
    // Log maintenance start
    console.log('Starting daily maintenance check');
    
    // Check each model's health
    const modelChecks = await Promise.allSettled(
      AVAILABLE_MODELS.map(async (model) => {
        try {
          const response = await fetch(
            `${API_BASE_URL}/blueprints/${BLUEPRINT_ID}/kins/${model.id}/health`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
              cache: 'no-store',
            }
          );
          
          if (!response.ok) {
            throw new Error(`Health check failed for ${model.name} with status ${response.status}`);
          }
          
          return {
            model: model.name,
            status: 'healthy',
            timestamp: new Date().toISOString()
          };
        } catch (error) {
          console.error(`Health check failed for ${model.name}:`, error);
          return {
            model: model.name,
            status: 'unhealthy',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          };
        }
      })
    );
    
    // Compile results
    const results = {
      timestamp: new Date().toISOString(),
      checks: modelChecks.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          return {
            model: AVAILABLE_MODELS[index].name,
            status: 'check_failed',
            error: result.reason,
            timestamp: new Date().toISOString()
          };
        }
      }),
      summary: {
        total: AVAILABLE_MODELS.length,
        healthy: modelChecks.filter(r => r.status === 'fulfilled' && r.value.status === 'healthy').length,
        unhealthy: modelChecks.filter(r => r.status === 'fulfilled' && r.value.status === 'unhealthy').length,
        failed_checks: modelChecks.filter(r => r.status === 'rejected').length
      }
    };
    
    console.log('Maintenance check completed', results.summary);
    
    return NextResponse.json(results);
  } catch (error) {
    console.error('Maintenance check failed:', error);
    
    return NextResponse.json(
      {
        error: 'Maintenance check failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
