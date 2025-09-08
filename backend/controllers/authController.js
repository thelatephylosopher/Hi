const authModel = require('../models/authModel');
const bcrypt = require('bcryptjs');

// --- Login User and Create Session ---
const loginUser = (req, res) => {
    const { email, password } = req.body;
    
    // --- DEBUG LOG 1 ---
    console.log(`[AUTH DEBUG] Login attempt for email: ${email}`);
    // --- NEW DEBUG LOG ---
    // Check if the password is being received correctly from the frontend.
    console.log(`[AUTH DEBUG] Password received: ${password ? 'Yes' : 'No'}`);


    // Find the user in the database by their email
    authModel.findUserByEmail(email, async (err, user) => {
        if (err) {
            console.error("Database error during login:", err.message);
            return res.status(500).json({ message: 'An internal error occurred.' });
        }

        if (!user) {
            // --- DEBUG LOG 2 ---
            console.log(`[AUTH DEBUG] User not found for email: ${email}`);
            return res.status(401).json({ message: 'Invalid credentials' });
        }
        
        // --- NEW DEBUG LOG ---
        // Log the entire user object to inspect its structure and the hashed password.
        console.log('[AUTH DEBUG] User object found in database:', user);

        try {
            // Compare the provided password with the hashed password from the database
            const isMatch = await bcrypt.compare(password, user.password);

            // --- DEBUG LOG 3 ---
            console.log(`[AUTH DEBUG] Password match result for ${email}: ${isMatch}`);

            if (isMatch) {
                // --- SUCCESS! ---
                console.log(`[AUTH DEBUG] Login successful for ${email}. Creating session.`);
                req.session.user = {
                  id: user.id,
                  email: user.email,
                };

                return res.status(200).json({ message: "Login successful", user: req.session.user });

            } else {
                // If passwords do not match
                console.log(`[AUTH DEBUG] Password mismatch for user: ${email}`);
                return res.status(401).json({ message: 'Invalid credentials' });
            }
        } catch (bcryptError) {
            console.error("Bcrypt comparison error:", bcryptError);
            return res.status(500).json({ message: 'An internal error occurred.' });
        }
    });
};

// --- Logout User and Destroy Session ---
const logoutUser = (req, res) => {
  req.session.destroy(err => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).json({ message: "Could not log out, please try again." });
    }
    res.clearCookie('connect.sid');
    return res.status(200).json({ message: "Logged out successfully" });
  });
};

// --- NEW: Check Authentication Status ---
const checkAuthStatus = (req, res) => {
    // The `isAuthenticated` middleware runs before this.
    // If the code reaches here, it means a valid session exists.
    res.status(200).json({ user: req.session.user });
};

// --- Export all functions ---
module.exports = {
    loginUser,
    logoutUser,
    checkAuthStatus
};
