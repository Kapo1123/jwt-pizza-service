import { sleep, check, fail } from 'k6'
import http from 'k6/http'
import jsonpath from 'https://jslib.k6.io/jsonpath/1.0.2/index.js'

export const options = {
  cloud: {
    distribution: { 'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 } },
    apm: [],
  },
  thresholds: {},
  scenarios: {
    Login_And_Pizza_Order: {
      executor: 'ramping-vus',
      gracefulStop: '30s',
      stages: [
        { target: 5, duration: '30s' },   
        { target: 15, duration: '1m' },    
        { target: 10, duration: '30s' },   
        { target: 0, duration: '30s' },   
      ],
      gracefulRampDown: '30s',
      exec: 'login_and_pizza_order',
    },
  },
}


// Scenario: Imported_HAR (executor: ramping-vus)

export function login_and_pizza_order() {
  let response

  const vars = {}

  // Login
  response = http.put(
    'https://pizza-service.kapo1123.click/api/auth',
    '{"email":"a@jwt.com","password":"admin"}',
    {
      headers: {
        'sec-ch-ua-platform': '"macOS"',
        'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
        'Content-Type': 'application/json',
        'sec-ch-ua-mobile': '?0',
      },
    }
  )
  if (!check(response, { 'status equals 200': response => response.status.toString() === '200' })) {
    console.log(response.body);
    fail('Login was *not* 200');
  }

  vars['token'] = jsonpath.query(response.json(), '$.token')[0]

  sleep(2.7)

  // Meun
  response = http.get('https://pizza-service.kapo1123.click/api/order/menu', {
    headers: {
      'sec-ch-ua-platform': '"macOS"',
      Authorization: `Bearer ${vars['token']}`,
      'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
      'Content-Type': 'application/json',
      'sec-ch-ua-mobile': '?0',
    },
  })

  // Franchise
  response = http.get('https://pizza-service.kapo1123.click/api/franchise?page=0&limit=20&name=*', {
    headers: {
      'sec-ch-ua-platform': '"macOS"',
      Authorization: `Bearer ${vars['token']}`,
      'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
      'Content-Type': 'application/json',
      'sec-ch-ua-mobile': '?0',
    },
  })
  sleep(4.7)

  // Me
  response = http.get('https://pizza-service.kapo1123.click/api/user/me', {
    headers: {
      'sec-ch-ua-platform': '"macOS"',
      Authorization: `Bearer ${vars['token']}`,
      'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
      'Content-Type': 'application/json',
      'sec-ch-ua-mobile': '?0',
    },
  })
  sleep(1.7)

  // Purchase pizza
  response = http.post(
    'https://pizza-service.kapo1123.click/api/order',
    '{"items":[{"menuId":2,"description":"Pepperoni","price":0.0042}],"storeId":"1","franchiseId":1}',
    {
      headers: {
        'sec-ch-ua-platform': '"macOS"',
        Authorization: `Bearer ${vars['token']}`,
        'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
        'Content-Type': 'application/json',
        'sec-ch-ua-mobile': '?0',
      },
    }
  )
  if (!check(response, { 'Purchase was 200': response => response.status.toString() === '200' })) {
    console.log(response.body);
    fail('Purchase was *not* 200');
  }
  
  vars['pizzaJwt'] = jsonpath.query(response.json(), '$.jwt')[0] // Capture JWT
  
  sleep(3.2)

  // Verify pizza
  response = http.post(
    'https://pizza-factory.cs329.click/api/order/verify',
    `{"jwt":"${vars['pizzaJwt']}"}`, // Use captured JWT
    {
      headers: {
        'sec-ch-ua-platform': '"macOS"',
        Authorization: `Bearer ${vars['token']}`,
        'sec-ch-ua': '"Google Chrome";v="141", "Not?A_Brand";v="8", "Chromium";v="141"',
        'Content-Type': 'application/json',
        'sec-ch-ua-mobile': '?0',
      },
    }
  )
}

// Scenario: Scenario_2 (executor: ramping-vus)

export function scenario_2() {
  // Automatically added sleep
  sleep(1)
}