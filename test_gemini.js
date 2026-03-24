const fs = require('fs');
require('dotenv').config();

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;

async function testModels(modelName) {
  const dummyBase64 = "UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA="; 
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: "Accurately transcribe." },
              {
                inline_data: {
                  mime_type: "audio/wav",
                  data: dummyBase64
                }
              }
            ]
          }]
        })
      }
    );
    const data = await response.json();
    console.log(`[${modelName}] Response:`, data.error ? data.error.message : "SUCCESS!");
  } catch(e) {
    console.error(e);
  }
}

async function run() {
  await testModels("gemini-1.5-flash-latest");
  await testModels("gemini-1.5-flash");
  await testModels("gemini-1.5-pro");
}

run();
