const bcrypt = require('bcrypt');

const password = 'Adampass23062017'; // replace with your test password
const hashedPassword = '<password_hash_from_database>'; // replace with actual hash

bcrypt.compare(password, hashedPassword)
    .then(isMatch => console.log('Password match:', isMatch))
    .catch(err => console.error('Error comparing passwords:', err));
