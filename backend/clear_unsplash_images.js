import mongoose from 'mongoose';
import dotenv from 'dotenv';
import dns from 'dns';

dns.setServers(['8.8.8.8', '8.8.4.4']);
dotenv.config();

const lostItemSchema = new mongoose.Schema({
  images: { type: Array, default: [] },
}, { strict: false });

const foundItemSchema = new mongoose.Schema({
  images: { type: Array, default: [] },
}, { strict: false });

const LostItem = mongoose.models.LostItem || mongoose.model('LostItem', lostItemSchema);
const FoundItem = mongoose.models.FoundItem || mongoose.model('FoundItem', foundItemSchema);

async function run() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("No MONGO_URI");
    await mongoose.connect(uri);
    console.log("Connected");

    // Remove unsplash images from LostItems
    const lostResult = await LostItem.updateMany(
      { "images.url": { $regex: /unsplash\.com/i } },
      { $set: { images: [] } }
    );
    console.log(`LostItems modified: ${lostResult.modifiedCount}`);

    // Remove unsplash images from FoundItems
    const foundResult = await FoundItem.updateMany(
      { "images.url": { $regex: /unsplash\.com/i } },
      { $set: { images: [] } }
    );
    console.log(`FoundItems modified: ${foundResult.modifiedCount}`);

  } catch(e) {
    console.error(e);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}
run();
