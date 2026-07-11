package com.nehemiahlab.platform.security;

public final class PasswordPolicy {

    private PasswordPolicy() {
    }

    public static boolean isValid(String password) {
        if (password == null || password.length() < 10 || password.length() > 128) return false;
        boolean lower = false;
        boolean upper = false;
        boolean digit = false;
        for (char character : password.toCharArray()) {
            lower |= Character.isLowerCase(character);
            upper |= Character.isUpperCase(character);
            digit |= Character.isDigit(character);
        }
        return lower && upper && digit;
    }

    public static String requirementMessage() {
        return "Le mot de passe doit contenir 10 à 128 caractères, avec une minuscule, une majuscule et un chiffre.";
    }
}
