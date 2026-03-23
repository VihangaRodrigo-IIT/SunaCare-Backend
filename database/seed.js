import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { sequelize } from '../src/config/database.js';
import '../src/models/index.js';
import { User, NgoApplication, NgoVerification } from '../src/models/index.js';

async function seed() {
  console.log('Starting minimal seed...');

  await sequelize.authenticate();
  console.log('DB connected');

  //await sequelize.sync({ force: true });
  console.log('Using existing schema...');

  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);

  const adminPassword = await bcrypt.hash('Admin1234!', rounds);
  const responderPassword = await bcrypt.hash('Rescue123!', rounds);
  const userPassword = await bcrypt.hash('User1234!', rounds);

  const admin = await User.create({
    name: 'Platform Admin',
    email: 'admin@sunacare.com',
    password: adminPassword,
    role: 'admin',
    is_active: true,
    email_verified: true,
    phone: '+94 11 2345678',
    location: 'Colombo, Sri Lanka',
    bio: 'Platform administrator for Sunacare.',
  });

  const responder = await User.create({
    name: 'Amara Perera',
    email: 'responder@pawsrescue.com',
    password: responderPassword,
    role: 'responder',
    is_active: true,
    email_verified: true,
    phone: '+94 77 1234567',
    location: 'Colombo, Sri Lanka',
    org_name: 'PAWS Rescue Lanka',
    bio: 'Responder account for NGO-side testing.',
  });

  await User.create({
    name: 'Nimali Silva',
    email: 'jane@sunacare.com',
    password: userPassword,
    role: 'user',
    is_active: true,
    email_verified: true,
    phone: '+94 77 9876543',
    location: 'Negombo, Sri Lanka',
    bio: 'User-side testing account.',
  });

  const ngoApp = await NgoApplication.create({
    contact_name: 'Amara Perera',
    org_name: 'PAWS Rescue Lanka',
    email: 'responder@pawsrescue.com',
    phone: '+94 77 1234567',
    org_type: 'rescue',
    registration_no: 'NGO-TEST-001',
    org_address: 'Colombo, Sri Lanka',
    org_description: 'Approved responder organization for testing.',
    coverage_radius_km: 25,
    approval_status: 'approved',
    review_note: 'Bootstrap responder organization',
    reviewed_by: admin.id,
    reviewed_at: new Date(),
    show_on_user_map: true,
    map_pinned: false,
  });

  await responder.update({ ngo_application_id: ngoApp.id });

  await NgoVerification.create({
    application_id: ngoApp.id,
    user_id: responder.id,
    username: 'pawsrescue',
    password_plain: 'Rescue123!',
    email_sent: true,
  });

  console.log('Minimal seed complete.');
  console.log('Admin: admin@sunacare.com / Admin1234!');
  console.log('Responder: responder@pawsrescue.com / Rescue123!');
  console.log('User: jane@sunacare.com / User1234!');

  await sequelize.close();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
