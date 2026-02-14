
import axios from 'axios';

const API_URL = 'http://localhost:5000';

async function verifyTranslation() {
    console.log("Verifying Translation API fix...");

    try {
        // Test 1: Spanish to English with auto detection
        console.log("\nTest 1: Spanish 'Hola' -> English (Source: auto)");
        const res1 = await axios.post(`${API_URL}/api/translate`, {
            text: "Hola",
            sourceLang: "auto",
            targetLang: "en"
        });
        console.log("Result:", res1.data);
        if (res1.data.translatedText && res1.data.translatedText.toLowerCase().includes("hello")) {
            console.log("✅ PASSED");
        } else {
            console.log("❌ FAILED: Expected 'Hello', got", res1.data.translatedText);
        }

        // Test 2: English to Spanish with auto detection
        console.log("\nTest 2: English 'Hello' -> Spanish (Source: auto)");
        const res2 = await axios.post(`${API_URL}/api/translate`, {
            text: "Hello",
            sourceLang: "auto",
            targetLang: "es"
        });
        console.log("Result:", res2.data);
        if (res2.data.translatedText && res2.data.translatedText.toLowerCase().includes("hola")) {
            console.log("✅ PASSED");
        } else {
            console.log("❌ FAILED: Expected 'Hola', got", res2.data.translatedText);
        }

    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.error("❌ FAILED: Could not connect to server. Is it running on port 5000?");
        } else {
            console.error("❌ ERROR:", error.message);
            if (error.response) {
                console.error("Response data:", error.response.data);
            }
        }
    }
}

verifyTranslation();
