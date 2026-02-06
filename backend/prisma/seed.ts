import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@projectforge.io' },
    update: {},
    create: {
      email: 'admin@projectforge.io',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });
  console.log('✅ Created admin user:', admin.email);

  // Create demo user
  const demoPassword = await bcrypt.hash('demo1234', 12);
  const demo = await prisma.user.upsert({
    where: { email: 'demo@projectforge.io' },
    update: {},
    create: {
      email: 'demo@projectforge.io',
      passwordHash: demoPassword,
      firstName: 'Demo',
      lastName: 'User',
      role: 'MEMBER',
    },
  });
  console.log('✅ Created demo user:', demo.email);

  // Create a team
  const team = await prisma.team.upsert({
    where: { slug: 'engineering' },
    update: {},
    create: {
      name: 'Engineering',
      description: 'Core engineering team',
      slug: 'engineering',
      ownerId: admin.id,
    },
  });

  // Add members to team
  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      teamId: team.id,
      userId: admin.id,
      role: 'OWNER',
    },
  });

  await prisma.teamMember.upsert({
    where: {
      teamId_userId: {
        teamId: team.id,
        userId: demo.id,
      },
    },
    update: {},
    create: {
      teamId: team.id,
      userId: demo.id,
      role: 'MEMBER',
    },
  });
  console.log('✅ Created team:', team.name);

  // Create a project
  const project = await prisma.project.upsert({
    where: {
      teamId_slug: {
        teamId: team.id,
        slug: 'projectforge-web',
      },
    },
    update: {},
    create: {
      name: 'ProjectForge Web',
      description: 'The main ProjectForge web application',
      slug: 'projectforge-web',
      key: 'PFW',
      color: '#6366f1',
      teamId: team.id,
    },
  });
  console.log('✅ Created project:', project.name);

  // Add project members
  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: admin.id,
      },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: admin.id,
      role: 'OWNER',
    },
  });

  await prisma.projectMember.upsert({
    where: {
      projectId_userId: {
        projectId: project.id,
        userId: demo.id,
      },
    },
    update: {},
    create: {
      projectId: project.id,
      userId: demo.id,
      role: 'MEMBER',
    },
  });

  // Create work packages
  const wp1 = await prisma.workPackage.create({
    data: {
      name: 'Backend Development',
      description: 'Core backend services',
      projectId: project.id,
      status: 'IN_PROGRESS',
      priority: 'HIGH',
    },
  });

  const wp2 = await prisma.workPackage.create({
    data: {
      name: 'Frontend Development',
      description: 'React frontend application',
      projectId: project.id,
      status: 'TODO',
      priority: 'HIGH',
    },
  });

  const wp3 = await prisma.workPackage.create({
    data: {
      name: 'DevOps & Infrastructure',
      description: 'CI/CD and deployment',
      projectId: project.id,
      status: 'TODO',
      priority: 'MEDIUM',
    },
  });
  console.log('✅ Created work packages');

  // Create milestone
  const milestone = await prisma.milestone.create({
    data: {
      name: 'MVP Release',
      description: 'Minimum viable product release',
      projectId: project.id,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    },
  });
  console.log('✅ Created milestone:', milestone.name);

  // Create some tasks
  const tasks = [
    {
      title: 'Set up project structure',
      description: 'Initialize the Node.js project with TypeScript',
      projectId: project.id,
      workPackageId: wp1.id,
      priority: 'HIGH',
      status: 'DONE',
      assigneeId: admin.id,
    },
    {
      title: 'Implement authentication',
      description: 'JWT-based authentication with Passport.js',
      projectId: project.id,
      workPackageId: wp1.id,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      assigneeId: admin.id,
    },
    {
      title: 'Create database schema',
      description: 'Design and implement Prisma schema',
      projectId: project.id,
      workPackageId: wp1.id,
      priority: 'HIGH',
      status: 'DONE',
      assigneeId: demo.id,
    },
    {
      title: 'Build UI components',
      description: 'Create reusable React components',
      projectId: project.id,
      workPackageId: wp2.id,
      priority: 'MEDIUM',
      status: 'TODO',
      assigneeId: demo.id,
    },
    {
      title: 'Set up Docker',
      description: 'Create Dockerfile and docker-compose',
      projectId: project.id,
      workPackageId: wp3.id,
      priority: 'MEDIUM',
      status: 'TODO',
    },
  ];

  for (const taskData of tasks) {
    await prisma.task.create({
      data: taskData,
    });
  }
  console.log('✅ Created tasks');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📝 Login credentials:');
  console.log('   Admin: admin@projectforge.io / admin123');
  console.log('   Demo:  demo@projectforge.io / demo1234');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
