const fileModel = require('../models/fileModel');
const dataModel = require('../models/dataModel');
const csvHandler = require('../utils/csvHandler');
const { MEconc, TEconc } = require('../colHeaders');
const qcl = {
  1: 'QC MES 5 ppm',
  2: 'QC MES 50 ppb',
};


// ==========================
// 1. File Validation
// ==========================

/**
 * Validate a CSV file before processing.
 * - Checks for duplicates
 * - Determines file type
 * - Validates headers
 * - Parses rows and splits sample/QC
 */
async function validate(filePath, originalName) {
  try {
    // Check if file with same name already exists
    if (await fileModel.fileExists(originalName)) {
      return { error: 'File already present', samples: null, qc: null, csvType: null, headers: null };
    }

    // Detect CSV type from initial header(s)
    const firstLine = await csvHandler.getHeaders(1, filePath);
    const csvType = csvHandler.checkCsvType(firstLine);
    if (csvType === 0) {
      return { error: 'Unrecognized CSV structure', samples: null, qc: null, csvType, headers: null };
    }

    // Validate full header set
    const headers = await csvHandler.getHeaders(csvType, filePath);
    if (!csvHandler.validateHeaders(headers, csvType)) {
      return { error: 'Invalid or mismatched headers', samples: null, qc: null, csvType, headers };
    }

    // Parse all data rows
    const rows = await csvHandler.parseDataRows(filePath, headers);
    if (!rows.length) {
      return { error: 'No valid data rows', samples: null, qc: null, csvType, headers };
    }

    // Separate rows into samples and QC
    const { samples, qc } = csvHandler.splitSamplesAndQc(rows);
    if (!samples.length || !qc.length) {
      return { error: 'Either no samples or no QC rows', samples: null, qc: null, csvType, headers };
    }

    // Final QC label check
    csvHandler.validateQcLabels(qc);

    return { error: null, samples, qc, csvType, headers };
  } catch (err) {
    console.error('[validate] Error:', err.message);
    return { error: err.message || 'Validation failed', samples: null, qc: null, csvType: null, headers: null };
  }
}



// ==========================
// 2. Insert Raw CSV Data
// ==========================

/**
 * Insert validated data into DB.
 * - Insert file metadata (including optional PDF info)
 * - Insert QC data
 * - Insert/update sample rows
 * - Map sample IDs to file
 */
async function insertAllData(originalName, savedFilePath, samples, qc, csvType, headers, pdfOriginalName, pdfSavedPath) {
  let fileId;

  // Step 1: Insert file info, now including PDF details.
  // The fileModel.insertFile will need to be updated to handle these new optional arguments.
  // For the old route, pdfOriginalName and pdfSavedPath will be null/undefined.
  try {
    const fileRow = await fileModel.insertFile(originalName, savedFilePath, csvType, pdfOriginalName, pdfSavedPath);
    fileId = fileRow.id;
  } catch (err) {
    return { error: 'Failed to insert file metadata: ' + err.message, fileId: null };
  }

  // Step 2: Insert QC data (No changes needed here)
  try {
    for (const row of qc) {
      const columns = ['file_id', ...Object.keys(row)];
      const values = [fileId, ...Object.values(row)];
      await dataModel.insertQCRow(columns, values);
    }
  } catch (err) {
    return { error: 'Failed to insert QC data: ' + err.message, fileId };
  }

  // Step 3: Filter relevant sample columns (No changes needed here)
  const filteredRows = csvHandler.filterColumnsByKeys(samples, csvType, headers);

  // Step 4: Insert or update sample data + mapping (No changes needed here)
  try {
    for (const { filtered1, filtered2 } of filteredRows) {
      const label = filtered1['Solution Label'];
      const exists = await dataModel.sampleExists(label);

      let sampleId;
      try {
        sampleId = exists
          ? await dataModel.updateSample(label, filtered1)
          : await dataModel.insertSample(filtered1);

        if (!sampleId) {
          return { error: `Failed to handle sample "${label}"`, fileId };
        }

        // ✅ Insert or update rest_data (filtered2)
        if (exists) {
          await dataModel.updateRestData(label, filtered2);
        } else {
          await dataModel.insertRestData(filtered2);
        }

      } catch (err) {
        return { error: `Failed to process sample "${label}": ${err.message}`, fileId };
      }

      try {
        await dataModel.insertSampleFileMapping(sampleId, fileId);
      } catch (err) {
        return { error: `Failed to map sample "${label}" to file: ${err.message}`, fileId };
      }
    }
  } catch (err) {
    return { error: 'Failed to process sample data: ' + err.message, fileId };
  }


  return { error: null, fileId };
}


// ==========================
// 3. Apply Correction Factors
// ==========================

/**
 * Apply correction factors using QC MES rows.
 * - Calculates % deviation from known value
 * - Applies correction to sample_data and SJS-Std
 */
async function insertCorrected(fileId, csvType, headers) {


  try {
    // // Step 1: Get QC MES rows for this file
    // const qcRows = await dataModel.getAllQCMESRows(fileId);
    // const selectedRow = qcRows[0];
    // const usedLabel = selectedRow["Solution Label"];

    // Step 2: Determine applicable element columns
    const allowedCols = csvType === 1 ? MEconc : TEconc;
    const elementCols = headers.filter(header => allowedCols.includes(header));



    // Step 3: Get average measured values
    const averages = await dataModel.getQCAveragesByLabel(fileId, qcl[csvType], elementCols);



    const known = csvType === 1 ? 5 : 50; // e.g., extract 50 from "QC MES 50"

    // Step 4: Calculate correction factors
    const factors = {};
    for (const [key, avg] of Object.entries(averages)) {
      if (avg !== null && !isNaN(avg)) {
        factors[key] = (known - avg) / known;
      }
    }

    // Step 5: Apply correction to samples
    const sampleIds = await dataModel.getSampleIdsForFile(fileId);


    for (const sampleId of sampleIds) {
      const row = await dataModel.getSampleById(sampleId, elementCols);


      if (!row) continue;

      const updates = {};
      for (const [element, factor] of Object.entries(factors)) {
        const rawVal = row[element];
        if (rawVal !== null && !isNaN(parseFloat(rawVal))) {
          updates[`${element}_Corrected`] = parseFloat(rawVal) * (1 + factor);
        }
      }

      if (Object.keys(updates).length > 0) {
        await dataModel.updateSampleCorrectedValues(sampleId, updates);
      }
    }

    // Step 6: Apply correction to SJS-Std rows
    const stdIds = await dataModel.getStdIdsForFile(fileId);

    for (const stdId of stdIds) {
      const row = await dataModel.getStdById(stdId, elementCols);
      if (!row) continue;

      const updates = {};
      for (const [element, factor] of Object.entries(factors)) {
        const rawVal = row[element];
        if (rawVal !== null && !isNaN(parseFloat(rawVal))) {
          updates[`${element}_Corrected`] = parseFloat(rawVal) * (1 + factor);
        }
      }

      if (Object.keys(updates).length > 0) {
        await dataModel.updateStdCorrectedValues(stdId, updates);
      }
    }

    return { error: null };

  } catch (err) {
    console.error('[insertCorrected] Error:', err.message);
    return { error: 'Failed to apply correction factors: ' + err.message };
  }
}


// ==========================
// Exports
// ==========================
module.exports = {
  validate,
  insertAllData,
  insertCorrected,
};
