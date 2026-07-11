package com.nehemiahlab.platform.security;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class InputSanitizerEmailTest {

    @Test
    void acceptsStandardAndLocalDevEmails() {
        assertTrue(InputSanitizer.isSafeEmail("directeur@ska.tg"));
        assertTrue(InputSanitizer.isSafeEmail("director@localhost"));
        assertTrue(InputSanitizer.isSafeEmail("parent.26ska0487@ska.local"));
    }

    @Test
    void rejectsInvalidEmails() {
        assertFalse(InputSanitizer.isSafeEmail("not-an-email"));
        assertFalse(InputSanitizer.isSafeEmail("user@"));
        assertFalse(InputSanitizer.isSafeEmail(""));
    }
}
