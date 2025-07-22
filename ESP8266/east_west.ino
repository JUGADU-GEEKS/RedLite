#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "Tenda ";
const char* password = "12345678";

// Your backend endpoint
const char* serverName = "http://192.168.0.190:8000/signal_status";

// East Signal Pins
const int eastRed = D1;     // GPIO5
const int eastYellow = D2;  // GPIO4
const int eastGreen = D3;   // GPIO0

// West Signal Pins
const int westRed = D5;     // GPIO14
const int westYellow = D6;  // GPIO12
const int westGreen = D7;   // GPIO13

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  Serial.print("Connecting to WiFi");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\nWiFi connected!");

  // Set LED pins as outputs
  pinMode(eastRed, OUTPUT);
  pinMode(eastYellow, OUTPUT);
  pinMode(eastGreen, OUTPUT);
  pinMode(westRed, OUTPUT);
  pinMode(westYellow, OUTPUT);
  pinMode(westGreen, OUTPUT);

  // Turn all lights off initially
  turnAllLightsOff();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;         // ✅ New API usage
    HTTPClient http;

    http.begin(client, serverName);  // ✅ Correct usage

    int httpCode = http.GET();
    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      Serial.println("Response: " + payload);

      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, payload);

      if (!error) {
        // ✅ Correct: your payload is an ARRAY
        String eastSignal = doc[0]["east"];
        String westSignal = doc[0]["west"];

        Serial.println("East: " + eastSignal + " | West: " + westSignal);

        updateSignal(eastSignal, eastRed, eastYellow, eastGreen);
        updateSignal(westSignal, westRed, westYellow, westGreen);
      } else {
        Serial.println("Failed to parse JSON!");
      }
    } else {
      Serial.println("GET request failed, HTTP Code: " + String(httpCode));
    }

    http.end();
  } else {
    Serial.println("WiFi disconnected!");
  }

  delay(3000); // Fetch every 3 seconds
}

void updateSignal(String signal, int redPin, int yellowPin, int greenPin) {
  // Turn all lights off first
  digitalWrite(redPin, LOW);
  digitalWrite(yellowPin, LOW);
  digitalWrite(greenPin, LOW);

  // Turn ON only the correct light
  if (signal == "red") {
    digitalWrite(redPin, HIGH);
  } else if (signal == "yellow") {
    digitalWrite(yellowPin, HIGH);
  } else if (signal == "green") {
    digitalWrite(greenPin, HIGH);
  }
}

void turnAllLightsOff() {
  digitalWrite(eastRed, LOW);
  digitalWrite(eastYellow, LOW);
  digitalWrite(eastGreen, LOW);
  digitalWrite(westRed, LOW);
  digitalWrite(westYellow, LOW);
  digitalWrite(westGreen, LOW);
}