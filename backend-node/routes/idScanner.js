const express = require('express');
const router = express.Router();

/**
 * POST /api/scan-id
 * Analyzes a student ID card image using Google Gemini 1.5 Flash Vision AI.
 * Returns structured student identity: firstname, middlename, lastname, student_number.
 */
router.post('/', async (req, res) => {
  try {
    const { image } = req.body;

    if (!image) {
      return res.status(400).json({
        success: false,
        fallback: false,
        message: 'No image provided for ID scanning'
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
      return res.json({
        success: false,
        fallback: true,
        message: 'GEMINI_API_KEY is not configured in backend-node/.env. Falling back to local OCR.'
      });
    }

    // Extract mime type and raw base64 data
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const promptText = `You are an expert AI document scanner for Philippine School and University Student IDs.
Examine the provided student ID card image carefully.
Extract the student's identity into strict JSON format with these exact keys:
{
  "firstname": "...",
  "middlename": "...",
  "lastname": "...",
  "student_number": "..."
}

STRICT RULES:
1. 'firstname': Given name(s) in Title Case (e.g. 'Juan' or 'Mary Rose').
2. 'middlename': Middle name or middle initial (e.g. 'Protacio' or 'P.'), or empty string "" if not found.
3. 'lastname': Family surname in Title Case (e.g. 'Dela Cruz').
4. 'student_number': Only the unique student number/ID (e.g. '2023-0145', '12-3456', or '10293847'). DO NOT include academic year, school year (e.g. '2024-2025'), expiration dates, or birthday. Only the pure student ID.
5. Ignore university/school names, 'Republic of the Philippines', department names, and administrator signatures.
6. Output ONLY valid JSON, with NO surrounding markdown backticks or explanation.`;

    // Try gemini-1.5-flash first, with fallback to gemini-2.0-flash if needed
    const models = ['gemini-1.5-flash', 'gemini-2.0-flash'];
    let lastError = null;
    let extractedJson = null;

    for (const model of models) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { text: promptText },
                  {
                    inlineData: {
                      mimeType: mimeType,
                      data: base64Data
                    }
                  }
                ]
              }
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.1
            }
          })
        });

        if (!response.ok) {
          const errorBody = await response.text();
          console.warn(`Gemini model ${model} returned HTTP ${response.status}:`, errorBody);
          lastError = new Error(`Gemini API HTTP ${response.status}: ${errorBody}`);
          continue;
        }

        const data = await response.json();
        const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;

        if (rawContent) {
          const cleaned = rawContent.replace(/```(?:json)?/gi, '').replace(/```/g, '').trim();
          extractedJson = JSON.parse(cleaned);
          break; // Successfully got JSON!
        }
      } catch (err) {
        console.warn(`Error trying Gemini model ${model}:`, err.message);
        lastError = err;
      }
    }

    if (!extractedJson) {
      console.warn('Gemini vision analysis failed, enabling client fallback:', lastError?.message);
      return res.json({
        success: false,
        fallback: true,
        message: lastError?.message || 'Could not parse response from Gemini Vision AI'
      });
    }

    // Sanitize results
    const cleanField = (val) => (typeof val === 'string' ? val.trim() : '');

    return res.json({
      success: true,
      provider: 'gemini',
      data: {
        firstname: cleanField(extractedJson.firstname),
        middlename: cleanField(extractedJson.middlename),
        lastname: cleanField(extractedJson.lastname),
        student_number: cleanField(extractedJson.student_number)
      }
    });
  } catch (error) {
    console.error('Scan ID route error:', error);
    return res.json({
      success: false,
      fallback: true,
      message: error.message
    });
  }
});

module.exports = router;
