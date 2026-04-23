import { connectToDatabase } from './src/config/db.js';
import { CommunityQuestion } from './src/models/CommunityQuestion.js';
import { CommunityAnswer } from './src/models/CommunityAnswer.js';
import { communityQuestions, communityAnswers } from './src/data/mockData.js';
import dotenv from 'dotenv';
dotenv.config();

async function seed() {
  try {
    await connectToDatabase();
    
    // Clear and re-seed to ensure a fresh "alive" community
    await CommunityQuestion.deleteMany({});
    await CommunityAnswer.deleteMany({});
    
    await CommunityQuestion.insertMany(communityQuestions);
    await CommunityAnswer.insertMany(communityAnswers);
    
    console.log('Community seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err);
    process.exit(1);
  }
}
seed();
