import mongoose from 'mongoose';
import QcStage from './models/QcStage.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const stage = await QcStage.findOne({ jobCardId: '69cc1e20a44d2730b1ba60e7' });
  console.log(JSON.stringify(stage?.defectPhotos, null, 2));
  process.exit(0);
});
