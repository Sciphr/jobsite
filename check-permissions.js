const { appPrisma } = require('./app/lib/prisma');

async function getAllPermissions() {
  try {
    const permissions = await appPrisma.permissions.findMany({
      orderBy: [{ resource: 'asc' }, { action: 'asc' }]
    });
    
    console.log('=== ALL PERMISSIONS (' + permissions.length + ' total) ===');
    
    // Group by resource
    const byResource = {};
    permissions.forEach(p => {
      if (!byResource[p.resource]) byResource[p.resource] = [];
      byResource[p.resource].push(p);
    });
    
    Object.keys(byResource).sort().forEach(resource => {
      console.log('\n🔹 ' + resource.toUpperCase());
      byResource[resource].forEach(p => {
        console.log('  • ' + p.action + ' - ' + (p.description || 'No description'));
      });
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await appPrisma.$disconnect();
  }
}

getAllPermissions();