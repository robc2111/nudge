/** @type {import('node-pg-migrate').MigrationBuilder} */
module.exports = {
  up: (pgm) => {
    // add soft-delete column
    pgm.addColumn('users', {
      deleted_at: { type: 'timestamptz', notNull: false },
    });

    // drop any plain unique constraint on email (safe if not there)
    pgm.dropConstraint('users', 'users_email_key', { ifExists: true });

    // unique among active (non-deleted) users only
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
