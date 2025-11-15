// src/services/aiService.js
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

export const aiService = {
  /**
   * Generate a concise summary of daily work logs using Gemini
   * @param {Array} workLogs - Array of work log objects
   * @param {Object} options - Additional options (projectName, date, etc.)
   * @returns {Promise<Object>} - {success: boolean, summary: string, error?: string}
   */
  async generateWorkSummary(workLogs, options = {}) {
    try {
      console.log('🚀 Starting summary generation...');
      
      if (!GEMINI_API_KEY) {
        throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your .env file');
      }

      if (!workLogs || workLogs.length === 0) {
        return {
          success: false,
          error: 'No work logs provided'
        };
      }

      console.log(`📊 Processing ${workLogs.length} work logs`);

      // ✅ Limit to prevent token overflow
      const MAX_LOGS = 50;
      const logsToProcess = workLogs.slice(0, MAX_LOGS);
      
      if (workLogs.length > MAX_LOGS) {
        console.warn(`⚠️ Too many logs (${workLogs.length}). Using first ${MAX_LOGS} only.`);
      }

      // Prepare work descriptions for the AI
      const descriptions = logsToProcess.map((log, index) => {
        const desc = log.translatedDescription || log.description;
        const employee = log.employeeName || 'Unknown';
        const photoCount = log.images?.length || 0;
        
        // ✅ Truncate very long descriptions
        const truncatedDesc = desc.length > 200 ? desc.substring(0, 200) + '...' : desc;
        
        return `${index + 1}. ${employee}: ${truncatedDesc} (${photoCount} photo${photoCount !== 1 ? 's' : ''})`;
      }).join('\n');

      const { projectName, date } = options;
      const projectInfo = projectName ? `Project: ${projectName}\n` : '';
      const dateInfo = date ? `Date: ${date}\n` : '';

      // Create prompt for Gemini
  const prompt = `You are a construction project manager creating a daily work summary report.

${projectInfo}${dateInfo}
Below are the work logs submitted by workers today. Generate a concise, professional summary (3-5 sentences) that:
1. Highlights the main work completed
2. Mentions key accomplishments
3. Notes the number of workers/submissions
4. Is suitable for client reports or project documentation
5. **(New Instruction): Ensure the summary uses clear, common language and simple sentence structures to facilitate translation and understanding by foreign families whose first language is not English.**

Work Logs (${workLogs.length} submission${workLogs.length !== 1 ? 's' : ''}):
${descriptions}

Generate a brief, professional summary:`;

      // Call Gemini API - Using v1 endpoint
      const apiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      console.log('📡 Calling Gemini API...');

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 2048,  // ✅ Increased from 500 to 2048
            topP: 0.95,
            topK: 40
          }
        })
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Gemini API Error:', errorData);
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`);
      }

      const data = await response.json();
      console.log('✅ Full API Response:', data);
      
      // Extract the generated text from Gemini's response with better error handling
      if (!data.candidates) {
        console.error('❌ No candidates in response');
        console.error('Full response:', JSON.stringify(data, null, 2));
        throw new Error('No candidates in API response. The response may have been blocked or filtered.');
      }

      if (data.candidates.length === 0) {
        console.error('❌ Candidates array is empty');
        throw new Error('No response generated from Gemini');
      }

      const candidate = data.candidates[0];
      console.log('📝 First candidate:', JSON.stringify(candidate, null, 2));

      // ✅ Check for MAX_TOKENS error specifically
      if (candidate.finishReason === 'MAX_TOKENS') {
        throw new Error('Response too long. Try filtering to fewer work logs or use a shorter date range.');
      }

      // Check if response was blocked
      if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
        throw new Error(`Response blocked by Gemini safety filters: ${candidate.finishReason}`);
      }

      // Handle different possible response structures
      let summary = null;

      // Try primary structure: candidate.content.parts[0].text
      if (candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
        const firstPart = candidate.content.parts[0];
        if (firstPart && firstPart.text) {
          summary = firstPart.text;
          console.log('✨ Found summary in standard location');
        }
      }

      // Try alternative structure: candidate.text
      if (!summary && candidate.text) {
        summary = candidate.text;
        console.log('✨ Found summary in candidate.text');
      }

      // Try alternative structure: candidate.output
      if (!summary && candidate.output) {
        summary = candidate.output;
        console.log('✨ Found summary in candidate.output');
      }

      if (!summary) {
        console.error('❌ Could not find text in any expected location');
        console.error('Full candidate structure:', JSON.stringify(candidate, null, 2));
        throw new Error('Invalid response structure: could not find generated text. Check console for details.');
      }

      console.log('✨ Generated summary:', summary);

      return {
        success: true,
        summary: summary.trim()
      };

    } catch (error) {
      console.error('❌ Error generating work summary:', error);
      return {
        success: false,
        error: error.message || 'Failed to generate summary'
      };
    }
  },

  /**
   * Generate a summary for multiple projects
   * @param {Object} projectLogs - Object with projectId as key and logs array as value
   * @returns {Promise<Object>} - {success: boolean, summaries: Object, error?: string}
   */
  async generateMultiProjectSummary(projectLogs) {
    try {
      const summaries = {};
      
      for (const [projectId, logs] of Object.entries(projectLogs)) {
        if (logs.length > 0) {
          const result = await this.generateWorkSummary(logs, {
            projectName: logs[0].projectName
          });
          
          if (result.success) {
            summaries[projectId] = result.summary;
          }
        }
      }

      return {
        success: true,
        summaries
      };

    } catch (error) {
      console.error('Error generating multi-project summary:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
};