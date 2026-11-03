
/* ========================================
   MONEYMAP SETTINGS
======================================== */

// Do not redeclare supabaseClient here.
// It is already initialized in supabase-config.js.


// ========================================
// CHECK LOGIN AND LOAD PROFILE
// ========================================

async function loadSettings() {

    if (!window.supabaseClient) {
        alert("Supabase configuration not found.");
        return;
    }

    const { data, error } =
        await window.supabaseClient.auth.getUser();

    if (error || !data.user) {
        window.location.href = "auth.html";
        return;
    }

    const user = data.user;

    document.getElementById("registered-email").value =
        user.email || "";

    document.getElementById("full-name").value =
        user.user_metadata?.full_name || "";
}


// ========================================
// SAVE PROFILE
// ========================================

async function saveProfile() {

    const fullName = document.getElementById("full-name")
        .value.trim();

    if (!fullName) {
        alert("Please enter your full name.");
        return;
    }

    const saveButton =
        document.getElementById("save-profile-btn");

    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    const { error } =
        await window.supabaseClient.auth.updateUser({
            data: {
                full_name: fullName
            }
        });

    saveButton.disabled = false;
    saveButton.textContent = "Save Profile";

    if (error) {
        console.error("Profile update error:", error.message);

        alert(
            "Unable to update your profile. Please try again."
        );

        return;
    }

    alert("Your profile has been updated successfully!");
}


// ========================================
// CHANGE PASSWORD
// ========================================

async function changePassword(event) {

    event.preventDefault();

    const currentPassword =
        document.getElementById("current-password").value;

    const newPassword =
        document.getElementById("new-password").value;

    const confirmPassword =
        document.getElementById("confirm-password").value;


    // Validate password length

    if (newPassword.length < 6) {

        alert(
            "Your new password must contain at least 6 characters."
        );

        return;
    }


    // Confirm new password

    if (newPassword !== confirmPassword) {

        alert(
            "New password and confirmation password do not match."
        );

        return;
    }


    // Check whether password is unchanged

    if (currentPassword === newPassword) {

        alert(
            "Your new password must be different from your current password."
        );

        return;
    }


    // Get logged-in user

    const { data: userData, error: userError } =
        await window.supabaseClient.auth.getUser();


    if (userError || !userData.user) {

        alert(
            "Your session has expired. Please log in again."
        );

        window.location.href = "auth.html";

        return;
    }


    const email = userData.user.email;


    // Verify current password

    const { error: signInError } =
        await window.supabaseClient.auth.signInWithPassword({

            email: email,

            password: currentPassword

        });


    if (signInError) {

        alert("Your current password is incorrect.");

        return;
    }


    // Update password

    const { error: updateError } =
        await window.supabaseClient.auth.updateUser({

            password: newPassword

        });


    if (updateError) {

        console.error(
            "Password update error:",
            updateError.message
        );

        alert(
            "Unable to update your password. Please try again."
        );

        return;
    }


    // Reset form

    document.getElementById("change-password-form").reset();


    alert(
        "Your password has been changed successfully!"
    );
}


// ========================================
// LOGOUT
// ========================================

async function logoutUser() {

    const confirmed = confirm(
        "Are you sure you want to logout?"
    );

    if (!confirmed) {
        return;
    }


    const { error } =
        await window.supabaseClient.auth.signOut();


    if (error) {

        console.error(
            "Logout error:",
            error.message
        );

        alert(
            "Unable to logout. Please try again."
        );

        return;
    }


    window.location.href = "auth.html";
}


// ========================================
// EVENT LISTENERS
// ========================================

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        // Load profile information

        await loadSettings();


        // Back to dashboard

        document.getElementById("back-to-dashboard")
            .addEventListener("click", function() {

                window.location.href = "index.html";

            });


        // Save profile

        document.getElementById("save-profile-btn")
            .addEventListener("click", saveProfile);


        // Change password

        document.getElementById("change-password-form")
            .addEventListener("submit", changePassword);


        // Logout

        document.getElementById("logout-btn")
            .addEventListener("click", logoutUser);

    }
);
