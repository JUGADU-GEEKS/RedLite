#include <Arduino.h>
#include <Wire.h>

// -------------------- PIN & MPU CONFIG --------------------
#define SDA_PIN D2
#define SCL_PIN D1
#define MPU_ADDR 0x68   // We already confirmed 0x68 works for your good module

// -------------------- SAMPLING PARAMETERS --------------------
const int   SAMPLE_RATE_HZ   = 200;             // 200 Hz
const float SAMPLE_PERIOD_MS = 1000.0f / 200.0f; // ~5 ms

// Window: 1 second of data
const int WINDOW_SIZE = SAMPLE_RATE_HZ * 1;

// Raw vertical acceleration + high-pass component
float verticalBuf[WINDOW_SIZE];
float highBuf[WINDOW_SIZE];
unsigned long timeBuf[WINDOW_SIZE];

int bufIndex      = 0;
bool bufferFilled = false;

// Gravity scale for ±2g
const float G_PER_LSB = 1.0f / 16384.0f;

// High-pass filter
float lpVertical = 0.0f;
const float HPF_TAU = 0.3f;   // seconds, tune if needed

// Calibration offset for Z (in g). You can refine this after mounting.
float zOffset_g = 0.0f;

// -------------------- DETECTION PARAMETERS --------------------
// Tunable thresholds
float PEAK_G_THRESHOLD       = 2.5f;   // min peak g to consider pothole
float HF_RATIO_MIN           = 0.6f;   // high-frequency energy fraction
unsigned long MAX_DURATION_MS = 300;   // max impact duration

// Cooldown to avoid multiple detections for same pothole
unsigned long COOLDOWN_MS     = 2000;
unsigned long lastEventTimeMs = 0;

// For sampling scheduling
unsigned long nextSampleMicros = 0;

// -------------------- STRUCTS --------------------
struct PotholeEvent {
  float peak_g;
  unsigned long duration_ms;
  float hf_ratio;
};

// -------------------- MPU LOW-LEVEL --------------------
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
  Wire.requestFrom(MPU_ADDR, len, true);
  for (uint8_t i = 0; i < len && Wire.available(); i++) {
    buf[i] = Wire.read();
  }
}

bool readAccelRaw(int16_t &ax, int16_t &ay, int16_t &az) {
  uint8_t data[6];
  mpuReadBytes(0x3B, 6, data);  // ACCEL_XOUT_H

  if (Wire.available()) {
    // This check is soft; we trust requestFrom above
  }

  ax = (int16_t)((data[0] << 8) | data[1]);
  ay = (int16_t)((data[2] << 8) | data[3]);
  az = (int16_t)((data[4] << 8) | data[5]);
  return true;
}

// -------------------- ANALYSIS / DETECTION --------------------
bool analyzeWindow(PotholeEvent &evt) {
  if (!bufferFilled) return false;

  float totalEnergy = 0.0f;
  float highEnergy  = 0.0f;

  float peakG      = -999.0f;
  float minG       =  999.0f;
  int   peakIndex  = 0;

  for (int i = 0; i < WINDOW_SIZE; i++) {
    float v = verticalBuf[i]; // vertical accel in g
    float h = highBuf[i];     // high-pass component in g

    totalEnergy += v * v;
    highEnergy  += h * h;

    if (v > peakG) {
      peakG = v;
      peakIndex = i;
    }
    if (v < minG) {
      minG = v;
    }
  }

  if (totalEnergy < 1e-6f) {
    // Avoid division by zero if something went wrong
    return false;
  }

  float hf_ratio = highEnergy / totalEnergy;

  // Estimate event duration around the main peak.
  // Baseline near (peak+min)/2; threshold a bit above baseline.
  float baseline = (peakG + minG) * 0.5f;
  float thresh   = baseline + 0.3f;  // 0.3 g above local baseline

  int start = peakIndex;
  int end   = peakIndex;

  // Walk backwards until we drop below threshold
  while (start > 0 && verticalBuf[start] > thresh) {
    start--;
  }
  // Walk forwards until we drop below threshold
  while (end < WINDOW_SIZE - 1 && verticalBuf[end] > thresh) {
    end++;
  }

  unsigned long duration_ms = 0;
  if (end >= start) {
    duration_ms = timeBuf[end] - timeBuf[start];
  }

  evt.peak_g      = peakG;
  evt.duration_ms = duration_ms;
  evt.hf_ratio    = hf_ratio;

  // Apply pothole rules (without speed for now)
  if (peakG >= PEAK_G_THRESHOLD &&
      duration_ms <= MAX_DURATION_MS &&
      hf_ratio >= HF_RATIO_MIN) {
    return true;
  }

  return false;
}

// -------------------- SAMPLING --------------------
void sampleAccel() {
  unsigned long nowMicros = micros();

  // Schedule next sample
  if (nowMicros < nextSampleMicros) return;
  nextSampleMicros = nowMicros + (unsigned long)(SAMPLE_PERIOD_MS * 1000.0f);

  int16_t ax_raw, ay_raw, az_raw;
  if (!readAccelRaw(ax_raw, ay_raw, az_raw)) {
    return;
  }

  // Convert raw Z to g (vertical axis). Adjust if you mount differently.
  float az_g = (float)az_raw * G_PER_LSB - zOffset_g;

  // High-pass filter to get "jerk" component
  float dt = SAMPLE_PERIOD_MS / 1000.0f; // in seconds
  float alpha = dt / (HPF_TAU + dt);     // low-pass alpha

  lpVertical = lpVertical + alpha * (az_g - lpVertical);
  float high = az_g - lpVertical;

  unsigned long nowMs = millis();
  verticalBuf[bufIndex] = az_g;
  highBuf[bufIndex]     = high;
  timeBuf[bufIndex]     = nowMs;

  bufIndex++;
  if (bufIndex >= WINDOW_SIZE) {
    bufIndex = 0;
    bufferFilled = true;
  }

  // Optional debug: print a decimated stream
  static int debugCount = 0;
  debugCount++;
  if (debugCount >= 20) {  // every ~100 ms
    debugCount = 0;
    Serial.print("Z(g)=");
    Serial.print(az_g, 3);
    Serial.print("  HP=");
    Serial.print(high, 3);
    Serial.println();
  }
}

// -------------------- SETUP --------------------
void setupMPU() {
  Wire.begin(SDA_PIN, SCL_PIN);
  delay(100);

  // Reset
  mpuWriteByte(0x6B, 0x80);
  delay(100);

  // Wake up, set clock
  mpuWriteByte(0x6B, 0x01);  // PLL with X axis gyroscope
  delay(10);

  // Configure accelerometer ±2g
  mpuWriteByte(0x1C, 0x00);

  // Configure gyro ±250 deg/s
  mpuWriteByte(0x1B, 0x00);

  // Low-pass filter (optional: 0x03 ~ 44 Hz)
  mpuWriteByte(0x1A, 0x03);

  Serial.println("MPU6050 initialized.");
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n=== A3 (Aether) – MPU6050 Pothole Detector (NO GPS) ===\n");

  setupMPU();

  // Start sampling immediately
  nextSampleMicros = micros();
}

// -------------------- LOOP --------------------
void loop() {
  sampleAccel();

  // Once we have at least 1 second of data, analyze continuously.
  if (bufferFilled) {
    PotholeEvent evt;
    if (analyzeWindow(evt)) {
      unsigned long now = millis();
      if (now - lastEventTimeMs > COOLDOWN_MS) {
        lastEventTimeMs = now;

        Serial.println("\n******** POTHOLE DETECTED ********");
        Serial.print("peak_g: ");
        Serial.println(evt.peak_g, 3);
        Serial.print("duration_ms: ");
        Serial.println(evt.duration_ms);
        Serial.print("hf_ratio: ");
        Serial.println(evt.hf_ratio, 3);
        Serial.println("**********************************\n");
      }
    }
  }

  // Nothing else; everything is event-driven by sampling
}
