# Biometric Device Integration Specifications

This document outlines the requirements for connecting external attendance hardware (Fingerprint/Facial Recognition) to the Enterprise HRMS.

## 1. Gateway Endpoint
- **URL**: `http://<server-ip>:5000/api/biometric/punch`
- **Method**: `POST`
- **Content-Type**: `application/json`

## 2. Request Payload
The device must send a JSON payload for every successful identification (punch).

```json
{
  "device_key": "YOUR_DEVICE_API_KEY",
  "biometric_id": "ENROLLMENT_ID_OF_STAFF",
  "punch_time": "2026-02-10T08:30:00Z"
}
```

### Field Descriptions:
- `device_key`: The unique API key generated during device registration in the HRMS.
- `biometric_id`: The ID assigned to the staff member on the physical device (must match the `biometric_id` in staff profile).
- `punch_time`: ISO 8601 formatted timestamp of the punch.

## 3. Response Handling
- **200 OK**: Punch successfully recorded.
- **401 Unauthorized**: Invalid or inactive `device_key`.
- **404 Not Found**: `biometric_id` does not exist in the HRMS master records.

## 4. Security Recommendations
- **HTTPS**: Use SSL/TLS for all communication between the device and server.
- **Whitelist**: Restrict access to the biometric API endpoint to known device IP addresses in the firewall.
- **Poll Frequency**: If the device caches logs, it should push them every 5-15 minutes or in real-time.

## 5. Enrollment Workflow
1. Enroll staff finger/face on the physical device and assign a unique integer ID (e.g., `101`).
2. In the HRMS Staff Profile, update the `Biometric ID` field with the same value (`101`).
3. Verification: Perform a test punch and check the Attendance logs in HRMS.
