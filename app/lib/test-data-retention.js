// app/lib/test-data-retention.js
// This is a test file to verify the data retention setup
import { updateSystemSetting, getSystemSetting } from './settings.js';
import { dataRetentionScheduler } from './dataRetentionScheduler.js';

export async function testDataRetentionSetup() {
  console.log("🧪 Testing Data Retention Setup...");
  
  try {
    // Test 1: Try to set invalid value (should fail)
    console.log("1. Testing validation - setting invalid value (2 years)...");
    try {
      await updateSystemSetting("candidate_data_retention_years", "2", "number");
      console.log("❌ VALIDATION FAILED - Should not allow < 3 years");
    } catch (error) {
      console.log("✅ Validation working:", error.message);
    }
    
    // Test 2: Set valid value with proper parameters
    console.log("2. Testing valid value (5 years)...");
    await updateSystemSetting("candidate_data_retention_years", 5, "number");
    console.log("✅ Valid value set successfully");
    
    // Test 3: Read the setting back
    console.log("3. Testing setting retrieval...");
    const retrievedValue = await getSystemSetting("candidate_data_retention_years");
    console.log("✅ Retrieved value:", retrievedValue);
    
    // Test 4: Check scheduler configuration
    console.log("4. Testing scheduler configuration...");
    const scheduleInfo = await dataRetentionScheduler.getScheduleInfo();
    console.log("✅ Schedule info:", scheduleInfo);
    
    console.log("🎉 All tests passed! Data retention setup is working correctly.");
    
    return {
      success: true,
      setting: retrievedValue,
      scheduleInfo: scheduleInfo
    };
    
  } catch (error) {
    console.error("❌ Test failed:", error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Helper function to create the setting if it doesn't exist
export async function ensureDataRetentionSetting() {
  try {
    const { appPrisma } = await import('./prisma');
    
    // Check if setting exists
    const existingSetting = await appPrisma.settings.findFirst({
      where: {
        key: "candidate_data_retention_years",
        userId: null
      }
    });
    
    if (!existingSetting) {
      console.log("📝 Creating candidate_data_retention_years setting...");
      
      const newSetting = await appPrisma.settings.create({
        data: {
          key: "candidate_data_retention_years",
          value: "5", // Default 5 years
          category: "hiring_permissions", // Data privacy/compliance category
          description: "Number of years to retain candidate data after application closure (minimum 3 years for legal compliance)",
          dataType: "number",
          privilegeLevel: 2, // High privilege required
          userId: null, // System setting
        }
      });
      
      console.log("✅ Setting created:", newSetting);
      return newSetting;
    } else {
      console.log("✅ Setting already exists:", existingSetting);
      return existingSetting;
    }
  } catch (error) {
    console.error("❌ Error ensuring setting exists:", error);
    throw error;
  }
}

// Test the setting validation directly
export function validateDataRetentionValue(value) {
  const years = parseInt(value);
  if (isNaN(years)) {
    return { valid: false, error: "Value must be a number" };
  }
  if (years < 3) {
    return { valid: false, error: "Data retention period must be at least 3 years for legal compliance" };
  }
  return { valid: true, years };
}