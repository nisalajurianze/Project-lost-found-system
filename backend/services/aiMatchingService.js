// ============================================
// AI & Algorithmic Matching Service
// Finds matches between Lost and Found items
// ============================================

import LostItem from '../models/LostItem.js';
import FoundItem from '../models/FoundItem.js';
import Match from '../models/Match.js';
import ImageAnalysis from '../models/ImageAnalysis.js';
import { createNotification } from './notificationService.js';

/**
 * Calculates string similarity using Jaccard Similarity (word-level).
 * @param {string} str1
 * @param {string} str2
 * @returns {number} 0 to 1
 */
const calculateTextSimilarity = (str1 = '', str2 = '') => {
  const words1 = new Set(str1.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const words2 = new Set(str2.toLowerCase().split(/\s+/).filter(w => w.length > 2));

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter(x => words2.has(x)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
};

/**
 * Calculates array intersection similarity.
 * @param {string[]} arr1
 * @param {string[]} arr2
 * @returns {number} 0 to 1
 */
const calculateArrayOverlap = (arr1 = [], arr2 = []) => {
  if (arr1.length === 0 || arr2.length === 0) return 0;
  
  const set1 = new Set(arr1.map(s => s.toLowerCase().trim()));
  const set2 = new Set(arr2.map(s => s.toLowerCase().trim()));
  
  const intersection = [...set1].filter(x => set2.has(x));
  return intersection.length / Math.min(set1.size, set2.size);
};

/**
 * Calculates matching score between a lost item and a found item.
 * Runs in O(1) memory and is highly performant.
 *
 * Weights:
 * - Category: 20%
 * - Text (Name & Description): 40%
 * - Location: 15%
 * - AI Labels (ImageAnalysis): 15%
 * - Colors (ImageAnalysis): 10%
 *
 * @param {object} lost - LostItem document
 * @param {object} found - FoundItem document
 * @param {object} lostAnalysis - ImageAnalysis for lost item (optional)
 * @param {object} foundAnalysis - ImageAnalysis for found item (optional)
 * @returns {object} { similarityScore, confidencePercentage, reason }
 */
const evaluateMatch = (lost, found, lostAnalysis = null, foundAnalysis = null) => {
  let score = 0;
  const reasons = [];

  // 1. Category Check (Weight: 20)
  // Categories must match to get category points, otherwise 0
  const categoryMatch = lost.category.toLowerCase().trim() === found.category.toLowerCase().trim();
  if (categoryMatch) {
    score += 20;
    reasons.push('Same item category');
  } else {
    // Soft match for categories (e.g. Electronics vs Gadgets) - if names overlap, allow continuing
    const catSim = calculateTextSimilarity(lost.category, found.category);
    score += catSim * 10;
  }

  // 2. Text Similarity (Weight: 40)
  const nameSim = calculateTextSimilarity(lost.itemName, found.itemName);
  const descSim = calculateTextSimilarity(lost.description, found.description);
  const textSim = (nameSim * 0.6) + (descSim * 0.4);
  
  score += textSim * 40;
  if (textSim > 0.4) {
    reasons.push(`Similar titles or descriptions (${Math.round(textSim * 100)}% text match)`);
  }

  // 3. Location Similarity (Weight: 15)
  const locSim = calculateTextSimilarity(lost.lostLocation, found.foundLocation);
  score += locSim * 15;
  if (locSim > 0.5) {
    reasons.push('Similar location reported');
  }

  // 4. AI Image Labels (Weight: 15)
  if (lostAnalysis && foundAnalysis) {
    const labelSim = calculateArrayOverlap(lostAnalysis.labels, foundAnalysis.labels);
    score += labelSim * 15;
    if (labelSim > 0.4) {
      reasons.push(`AI detected matching visual characteristics (${Math.round(labelSim * 100)}% label match)`);
    }
  } else {
    // If no AI image analysis is available, distribute weight to text similarity
    score += textSim * 15;
  }

  // 5. Colors Match (Weight: 10)
  let colorSim = 0;
  if (lostAnalysis && foundAnalysis) {
    colorSim = calculateArrayOverlap(lostAnalysis.colors, foundAnalysis.colors);
  } else {
    // Check if color words are in descriptions
    const colorList = ['black', 'white', 'blue', 'red', 'green', 'yellow', 'grey', 'gray', 'silver', 'gold', 'brown', 'pink', 'purple', 'orange'];
    const lostColors = colorList.filter(c => `${lost.itemName} ${lost.description}`.toLowerCase().includes(c));
    const foundColors = colorList.filter(c => `${found.itemName} ${found.description}`.toLowerCase().includes(c));
    colorSim = calculateArrayOverlap(lostColors, foundColors);
  }

  score += colorSim * 10;
  if (colorSim > 0.5) {
    reasons.push('Matching colors identified');
  }

  // Date validation: Lost date should typically be before or close to found date
  // Allow up to 3 days of difference in reverse if dates are approximate (reporting errors)
  const timeDiff = found.foundDate.getTime() - lost.lostDate.getTime();
  const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
  
  // If found date is way before lost date, penalise score (e.g. found a month before lost makes no sense)
  if (timeDiff < -threeDaysInMs) {
    score = score * 0.3; // heavily penalize
  } else if (timeDiff < 0) {
    // Minor penalty for slight reporting date inconsistency
    score = score * 0.9;
  }

  // Normalize final score to a whole number out of 100
  const finalScore = Math.min(Math.round(score), 100);
  const confidence = finalScore; // Match confidence tracks similarity score

  return {
    similarityScore: finalScore,
    confidencePercentage: confidence,
    reason: reasons.length > 0 ? reasons.join(', ') : 'General category and detail overlap.'
  };
};

/**
 * Runs matching logic for a newly reported item.
 * If a LostItem is supplied, it finds matching FoundItems (and vice versa).
 * Saves new matches to the database and alerts users.
 *
 * @param {object} item - LostItem or FoundItem document
 * @param {string} itemType - 'LostItem' or 'FoundItem'
 */
const runMatchingForItem = async (item, itemType) => {
  console.log(`🔍 Running matching engine for new ${itemType}: ${item.itemName} (${item._id})`);
  
  try {
    // 1. Fetch image analysis for the target item if it exists
    const targetAnalysis = await ImageAnalysis.findOne({ itemId: item._id });

    // 2. Fetch active candidates of the opposite type
    let candidates = [];
    if (itemType === 'LostItem') {
      // Find active found items that are not claimed
      candidates = await FoundItem.find({ status: { $in: ['available', 'matched'] } });
    } else {
      // Find active lost items that are not claimed/closed
      candidates = await LostItem.find({ status: { $in: ['pending', 'matched'] } });
    }

    const MATCH_THRESHOLD = 50; // Minimum score to save a match
    const STRONG_MATCH_THRESHOLD = 70; // Minimum score to send a real-time notification
    const matchesCreated = [];

    for (const candidate of candidates) {
      // Avoid matching items belonging to the same user
      if (candidate.userId.toString() === item.userId.toString()) continue;

      // Fetch image analysis for candidate
      const candidateAnalysis = await ImageAnalysis.findOne({ itemId: candidate._id });

      // Calculate score
      const lostItem = itemType === 'LostItem' ? item : candidate;
      const foundItem = itemType === 'FoundItem' ? item : candidate;
      const lostAnalysis = itemType === 'LostItem' ? targetAnalysis : candidateAnalysis;
      const foundAnalysis = itemType === 'FoundItem' ? targetAnalysis : candidateAnalysis;

      const { similarityScore, confidencePercentage, reason } = evaluateMatch(
        lostItem,
        foundItem,
        lostAnalysis,
        foundAnalysis
      );

      if (similarityScore >= MATCH_THRESHOLD) {
        // Create or update Match record
        // Use upsert to avoid duplicate records if run multiple times
        const matchData = {
          lostItemId: lostItem._id,
          foundItemId: foundItem._id,
          lostUserId: lostItem.userId,
          foundUserId: foundItem.userId,
          similarityScore,
          confidencePercentage,
          reason,
          status: 'suggested'
        };

        const savedMatch = await Match.findOneAndUpdate(
          { lostItemId: lostItem._id, foundItemId: foundItem._id },
          matchData,
          { upsert: true, new: true }
        );

        matchesCreated.push(savedMatch);

        // Update items' status to 'matched' if they are still 'pending' / 'available'
        if (lostItem.status === 'pending') {
          lostItem.status = 'matched';
          await lostItem.save();
        }
        if (foundItem.status === 'available') {
          foundItem.status = 'matched';
          await foundItem.save();
        }

        // Send notification if it's a strong match
        if (similarityScore >= STRONG_MATCH_THRESHOLD) {
          // Notify lost user
          await createNotification({
            userId: lostItem.userId,
            title: '🎯 Potential Match Found!',
            message: `We found a potential match for your lost "${lostItem.itemName}"! Check out the details.`,
            type: 'match_found',
            relatedItem: { itemType: 'Match', itemId: savedMatch._id }
          });

          // Notify found reporter
          await createNotification({
            userId: foundItem.userId,
            title: '🎯 Potential Match Found!',
            message: `A lost item matching your found "${foundItem.itemName}" has been reported.`,
            type: 'match_found',
            relatedItem: { itemType: 'Match', itemId: savedMatch._id }
          });
        }
      }
    }

    console.log(`✅ Matching engine completed. Created/updated ${matchesCreated.length} matches.`);
    return matchesCreated;
  } catch (error) {
    console.error('❌ Error running matching engine:', error);
    throw error;
  }
};

export { runMatchingForItem, evaluateMatch };
