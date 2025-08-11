import { appPrisma } from './prisma';

/**
 * Comprehensive audit logging utility for authentication and other system events
 */

/**
 * Extract client information from request headers
 */
export function extractClientInfo(request) {
  const headers = request?.headers;
  if (!headers) return {};

  return {
    ip_address: headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               headers.get('x-real-ip') || 
               headers.get('cf-connecting-ip') || 
               'unknown',
    user_agent: headers.get('user-agent')?.slice(0, 500) || null,
    session_id: null, // Could be extracted from cookies if needed
    request_id: headers.get('x-request-id') || null
  };
}

/**
 * Log authentication events
 */
export async function logAuthEvent({
  eventType,
  action,
  status = 'success',
  severity = 'info',
  actorId = null,
  actorName = null,
  relatedUserId = null,
  description,
  metadata = {},
  oldValues = null,
  newValues = null,
  request = null
}) {
  try {
    const clientInfo = request ? extractClientInfo(request) : {};
    
    await appPrisma.audit_logs.create({
      data: {
        event_type: eventType,
        category: 'authentication',
        subcategory: eventType.toLowerCase().replace('_', '-'),
        entity_type: 'user',
        entity_id: relatedUserId,
        entity_name: actorName,
        actor_id: actorId,
        actor_type: 'user',
        actor_name: actorName,
        action: action,
        description: description,
        old_values: oldValues,
        new_values: newValues,
        changes: oldValues && newValues ? { 
          from: oldValues, 
          to: newValues 
        } : null,
        related_user_id: relatedUserId,
        severity: severity,
        status: status,
        tags: ['authentication', eventType.toLowerCase()],
        metadata: {
          ...metadata,
          timestamp: new Date().toISOString()
        },
        ...clientInfo
      }
    });
  } catch (error) {
    console.error('Failed to log audit event:', error);
    // Don't throw - audit logging shouldn't break the main flow
  }
}

/**
 * Authentication-specific audit log functions
 */
export const AuthAudit = {
  // Login attempts and successes
  async loginSuccess(userId, userEmail, authMethod, request = null, metadata = {}) {
    await logAuthEvent({
      eventType: 'LOGIN_SUCCESS',
      action: `User logged in via ${authMethod.toUpperCase()}`,
      actorId: userId,
      actorName: userEmail,
      relatedUserId: userId,
      description: `Successful authentication using ${authMethod}`,
      metadata: {
        auth_method: authMethod,
        ...metadata
      },
      request
    });
  },

  async loginFailure(email, authMethod, reason, request = null, metadata = {}) {
    await logAuthEvent({
      eventType: 'LOGIN_FAILURE',
      action: `Failed login attempt via ${authMethod.toUpperCase()}`,
      actorName: email,
      description: `Authentication failed: ${reason}`,
      severity: 'warning',
      status: 'failure',
      metadata: {
        auth_method: authMethod,
        failure_reason: reason,
        ...metadata
      },
      request
    });
  },

  // Account linking events
  async accountLinked(userId, userEmail, fromAuthType, toAuthType, request = null) {
    await logAuthEvent({
      eventType: 'ACCOUNT_LINKED',
      action: `Account linked from ${fromAuthType.toUpperCase()} to ${toAuthType.toUpperCase()}`,
      actorId: userId,
      actorName: userEmail,
      relatedUserId: userId,
      description: `User account linked additional authentication method`,
      oldValues: { account_type: fromAuthType },
      newValues: { account_type: toAuthType },
      metadata: {
        from_auth_type: fromAuthType,
        to_auth_type: toAuthType
      },
      request
    });
  },

  // User provisioning (JIT)
  async userProvisioned(userId, userEmail, authMethod, provisioningSource, userData, request = null) {
    await logAuthEvent({
      eventType: 'USER_PROVISIONED',
      action: `User auto-provisioned via ${authMethod.toUpperCase()}`,
      actorId: userId,
      actorName: userEmail,
      relatedUserId: userId,
      description: `New user automatically created from ${provisioningSource}`,
      newValues: userData,
      metadata: {
        auth_method: authMethod,
        provisioning_source: provisioningSource,
        provisioned_at: new Date().toISOString()
      },
      request
    });
  },

  // Role assignments
  async roleAssigned(targetUserId, targetUserEmail, roleId, roleName, assignedBy, source = 'manual', request = null) {
    await logAuthEvent({
      eventType: 'ROLE_ASSIGNED',
      action: `Role '${roleName}' assigned to user`,
      actorId: assignedBy?.id,
      actorName: assignedBy?.email,
      relatedUserId: targetUserId,
      description: `User assigned role '${roleName}' via ${source}`,
      newValues: { role_id: roleId, role_name: roleName },
      metadata: {
        assignment_source: source,
        role_id: roleId,
        role_name: roleName
      },
      request
    });
  },

  // Authentication method changes
  async authMethodDisabled(authMethod, disabledBy, request = null) {
    await logAuthEvent({
      eventType: 'AUTH_METHOD_DISABLED',
      action: `${authMethod.toUpperCase()} authentication disabled`,
      actorId: disabledBy?.id,
      actorName: disabledBy?.email,
      description: `Administrator disabled ${authMethod} authentication`,
      oldValues: { [`${authMethod}_enabled`]: true },
      newValues: { [`${authMethod}_enabled`]: false },
      severity: 'warning',
      metadata: {
        auth_method: authMethod,
        disabled_by: disabledBy?.email
      },
      request
    });
  },

  async authMethodEnabled(authMethod, enabledBy, request = null) {
    await logAuthEvent({
      eventType: 'AUTH_METHOD_ENABLED',
      action: `${authMethod.toUpperCase()} authentication enabled`,
      actorId: enabledBy?.id,
      actorName: enabledBy?.email,
      description: `Administrator enabled ${authMethod} authentication`,
      oldValues: { [`${authMethod}_enabled`]: false },
      newValues: { [`${authMethod}_enabled`]: true },
      metadata: {
        auth_method: authMethod,
        enabled_by: enabledBy?.email
      },
      request
    });
  },

  // LDAP/SAML specific events
  async ldapSync(userId, userEmail, syncedGroups, request = null) {
    await logAuthEvent({
      eventType: 'LDAP_SYNC',
      action: 'LDAP user data synchronized',
      actorId: userId,
      actorName: userEmail,
      relatedUserId: userId,
      description: `User data synchronized with LDAP directory`,
      newValues: { 
        synced_groups: syncedGroups,
        synced_at: new Date().toISOString()
      },
      metadata: {
        groups_count: syncedGroups?.length || 0,
        synced_groups: syncedGroups
      },
      request
    });
  },

  async samlResponse(userId, userEmail, samlAttributes, request = null) {
    await logAuthEvent({
      eventType: 'SAML_RESPONSE_PROCESSED',
      action: 'SAML response processed successfully',
      actorId: userId,
      actorName: userEmail,
      relatedUserId: userId,
      description: 'User authenticated via SAML SSO',
      metadata: {
        saml_attributes: Object.keys(samlAttributes || {}),
        attribute_count: Object.keys(samlAttributes || {}).length
      },
      request
    });
  },

  // Session management
  async sessionExpired(userId, userEmail, reason = 'timeout') {
    await logAuthEvent({
      eventType: 'SESSION_EXPIRED',
      action: 'User session expired',
      actorId: userId,
      actorName: userEmail,
      relatedUserId: userId,
      description: `Session expired due to ${reason}`,
      severity: 'info',
      metadata: {
        expiration_reason: reason
      }
    });
  },

  async logout(userId, userEmail, request = null) {
    await logAuthEvent({
      eventType: 'LOGOUT',
      action: 'User logged out',
      actorId: userId,
      actorName: userEmail,
      relatedUserId: userId,
      description: 'User successfully logged out',
      request
    });
  }
};

/**
 * General system audit functions
 */
export const SystemAudit = {
  async configurationChanged(setting, oldValue, newValue, changedBy, request = null) {
    await appPrisma.audit_logs.create({
      data: {
        event_type: 'CONFIGURATION_CHANGED',
        category: 'system',
        subcategory: 'settings',
        entity_type: 'setting',
        entity_name: setting,
        actor_id: changedBy?.id,
        actor_type: 'user',
        actor_name: changedBy?.email,
        action: `System setting '${setting}' modified`,
        description: `Configuration setting changed by administrator`,
        old_values: { [setting]: oldValue },
        new_values: { [setting]: newValue },
        changes: {
          setting: setting,
          from: oldValue,
          to: newValue
        },
        severity: 'info',
        status: 'success',
        tags: ['configuration', 'settings'],
        metadata: {
          setting_key: setting,
          changed_by: changedBy?.email,
          timestamp: new Date().toISOString()
        },
        ...extractClientInfo({ headers: request?.headers })
      }
    });
  }
};