
/* ========================================
   MONEYMAP AUTHENTICATION
======================================== */

// Supabase client is initialized in supabase-config.js.
// Do not redeclare supabaseClient here.


// ========================================
// DOM ELEMENTS
// ========================================

const loginSection = document.getElementById("login-section");

const signupSection = document.getElementById("signup-section");

const resetSection = document.getElementById("reset-section");

const authMessage = document.getElementById("auth-message");


// ========================================
// SHOW AUTHENTICATION MESSAGE
// ========================================

function showAuthMessage(message, isError = true) {

    if (!authMessage) return;

    authMessage.textContent = message;

    authMessage.style.color = isError
        ? "#ef4444"
        : "#10b981";
}


// ========================================
// SHOW LOGIN SECTION
// ========================================

function showLogin() {

    if (loginSection) {
        loginSection.style.display = "block";
    }

    if (signupSection) {
        signupSection.style.display = "none";
    }

    if (resetSection) {
        resetSection.style.display = "none";
    }

    showAuthMessage("");
}


// ========================================
// SHOW SIGNUP SECTION
// ========================================

function showSignup() {

    if (loginSection) {
        loginSection.style.display = "none";
    }

    if (signupSection) {
        signupSection.style.display = "block";
    }

    if (resetSection) {
        resetSection.style.display = "none";
    }

    showAuthMessage("");
}


// ========================================
// SHOW PASSWORD RESET SECTION
// ========================================

function showResetPassword() {

    if (loginSection) {
        loginSection.style.display = "none";
    }

    if (signupSection) {
        signupSection.style.display = "none";
    }

    if (resetSection) {
        resetSection.style.display = "block";
    }

    showAuthMessage("");
}


// ========================================
// LOGIN USER
// ========================================

async function loginUser(event) {

    event.preventDefault();

    const email = document.getElementById("login-email")
        .value.trim();

    const password = document.getElementById("login-password")
        .value;

    if (!email || !password) {

        showAuthMessage(
            "Please enter your email and password."
        );

        return;
    }


    const loginButton = document.getElementById("login-btn");

    if (loginButton) {
        loginButton.disabled = true;
        loginButton.textContent = "Logging in...";
    }


    const { data, error } =
        await window.supabaseClient.auth.signInWithPassword({

            email: email,

            password: password

        });


    if (loginButton) {
        loginButton.disabled = false;
        loginButton.textContent = "Login";
    }


    if (error) {

        console.error("Login error:", error.message);

        showAuthMessage(
            error.message || "Login failed. Please try again."
        );

        return;
    }


    showAuthMessage(
        "Login successful! Redirecting...",
        false
    );


    window.location.href = "index.html";
}


// ========================================
// REGISTER NEW USER
// ========================================

async function signupUser(event) {

    event.preventDefault();

    const fullName = document.getElementById("signup-name")
        .value.trim();

    const email = document.getElementById("signup-email")
        .value.trim();

    const password = document.getElementById("signup-password")
        .value;

    const confirmPassword = document.getElementById(
        "signup-confirm-password"
    ).value;


    if (!fullName || !email || !password || !confirmPassword) {

        showAuthMessage(
            "Please fill in all the fields."
        );

        return;
    }


    if (password.length < 6) {

        showAuthMessage(
            "Password must contain at least 6 characters."
        );

        return;
    }


    if (password !== confirmPassword) {

        showAuthMessage(
            "Passwords do not match."
        );

        return;
    }


    const signupButton = document.getElementById("signup-btn");

    if (signupButton) {
        signupButton.disabled = true;
        signupButton.textContent = "Creating Account...";
    }


    const { data, error } =
        await window.supabaseClient.auth.signUp({

            email: email,

            password: password,

            options: {

                data: {

                    full_name: fullName

                }

            }

        });


    if (signupButton) {
        signupButton.disabled = false;
        signupButton.textContent = "Create Account";
    }


    if (error) {

        console.error("Signup error:", error.message);

        showAuthMessage(
            error.message || "Signup failed. Please try again."
        );

        return;
    }


    if (data.session) {

        showAuthMessage(
            "Account created successfully! Redirecting...",
            false
        );

        window.location.href = "index.html";

    } else {

        showAuthMessage(
            "Account created! Please check your email to verify your account.",
            false
        );

    }
}


// ========================================
// RESET PASSWORD EMAIL
// ========================================

async function sendResetPasswordEmail(event) {

    event.preventDefault();

    const email = document.getElementById("reset-email")
        .value.trim();


    if (!email) {

        showAuthMessage(
            "Please enter your registered email address."
        );

        return;
    }


    const resetButton = document.getElementById("reset-btn");

    if (resetButton) {
        resetButton.disabled = true;
        resetButton.textContent = "Sending...";
    }


    const { error } =
        await window.supabaseClient.auth.resetPasswordForEmail(

            email,

            {
                redirectTo: window.location.origin + "/auth.html"
            }

        );


    if (resetButton) {
        resetButton.disabled = false;
        resetButton.textContent = "Send Reset Link";
    }


    if (error) {

        console.error(
            "Password reset error:",
            error.message
        );

        showAuthMessage(
            error.message || "Unable to send reset email."
        );

        return;
    }


    showAuthMessage(
        "Password reset link sent! Please check your email.",
        false
    );
}


// ========================================
// UPDATE PASSWORD
// ========================================

async function updateNewPassword(event) {

    event.preventDefault();

    const newPassword = document.getElementById(
        "new-password"
    ).value;

    const confirmPassword = document.getElementById(
        "confirm-new-password"
    ).value;


    if (newPassword.length < 6) {

        showAuthMessage(
            "Password must contain at least 6 characters."
        );

        return;
    }


    if (newPassword !== confirmPassword) {

        showAuthMessage(
            "Passwords do not match."
        );

        return;
    }


    const { error } =
        await window.supabaseClient.auth.updateUser({

            password: newPassword

        });


    if (error) {

        console.error(
            "Password update error:",
            error.message
        );

        showAuthMessage(
            "Unable to update password. Please try again."
        );

        return;
    }


    showAuthMessage(
        "Password updated successfully! Please log in.",
        false
    );


    await window.supabaseClient.auth.signOut();


    setTimeout(function() {

        window.location.href = "auth.html";

    }, 1500);
}


// ========================================
// CHECK EXISTING SESSION
// ========================================

async function checkExistingSession() {

    if (!window.supabaseClient) {

        console.error("Supabase client not initialized.");

        showAuthMessage(
            "Unable to connect to the server. Please refresh."
        );

        return;
    }


    const { data, error } =
        await window.supabaseClient.auth.getSession();


    if (error) {

        console.error(
            "Session check error:",
            error.message
        );

        return;
    }


    if (data.session) {

        window.location.href = "index.html";

    }
}


// ========================================
// EVENT LISTENERS
// ========================================

document.addEventListener("DOMContentLoaded", function() {


    // Login form

    const loginForm = document.getElementById("login-form");

    if (loginForm) {

        loginForm.addEventListener(
            "submit",
            loginUser
        );

    }


    // Signup form

    const signupForm = document.getElementById("signup-form");

    if (signupForm) {

        signupForm.addEventListener(
            "submit",
            signupUser
        );

    }


    // Password reset form

    const resetForm = document.getElementById("reset-form");

    if (resetForm) {

        resetForm.addEventListener(
            "submit",
            sendResetPasswordEmail
        );

    }


    // Update password form

    const updatePasswordForm = document.getElementById(
        "update-password-form"
    );

    if (updatePasswordForm) {

        updatePasswordForm.addEventListener(
            "submit",
            updateNewPassword
        );

    }


    // Switch to signup

    const showSignupButton = document.getElementById(
        "show-signup"
    );

    if (showSignupButton) {

        showSignupButton.addEventListener(
            "click",
            showSignup
        );

    }


    // Switch to login

    const showLoginButton = document.getElementById(
        "show-login"
    );

    if (showLoginButton) {

        showLoginButton.addEventListener(
            "click",
            showLogin
        );

    }


    // Forgot password

    const forgotPasswordButton = document.getElementById(
        "forgot-password"
    );

    if (forgotPasswordButton) {

        forgotPasswordButton.addEventListener(
            "click",
            showResetPassword
        );

    }


    // Back to login from reset

    const backToLoginButton = document.getElementById(
        "back-to-login"
    );

    if (backToLoginButton) {

        backToLoginButton.addEventListener(
            "click",
            showLogin
        );

    }


    // Check existing session

    checkExistingSession();


});
