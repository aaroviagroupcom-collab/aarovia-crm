import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Aarovia CRM...');

  // ── Users ──────────────────────────────────────────────────────────────────
  const hashedPassword = await bcrypt.hash('Admin@123', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'superadmin@aaroviagroup.com' },
      update: {},
      create: { name: 'Super Admin', email: 'superadmin@aaroviagroup.com', password: hashedPassword, role: Role.SUPER_ADMIN, phone: '9800000001' },
    }),
    prisma.user.upsert({
      where: { email: 'admin@aaroviagroup.com' },
      update: {},
      create: { name: 'Admin User', email: 'admin@aaroviagroup.com', password: hashedPassword, role: Role.ADMIN, phone: '9800000002' },
    }),
    prisma.user.upsert({
      where: { email: 'manager@aaroviagroup.com' },
      update: {},
      create: { name: 'Sales Manager', email: 'manager@aaroviagroup.com', password: hashedPassword, role: Role.SALES_MANAGER, phone: '9800000003' },
    }),
    prisma.user.upsert({
      where: { email: 'tl@aaroviagroup.com' },
      update: {},
      create: { name: 'Team Leader', email: 'tl@aaroviagroup.com', password: hashedPassword, role: Role.TEAM_LEADER, phone: '9800000004' },
    }),
    prisma.user.upsert({
      where: { email: 'exec1@aaroviagroup.com' },
      update: {},
      create: { name: 'Rahul Sharma', email: 'exec1@aaroviagroup.com', password: hashedPassword, role: Role.SALES_EXECUTIVE, phone: '9800000005' },
    }),
    prisma.user.upsert({
      where: { email: 'exec2@aaroviagroup.com' },
      update: {},
      create: { name: 'Priya Singh', email: 'exec2@aaroviagroup.com', password: hashedPassword, role: Role.SALES_EXECUTIVE, phone: '9800000006' },
    }),
    prisma.user.upsert({
      where: { email: 'postsales@aaroviagroup.com' },
      update: {},
      create: { name: 'Post Sales Executive', email: 'postsales@aaroviagroup.com', password: hashedPassword, role: Role.POST_SALES_EXECUTIVE, phone: '9800000007' },
    }),
    prisma.user.upsert({
      where: { email: 'accounts@aaroviagroup.com' },
      update: {},
      create: { name: 'Accounts Manager', email: 'accounts@aaroviagroup.com', password: hashedPassword, role: Role.ACCOUNTS, phone: '9800000008' },
    }),
    prisma.user.upsert({
      where: { email: 'marketing@aaroviagroup.com' },
      update: {},
      create: { name: 'Marketing Executive', email: 'marketing@aaroviagroup.com', password: hashedPassword, role: Role.MARKETING, phone: '9800000009' },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);
  console.log('\n🎉 Seed complete!\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  LOGIN CREDENTIALS');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  superadmin@aaroviagroup.com  |  Admin@123');
  console.log('  admin@aaroviagroup.com       |  Admin@123');
  console.log('  manager@aaroviagroup.com     |  Admin@123');
  console.log('  tl@aaroviagroup.com          |  Admin@123');
  console.log('  exec1@aaroviagroup.com       |  Admin@123');
  console.log('  exec2@aaroviagroup.com       |  Admin@123');
  console.log('  postsales@aaroviagroup.com   |  Admin@123');
  console.log('  accounts@aaroviagroup.com    |  Admin@123');
  console.log('  marketing@aaroviagroup.com   |  Admin@123');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
