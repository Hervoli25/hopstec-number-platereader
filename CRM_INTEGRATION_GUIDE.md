# Carwash CRM Integration Guide

## Overview

Your Carwash booking system can send new bookings to this app automatically. Technicians will see upcoming bookings in their **My Jobs** dashboard.

## Integration Endpoint

```
POST /api/integrations/create-job
```

### Authentication

Include your integration secret in the request header:

```http
x-integration-secret: your_integration_secret_here
```

**Set this in your `.env` file:**
```env
INTEGRATION_SECRET=your_secret_key_here
```

## Request Format

```http
POST http://localhost:5000/api/integrations/create-job
Content-Type: application/json
x-integration-secret: your_integration_secret_here

{
  "plateDisplay": "AB-123-FR",
  "customerName": "John Doe",
  "customerEmail": "john@example.com",
  "serviceCode": "PREMIUM",
  "serviceChecklist": [
    "Pre-wash",
    "Foam Application",
    "High-Pressure Rinse",
    "Hand Dry",
    "Interior Vacuum",
    "Tire Shine"
  ]
}
```

### Parameters

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `plateDisplay` | string | ✅ Yes | License plate number (any format) |
| `customerName` | string | ⬜ Optional | Customer's name |
| `customerEmail` | string | ⬜ Optional | Customer's email |
| `serviceCode` | string | ⬜ Optional | Service package code (e.g., BASIC, PREMIUM, DELUXE) |
| `serviceChecklist` | array | ⬜ Optional | List of service steps to perform |

## Response

```json
{
  "job": {
    "id": "abc-123-def-456",
    "plateDisplay": "AB-123-FR",
    "status": "received",
    "technicianId": "integration",
    "serviceCode": "PREMIUM",
    "startAt": "2026-02-04T08:00:00.000Z"
  },
  "customerUrl": "http://localhost:5000/customer/job/xyz789token",
  "token": "xyz789token"
}
```

### Important Fields in Response:

- **`customerUrl`**: Send this link to the customer so they can track their wash live!
- **`token`**: Customer's unique tracking token
- **`job.id`**: Internal job ID for your records

## Example Integration (JavaScript/Node.js)

```javascript
async function createWashJobFromBooking(booking) {
  const response = await fetch('http://localhost:5000/api/integrations/create-job', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-integration-secret': process.env.INTEGRATION_SECRET
    },
    body: JSON.stringify({
      plateDisplay: booking.licensePlate,
      customerName: booking.customerName,
      customerEmail: booking.email,
      serviceCode: booking.servicePackage,
      serviceChecklist: booking.selectedServices
    })
  });

  const result = await response.json();

  // Send customer tracking URL via SMS/Email
  await sendCustomerTrackingLink(booking.email, result.customerUrl);

  return result;
}
```

## Example Integration (PHP)

```php
<?php
function createWashJob($booking) {
    $data = [
        'plateDisplay' => $booking['license_plate'],
        'customerName' => $booking['customer_name'],
        'customerEmail' => $booking['email'],
        'serviceCode' => $booking['service_package'],
        'serviceChecklist' => $booking['services']
    ];

    $ch = curl_init('http://localhost:5000/api/integrations/create-job');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Content-Type: application/json',
        'x-integration-secret: ' . $_ENV['INTEGRATION_SECRET']
    ]);

    $response = curl_exec($ch);
    $result = json_decode($response, true);

    // Send tracking URL to customer
    sendTrackingEmail($booking['email'], $result['customerUrl']);

    return $result;
}
?>
```

## Technician Workflow

Once your CRM sends a booking:

1. **Booking appears in "Upcoming Bookings"** section
2. **Technician sees:** Plate number, service code, scheduled time
3. **When car arrives:**
   - Tech opens the job
   - Verifies plate number (can update if needed)
   - Starts the wash (changes status to "Pre-wash")
4. **Customer receives tracking link** and can watch live progress

## Testing the Integration

### Test with cURL:

```bash
curl -X POST http://localhost:5000/api/integrations/create-job \
  -H "Content-Type: application/json" \
  -H "x-integration-secret: your_secret_here" \
  -d '{
    "plateDisplay": "TEST-123",
    "customerName": "Test Customer",
    "customerEmail": "test@example.com",
    "serviceCode": "PREMIUM",
    "serviceChecklist": ["Pre-wash", "Foam", "Rinse", "Dry"]
  }'
```

### Expected Success Response:

```json
{
  "job": { ... },
  "customerUrl": "http://localhost:5000/customer/job/...",
  "token": "..."
}
```

### Error Responses:

**401 Unauthorized:**
```json
{
  "message": "Invalid integration secret"
}
```

**400 Bad Request:**
```json
{
  "message": "Plate is required"
}
```

## Production Deployment

1. **Set `INTEGRATION_SECRET`** in production environment
2. **Update `APP_URL`** to your production domain
3. **Whitelist your CRM server IP** (optional, for extra security)
4. **Use HTTPS** for all API calls in production

## Support

For integration help, contact your development team or refer to:
- API documentation: `server/routes.ts` (line 828)
- Integration endpoint implementation

---

**Made by HOPS-TECH INNOVATION**
