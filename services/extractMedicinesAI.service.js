const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
dotenv.config();


const ai = new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY });

/**
 * دالة مساعدة لتحويل Buffer الصورة إلى كائن Part لـ Gemini API
 * @param {Buffer} buffer - Buffer الصورة
 * @param {string} mimeType - نوع الـ MIME للصورة (مثل: 'image/jpeg', 'image/png')
 * @returns {object} - كائن Part جاهز للإرسال
 */
function bufferToGenerativePart(buffer, mimeType) {
  return {
    inlineData: {
      data: buffer.toString("base64"),
      mimeType
    },
  };
}

/**

 * * @param {Buffer} imageBuffer .
 * @param {string} mimeType 
 * @returns {Promise<string[]>}
 */
async function extractMedicinesFromImage(imageBuffer, mimeType = 'image/jpeg') {

    const imagePart = bufferToGenerativePart(imageBuffer, mimeType);

   
    const prompt = `
        Analyze the provided image which contains text, possibly a prescription or medicine packaging.
        Your task is to extract ALL potential medicine names, drug names, or pharmaceutical brand names from the text.
        
        CRITICAL OUTPUT INSTRUCTIONS:
        1. List only the unique names.
        2. Clean the names (remove numbers, dosages like '500mg', or general words like 'Tablet', 'Capsule' unless they are part of the brand name).
        3. Do NOT include any introductory phrases, explanations, or numbering.
        4. Output the result as a single, comma-separated string (e.g., MedicineA,MedicineB,MedicineC).
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [imagePart, prompt],
        });
console.log("Gemini API response:", response);
        const textOutput = response.text.trim();
console.log("Extracted text from Gemini API:", textOutput);

    
        if (!textOutput) {
            return [];
        }

        const medsArray = textOutput
            .split(',')
            .map(med => med.trim())
            .filter(med => med.length > 0);
console.log("Parsed medicines array:", medsArray);
        return [...new Set(medsArray)];
        
    } catch (error) {
        console.error("Error extracting medicines with Gemini API:", error);
        throw new Error("Failed to process image with Gemini API.");
    }
}

module.exports = extractMedicinesFromImage;