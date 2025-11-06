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

      // Prepare work descriptions for the AI
      const descriptions = workLogs.map((log, index) => {
        const desc = log.translatedDescription || log.description;
        const employee = log.employeeName || 'Unknown';
        const photoCount = log.images?.length || 0;
        return `${index + 1}. ${employee}: ${desc} (${photoCount} photo${photoCount !== 1 ? 's' : ''})`;
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
            maxOutputTokens: 500,
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
      console.log('📝 First candidate:', candidate);

      // Check if response was blocked
      if (candidate.finishReason === 'SAFETY' || candidate.finishReason === 'RECITATION') {
        throw new Error(`Response blocked by Gemini safety filters: ${candidate.finishReason}`);
      }

      // Safely access nested properties
      if (!candidate.content) {
        console.error('❌ No content in candidate:', candidate);
        throw new Error('Invalid response structure: missing content');
      }

      if (!candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('❌ No parts in content:', candidate.content);
        throw new Error('Invalid response structure: missing parts');
      }

      const firstPart = candidate.content.parts[0];
      if (!firstPart || !firstPart.text) {
        console.error('❌ No text in first part:', firstPart);
        throw new Error('Invalid response structure: missing text');
      }

      const summary = firstPart.text;
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