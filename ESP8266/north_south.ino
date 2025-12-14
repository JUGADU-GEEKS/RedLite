#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "OPPO F25 Pro 5G";
const char* password = "00000000";
const char* serverName = "http://10.89.28.116:8000/signal_status/INT-001";

// NORTH LEDs
const int northRed = D1;
const int northYellow = D2;
const int northGreen = D3;

// SOUTH LEDs
const int southRed = D5;
const int southYellow = D6;
const int southGreen = D7;

// ================= Function Headers ===================
void update(String s,int r,int y,int g);
void turnAllOff();

// ======================= SETUP =========================
void setup() {
  Serial.begin(115200);

  WiFi.begin(ssid, password);
  Serial.print("Connecting WiFi...");
  while(WiFi.status() != WL_CONNECTED){
    Serial.print(".");
    delay(500);
  }
  Serial.println("\n✔ WiFi Connected!");

  pinMode(northRed,OUTPUT); pinMode(northYellow,OUTPUT); pinMode(northGreen,OUTPUT);
  pinMode(southRed,OUTPUT); pinMode(southYellow,OUTPUT); pinMode(southGreen,OUTPUT);

  turnAllOff();
}

// ======================== LOOP =========================
void loop() {
  if(WiFi.status()==WL_CONNECTED){
    WiFiClient client;
    HTTPClient http;

    http.begin(client, serverName);
    int code = http.GET();
    Serial.println("HTTP CODE = " + String(code));

    if(code==200){
      String data = http.getString();
      Serial.println("📥 "+data);

      StaticJsonDocument<512> doc;
      if(!deserializeJson(doc,data)){
        JsonObject lane = doc["state"];

        update(lane["north"], northRed, northYellow, northGreen);
        update(lane["south"], southRed, southYellow, southGreen);
      }
    }
    http.end();
  }
  delay(2000);
}

// ========================== FUNCTIONS ==========================
void update(String s,int r,int y,int g){
  digitalWrite(r,LOW);
  digitalWrite(y,LOW);
  digitalWrite(g,LOW);

  if(s=="red") digitalWrite(r,HIGH);
  if(s=="yellow") digitalWrite(y,HIGH);
  if(s=="green") digitalWrite(g,HIGH);
}

void turnAllOff(){
  digitalWrite(northRed,LOW);
  digitalWrite(northYellow,LOW);
  digitalWrite(northGreen,LOW);

  digitalWrite(southRed,LOW);
  digitalWrite(southYellow,LOW);
  digitalWrite(southGreen,LOW);
}
