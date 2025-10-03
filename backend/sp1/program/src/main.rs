/**
 * ConnectSphere SP1 Email Verification Program
 *
 * This SP1 program implements zero-knowledge proof generation for email domain
 * verification. It verifies JWT signatures and validates email domains without
 * exposing personal information.
 */

#![no_main]
sp1_zkvm::entrypoint!(main);

use lib::{split_email, split_jwt, pem_to_der};
use rsa::{pkcs8::DecodePublicKey, Pkcs1v15Sign, RsaPublicKey};
use sha2_v0_10_8::{Digest, Sha256};

pub fn main() {
    // Read input values: JWT token from Clerk, RSA public key, expected domain, and SUI wallet address
    let token = sp1_zkvm::io::read::<String>();
    let rsa_public_key = sp1_zkvm::io::read::<String>();
    let domain = sp1_zkvm::io::read::<String>();
    let wallet_address = sp1_zkvm::io::read::<String>();

    // Commit the domain to the zk proof (so it's publicly known)
    sp1_zkvm::io::commit(&domain);

    // Split the JWT into its components: header, payload, and signature
    let (header, payload, signature) = split_jwt(&token)
        .expect("Failed to decode JWT from Clerk");

    // Convert the PEM public key into DER format for RSA verification
    let pk_der = pem_to_der(&rsa_public_key);
    let public_key = RsaPublicKey::from_public_key_der(&pk_der)
        .expect("Failed to parse RSA public key");

    // Reconstruct the signing input (header + payload) as a string
    let signing_input = format!(
        "{}.{}",
        token.split('.').collect::<Vec<&str>>()[0], // First part: header
        token.split('.').collect::<Vec<&str>>()[1]  // Second part: payload
    );

    // Hash the signing input using SHA256
    let mut hasher = Sha256::new();
    hasher.update(signing_input);
    let hashed_msg = hasher.finalize();

    // Verify the JWT signature using Google's RSA public key
    let signature_valid = match public_key.verify(Pkcs1v15Sign::new::<Sha256>(), &hashed_msg, &signature) {
        Ok(_) => true,  // Signature is valid
        Err(_) => false, // Signature is invalid
    };

    // Commit the signature verification result
    sp1_zkvm::io::commit(&signature_valid);

    // Extract email from the JWT payload (handle both Clerk and Google formats)
    let email_str = if let Some(email_addresses) = payload.get("email_addresses").and_then(|emails| emails.as_array()) {
        // Clerk format: email_addresses is an array of email objects
        if let Some(first_email) = email_addresses.first() {
            first_email.get("email_address")
                .and_then(|email| email.as_str())
                .expect("No email_address field in Clerk email_addresses array")
        } else {
            panic!("No email addresses found in Clerk JWT payload");
        }
    } else if let Some(email) = payload.get("email").and_then(|e| e.as_str()) {
        // Google OAuth format: top-level email field (backward compatibility)
        email
    } else {
        panic!("No email field found in JWT payload (expected 'email' or 'email_addresses')");
    };

    // Validate email format - check if it contains template placeholders
    if email_str.contains("{{") || email_str.contains("}}") || !email_str.contains('@') {
        panic!("Invalid email format: email appears to be a template string rather than actual email");
    }

    // Split the email address into username and domain parts
    let email_parts = split_email(email_str.to_string())
        .expect("Failed to parse email address");

    // Check if the email domain matches the expected domain
    let domain_verified = email_parts.domain == domain;

    // Commit the domain verification result
    sp1_zkvm::io::commit(&domain_verified);

    // Extract user's Clerk ID from JWT payload for linking to our system
    let clerk_user_id = payload.get("sub")
        .and_then(|sub| sub.as_str())
        .unwrap_or("");

    // Commit the Clerk user ID (can be used to link the proof to a specific user)
    sp1_zkvm::io::commit(&clerk_user_id);

    // Overall verification result: signature valid AND domain matches
    let verification_success = signature_valid && domain_verified;
    sp1_zkvm::io::commit(&verification_success);

    // Commit the wallet address last so client code can read it after other fields
    sp1_zkvm::io::commit(&wallet_address);
}
