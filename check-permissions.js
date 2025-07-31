// check-permissions.js - Utility to check current permissions in database
const { appPrisma } = require('./app/lib/prisma');

async function checkPermissions() {
  try {
    console.log("📋 All Permissions in Database:");
    console.log("================================");
    
    const permissions = await appPrisma.permissions.findMany({
      orderBy: [{ category: 'asc' }, { resource: 'asc' }, { action: 'asc' }]
    });
    
    // Group by category
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.category]) acc[perm.category] = [];
      acc[perm.category].push(perm);
      return acc;
    }, {});
    
    Object.entries(grouped).forEach(([category, perms]) => {
      console.log(`\n🏷️  ${category}:`);
      perms.forEach(perm => {
        console.log(`   ${perm.resource}:${perm.action} - ${perm.description}`);
      });
    });
    
    console.log(`\n📊 Total Permissions: ${permissions.length}`);
    
    // Also check roles
    console.log("\n🎭 All Roles:");
    console.log("============");
    const roles = await appPrisma.roles.findMany({
      include: {
        role_permissions: {
          include: {
            permissions: true
          }
        },
        _count: {
          select: {
            user_roles: {
              where: { is_active: true }
            }
          }
        }
      }
    });
    
    roles.forEach(role => {
      console.log(`\n🎭 ${role.name} (${role._count.user_roles} users):`);
      role.role_permissions.forEach(rp => {
        console.log(`   ✓ ${rp.permissions.resource}:${rp.permissions.action}`);
      });
    });
    
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await appPrisma.$disconnect();
  }
}

checkPermissions();