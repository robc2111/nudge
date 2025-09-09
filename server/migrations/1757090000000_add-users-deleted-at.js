// server/migrations/1757090000000_add-users-deleted-at.js
/** @type {import('node-pg-migrate').MigrationBuilder} */
module.exports = {
  up: (pgm) => {
    // soft delete column
    pgm.addColumn('users', {
      deleted_at: { type: 'timestamptz', notNull: false },
    });

    // drop old unique(email) if it exists
    pgm.dropConstraint('users', 'users_email_key', { ifExists: true });

    // unique among active (non-deleted) users
    pgm.createIndex('users', 'email', {
      name: 'users_email_unique_active',
      unique: true,
      where: 'email IS NOT NULL AND deleted_at IS NULL',
    });
  },

  down: (pgm) => {
    pgm.dropIndex('users', 'email', {
      name: 'users_email_unique_active',
      ifExists: true,
    });
    pgm.addConstraint('users', 'users_email_key', { unique: 'email' });
    pgm.dropColumn('users', 'deleted_at', { ifExists: true });
  },
};
