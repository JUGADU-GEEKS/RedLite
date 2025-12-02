const LANG = {
  en: {
    greeting: "Hello! Ask me about traffic laws, fines, reporting, or weather in Odisha.",
    start_conversation: "Start a conversation...",
    placeholder: "Ask about traffic, fines, reporting, or weather in Odisha...",
    send: "Send",
    loading: "Loading...",
    error_connect: "Unable to connect to server. Please check your connection.",
    error_generic: "An error occurred. Please try again.",
    suggestions: [
      "What's the weather in Odisha regions (e.g., Bhubaneswar, Cuttack)?",
      "How do I report a pothole near me?",
      "What are the fine amounts for overspeeding in Odisha?",
      "How to report illegal parking in my area?",
    ],
    suggestion_weather_nearby: (lat, lon) => `What's the weather in my area (${lat.toFixed(2)}, ${lon.toFixed(2)})?`,
    suggestion_advisory_nearby: (lat, lon) => `Any traffic advisories near (${lat.toFixed(3)}, ${lon.toFixed(3)})?`,
    start_message_role: 'bot'
  },
  hi: {
    greeting: "नमस्ते! ट्रैफिक नियम और ओडिशा के मौसम के बारे में पूछें।",
    start_conversation: "एक बातचीत शुरू करें...",
    placeholder: "ट्रैफिक, जुर्माना, रिपोर्टिंग, या ओडिशा के मौसम के बारे में पूछें...",
    send: "भेजें",
    loading: "लोड हो रहा है...",
    error_connect: "सर्वर से कनेक्ट नहीं कर पा रहे हैं। कृपया अपना कनेक्शन जांचें।",
    error_generic: "कुछ गलत हुआ। कृपया पुनः प्रयास करें।",
    suggestions: [
      "ओडिशा के विभिन्न क्षेत्रों में मौसम कैसा है (जैसे, भुवनेश्वर, कटक)?",
      "मेरे नज़दीक गड्ढा कैसे रिपोर्ट करूं?",
      "ओडिशा में ओवरस्पीडिंग के लिए जुर्माने कितने हैं?",
      "मेरे क्षेत्र में अवैध पार्किंग कैसे रिपोर्ट करूं?",
    ],
    suggestion_weather_nearby: (lat, lon) => `मेरे क्षेत्र में मौसम कैसा है (${lat.toFixed(2)}, ${lon.toFixed(2)})?`,
    suggestion_advisory_nearby: (lat, lon) => `क्या मेरे आस-पास कोई यातायात परामর্শ है (${lat.toFixed(3)}, ${lon.toFixed(3)})?`,
    start_message_role: 'bot'
  },
  or: {
    greeting: "ନମସ୍କାର! ଟ୍ରାଫିକ୍ ନିୟମ ଏବଂ ଓଡିଶାର ଆବହାବିଷୟରେ ପଚାରନ୍ତୁ ।",
    start_conversation: "ଏକ କଥାବାର୍ତ୍ତା ଆରମ୍ଭ କରନ୍ତୁ...",
    placeholder: "ଟ୍ରାଫିକ୍‌, ଦଣ୍ଡ, ରିପୋର୍ଟିଂ କିମ୍ବା ଓଡିଶାର ଆବହା ବିଷୟରେ ପଚାରନ୍ତୁ...",
    send: "ପଠାନ୍ତୁ",
    loading: "ଲୋଡ୍ ହେଉଛି...",
    error_connect: "ସର୍ଭରକୁ ସଂଯୋଗ କରିପାରୁନି। ଦୟାକରି ସଂଯୋଗ ଯାଞ୍ଚ କରନ୍ତୁ।",
    error_generic: "କିଛି ତ୍ରୁଟି ଘଟିଛି। ପୁନର୍ବାର ଚେଷ୍ଟା କରନ୍ତୁ।",
    suggestions: [
      "ଓଡିଶା ଅଞ୍ଚଳରେ ଆବହା କେମିତି ଅଛି (ଉଦାହରଣ, ଭୁବନେଶ୍ୱର, କଟକ)?",
      "ମୋ ନିକଟରେ ଗଡ଼ଢ଼ା କିପରି ରିପୋର୍ଟ କରିବି?",
      "ଓଭର୍ସ୍ପିଡିଂ ପାଇଁ ଓଡିଶାରେ ଜରିମାନା କେତେ?",
      "ମୋ ଅଞ୍ଚଳରେ ଅବଇଧ ପାର୍କିଂ କିପରି ରିପୋର୍ଟ କରିବି?",
    ],
    suggestion_weather_nearby: (lat, lon) => `ମୋ ଅଞ୍ଚଳରେ ଆବହା କେମିତି ଅଛି (${lat.toFixed(2)}, ${lon.toFixed(2)})?`,
    suggestion_advisory_nearby: (lat, lon) => `ମୋ ନିକଟରେ କୌଣସି ଟ୍ରାଫିକ୍ ସୂଚନା ଅଛି କି (${lat.toFixed(3)}, ${lon.toFixed(3)})?`,
    start_message_role: 'bot'
  }
};

export default LANG;
