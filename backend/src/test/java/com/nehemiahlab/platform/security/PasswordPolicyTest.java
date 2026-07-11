package com.nehemiahlab.platform.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class PasswordPolicyTest {

    @Test
    void acceptsStrongPassword() {
        assertTrue(PasswordPolicy.isValid("ParentSka2026"));
    }

    @Test
    void rejectsShortOrSingleClassPasswords() {
        assertFalse(PasswordPolicy.isValid("Abc123"));
        assertFalse(PasswordPolicy.isValid("abcdefghij1"));
        assertFalse(PasswordPolicy.isValid("ABCDEFGHIJ1"));
        assertFalse(PasswordPolicy.isValid("Abcdefghijk"));
    }
}
