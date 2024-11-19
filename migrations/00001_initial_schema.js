// migrations/00001_initial_schema.js
async function up(pool) {
  await pool.query(`
      DROP TABLE IF EXISTS user_feedback;
      DROP TABLE IF EXISTS users;

      CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          is_admin BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE user_feedback (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id),
          name VARCHAR(255),
          email VARCHAR(255) NOT NULL,
          screen_time_addiction BOOLEAN DEFAULT FALSE,
          consumptive_habits BOOLEAN DEFAULT FALSE,
          inappropriate_content BOOLEAN DEFAULT FALSE,
          bad_influences BOOLEAN DEFAULT FALSE,
          safety BOOLEAN DEFAULT FALSE,
          false_information BOOLEAN DEFAULT FALSE,
          social_distortion BOOLEAN DEFAULT FALSE,
          other_concern BOOLEAN DEFAULT FALSE,
          other_description TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
  `);
}

async function down(pool) {
  await pool.query(`
      DROP TABLE IF EXISTS user_feedback;
      DROP TABLE IF EXISTS users;
  `);
}

module.exports = { up, down };