import { firestoreService } from '../services/firestoreService';
import { getUserType } from './workerUserLink';

/**
 * Migrates a single project from legacy assignedWorkers array to dual-array structure
 * (assignedEmployees + assignedWorkers)
 *
 * @param {Object} project - Project object to migrate
 * @returns {Promise<Object>} Migration result
 */
export async function migrateProject(project) {
  try {
    // If project already has both arrays populated, skip migration
    if (project.assignedEmployees && project.assignedEmployees.length > 0) {
      console.log(`Project ${project.id} already migrated, skipping...`);
      return {
        success: true,
        skipped: true,
        projectId: project.id,
        message: 'Already migrated'
      };
    }

    const legacyWorkers = project.assignedWorkers || [];

    if (legacyWorkers.length === 0) {
      console.log(`Project ${project.id} has no assigned workers, skipping...`);
      return {
        success: true,
        skipped: true,
        projectId: project.id,
        message: 'No workers assigned'
      };
    }

    const assignedEmployees = [];
    const assignedWorkers = [];

    // Process each ID in the legacy array
    for (const workerId of legacyWorkers) {
      const typeInfo = await getUserType(workerId);

      if (typeInfo.isUser && typeInfo.uid) {
        // This is an authenticated user
        assignedEmployees.push(typeInfo.uid);
        console.log(`  ✅ User: ${typeInfo.data.name} (${typeInfo.uid})`);
      } else if (typeInfo.type === 'worker-with-user-account' && typeInfo.linkedUser) {
        // This is a worker with a linked user account
        assignedEmployees.push(typeInfo.linkedUser.uid);
        console.log(`  ✅ Worker with User: ${typeInfo.data.name} -> ${typeInfo.linkedUser.name} (${typeInfo.linkedUser.uid})`);
      } else if (typeInfo.isWorker) {
        // This is an SMS-only worker
        assignedWorkers.push(workerId);
        console.log(`  📱 SMS Worker: ${typeInfo.data.name} (${workerId})`);
      } else {
        console.warn(`  ⚠️  Unknown type for ID: ${workerId}`);
        // Keep in assignedWorkers as fallback
        assignedWorkers.push(workerId);
      }
    }

    // Update the project with both arrays
    await firestoreService.update('projects', project.id, {
      assignedEmployees: assignedEmployees,
      assignedWorkers: assignedWorkers,
      migratedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    console.log(`✅ Migrated project ${project.id}: ${assignedEmployees.length} users, ${assignedWorkers.length} SMS workers`);

    return {
      success: true,
      projectId: project.id,
      projectName: project.name,
      assignedEmployees: assignedEmployees.length,
      assignedWorkers: assignedWorkers.length
    };

  } catch (error) {
    console.error(`❌ Error migrating project ${project.id}:`, error);
    return {
      success: false,
      projectId: project.id,
      error: error.message
    };
  }
}

/**
 * Migrates all projects in the database
 *
 * @returns {Promise<Object>} Migration summary
 */
export async function migrateAllProjects() {
  console.log('🚀 Starting project migration...');

  try {
    // Get all projects
    const projectsResult = await firestoreService.getAll('projects');

    if (!projectsResult.success || !projectsResult.data) {
      throw new Error('Failed to load projects');
    }

    const projects = projectsResult.data;
    console.log(`Found ${projects.length} projects to process`);

    const results = {
      total: projects.length,
      migrated: 0,
      skipped: 0,
      failed: 0,
      details: []
    };

    // Process each project
    for (const project of projects) {
      console.log(`\nProcessing: ${project.name} (${project.id})`);
      const result = await migrateProject(project);

      results.details.push(result);

      if (result.success) {
        if (result.skipped) {
          results.skipped++;
        } else {
          results.migrated++;
        }
      } else {
        results.failed++;
      }
    }

    console.log('\n✅ Migration complete!');
    console.log(`Total: ${results.total}`);
    console.log(`Migrated: ${results.migrated}`);
    console.log(`Skipped: ${results.skipped}`);
    console.log(`Failed: ${results.failed}`);

    return results;

  } catch (error) {
    console.error('❌ Migration failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Validates that all projects have correct dual-array structure
 *
 * @returns {Promise<Object>} Validation report
 */
export async function validateProjectMigration() {
  try {
    const projectsResult = await firestoreService.getAll('projects');

    if (!projectsResult.success || !projectsResult.data) {
      throw new Error('Failed to load projects');
    }

    const projects = projectsResult.data;
    const issues = [];

    for (const project of projects) {
      const assignedEmployees = project.assignedEmployees || [];
      const assignedWorkers = project.assignedWorkers || [];

      // Check if project still uses only legacy array
      if (assignedEmployees.length === 0 && assignedWorkers.length > 0) {
        issues.push({
          projectId: project.id,
          projectName: project.name,
          issue: 'Still using legacy assignedWorkers array only',
          assignedWorkers: assignedWorkers.length
        });
      }

      // Check for potential duplicates
      const allIds = [...assignedEmployees, ...assignedWorkers];
      const uniqueIds = new Set(allIds);
      if (allIds.length !== uniqueIds.size) {
        issues.push({
          projectId: project.id,
          projectName: project.name,
          issue: 'Duplicate IDs found in arrays',
          total: allIds.length,
          unique: uniqueIds.size
        });
      }
    }

    return {
      total: projects.length,
      issuesFound: issues.length,
      issues: issues
    };

  } catch (error) {
    console.error('Validation failed:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
