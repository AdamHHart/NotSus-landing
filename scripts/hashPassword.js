const bcrypt = require('bcrypt');

const plainPassword = 'adampass23062017'; // Replace with the password you want to hash

bcrypt.hash(plainPassword, 10, (err, hash) => {
    if (err) {
        console.error('Error hashing password:', err);
    } else {
        console.log('Hashed password:', hash);
    }
});
