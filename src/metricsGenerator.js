const config = require('./config');
const metrics = require('./metrics');

// Pull metrics-specific configuration while providing a safe fallback during tests
const metricsConfig = config.metrics ?? {};

console.log('Metrics generator loaded');
console.log('Grafana URL:', metricsConfig.url);
console.log('API Key exists:', !!metricsConfig.apiKey);

// Send metrics to Grafana every 10 seconds
setInterval(() => {
  try {
    sendMetricsToGrafana();
  } catch (error) {
    console.error('Error in metrics reporting:', error);
  }
}, 10000);

function sendMetricsToGrafana() {
  const currentMetrics = metrics.getMetrics();
  
  // 1. HTTP Requests by method/minute
  sendMetricToGrafana('http_requests_total', currentMetrics.httpRequests.total, 'gauge', 'requests');
  sendMetricToGrafana('http_requests_get', currentMetrics.httpRequests.GET, 'gauge', 'requests');
  sendMetricToGrafana('http_requests_post', currentMetrics.httpRequests.POST, 'gauge', 'requests');
  sendMetricToGrafana('http_requests_put', currentMetrics.httpRequests.PUT, 'gauge', 'requests');
  sendMetricToGrafana('http_requests_delete', currentMetrics.httpRequests.DELETE, 'gauge', 'requests');
  
  // 2. Active users
  sendMetricToGrafana('active_users', currentMetrics.activeUsers, 'gauge', 'users');
  
  // 3. Authentication attempts/minute
  sendMetricToGrafana('auth_attempts_successful', currentMetrics.authAttempts.successful, 'gauge', 'attempts');
  sendMetricToGrafana('auth_attempts_failed', currentMetrics.authAttempts.failed, 'gauge', 'attempts');
  
  // 4. CPU and memory usage percentage
  sendMetricToGrafana('system_cpu_usage', currentMetrics.system.cpu, 'gauge', 'percent');
  sendMetricToGrafana('system_memory_usage', currentMetrics.system.memory, 'gauge', 'percent');
  
  // 5. Pizza metrics
  sendMetricToGrafana('pizza_sold', currentMetrics.pizzaMetrics.sold, 'gauge', 'pizzas');
  sendMetricToGrafana('pizza_creation_failures', currentMetrics.pizzaMetrics.creationFailures, 'gauge', 'failures');
  sendMetricToGrafana('pizza_revenue', currentMetrics.pizzaMetrics.revenue, 'gauge', 'dollars');
  
  // 6. Latency
  sendMetricToGrafana('latency_all_endpoints', currentMetrics.latency.all, 'gauge', 'ms');
  sendMetricToGrafana('latency_pizza_creation', currentMetrics.latency.pizzaCreation, 'gauge', 'ms');
  
  // Reset counters after sending (for per-minute calculations)
  // Keep active users for a window, but reset every minute
  metrics.resetCounters();
}

function sendMetricToGrafana(metricName, metricValue, type, unit) {
  // Ensure we have a valid number
  const value = typeof metricValue === 'number' ? metricValue : 0;
  
  const metric = {
    resourceMetrics: [
      {
        resource: {
          attributes: [
            {
              key: 'service.name',
              value: { stringValue: metricsConfig.source },
            },
          ],
        },
        scopeMetrics: [
          {
            metrics: [
              {
                name: metricName,
                description: `${metricName} metric`,
                unit: unit,
                gauge: {
                  dataPoints: [
                    {
                      asDouble: value,
                      timeUnixNano: `${Date.now()}000000`,
                      attributes: [],
                    },
                  ],
                },
              },
            ],
          },
        ],
      },
    ],
  };

  const body = JSON.stringify(metric);
  if (!metricsConfig.url || !metricsConfig.apiKey || !metricsConfig.source) {
    console.warn(`Skipping ${metricName}: metrics configuration missing`);
    return;
  }

  fetch(metricsConfig.url, {
    method: 'POST',
    body: body,
    headers: { 
      Authorization: `Bearer ${metricsConfig.apiKey}`, 
      'Content-Type': 'application/json' 
    },
  })
    .then((response) => {
      if (!response.ok) {
        response.text().then((text) => {
          console.error(`Failed to push ${metricName} to Grafana: ${text}`);
        });
      } else {
        console.log(`✓ Pushed ${metricName}: ${value} ${unit}`);
      }
    })
    .catch((error) => {
      console.error(`Error pushing ${metricName}:`, error.message);
    });
}
