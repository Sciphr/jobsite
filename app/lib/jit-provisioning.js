import { appPrisma } from './prisma';
import { AuthAudit } from './audit';

/**
 * Just-in-Time (JIT) User Provisioning and Role Mapping
 * Handles automatic user creation and role assignment from SAML/LDAP groups
 */

/**
 * Map SAML/LDAP groups to application roles
 */
export async function mapGroupsToRoles(groups, authMethod = 'ldap') {
  if (!groups || groups.length === 0) return [];

  try {
    const mappedRoles = [];
    
    for (const group of groups) {
      const groupName = typeof group === 'string' ? group : group.name;
      
      // Look for existing role mapping
      let role = null;
      
      if (authMethod === 'ldap') {
        // Find LDAP-mapped role
        role = await appPrisma.roles.findFirst({
          where: {
            is_ldap_role: true,
            ldap_group_name: groupName,
            is_active: true
          }
        });
      } else if (authMethod === 'saml') {
        // For SAML, we'll use a naming convention or attribute mapping
        // Look for roles that match the SAML group name or have SAML mapping
        role = await appPrisma.roles.findFirst({
          where: {
            OR: [
              { name: groupName }, // Direct name match
              { name: groupName.replace(/[^a-zA-Z0-9]/g, '_') }, // Sanitized name
              // Could add more SAML-specific mapping logic here
            ],
            is_active: true
          }
        });
      }
      
      if (role) {
        mappedRoles.push(role);
        console.log(`✅ Mapped ${authMethod} group '${groupName}' to role '${role.name}'`);
      } else {
        console.log(`⚠️ No role mapping found for ${authMethod} group '${groupName}'`);
        
        // Option to auto-create roles (configurable)
        const shouldAutoCreateRoles = await shouldAutoCreateRolesFromGroups(authMethod);
        if (shouldAutoCreateRoles) {
          const newRole = await createRoleFromGroup(groupName, authMethod);
          if (newRole) {
            mappedRoles.push(newRole);
            console.log(`🆕 Auto-created role '${newRole.name}' from ${authMethod} group '${groupName}'`);
          }
        }
      }
    }
    
    return mappedRoles;
  } catch (error) {
    console.error('Error mapping groups to roles:', error);
    return [];
  }
}

/**
 * Check if auto-creation of roles from groups is enabled
 */
async function shouldAutoCreateRolesFromGroups(authMethod) {
  try {
    const setting = await appPrisma.settings.findFirst({
      where: {
        key: `${authMethod}_auto_create_roles`,
        userId: null
      }
    });
    
    return setting?.value === 'true';
  } catch (error) {
    console.warn('Could not check auto-create roles setting:', error);
    return false; // Default to false for security
  }
}

/**
 * Create a new role from a group name
 */
async function createRoleFromGroup(groupName, authMethod) {
  try {
    // Sanitize the role name
    const roleName = sanitizeRoleName(groupName);
    
    // Check if role already exists (race condition protection)
    const existingRole = await appPrisma.roles.findFirst({
      where: { name: roleName }
    });
    
    if (existingRole) return existingRole;
    
    const newRole = await appPrisma.roles.create({
      data: {
        name: roleName,
        description: `Auto-created from ${authMethod.toUpperCase()} group: ${groupName}`,
        color: authMethod === 'ldap' ? '#3b82f6' : '#10b981', // Blue for LDAP, Green for SAML
        is_system_role: false,
        is_active: true,
        is_ldap_role: authMethod === 'ldap',
        ldap_group_name: authMethod === 'ldap' ? groupName : null,
        is_editable: true
      }
    });
    
    return newRole;
  } catch (error) {
    console.error(`Error creating role from ${authMethod} group '${groupName}':`, error);
    return null;
  }
}

/**
 * Sanitize group name for use as role name
 */
function sanitizeRoleName(groupName) {
  return groupName
    .replace(/[^a-zA-Z0-9\s-_]/g, '') // Remove special chars except spaces, hyphens, underscores
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .toLowerCase()
    .substring(0, 100); // Limit to 100 chars (database constraint)
}

/**
 * Assign roles to user based on groups
 */
export async function assignRolesToUser(userId, roles, authMethod = 'ldap', assignedBy = null) {
  if (!roles || roles.length === 0) return [];

  try {
    const assignmentResults = [];
    
    for (const role of roles) {
      // Check if user already has this role
      const existingAssignment = await appPrisma.user_roles.findFirst({
        where: {
          user_id: userId,
          role_id: role.id,
          is_active: true
        }
      });
      
      if (existingAssignment) {
        console.log(`👤 User already has role '${role.name}'`);
        continue;
      }
      
      // Assign the role
      const assignment = await appPrisma.user_roles.create({
        data: {
          user_id: userId,
          role_id: role.id,
          assigned_at: new Date(),
          assigned_by: assignedBy?.id || null,
          is_active: true
        }
      });
      
      assignmentResults.push({ role, assignment });
      
      // Log role assignment
      await AuthAudit.roleAssigned(
        userId,
        null, // We'll get the email separately
        role.id,
        role.name,
        assignedBy,
        `${authMethod}_jit`
      );
      
      console.log(`✅ Assigned role '${role.name}' to user via ${authMethod.toUpperCase()} JIT`);
    }
    
    return assignmentResults;
  } catch (error) {
    console.error('Error assigning roles to user:', error);
    return [];
  }
}

/**
 * Remove roles that user no longer has in LDAP/SAML groups
 */
export async function syncUserRoles(userId, currentGroups, authMethod = 'ldap') {
  try {
    // Get current roles mapped from groups for this auth method
    const currentMappedRoles = await mapGroupsToRoles(currentGroups, authMethod);
    const currentRoleIds = currentMappedRoles.map(r => r.id);
    
    // Get user's current roles that were assigned via this auth method
    const userRoles = await appPrisma.user_roles.findMany({
      where: {
        user_id: userId,
        is_active: true
      },
      include: {
        roles: true
      }
    });
    
    // Filter to roles that came from this auth method
    const authMethodRoles = userRoles.filter(ur => {
      if (authMethod === 'ldap') {
        return ur.roles.is_ldap_role;
      }
      // For SAML, we could add similar logic or use other identifiers
      return false; // For now, only sync LDAP roles
    });
    
    // Find roles to remove (user had them but no longer in groups)
    const rolesToRemove = authMethodRoles.filter(
      ur => !currentRoleIds.includes(ur.roles.id)
    );
    
    // Deactivate removed roles
    for (const userRole of rolesToRemove) {
      await appPrisma.user_roles.update({
        where: { id: userRole.id },
        data: { is_active: false }
      });
      
      console.log(`🗑️ Removed role '${userRole.roles.name}' from user (no longer in ${authMethod.toUpperCase()} groups)`);
    }
    
    // Assign new roles
    await assignRolesToUser(userId, currentMappedRoles, authMethod);
    
    return {
      added: currentMappedRoles.length,
      removed: rolesToRemove.length
    };
  } catch (error) {
    console.error('Error syncing user roles:', error);
    return { added: 0, removed: 0 };
  }
}

/**
 * Get default roles for new users
 */
export async function getDefaultRolesForNewUser(authMethod = 'local') {
  try {
    const setting = await appPrisma.settings.findFirst({
      where: {
        key: `${authMethod}_default_roles`,
        userId: null
      }
    });
    
    if (!setting?.value) {
      // Fallback to basic 'User' role
      const userRole = await appPrisma.roles.findFirst({
        where: {
          name: 'User',
          is_active: true
        }
      });
      
      return userRole ? [userRole] : [];
    }
    
    const roleNames = JSON.parse(setting.value);
    const roles = await appPrisma.roles.findMany({
      where: {
        name: { in: roleNames },
        is_active: true
      }
    });
    
    return roles;
  } catch (error) {
    console.error('Error getting default roles:', error);
    return [];
  }
}

/**
 * Complete JIT provisioning workflow
 */
export async function performJITProvisioning({
  userData,
  groups = [],
  authMethod,
  existingUser = null,
  provisionedBy = null
}) {
  try {
    let user = existingUser;
    const isNewUser = !existingUser;
    
    // Step 1: Create user if doesn't exist
    if (!user) {
      const defaultRoles = await getDefaultRolesForNewUser(authMethod);
      
      user = await appPrisma.users.create({
        data: {
          ...userData,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      });
      
      // Assign default roles
      if (defaultRoles.length > 0) {
        await assignRolesToUser(user.id, defaultRoles, authMethod, provisionedBy);
      }
      
      // Log user provisioning
      await AuthAudit.userProvisioned(
        user.id,
        user.email,
        authMethod,
        `${authMethod.toUpperCase()} JIT Provisioning`,
        userData
      );
    }
    
    // Step 2: Map groups to roles and assign
    if (groups.length > 0) {
      const rolesSyncResult = await syncUserRoles(user.id, groups, authMethod);
      console.log(`📊 JIT Role sync: +${rolesSyncResult.added} -${rolesSyncResult.removed}`);
    }
    
    return {
      user,
      isNewUser,
      success: true
    };
  } catch (error) {
    console.error('JIT Provisioning failed:', error);
    return {
      user: existingUser,
      isNewUser: false,
      success: false,
      error: error.message
    };
  }
}