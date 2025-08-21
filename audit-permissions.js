import { appPrisma } from './app/lib/prisma.js';

async function auditPermissions() {
  try {
    console.log('🔍 PERMISSION SYSTEM AUDIT\n');

    // 1. Get all permissions
    const permissions = await appPrisma.permissions.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }]
    });

    console.log(`📊 Total Permissions: ${permissions.length}\n`);

    // Group by resource
    const byResource = {};
    permissions.forEach(p => {
      if (!byResource[p.resource]) byResource[p.resource] = [];
      byResource[p.resource].push(p);
    });

    console.log('📋 PERMISSIONS BY RESOURCE:');
    Object.keys(byResource).sort().forEach(resource => {
      console.log(`\n🔹 ${resource.toUpperCase()} (${byResource[resource].length} permissions)`);
      byResource[resource].forEach(p => {
        console.log(`  • ${p.action} - ${p.description || 'No description'}`);
      });
    });

    // 2. Get all roles and their permissions
    const roles = await appPrisma.roles.findMany({
      include: {
        role_permissions: {
          include: {
            permissions: true
          }
        },
        user_roles: {
          where: { is_active: true },
          select: { user_id: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    console.log(`\n\n👥 ROLES ANALYSIS (${roles.length} roles):`);
    
    roles.forEach(role => {
      const permCount = role.role_permissions.length;
      const userCount = role.user_roles.length;
      const isSystem = role.is_system_role ? '🔒 System' : '📝 Custom';
      
      console.log(`\n${isSystem} Role: ${role.name}`);
      console.log(`  Description: ${role.description || 'No description'}`);
      console.log(`  Users: ${userCount} | Permissions: ${permCount}`);
      
      if (permCount > 0) {
        console.log('  Permissions:');
        role.role_permissions.forEach(rp => {
          console.log(`    • ${rp.permissions.resource}:${rp.permissions.action}`);
        });
      }
    });

    // 3. Check for users without roles
    const usersWithoutRoles = await appPrisma.users.findMany({
      where: {
        user_roles: {
          none: {
            is_active: true
          }
        }
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true // legacy role field
      }
    });

    if (usersWithoutRoles.length > 0) {
      console.log(`\n\n⚠️  USERS WITHOUT ROLES (${usersWithoutRoles.length}):`);
      usersWithoutRoles.forEach(user => {
        console.log(`  • ${user.email} (${user.firstName} ${user.lastName}) - Legacy role: ${user.role}`);
      });
    }

    // 4. Check for orphaned permissions (not assigned to any role)
    const assignedPermissionIds = roles.flatMap(role => 
      role.role_permissions.map(rp => rp.permissions.id)
    );
    
    const orphanedPermissions = permissions.filter(p => 
      !assignedPermissionIds.includes(p.id)
    );

    if (orphanedPermissions.length > 0) {
      console.log(`\n\n🔍 ORPHANED PERMISSIONS (${orphanedPermissions.length}):`);
      console.log('These permissions exist but are not assigned to any role:');
      orphanedPermissions.forEach(p => {
        console.log(`  • ${p.resource}:${p.action} - ${p.description}`);
      });
    }

    // 5. Security recommendations
    console.log('\n\n🛡️  SECURITY RECOMMENDATIONS:');
    
    // Check for users with privilege level >= 3 (super admins)
    const superAdmins = await appPrisma.users.findMany({
      where: { privilegeLevel: { gte: 3 } },
      select: { email: true, privilegeLevel: true }
    });
    
    if (superAdmins.length > 0) {
      console.log(`  • ${superAdmins.length} super admin(s) found (bypass all permission checks):`);
      superAdmins.forEach(admin => {
        console.log(`    - ${admin.email} (privilege level: ${admin.privilegeLevel})`);
      });
    }

    // Check for overprivileged roles
    const highPermissionRoles = roles.filter(role => 
      role.role_permissions.length > 20 && !role.is_system_role
    );
    
    if (highPermissionRoles.length > 0) {
      console.log(`  • ${highPermissionRoles.length} role(s) have >20 permissions (review needed):`);
      highPermissionRoles.forEach(role => {
        console.log(`    - ${role.name}: ${role.role_permissions.length} permissions`);
      });
    }

    console.log('\n✅ Audit completed!');

  } catch (error) {
    console.error('❌ Error during audit:', error);
  } finally {
    await appPrisma.$disconnect();
  }
}

auditPermissions();