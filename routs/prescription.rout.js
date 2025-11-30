const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const extractMedicinesFromImage = require("../services/extractMedicinesAI.service");
const Medicine = require("../models/medicine.model");
const Pharmacy = require("../models/pharmacy.model");

router.post("/upload", upload.single("image"), async (req, res) => {
  try {
    if (!req.file)
      return res.status(400).json({
        status: "fail",
        data: { msg: "Image is required" },
      });

    const imageBuffer = req.file.buffer;
    const mimeType = req.file.mimetype; 

    const meds = await extractMedicinesFromImage(imageBuffer, mimeType); 

    const results = [];
    for (let med of meds) {
      const cleanedMed = med.trim();
   
      if (cleanedMed.length < 3) continue;

      const lowerCaseMed = cleanedMed.toLowerCase(); 

      const medicinesInDB = await Medicine.find({
        name: { $regex: lowerCaseMed, $options: "i" },
      }).populate("pharmacy");

      if (medicinesInDB.length > 0) {
       
        const pharmacies = medicinesInDB.map((m) => {
          return {
            pharmacyName: m.pharmacy ? m.pharmacy.name : "Unknown",
            pharmacyAddress: m.pharmacy ? m.pharmacy.address : "Unknown",
            price: m.price,
            description: m.description,
          };
        });

        results.push({
          medicine: cleanedMed,
          status: "found",
          pharmacies: pharmacies,
        });
      } else {
    
        results.push({
          medicine: cleanedMed,
          status: "not_found",
          pharmacies: "Not found in any registered pharmacy.",
        });
      }
    } 

    return res.json({
      status: "success",
      data: { medicinesFound: results },
      message: "Search completed for all extracted medicine names.",
    });
  } catch (error) {
    console.error("Error processing upload request:", error);
    return res.status(500).json({
      status: "error",
      data: { msg: "Server error" },
      message: error.message,
    });
  }
});

module.exports = router;
