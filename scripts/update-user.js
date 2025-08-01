// scripts/update-user.js - One-time script to fix user data
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUser() {
  try {
    const userId = 'b9587094-ad29-4576-8e8b-18034c1720db';
    
    console.log('Updating user:', userId);
    
    const updatedUser = await prisma.users.update({
      where: { id: userId },
      data: {
        role: 'tester',
        privilegeLevel: 0
      },
      select: {
        id: true,
        email: true,
        role: true,
        privilegeLevel: true
      }
    });
    
    console.log('✅ User updated successfully:', updatedUser);
  } catch (error) {
    console.error('❌ Error updating user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUser();