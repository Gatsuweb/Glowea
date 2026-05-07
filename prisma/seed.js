require('dotenv').config();
const { Pool } = require('pg');
const { PrismaPg } = require('@prisma/adapter-pg');
const { PrismaClient } = require('@prisma/client');

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const tenantId = 'tenant_seed_123';
  const userId = 'user_seed_123';
  const now = new Date();

  console.log('Seeding database...');

  // Create Tenant
  const tenant = await prisma.tenant.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: 'Glowéa Studio',
      slug: 'glowea-studio',
      updatedAt: now,
    },
  });

  // Create User
  const user = await prisma.user.upsert({
    where: { id: userId },
    update: {},
    create: {
      id: userId,
      clerkUserId: 'clerk_seed_123',
      email: 'test@glowea.com',
      fullName: 'Sophie Doe',
      tenantId: tenant.id,
      updatedAt: now,
    },
  });

  // Create Categories
  const categories = [
    { id: 'cat_1', name: 'Cils', slug: 'cils' },
    { id: 'cat_2', name: 'Ongles', slug: 'ongles' },
    { id: 'cat_3', name: 'Consommables', slug: 'consommables' },
    { id: 'cat_4', name: 'Liquides', slug: 'liquides' },
  ];

  for (const cat of categories) {
    await prisma.productCategory.upsert({
      where: { id: cat.id },
      update: {},
      create: {
        id: cat.id,
        tenantId: tenant.id,
        name: cat.name,
        slug: cat.slug,
        updatedAt: now,
      },
    });
  }

  // Create Services
  const services = [
    { id: 'srv_1', name: 'Pose cil à cil', durationMin: 120, price: 80, category: 'Cils' },
    { id: 'srv_2', name: 'Remplissage gel', durationMin: 90, price: 50, category: 'Ongles' },
    { id: 'srv_3', name: 'Pose cil volume', durationMin: 150, price: 90, category: 'Cils' },
  ];

  for (const srv of services) {
    await prisma.service.upsert({
      where: { id: srv.id },
      update: {},
      create: {
        id: srv.id,
        tenantId: tenant.id,
        name: srv.name,
        durationMin: srv.durationMin,
        price: srv.price,
        updatedAt: now,
      },
    });
  }

  // Create Clients
  const clients = [
    { id: 'cli_1', firstName: 'Emma', lastName: 'L.', phone: '0601020304', email: 'emma@test.com' },
    { id: 'cli_2', firstName: 'Laura', lastName: 'M.', phone: '0601020305', email: 'laura@test.com' },
    { id: 'cli_3', firstName: 'Chloé', lastName: 'D.', phone: '0601020306', email: 'chloe@test.com' },
    { id: 'cli_4', firstName: 'Sofia', lastName: 'R.', phone: '0601020307', email: 'sofia@test.com' },
  ];

  for (const cli of clients) {
    await prisma.client.upsert({
      where: { id: cli.id },
      update: {},
      create: {
        id: cli.id,
        tenantId: tenant.id,
        firstName: cli.firstName,
        lastName: cli.lastName,
        phone: cli.phone,
        email: cli.email,
        updatedAt: now,
      },
    });
  }

  // Create Appointments
  const today = new Date();
  today.setHours(10, 0, 0, 0);
  
  const appointments = [
    { id: 'app_1', clientId: 'cli_1', serviceId: 'srv_1', date: new Date(today), status: 'COMPLETED' },
    { id: 'app_2', clientId: 'cli_2', serviceId: 'srv_2', date: new Date(today.getTime() + 4 * 60 * 60 * 1000), status: 'SCHEDULED' },
    { id: 'app_3', clientId: 'cli_3', serviceId: 'srv_3', date: new Date(today.getTime() + 6 * 60 * 60 * 1000), status: 'SCHEDULED' },
  ];

  for (const app of appointments) {
    await prisma.appointment.upsert({
      where: { id: app.id },
      update: {},
      create: {
        id: app.id,
        tenantId: tenant.id,
        clientId: app.clientId,
        serviceId: app.serviceId,
        createdByUserId: user.id,
        scheduledAt: app.date,
        status: app.status,
        updatedAt: now,
      },
    });
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
    await prisma.$disconnect();
  });
