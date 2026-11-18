import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Organization from '../models/Organization.js';
import Donation from '../models/Donation.js';
import User from '../models/User.js';

const args = process.argv.slice(2);

async function setLocation() {
  if (process.env.NODE_ENV === 'production') {
    console.error('❌ dev:set-location is strictly disabled in production environment.');
    process.exit(1);
  }

  if (args.length < 4) {
    console.log('Usage:');
    console.log('  npm run dev:set-location -- org <email-or-orgId> <lat> <lng>');
    console.log('  npm run dev:set-location -- donation <donationCode> <lat> <lng>');
    process.exit(1);
  }

  const [type, identifier, latStr, lngStr] = args;
  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng)) {
    console.error('❌ Latitude and longitude must be valid floating point numbers.');
    process.exit(1);
  }

  await connectDB();

  try {
    if (type === 'org') {
      let org = null;
      if (mongoose.Types.ObjectId.isValid(identifier)) {
        org = await Organization.findById(identifier);
      }
      if (!org) {
        // Try looking up owner by email
        const user = await User.findOne({ email: identifier.toLowerCase().trim() });
        if (user) {
          org = await Organization.findOne({ ownerId: user._id });
        }
      }
      if (!org) {
        console.error(`❌ Organization not found for identifier "${identifier}".`);
        process.exit(1);
      }

      console.log(`\n🏢 Organization: ${org.name}`);
      console.log(`   Before location: [lng: ${org.location?.coordinates?.[0]}, lat: ${org.location?.coordinates?.[1]}]`);

      org.location = {
        type: 'Point',
        coordinates: [lng, lat],
      };
      await org.save();

      console.log(`   After location:  [lng: ${org.location.coordinates[0]}, lat: ${org.location.coordinates[1]}]`);
      console.log('✅ Organization location updated successfully.');
    } else if (type === 'donation') {
      const donation = await Donation.findOne({
        $or: [
          { donationCode: identifier.toUpperCase().trim() },
          ...(mongoose.Types.ObjectId.isValid(identifier) ? [{ _id: identifier }] : []),
        ],
      });

      if (!donation) {
        console.error(`❌ Donation not found for identifier "${identifier}".`);
        process.exit(1);
      }

      console.log(`\n📦 Donation: ${donation.donationCode}`);
      console.log(`   Before location: [lng: ${donation.location?.coordinates?.[0]}, lat: ${donation.location?.coordinates?.[1]}]`);

      donation.location = {
        type: 'Point',
        coordinates: [lng, lat],
      };
      await donation.save();

      console.log(`   After location:  [lng: ${donation.location.coordinates[0]}, lat: ${donation.location.coordinates[1]}]`);
      console.log('✅ Donation location updated successfully.');
    } else {
      console.error(`❌ Invalid type "${type}". Allowed types: "org", "donation".`);
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Error updating location:', err.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
  }
}

setLocation();
