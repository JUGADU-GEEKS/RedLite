#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "Tenda ";
const char* password = "12345678";

// Your backend endpoint
const char* serverName = "http://192.168.0.190:8000/signal_status";

// North Signal Pins
const int northRed = D1;     // GPIO5
const int northYellow = D2;  // GPIO4
const int northGreen = D3;   // GPIO0

// South Signal Pins
const int southRed = D5;     // GPIO14
const int southYellow = D6;  // GPIO12
const int southGreen = D7;   // GPIO13

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
  pinMode(northRed, OUTPUT);
  pinMode(northYellow, OUTPUT);
  pinMode(northGreen, OUTPUT);
  pinMode(southRed, OUTPUT);
  pinMode(southYellow, OUTPUT);
  pinMode(southGreen, OUTPUT);

  // Turn all lights off initially
  turnAllLightsOff();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    WiFiClient client;
    HTTPClient http;

    http.begin(client, serverName);  // Connect to backend
    int httpCode = http.GET();

    if (httpCode == HTTP_CODE_OK) {
      String payload = http.getString();
      Serial.println("Response: " + payload);

      StaticJsonDocument<256> doc;
      DeserializationError error = deserializeJson(doc, payload);

      if (!error) {
        JsonObject signalData = doc[0];  // Get first object from array

        String northSignal = signalData["north"];
        String southSignal = signalData["south"];

        Serial.println("North: " + northSignal + " | South: " + southSignal);

        updateSignal(northSignal, northRed, northYellow, northGreen);
        updateSignal(southSignal, southRed, southYellow, southGreen);
      } else {
        Serial.println("Failed to parse JSON!");
      }
    } else {
      Serial.println("GET request failed. HTTP Code: " + String(httpCode));
    }

    http.end();
  } else {
    Serial.println("WiFi not connected.");
  }

  delay(3000);  // Fetch every 3 seconds
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
  digitalWrite(northRed, LOW);
  digitalWrite(northYellow, LOW);
  digitalWrite(northGreen, LOW);
  digitalWrite(southRed, LOW);
  digitalWrite(southYellow, LOW);
  digitalWrite(southGreen, LOW);
}
