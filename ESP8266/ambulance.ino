#include <ESP8266WiFi.h>
#include <ESP8266WebServer.h>
#include <ESP8266HTTPClient.h>

const char* ssid = "Kunal";
const char* password = "12345678";

ESP8266WebServer server(80);
WiFiClient wifiClient;

String lat = "0.0", lon = "0.0", dir = "north";
const int ledPin = D5; // Optional LED

// 🌐 Frontend page that gets location + heading from phone
void handleRoot() {
  String html = R"rawliteral(
    <!DOCTYPE html>
    <html>
    <head><title>ESP Location</title></head>
    <body>
      <h2>📡 Location + Direction Tracker</h2>
      <p id="status">Waiting for location...</p>
      <script>
        function getDirection(deg) {
          if (deg >= 45 && deg < 135) return "east";
          else if (deg >= 135 && deg < 225) return "south";
          else if (deg >= 225 && deg < 315) return "west";
          else return "north";
        }

        navigator.geolocation.watchPosition(function(position) {
          let lat = position.coords.latitude;
          let lon = position.coords.longitude;
          let heading = position.coords.heading;

          let direction = "north"; // default
          if (heading !== null) {
            direction = getDirection(heading);
          }

          document.getElementById("status").innerText = 
            `Lat: ${lat}, Long: ${lon}, Dir: ${direction}`;

          fetch(`/update?lat=${lat}&long=${lon}&dir=${direction}`);
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
  lon = server.arg("long");   // fixed key name
  dir = server.arg("dir");

  digitalWrite(ledPin, HIGH);
  delay(50);
  digitalWrite(ledPin, LOW);

  // Debug print
  Serial.println("📦 Data Packet:");
  Serial.print("  Lat: "); Serial.println(lat);
  Serial.print("  Long: "); Serial.println(lon);
  Serial.print("  Direction: "); Serial.println(dir);

  // 🔁 POST to backend
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(wifiClient, "http://192.168.103.20:8000/ambulance_override");  // ✅ Added :8000
    http.addHeader("Content-Type", "application/json");

    String payload = "{\"lat\":" + lat + ",\"long\":" + lon + ",\"direction\":\"" + dir + "\"}";
    int httpCode = http.POST(payload);

    Serial.print("HTTP Response Code: ");
    Serial.println(httpCode);

    if (httpCode > 0) {
      Serial.print("Response: ");
      Serial.println(http.getString());
    }

    http.end();
  } else {
    Serial.println("❌ WiFi not connected");
  }

  server.send(200, "text/plain", "✅ Location + direction sent to backend");
}

void setup() {
  Serial.begin(115200);
  pinMode(ledPin, OUTPUT);

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
