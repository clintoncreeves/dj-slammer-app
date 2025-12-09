/**
 * Performance measurement utilities for DJ Slammer App
 * 
 * Measures audio latency and other performance metrics
 */

interface PerformanceMark {
  name: string;
  timestamp: number;
}

interface LatencyMeasurement {
  action: string;
  latency: number;
  timestamp: number;
}

class PerformanceMonitor {
  private marks: Map<string, PerformanceMark> = new Map();
  private measurements: LatencyMeasurement[] = [];

  /**
   * Mark the start of a performance measurement
   */
  mark(name: string): void {
    this.marks.set(name, {
      name,
      timestamp: performance.now(),
    });
  }

  /**
   * Measure latency from a previous mark to now
   */
  measure(name: string, startMark: string): number | null {
    const start = this.marks.get(startMark);
    if (!start) {
      console.warn(`No mark found for ${startMark}`);
      return null;
    }

    const latency = performance.now() - start.timestamp;
    
    this.measurements.push({
      action: name,
      latency,
      timestamp: Date.now(),
    });

    // Clean up old mark
    this.marks.delete(startMark);

    return latency;
  }

  /**
   * Get all measurements
   */
  getMeasurements(): LatencyMeasurement[] {
    return [...this.measurements];
  }

  /**
   * Get average latency for an action
   */
  getAverageLatency(action: string): number | null {
    const filtered = this.measurements.filter(m => m.action === action);
    if (filtered.length === 0) return null;

    const sum = filtered.reduce((acc, m) => acc + m.latency, 0);
    return sum / filtered.length;
  }

  /**
   * Clear all measurements
   */
  clear(): void {
    this.marks.clear();
    this.measurements = [];
  }

  /**
   * Log performance report to console
   */
  report(): void {
    console.log('=== Performance Report ===');
    
    // Group by action
    const byAction = new Map<string, number[]>();
    this.measurements.forEach(m => {
      if (!byAction.has(m.action)) {
        byAction.set(m.action, []);
      }
      byAction.get(m.action)!.push(m.latency);
    });

    byAction.forEach((latencies, action) => {
      const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const min = Math.min(...latencies);
      const max = Math.max(...latencies);
      
      console.log(`${action}:`);
      console.log(`  Avg: ${avg.toFixed(2)}ms | Min: ${min.toFixed(2)}ms | Max: ${max.toFixed(2)}ms | Samples: ${latencies.length}`);
    });
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

/**
 * Measure audio latency from user interaction to sound output
 * 
 * Usage:
 * ```typescript
 * // In event handler
 * performanceMonitor.mark('play-button-click');
 * 
 * // After audio starts (in AudioEngine)
 * const latency = performanceMonitor.measure('audio-play-latency', 'play-button-click');
 * console.log(`Audio latency: ${latency}ms`);
 * ```
 */
export function measureAudioLatency(action: string): void {
  performanceMonitor.mark(`${action}-start`);
}

/**
 * Complete audio latency measurement
 */
export function completeAudioLatency(action: string): number | null {
  return performanceMonitor.measure(`${action}-latency`, `${action}-start`);
}

/**
 * Check if latency is within target (50ms)
 */
export function isLatencyAcceptable(latency: number): boolean {
  return latency < 50;
}

/**
 * Format latency for display
 */
export function formatLatency(latency: number): string {
  const status = isLatencyAcceptable(latency) ? '✅' : '⚠️';
  return `${status} ${latency.toFixed(2)}ms`;
}
