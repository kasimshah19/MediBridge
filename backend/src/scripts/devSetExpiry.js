import mongoose from 'mongoose';
import env from '../config/env.js';
import connectDB from '../config/db.js';
import Medicine from '../models/Medicine.js';
import { nowIST } from '../utils/dates.js';
import { decorateMedicine } from '../services/expiry.service.js';

/**
 * Developer helper script to override a medicine's expiry date for testing priorities and expiry workflows.
 * Usage: npm run dev:set-expiry -- <medicineId> <daysLeft>
 * Example: npm run dev:set-expiry -- MED-2026-000001 20
 */
const run = async () => {
  if (env.NODE_ENV === 'production') {
    console.error('❌ Refusing to run dev:set-expiry in production environment!');
    process.exit(1);
  }

  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.log('Usage: npm run dev:set-expiry -- <medicineId|MongoObjectId> <daysLeft>');
    console.log('Example: npm run dev:set-expiry -- MED-2026-000001 20');
    console.log('Example (expired): npm run dev:set-expiry -- MED-2026-000001 -1');
    process.exit(1);
  }

  const [idInput, daysLeftStr] = args;
  const daysLeft = parseInt(daysLeftStr, 10);

  if (isNaN(daysLeft)) {
    console.error(`❌ Invalid daysLeft argument: "${daysLeftStr}". Must be an integer.`);
    process.exit(1);
  }

  try {
    console.log('🔌 Connecting to MongoDB Atlas...');
    await connectDB();

    // Find medicine by medicineId or _id
    const query = mongoose.Types.ObjectId.isValid(idInput)
      ? { $or: [{ _id: idInput }, { medicineId: idInput }] }
      : { medicineId: idInput };

    const medicine = await Medicine.findOne(query);

    if (!medicine) {
      console.error(`❌ Medicine not found matching "${idInput}".`);
      process.exit(1);
    }

    const beforeDecorated = decorateMedicine(medicine);
    console.log('\n--- BEFORE UPDATE ---');
    console.log(`Medicine ID:    ${medicine.medicineId || medicine._id}`);
    console.log(`Name:           ${medicine.name}`);
    console.log(`Expiry Date:    ${medicine.expiryDate.toISOString()} (${medicine.expiryDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
    console.log(`Days Left:      ${beforeDecorated.daysLeft}`);
    console.log(`Priority:       ${beforeDecorated.effectivePriority}`);
    console.log(`Status:         ${medicine.status}`);

    // Compute new target date: today + daysLeft at 23:59:59.999 IST
    const targetDt = nowIST().plus({ days: daysLeft }).set({
      hour: 23,
      minute: 59,
      second: 59,
      millisecond: 999,
    });

    medicine.expiryDate = targetDt.toJSDate();
    await medicine.save();

    const afterDecorated = decorateMedicine(medicine);
    console.log('\n--- AFTER UPDATE ---');
    console.log(`Medicine ID:    ${medicine.medicineId || medicine._id}`);
    console.log(`Name:           ${medicine.name}`);
    console.log(`New Expiry:     ${medicine.expiryDate.toISOString()} (${medicine.expiryDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })})`);
    console.log(`Days Left:      ${afterDecorated.daysLeft}`);
    console.log(`New Priority:   ${afterDecorated.effectivePriority}`);
    console.log(`Expiry Label:   "${afterDecorated.expiryLabel}"`);
    console.log('\n✅ Successfully updated medicine expiry date!\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to update expiry:', err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
};

run();

