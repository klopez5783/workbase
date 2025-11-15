import { firestoreService } from './firestoreService';

/**
 * Daily Report Generation Service
 * Generates comprehensive daily reports from work logs
 */

export const reportGenerationService = {
  /**
   * Generate a daily report for a specific date and project
   */
  async generateDailyReport(projectId, date = new Date()) {
    try {
      // Set date to start of day
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      // Get project details
      const projectResult = await firestoreService.getById('projects', projectId);
      if (!projectResult.success) {
        throw new Error('Project not found');
      }
      const project = projectResult.data;

      // Get all work logs for this project on this date
      const workLogsResult = await firestoreService.query('workLogs', [
        { field: 'projectId', operator: '==', value: projectId }
      ]);

      let workLogs = [];
      if (workLogsResult.success) {
        workLogs = workLogsResult.data.filter(log => {
          const logDate = new Date(log.createdAt);
          return logDate >= startOfDay && logDate <= endOfDay;
        });
      }

      // Get all time entries for this project on this date
      const timeEntriesResult = await firestoreService.query('timeEntries', [
        { field: 'projectId', operator: '==', value: projectId }
      ]);

      let timeEntries = [];
      if (timeEntriesResult.success) {
        timeEntries = timeEntriesResult.data.filter(entry => {
          const entryDate = new Date(entry.clockIn);
          return entryDate >= startOfDay && entryDate <= endOfDay;
        });
      }

      // Calculate statistics
      const stats = this.calculateStatistics(workLogs, timeEntries);

      // Build report
      const report = {
        id: 'report_' + projectId + '_' + date.toISOString().split('T')[0],
        projectId: project.id,
        projectName: project.name,
        projectAddress: project.address,
        clientName: project.clientName,
        date: date.toISOString(),
        dateFormatted: date.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        }),
        
        // Statistics
        stats: {
          totalWorkers: stats.totalWorkers,
          totalHours: stats.totalHours,
          totalWorkLogs: workLogs.length,
          totalPhotos: stats.totalPhotos,
        },

        // Work completed
        workCompleted: workLogs.map(log => ({
          workerName: log.workerName,
          description: log.translatedDescription,
          originalLanguage: log.originalDescription !== log.translatedDescription,
          time: new Date(log.createdAt).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          photoCount: log.images ? log.images.length : 0,
        })),

        // Time entries
        laborSummary: timeEntries.map(entry => ({
          workerName: entry.workerName,
          clockIn: new Date(entry.clockIn).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }),
          clockOut: entry.clockOut ? new Date(entry.clockOut).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
          }) : 'Still working',
          hours: entry.hours || 0,
          verified: entry.verified,
        })),

        // Summary
        summary: this.generateSummary(project, workLogs, timeEntries, stats),

        // Metadata
        generatedAt: new Date().toISOString(),
        generatedBy: 'WorkBase System',
      };

      return { success: true, report };
    } catch (error) {
      console.error('Error generating report:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Calculate statistics from work logs and time entries
   */
  calculateStatistics(workLogs, timeEntries) {
    const uniqueWorkers = new Set();
    let totalHours = 0;
    let totalPhotos = 0;

    // From work logs
    workLogs.forEach(log => {
      uniqueWorkers.add(log.workerId);
      totalPhotos += log.images ? log.images.length : 0;
    });

    // From time entries
    timeEntries.forEach(entry => {
      uniqueWorkers.add(entry.workerId);
      totalHours += entry.hours || 0;
    });

    return {
      totalWorkers: uniqueWorkers.size,
      totalHours: Number(totalHours.toFixed(2)),
      totalPhotos,
    };
  },

  /**
   * Generate a concise summary paragraph
   */
  generateSummary(project, workLogs, timeEntries, stats) {
    if (workLogs.length === 0 && timeEntries.length === 0) {
      return 'No work activity was recorded for ' + project.name + ' on this date.';
    }

    let summary = 'On this date, ' + stats.totalWorkers + ' worker';
    summary += (stats.totalWorkers !== 1 ? 's' : '') + ' ';
    summary += 'logged a total of ' + stats.totalHours + ' hours at ' + project.name + '. ';
    
    if (workLogs.length > 0) {
      summary += workLogs.length + ' work log';
      summary += (workLogs.length !== 1 ? 's were' : ' was') + ' submitted ';
      summary += 'with ' + stats.totalPhotos + ' photo';
      summary += (stats.totalPhotos !== 1 ? 's' : '') + ' documenting the progress. ';
      
      // Highlight key work items
      if (workLogs.length > 0) {
        const workItems = workLogs.map(log => log.translatedDescription).join('; ');
        summary += 'Work completed includes: ' + workItems;
      }
    }

    return summary;
  },

  /**
   * Format report as plain text
   */
  formatReportAsText(report) {
    let text = '';
    
    text += 'DAILY WORK REPORT\n';
    text += '='.repeat(60) + '\n\n';
    
    text += 'Project: ' + report.projectName + '\n';
    text += 'Location: ' + report.projectAddress + '\n';
    text += 'Client: ' + report.clientName + '\n';
    text += 'Date: ' + report.dateFormatted + '\n\n';
    
    text += 'SUMMARY\n';
    text += '-'.repeat(60) + '\n';
    text += report.summary + '\n\n';
    
    text += 'STATISTICS\n';
    text += '-'.repeat(60) + '\n';
    text += 'Total Workers: ' + report.stats.totalWorkers + '\n';
    text += 'Total Hours: ' + report.stats.totalHours + '\n';
    text += 'Work Logs: ' + report.stats.totalWorkLogs + '\n';
    text += 'Photos: ' + report.stats.totalPhotos + '\n\n';
    
    if (report.workCompleted.length > 0) {
      text += 'WORK COMPLETED\n';
      text += '-'.repeat(60) + '\n';
      report.workCompleted.forEach((work, index) => {
        text += (index + 1) + '. [' + work.time + '] ' + work.workerName + '\n';
        text += '   ' + work.description + '\n';
        if (work.photoCount > 0) {
          text += '   📸 ' + work.photoCount + ' photo';
          text += (work.photoCount !== 1 ? 's' : '') + '\n';
        }
        text += '\n';
      });
    }
    
    if (report.laborSummary.length > 0) {
      text += 'LABOR HOURS\n';
      text += '-'.repeat(60) + '\n';
      report.laborSummary.forEach(entry => {
        text += entry.workerName + ': ' + entry.clockIn + ' - ' + entry.clockOut;
        text += ' (' + entry.hours + 'h)\n';
      });
      text += '\n';
    }
    
    text += '='.repeat(60) + '\n';
    text += 'Report generated: ' + new Date(report.generatedAt).toLocaleString() + '\n';
    
    return text;
  },

  /**
   * Save report to Firestore
   */
  async saveReport(report) {
    try {
      const result = await firestoreService.create('dailyReports', report);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },
};