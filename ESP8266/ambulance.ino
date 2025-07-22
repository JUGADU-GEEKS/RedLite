#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>
#include <Wire.h>
#include <QMC5883LCompass.h>

const char* ssid = "Tenda ";
const char* password = "12345678";

ESP8266WebServer server(80);
QMC5883LCompass compass;
WiFiClient wifiClient;

String lat = "0.0", lon = "0.0", dir = "north";
int directionDeg = 0;

const int ledPin = D5; // Optional LED

// 📍 Direction logic (only N, E, S, W)
String getDirection(int deg) {
  if (deg >= 45 && deg < 135) return "east";
  else if (deg >= 135 && deg < 225) return "west";
  else if (deg >= 225 && deg < 315) return "south";
  else return "north";
}

// 🌐 Frontend page that gets location
void handleRoot() {
  String html = R"rawliteral(
    <!DOCTYPE html>
    <html>
    <head><title>ESP Location</title></head>
    <body>
      <h2>📡 Location Tracker</h2>
      <p id="status">Waiting for location...</p>
      <script>
        navigator.geolocation.watchPosition(function(position) {
          let lat = position.coords.latitude;
          let lon = position.coords.longitude;
          document.getElementById("status").innerText = `Lat: ${lat}, Lon: ${lon}`;
          fetch(`/update?lat=${lat}&lon=${lon}`);
        }, function(error) {
          document.getElementById("status").innerText = "❌ Location access denied.";
        }, {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 1000
        });
      </script>
    </body>
    </html>
  )rawliteral";
  server.send(200, "text/html", html);
}

// 📦 When `/update` is hit from browser
void handleUpdate() {
  lat = server.arg("lat");
  lon = server.arg("lon");

  compass.read();
  directionDeg = compass.getAzimuth();
  dir = getDirection(directionDeg);

  digitalWrite(ledPin, HIGH);
  delay(50);
  digitalWrite(ledPin, LOW);

  // Debug print
  Serial.println("📦 Data Packet:");
  Serial.print("  Lat: "); Serial.println(lat);
  Serial.print("  Lon: "); Serial.println(lon);
  Serial.print("  Direction (deg): "); Serial.println(directionDeg);
  Serial.print("  Direction: "); Serial.println(dir);

  // 🔁 POST to backend
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(wifiClient, "http://192.168.0.190:8000/ambulance_override");  // Replace with your backend IP:port
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"lat\":" + lat + ",\"long\":" + lon + ",\"direction\":\"" + dir + "\"}";
    int httpCode = http.POST(payload);

    Serial.print("HTTP Response Code: ");
    Serial.println(httpCode);

    http.end();
  } else {
    Serial.println("❌ WiFi not connected");
  }

  server.send(200, "text/plain", "✅ Location + direction sent to backend");
}

void setup() {
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);
  Wire.begin(D2, D1); // I2C for QMC5883L

  compass.init();

  WiFi.begin(ssid, password);
  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500); Serial.print(".");
  }
  Serial.println("\n✅ WiFi connected");
  Serial.print("🌐 Open this in browser: http://"); Serial.println(WiFi.localIP());

  server.on("/", handleRoot);
  server.on("/update", handleUpdate);
  server.begin();
  Serial.println("🛰️ Web server started");
}

void loop() {
  server.handleClient();
}
