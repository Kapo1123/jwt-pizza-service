const os = require('os');

class MetricsCollector {
  constructor() {
    // HTTP request metrics
    this.httpRequests = {
      total: 0,
      GET: 0,
      POST: 0,
      PUT: 0,
      DELETE: 0,
    };

    // Active users (tracking unique user IDs in current window)
    this.activeUsers = new Set();

    // Authentication metrics
    this.authAttempts = {
      successful: 0,
      failed: 0,
    };

    // Pizza metrics
    this.pizzaMetrics = {
      sold: 0,
      creationFailures: 0,
      revenue: 0,
    };

    // Latency tracking (store recent latencies for each endpoint)
    this.latencies = {
      all: [],
      pizzaCreation: [],
    };

    // System metrics
    this.systemMetrics = {
      cpu: 0,
      memory: 0,
    };

    // Update system metrics periodically
    this.updateSystemMetrics();
    setInterval(() => this.updateSystemMetrics(), 10000); // Every 10 seconds
  }

  // HTTP Request tracking
  incrementRequest(method) {
    this.httpRequests.total++;
    if (this.httpRequests[method] !== undefined) {
      this.httpRequests[method]++;
    }
  }

  // Active user tracking
  trackActiveUser(userId) {
    if (userId) {
      this.activeUsers.add(userId);
    }
  }

  getActiveUserCount() {
    return this.activeUsers.size;
  }

  resetActiveUsers() {
    this.activeUsers.clear();
  }

  // Authentication tracking
  incrementAuthSuccess() {
    this.authAttempts.successful++;
  }

  incrementAuthFailure() {
    this.authAttempts.failed++;
  }

  // Pizza metrics
  recordPizzaSale(revenue) {
    this.pizzaMetrics.sold++;
    this.pizzaMetrics.revenue += revenue;
  }

  incrementPizzaFailure() {
    this.pizzaMetrics.creationFailures++;
  }

  // Latency tracking
  recordLatency(endpoint, latencyMs) {
    this.latencies.all.push(latencyMs);
    
    if (endpoint === 'pizza') {
      this.latencies.pizzaCreation.push(latencyMs);
    }

    // Keep only last 100 entries to prevent memory bloat
    if (this.latencies.all.length > 100) {
      this.latencies.all = this.latencies.all.slice(-100);
    }
    if (this.latencies.pizzaCreation.length > 100) {
      this.latencies.pizzaCreation = this.latencies.pizzaCreation.slice(-100);
    }
  }

  getAverageLatency(type = 'all') {
    const latencies = this.latencies[type] || this.latencies.all;
    if (latencies.length === 0) return 0;
    const sum = latencies.reduce((a, b) => a + b, 0);
    return Math.round(sum / latencies.length);
  }

  // System metrics
  updateSystemMetrics() {
    this.systemMetrics.cpu = this.getCpuUsagePercentage();
    this.systemMetrics.memory = this.getMemoryUsagePercentage();
  }

  getCpuUsagePercentage() {
    const cpuUsage = os.loadavg()[0] / os.cpus().length;
    return parseFloat((cpuUsage * 100).toFixed(2));
  }

  getMemoryUsagePercentage() {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const memoryUsage = (usedMemory / totalMemory) * 100;
    return parseFloat(memoryUsage.toFixed(2));
  }

  // Get all metrics snapshot
  getMetrics() {
    return {
      httpRequests: { ...this.httpRequests },
      activeUsers: this.getActiveUserCount(),
      authAttempts: { ...this.authAttempts },
      pizzaMetrics: { ...this.pizzaMetrics },
      latency: {
        all: this.getAverageLatency('all'),
        pizzaCreation: this.getAverageLatency('pizzaCreation'),
      },
      system: { ...this.systemMetrics },
    };
  }

  // Reset counters (for per-minute calculations)
  resetCounters() {
    this.httpRequests = {
      total: 0,
      GET: 0,
      POST: 0,
      PUT: 0,
      DELETE: 0,
    };
    this.authAttempts = {
      successful: 0,
      failed: 0,
    };
    this.pizzaMetrics = {
      sold: 0,
      creationFailures: 0,
      revenue: 0,
    };
    this.latencies = {
      all: [],
      pizzaCreation: [],
    };
    // Note: activeUsers is reset separately based on reporting interval
  }
}

// Singleton instance
const metrics = new MetricsCollector();

module.exports = metrics;