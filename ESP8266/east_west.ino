#include <ESP8266WiFi.h>
#include <ESP8266HTTPClient.h>
#include <ArduinoJson.h>

const char* ssid = "OPPO F25 Pro 5G";
const char* password = "00000000";

const char* serverName = "http://10.89.28.116:8000/signal_status/INT-001";  

// EAST LEDs
const int eastRed = D1;
const int eastYellow = D2;
const int eastGreen = D3;

// WEST LEDs
const int westRed = D5;
const int westYellow = D6;
const int westGreen = D7;

void setup(){
  Serial.begin(115200);
  WiFi.begin(ssid,password);

  Serial.print("WiFi Connecting");
  while(WiFi.status()!=WL_CONNECTED){ Serial.print("."); delay(500); }
  Serial.println("\n✔ Connected to WiFi");

  pinMode(eastRed,OUTPUT);
  pinMode(eastYellow,OUTPUT);
  pinMode(eastGreen,OUTPUT);

  pinMode(westRed,OUTPUT);
  pinMode(westYellow,OUTPUT);
  pinMode(westGreen,OUTPUT);

  turnAllOff();
}

void loop(){

  if(WiFi.status()==WL_CONNECTED){
    WiFiClient client;
    HTTPClient http;

    http.begin(client, serverName);
    int code = http.GET();
    Serial.println("HTTP CODE = " + String(code));

    if(code == 200){
      String payload = http.getString();
      Serial.println("DATA RECEIVED -> " + payload);

      StaticJsonDocument<512> doc;
      DeserializationError err = deserializeJson(doc, payload);

      if(!err){
        JsonObject lane = doc["state"];

        update(lane["east"], eastRed, eastYellow, eastGreen);
        update(lane["west"], westRed, westYellow, westGreen);
      }
    }
    http.end();
  }

  delay(2000);
}

void update(String s,int r,int y,int g){
  digitalWrite(r,LOW);
  digitalWrite(y,LOW);
  digitalWrite(g,LOW);

  if(s=="red")    digitalWrite(r,HIGH);
  if(s=="yellow") digitalWrite(y,HIGH);
  if(s=="green")  digitalWrite(g,HIGH);
}

void turnAllOff(){
  digitalWrite(eastRed,LOW);
  digitalWrite(eastYellow,LOW);
  digitalWrite(eastGreen,LOW);

  digitalWrite(westRed,LOW);
  digitalWrite(westYellow,LOW);
  digitalWrite(westGreen,LOW);
}
