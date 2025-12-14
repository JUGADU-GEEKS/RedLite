/* Aether — STA-only + phone-watchPosition + MPU6050 pothole detector
   Sequence:
   1) Connect to Wi-Fi (blocks until connected)
   2) Start HTTP server (route "/" serves phone UI using watchPosition)
   3) Wait for MPU to be stable (few consecutive WHO_AM_I)
   4) Start sampling/detection; when pothole detected, POST {lat,lon,vehicleId} to POST_ROUTE

   Set STA_SSID, STA_PASS, POST_ROUTE before upload.
*/

#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>

// ===== USER CONFIG - set before upload =====
const char* STA_SSID  = "Kunal";             // <-- replace
const char* STA_PASS  = "12345678";         // <-- replace
const char* POST_ROUTE = "http://10.197.94.183:8000/potholes/iot"; // <-- replace
const char* VEHICLE_ID = "OD-GOV-001";              // optional (empty "" to skip)
// ===========================================

ESP8266WebServer server(80);

// I2C / MPU pins & addresses
#define SDA_PIN D2
#define SCL_PIN D1
#define MPU_ADDR_68 0x68
#define MPU_ADDR_69 0x69
uint8_t MPU_ADDR = MPU_ADDR_68;

// Sampling params
const int SAMPLE_RATE_HZ = 200;
const float SAMPLE_PERIOD_MS = 1000.0f / SAMPLE_RATE_HZ;
const int WINDOW_SIZE = SAMPLE_RATE_HZ * 1;

float verticalBuf[WINDOW_SIZE];
float highBuf[WINDOW_SIZE];
unsigned long timeBuf[WINDOW_SIZE];
int bufIndex = 0;
bool bufferFilled = false;
const float G_PER_LSB = 1.0f / 16384.0f;

// HPF and calibration
float HPF_TAU = 0.12f;
float lpVertical = 0.0f;
float zOffset_g = 0.0f;

// Detection params
float PEAK_G_THRESHOLD = 2.2f;
float HF_RATIO_MIN     = 0.65f;
unsigned long MAX_DURATION_MS = 220;
unsigned long COOLDOWN_MS = 2000;
unsigned long lastEventTimeMs = 0;

unsigned long nextSampleMicros = 0;

// Phone location (updated via /location)
volatile double lastLat = NAN;
volatile double lastLon = NAN;
volatile bool locationReceived = false;

// Struct for events
struct PotholeEvent { float peak_g; unsigned long duration_ms; float hf_ratio; };

// ---------- MPU low-level ----------
void mpuWriteByte(uint8_t reg, uint8_t value) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.write(value);
  Wire.endTransmission();
}
void mpuReadBytes(uint8_t reg, uint8_t len, uint8_t *buf) {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(reg);
  Wire.endTransmission(false);
  Wire.requestFrom((uint8_t)MPU_ADDR, (size_t)len, (bool)true);
  for (uint8_t i = 0; i < len && Wire.available(); i++) buf[i] = Wire.read();
}
bool readAccelRaw(int16_t &ax, int16_t &ay, int16_t &az) {
  uint8_t data[6] = {0};
  mpuReadBytes(0x3B, 6, data);
  ax = (int16_t)((data[0] << 8) | data[1]);
  ay = (int16_t)((data[2] << 8) | data[3]);
  az = (int16_t)((data[4] << 8) | data[5]);
  return true;
}
uint8_t readWhoAmIAt(uint8_t addr) {
  Wire.beginTransmission(addr);
  Wire.write(0x75);
  if (Wire.endTransmission(false) != 0) return 0xFF;
  Wire.requestFrom((uint8_t)addr, (size_t)1, (bool)true);
  if (Wire.available()) return Wire.read();
  return 0xFF;
}

void dumpAccelRegs(uint8_t addr) {
  Wire.beginTransmission(addr);
  Wire.write(0x3B);
  if (Wire.endTransmission(false) != 0) {
    Serial.print("dumpRegs: endTransmission err for 0x"); Serial.println(addr, HEX);
    return;
  }
  Wire.requestFrom((uint8_t)addr, (size_t)14, (bool)true);
  Serial.print("RAW REGS @0x"); if (addr < 16) Serial.print('0'); Serial.print(addr, HEX); Serial.print(": ");
  while (Wire.available()) {
    uint8_t b = Wire.read();
    if (b < 16) Serial.print('0');
    Serial.print(b, HEX); Serial.print(' ');
  }
  Serial.println();
}

// ---------- MPU init helpers ----------
void setupMPURegisters() {
  // configure MPU registers (call after Wire.begin)
  mpuWriteByte(0x6B, 0x80); delay(50); // reset
  mpuWriteByte(0x6B, 0x00); delay(20); // wake
  mpuWriteByte(0x1C, 0x00); // accel ±2g
  mpuWriteByte(0x1B, 0x00); // gyro ±250
  mpuWriteByte(0x1A, 0x03); // DLPF
  Serial.println("MPU registers configured.");
}

// Wait until MPU provides N consecutive WHO_AM_I responses (stability)
bool waitForMPUStable(int N_CONS_READS = 3, int maxAttempts = 30) {
  Serial.println("Checking MPU stability...");
  Wire.begin(SDA_PIN, SCL_PIN);
  int attempts = 0;
  int consec = 0;
  uint8_t lastVal = 0xFF;
  while (attempts < maxAttempts) {
    attempts++;
    uint8_t v68 = readWhoAmIAt(MPU_ADDR_68);
    uint8_t v69 = readWhoAmIAt(MPU_ADDR_69);
    uint8_t value = 0xFF;
    if (v68 != 0xFF) { value = v68; MPU_ADDR = MPU_ADDR_68; }
    else if (v69 != 0xFF) { value = v69; MPU_ADDR = MPU_ADDR_69; }

    if (value != 0xFF) {
      Serial.print("WHO_AM_I responded: 0x"); Serial.println(value, HEX);
      if (lastVal == value) consec++; else { consec = 1; lastVal = value; }
      if (consec >= N_CONS_READS) {
        Serial.print("MPU stable at addr 0x"); Serial.println(MPU_ADDR, HEX);
        setupMPURegisters();
        return true;
      }
    } else {
      Serial.print("WHO_AM_I no response (attempt "); Serial.print(attempts); Serial.println(")");
      // re-run Wire.begin and small reset sequence to try recover
      Wire.begin(SDA_PIN, SCL_PIN);
      setupMPURegisters();
    }
    delay(200);
  }
  Serial.println("MPU did not stabilize. Fix wiring/power/AD0 and retry.");
  return false;
}

// ---------- WiFi helper (blocking connect) ----------
const char* wifiStatusStr(int s) {
  switch (s) {
    case WL_IDLE_STATUS:     return "IDLE";
    case WL_NO_SSID_AVAIL:   return "NO_SSID_AVAIL";
    case WL_SCAN_COMPLETED:  return "SCAN_COMPLETED";
    case WL_CONNECTED:       return "CONNECTED";
    case WL_CONNECT_FAILED:  return "CONNECT_FAILED";
    case WL_CONNECTION_LOST: return "CONNECTION_LOST";
    case WL_DISCONNECTED:    return "DISCONNECTED";
    default:                 return "UNKNOWN";
  }
}
void waitForWiFiConnect() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(STA_SSID, STA_PASS);
  Serial.print("Connecting to Wi-Fi SSID: "); Serial.println(STA_SSID);
  while (true) {
    int st = WiFi.waitForConnectResult();
    Serial.print("WiFi status: "); Serial.print(st); Serial.print(" => "); Serial.println(wifiStatusStr(st));
    if (st == WL_CONNECTED) {
      Serial.print("WiFi connected. IP = "); Serial.println(WiFi.localIP());
      Serial.print("RSSI: "); Serial.println(WiFi.RSSI());
      break;
    }
    Serial.println("WiFi connect failed — retrying in 4s.");
    delay(4000);
    WiFi.disconnect();
    WiFi.begin(STA_SSID, STA_PASS);
  }
}

// ---------- detection code (same algorithm) ----------
bool analyzeWindow(PotholeEvent &evt) {
  if (!bufferFilled) return false;
  float totalEnergy = 0.0f, highEnergy = 0.0f;
  float peakG = -999.0f, minG = 999.0f; int peakIndex = 0;
  for (int i = 0; i < WINDOW_SIZE; i++) {
    float v = verticalBuf[i]; float h = highBuf[i];
    totalEnergy += v * v; highEnergy += h * h;
    if (v > peakG) { peakG = v; peakIndex = i; }
    if (v < minG) minG = v;
  }
  if (totalEnergy < 1e-6f) return false;
  float hf_ratio = highEnergy / totalEnergy;
  float baseline = (peakG + minG) * 0.5f;
  float thresh = baseline + 0.3f;
  int start = peakIndex, end = peakIndex;
  while (start > 0 && verticalBuf[start] > thresh) start--;
  while (end < WINDOW_SIZE - 1 && verticalBuf[end] > thresh) end++;
  unsigned long duration_ms = (end >= start) ? (timeBuf[end] - timeBuf[start]) : 0;
  evt.peak_g = peakG; evt.duration_ms = duration_ms; evt.hf_ratio = hf_ratio;
  if (peakG >= PEAK_G_THRESHOLD && duration_ms <= MAX_DURATION_MS && hf_ratio >= HF_RATIO_MIN) return true;
  return false;
}

void sampleAccel() {
  unsigned long nowMicros = micros();
  if (nowMicros < nextSampleMicros) return;
  nextSampleMicros = nowMicros + (unsigned long)(SAMPLE_PERIOD_MS * 1000.0f);

  int16_t ax_raw = 0, ay_raw = 0, az_raw = 0;
  readAccelRaw(ax_raw, ay_raw, az_raw);

  float az_g = (float)az_raw * G_PER_LSB - zOffset_g;
  float dt = SAMPLE_PERIOD_MS / 1000.0f;
  float alpha = dt / (HPF_TAU + dt);
  lpVertical = lpVertical + alpha * (az_g - lpVertical);
  float high = az_g - lpVertical;

  unsigned long nowMs = millis();
  verticalBuf[bufIndex] = az_g;
  highBuf[bufIndex] = high;
  timeBuf[bufIndex] = nowMs;

  // warn if all zeros
  if (ax_raw == 0 && ay_raw == 0 && az_raw == 0) {
    static int zeroCnt = 0; zeroCnt++;
    if (zeroCnt % 50 == 0) {
      Serial.println("[WARN] MPU raw accel reads all zeros — check wiring/POWER/AD0.");
      dumpAccelRegs(MPU_ADDR);
    }
  }

  bufIndex++;
  if (bufIndex >= WINDOW_SIZE) { bufIndex = 0; bufferFilled = true; }

  static int dbg = 0; dbg++;
  if (dbg >= 20) { dbg = 0;
    Serial.print("Z(g)="); Serial.print(az_g, 3);
    Serial.print("  HP="); Serial.print(high, 3);
    Serial.print("  rawZ="); Serial.print(az_raw);
    Serial.print("  lp="); Serial.println(lpVertical, 3);
  }
}

// ---------- phone UI (watchPosition) ----------
const char index_html[] PROGMEM = R"rawliteral(
<!doctype html><html><head><meta charset="utf-8"><title>Aether — send location</title></head>
<body>
<h3>Aether — Stream phone location to ESP</h3>
<p>Allow location permission and keep this page open. The phone will stream location automatically every ~1s.</p>
<p>Status: <span id="status">starting...</span></p>
<script>
const status = document.getElementById('status');
let id = null;
function startWatch() {
  if (!navigator.geolocation) { status.innerText='Geolocation not supported'; return; }
  status.innerText='Requesting permission...';
  id = navigator.geolocation.watchPosition(function(pos){
    const payload = { lat: pos.coords.latitude, lon: pos.coords.longitude, acc: pos.coords.accuracy };
    fetch('/location', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(payload)})
      .then(r=>r.text()).then(t=> status.innerText = 'Sent @' + new Date().toLocaleTimeString())
      .catch(e => status.innerText = 'Err: ' + e);
  }, function(err){ status.innerText = 'Location error: ' + err.message; }, { enableHighAccuracy:true, maximumAge:1000, timeout:5000 });
}
startWatch();
</script>
</body></html>
)rawliteral";

void handleRoot() { server.send_P(200, "text/html", index_html); }

// simple JSON number extractor (no ArduinoJson)
double extractJsonNumber(const String &s, const char *key) {
  String k = String("\"") + key + "\"";
  int i = s.indexOf(k);
  if (i < 0) { k = String(key); i = s.indexOf(k); if (i < 0) return NAN; }
  int colon = s.indexOf(':', i);
  if (colon < 0) return NAN;
  int j = colon + 1;
  while (j < s.length() && (s[j] == ' ' || s[j] == '"')) j++;
  int end = j;
  while (end < s.length() && ((s[end] >= '0' && s[end] <= '9') || s[end] == '-' || s[end] == '.' || s[end] == 'e' || s[end] == 'E' || s[end] == '+')) end++;
  String num = s.substring(j, end);
  if (num.length() == 0) return NAN;
  return num.toDouble();
}

void handleLocationPost() {
  String body = server.arg("plain");
  double lat = extractJsonNumber(body, "lat");
  double lon = extractJsonNumber(body, "lon");
  if (!isnan(lat) && !isnan(lon)) {
    lastLat = lat; lastLon = lon; locationReceived = true;
    Serial.print("Phone location updated: "); Serial.print(lat, 6); Serial.print(", "); Serial.println(lon, 6);
    server.send(200, "text/plain", "OK");
  } else {
    server.send(400, "text/plain", "Bad data");
  }
}

// ---------- POST to backend ----------
void postPotholeToServer(double lat, double lon) {
  if (isnan(lat) || isnan(lon)) {
    Serial.println("No location available; skipping remote POST.");
    return;
  }
  WiFiClient client;
  HTTPClient http;
  String payload = "{";
  payload += "\"lat\":" + String(lat, 6) + ",";
  payload += "\"lon\":" + String(lon, 6);
  if (strlen(VEHICLE_ID) > 0) { payload += ",\"vehicleId\":\""; payload += VEHICLE_ID; payload += "\""; }
  payload += "}";
  Serial.print("POST -> "); Serial.println(POST_ROUTE);
  Serial.println(payload);
  if (http.begin(client, POST_ROUTE)) {
    http.addHeader("Content-Type", "application/json");
    int httpCode = http.POST(payload);
    if (httpCode > 0) {
      Serial.print("POST result: "); Serial.print(httpCode); Serial.print(" ");
      String resp = http.getString();
      Serial.println(resp);
    } else {
      Serial.print("POST failed, error: "); Serial.println(http.errorToString(httpCode));
    }
    http.end();
  } else {
    Serial.println("HTTP begin failed");
  }
}

// ---------- setup & loop ----------
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n=== Aether — connect WiFi -> start server -> stabilize MPU -> detect ===");

  // 1) Connect Wi-Fi (blocking)
  waitForWiFiConnect();

  // 2) Start HTTP server (phone UI)
  server.on("/", handleRoot);
  server.on("/location", HTTP_POST, handleLocationPost);
  server.begin();
  Serial.print("HTTP server running at http://");
  Serial.print(WiFi.localIP());
  Serial.println("/  (open this URL on your phone/browser on same Wi-Fi)");

  // 3) Wait for MPU to be stable before sampling starts
  bool ok = waitForMPUStable(3, 30); // 3 consecutive reads, up to 30 attempts
  if (!ok) {
    Serial.println("ERROR: MPU not stable. Fix wiring/power/AD0 and reset device.");
    while (true) delay(1000); // halt here so you can see error
  }

  // Start sampling loop
  nextSampleMicros = micros();
}

void loop() {
  server.handleClient();

  // re-check MPU periodically and try to re-init if it drops out
  static unsigned long lastCheck = 0;
  if (millis() - lastCheck > 5000) {
    lastCheck = millis();
    uint8_t v = readWhoAmIAt(MPU_ADDR);
    if (v == 0xFF) {
      Serial.println("[WARN] MPU dropped out — trying soft re-init.");
      Wire.begin(SDA_PIN, SCL_PIN);
      setupMPURegisters();
      delay(200);
      uint8_t v2 = readWhoAmIAt(MPU_ADDR);
      Serial.print("After re-init WHO_AM_I -> ");
      if (v2==0xFF) Serial.println("NO-RESP"); else { Serial.print("0x"); Serial.println(v2, HEX); }
    }
  }

  // sampling + detection
  sampleAccel();
  if (bufferFilled) {
    PotholeEvent evt;
    if (analyzeWindow(evt)) {
      unsigned long now = millis();
      if (now - lastEventTimeMs > COOLDOWN_MS) {
        lastEventTimeMs = now;
        Serial.println("\n******** POTHOLE DETECTED ********");
        Serial.print("peak_g: "); Serial.println(evt.peak_g, 3);
        Serial.print("duration_ms: "); Serial.println(evt.duration_ms);
        Serial.print("hf_ratio: "); Serial.println(evt.hf_ratio, 3);
        Serial.println("**********************************\n");
        if (locationReceived) {
          postPotholeToServer(lastLat, lastLon);
        } else {
          Serial.println("No phone location yet — skipping POST.");
        }
      }
    }
  }
}
