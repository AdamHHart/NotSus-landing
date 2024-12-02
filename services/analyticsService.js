// File: services/analyticsService.js

const db = require('../db');

class AnalyticsService {
    static async trackInteraction(data) {
        const {
            guardianId,
            sessionId,
            interactionType,
            pagePath,
            deviceInfo
        } = data;

        try {
            await db.query(`
                INSERT INTO site_interactions (
                    guardian_id,
                    session_id,
                    interaction_type,
                    page_path,
                    device_type,
                    browser_info
                ) VALUES ($1, $2, $3, $4, $5, $6)
            `, [
                guardianId,
                sessionId,
                interactionType,
                pagePath,
                deviceInfo.deviceType,
                JSON.stringify(deviceInfo)
            ]);
        } catch (err) {
            console.error('Error tracking interaction:', err);
        }
    }

    static async enhanceFeedbackSubmission(feedbackData) {
        const {
            guardianEmail,
            concerns,
            role,
            childrenAges,
            location,
            browserInfo
        } = feedbackData;

        try {
            // Start transaction
            return await db.transaction(async (client) => {
                // Create or update guardian profile
                const guardianResult = await client.query(`
                    INSERT INTO guardian_profiles (
                        email,
                        role,
                        children_age_ranges,
                        location_country,
                        location_region,
                        current_browser,
                        tech_comfort_level
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
                    ON CONFLICT (email) DO UPDATE
                    SET last_updated_at = CURRENT_TIMESTAMP
                    RETURNING id
                `, [
                    guardianEmail,
                    role,
                    childrenAges,
                    location.country,
                    location.region,
                    browserInfo.browser,
                    browserInfo.techComfortLevel
                ]);

                const guardianId = guardianResult.rows[0].id;

                // Record feedback submission
                const feedbackResult = await client.query(`
                    INSERT INTO feedback_submissions (
                        guardian_id,
                        submission_type,
                        category,
                        sentiment
                    ) VALUES ($1, $2, $3, $4)
                    RETURNING id
                `, [
                    guardianId,
                    'initial_survey',
                    'general',
                    0  // Neutral sentiment as default
                ]);

                // Record detailed concerns
                for (const concern of concerns) {
                    await client.query(`
                        INSERT INTO concern_details (
                            feedback_id,
                            concern_type,
                            severity,
                            impact_area,
                            description
                        ) VALUES ($1, $2, $3, $4, $5)
                    `, [
                        feedbackResult.rows[0].id,
                        concern.type,
                        concern.severity || 3,
                        concern.impactArea,
                        concern.description
                    ]);
                }

                return {
                    guardianId,
                    feedbackId: feedbackResult.rows[0].id
                };
            });
        } catch (err) {
            console.error('Error processing feedback:', err);
            throw err;
        }
    }

    static async generateInsightReport() {
        try {
            const insights = await db.query(`
                WITH ConcernMetrics AS (
                    SELECT 
                        concern_type,
                        COUNT(*) as frequency,
                        AVG(severity) as avg_severity,
                        MODE() WITHIN GROUP (ORDER BY impact_area) as primary_impact
                    FROM concern_details
                    GROUP BY concern_type
                ),
                GeographicDistribution AS (
                    SELECT 
                        location_country,
                        COUNT(*) as user_count
                    FROM guardian_profiles
                    GROUP BY location_country
                ),
                RoleDistribution AS (
                    SELECT 
                        role,
                        COUNT(*) as role_count
                    FROM guardian_profiles
                    GROUP BY role
                )
                SELECT 
                    json_build_object(
                        'topConcerns', (SELECT json_agg(ConcernMetrics.*) FROM ConcernMetrics),
                        'geography', (SELECT json_agg(GeographicDistribution.*) FROM GeographicDistribution),
                        'roles', (SELECT json_agg(RoleDistribution.*) FROM RoleDistribution)
                    ) as insights
            `);

            return insights.rows[0].insights;
        } catch (err) {
            console.error('Error generating insights:', err);
            throw err;
        }
    }
}

module.exports = AnalyticsService;