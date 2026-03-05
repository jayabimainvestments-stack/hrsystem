# Biometric Setup Guide: Rinsec TM500

Follow these steps to connect your Rinsec TM500 device to the Enterprise HRMS for real-time attendance syncing.

## 1. Physical Setup
1. Mount the device near your entrance.
2. Plug the AC power adapter into a wall outlet.
3. Connect the device to your office router/switch using a **Standard LAN (Ethernet) Cable**.

## 2. Enrollment
Each employee must be enrolled on the machine:
1. Enter the machine's Menu (usually by pressing **M/OK**).
2. Go to **Users** -> **New User**.
3. **IMPORTANT**: Set the **User ID** to a unique number (e.g., 101, 102).
4. Register the employee's fingerprints.
5. Record which User ID belongs to which employee.

## 3. Map IDs in HRMS
To link the machine to the HRMS:
1. Log in to the HRMS as an Admin or HR Manager.
2. Go to the **Employee Directory**.
3. Open an employee's profile and click **Edit Profile**.
4. In the **Personal** tab, enter the machine's User ID (e.g., 101) into the **Biometric Enrollment ID** field.
5. Click **Save Changes**.

## 4. Network Configuration (Cloud Sync)
On the Rinsec TM500 device:
1. Go to **Menu** -> **Comm.** -> **Ethernet**.
   - Ensure **DHCP** is ON or set a static IP that works on your network.
2. Go to **Menu** -> **Comm.** -> **ADMS** (or Cloud/Server Settings).
   - **Enable Domain Name**: OFF
   - **Server IP**: [Enter your server's public IP address or local IP]
   - **Server Port**: 5000
   - **Enable Proxy**: OFF
3. Restart the device.

## 5. Register Device in HRMS
1. Go to **Attendance Center** -> **Hardware Management**.
2. Click **Register Device**.
3. Enter a name (e.g., "Front Office") and the device's IP.
4. The system will generate an **API Key**.
5. **CRITICAL**: If your device allows entering a "Device Key" or "Password" in its cloud settings, enter this API Key. If not, the system will use the Device IP for identification.

---
*For technical support, please contact your IT department or refer to the Rinsec TM500 user manual.*
