const express = require('express');
const { Translate } = require('@google-cloud/translate').v2;
require('dotenv').config();

const router = express.Router();

// Initialize Google Cloud Translation client
let translate;
try {
  // Check if credentials are provided via environment variable or file
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    translate = new Translate({
      keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    });
  } else if (process.env.GOOGLE_CLOUD_API_KEY) {
    translate = new Translate({
      key: process.env.GOOGLE_CLOUD_API_KEY,
    });
  } else {
    // Try to use default credentials (for GCP environments)
    translate = new Translate();
  }
} catch (error) {
  console.error('Error initializing Google Cloud Translation:', error);
}

// Language code mapping
const LANGUAGE_CODES = {
  english: 'en',
  spanish: 'es',
  french: 'fr',
  chinese: 'zh',
  japanese: 'ja',
  arabic: 'ar',
  korean: 'ko',
  german: 'de',
  italian: 'it',
  polish: 'pl',
  portuguese: 'pt',
  romanian: 'ro',
  swedish: 'sv',
};

// POST /api/translation/translate
router.post('/translate', async (req, res) => {
  let targetLangCode = null; // Declare outside try block for error handling
  try {
    const { text, targetLanguage } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    if (!targetLanguage) {
      return res.status(400).json({ error: 'Target language is required' });
    }

    if (!translate) {
      return res.status(500).json({ 
        error: 'Translation service not configured. Please set GOOGLE_APPLICATION_CREDENTIALS or GOOGLE_CLOUD_API_KEY environment variable.' 
      });
    }

    // Get language code - ensure we always get a valid ISO code
    const normalizedLang = targetLanguage.toLowerCase().trim();
    targetLangCode = LANGUAGE_CODES[normalizedLang];
    
    // Debug logging
    console.log('[Translation] Received targetLanguage:', targetLanguage);
    console.log('[Translation] Normalized:', normalizedLang);
    console.log('[Translation] Mapped code:', targetLangCode);
    console.log('[Translation] Available mappings:', Object.keys(LANGUAGE_CODES));
    
    // If not found in mapping, check if it's already a valid ISO code (2 letters)
    if (!targetLangCode) {
      // Check if it's already a valid 2-letter ISO code
      if (/^[a-z]{2}$/.test(normalizedLang)) {
        targetLangCode = normalizedLang;
        console.log('[Translation] Using as-is (valid ISO code):', targetLangCode);
      } else {
        // Invalid language - return error
        console.error('[Translation] Invalid language provided:', normalizedLang);
        return res.status(400).json({ 
          error: 'Invalid target language', 
          message: `Language "${targetLanguage}" is not supported. Please use one of: ${Object.keys(LANGUAGE_CODES).join(', ')}`,
          supportedLanguages: Object.keys(LANGUAGE_CODES),
          received: targetLanguage,
          normalized: normalizedLang
        });
      }
    }
    
    console.log('[Translation] Final language code to use:', targetLangCode);
    
    // Validate language code format (must be 2-letter ISO code)
    if (!targetLangCode || !/^[a-z]{2}$/.test(targetLangCode)) {
      console.error('[Translation] Invalid language code format:', targetLangCode);
      return res.status(400).json({ 
        error: 'Invalid language code format', 
        message: `Language code must be a 2-letter ISO 639-1 code. Received: "${targetLangCode}"`,
        received: targetLanguage,
        mapped: targetLangCode,
        availableMappings: LANGUAGE_CODES
      });
    }
    
    // Double-check: Ensure we're using the ISO code, not the language name
    // This is a safety check to prevent sending language names to Google's API
    if (targetLangCode.length > 2 || !/^[a-z]{2}$/i.test(targetLangCode)) {
      console.error('[Translation] CRITICAL: Language code validation failed:', {
        targetLangCode,
        targetLanguage,
        normalizedLang,
        isInMapping: !!LANGUAGE_CODES[normalizedLang]
      });
      return res.status(400).json({ 
        error: 'Language code validation failed', 
        message: `Invalid language code format. Expected 2-letter ISO code, got: "${targetLangCode}"`,
        received: targetLanguage,
        mapped: targetLangCode
      });
    }

    // Translate text
    let translationResult;
    if (Array.isArray(text)) {
      // Filter out empty strings and optimize batch size
      const validTexts = text.filter(t => t && typeof t === 'string' && t.trim().length > 0);
      
      if (validTexts.length === 0) {
        return res.json({ translation: [], targetLanguage: targetLangCode });
      }
      
      // Translate multiple texts in a single API call (more efficient)
      // CRITICAL: Verify the language code one more time before API call
      const finalLangCode = String(targetLangCode).toLowerCase().trim();
      if (finalLangCode.length !== 2 || !/^[a-z]{2}$/.test(finalLangCode)) {
        console.error('[Translation] CRITICAL ERROR: Invalid language code before API call:', {
          original: targetLangCode,
          final: finalLangCode,
          type: typeof targetLangCode
        });
        return res.status(400).json({ 
          error: 'Invalid language code', 
          message: `Language code must be exactly 2 letters. Got: "${finalLangCode}"`,
          received: targetLanguage,
          mapped: targetLangCode
        });
      }
      
      console.log('[Translation] Calling Google API with:', { 
        textCount: validTexts.length, 
        targetLangCode: finalLangCode, 
        originalTargetLang: targetLangCode,
        sampleText: validTexts[0]?.substring(0, 50) 
      });
      const [translations] = await translate.translate(validTexts, finalLangCode);
      translationResult = Array.isArray(translations) ? translations : [translations];
      console.log('[Translation] Google API response received:', { 
        translationCount: translationResult.length,
        sampleTranslation: translationResult[0]?.substring(0, 50)
      });
      
      // Map back to original array structure (preserving empty slots)
      const result = [];
      let validIndex = 0;
      for (let i = 0; i < text.length; i++) {
        if (text[i] && typeof text[i] === 'string' && text[i].trim().length > 0) {
          result[i] = translationResult[validIndex++];
        } else {
          result[i] = text[i] || '';
        }
      }
      translationResult = result;
    } else {
      // Translate single text
      // CRITICAL: Verify the language code one more time before API call
      const finalLangCode = String(targetLangCode).toLowerCase().trim();
      if (finalLangCode.length !== 2 || !/^[a-z]{2}$/.test(finalLangCode)) {
        console.error('[Translation] CRITICAL ERROR: Invalid language code before API call:', {
          original: targetLangCode,
          final: finalLangCode,
          type: typeof targetLangCode
        });
        return res.status(400).json({ 
          error: 'Invalid language code', 
          message: `Language code must be exactly 2 letters. Got: "${finalLangCode}"`,
          received: targetLanguage,
          mapped: targetLangCode
        });
      }
      
      console.log('[Translation] Calling Google API with single text:', { 
        targetLangCode: finalLangCode, 
        originalTargetLang: targetLangCode,
        textLength: text.length,
        textPreview: text.substring(0, 50) 
      });
      const [translation] = await translate.translate(text, finalLangCode);
      translationResult = translation;
      console.log('[Translation] Google API response received:', { 
        translationLength: translationResult.length,
        translationPreview: translationResult.substring(0, 50)
      });
    }

    res.json({ 
      translation: translationResult,
      targetLanguage: targetLangCode 
    });
  } catch (error) {
    console.error('Translation error:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      targetLangCode: targetLangCode,
      targetLanguage: req.body?.targetLanguage,
      errorName: error.name,
      errorCode: error.code
    });
    
    // Log the full error object if available
    if (error.response) {
      console.error('Error response:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Provide more detailed error information
    let errorMessage = error.message || 'Translation failed';
    let statusCode = 500;
    
    // Check if it's a Google API error (various formats)
    if (error.response && error.response.data) {
      const apiError = error.response.data.error;
      if (apiError) {
        errorMessage = apiError.message || errorMessage;
        statusCode = apiError.code || 500;
        
        // Log detailed error for debugging
        console.error('Google Translation API Error:', {
          code: apiError.code,
          message: apiError.message,
          details: apiError.details,
          fieldViolations: apiError.details?.[0]?.fieldViolations
        });
        
        // Check for field violations (like invalid target language)
        if (apiError.details && Array.isArray(apiError.details)) {
          const fieldViolations = apiError.details.find(d => d['@type']?.includes('BadRequest'))?.fieldViolations;
          if (fieldViolations && fieldViolations.length > 0) {
            const targetError = fieldViolations.find(v => v.field === 'target');
            if (targetError) {
              errorMessage = `Invalid target language: ${targetError.description || targetLangCode || req.body?.targetLanguage}. Please use a valid ISO 639-1 language code.`;
              statusCode = 400;
            }
          }
        }
      }
    }
    
    res.status(statusCode).json({ 
      error: 'Translation failed', 
      message: errorMessage,
      targetLanguage: targetLangCode || req.body?.targetLanguage,
      debug: process.env.NODE_ENV === 'development' ? {
        received: req.body?.targetLanguage,
        mapped: targetLangCode,
        errorType: error.constructor?.name
      } : undefined
    });
  }
});

// GET /api/translation/languages
router.get('/languages', (req, res) => {
  const languages = [
    { code: 'en', name: 'English', key: 'english' },
    { code: 'es', name: 'Spanish', key: 'spanish' },
    { code: 'fr', name: 'French', key: 'french' },
    { code: 'zh', name: 'Chinese', key: 'chinese' },
    { code: 'ja', name: 'Japanese', key: 'japanese' },
    { code: 'ar', name: 'Arabic', key: 'arabic' },
    { code: 'ko', name: 'Korean', key: 'korean' },
    { code: 'de', name: 'German', key: 'german' },
    { code: 'it', name: 'Italian', key: 'italian' },
    { code: 'pl', name: 'Polish', key: 'polish' },
    { code: 'pt', name: 'Portuguese', key: 'portuguese' },
    { code: 'ro', name: 'Romanian', key: 'romanian' },
    { code: 'sv', name: 'Swedish', key: 'swedish' },
  ];
  res.json({ languages });
});

module.exports = router;

